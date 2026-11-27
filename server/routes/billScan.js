// ===================================================================
// Bill Scan — upload a supplier bill (PDF or photo) and import it
// automatically: Claude Haiku reads the bill, then each invoice becomes a
// Submitted Purchase Bill. Suppliers and items that don't exist yet are
// created in the item master, and stock + moving-average cost are posted
// through the normal stock ledger (so a bill can be undone with Cancel).
//
// Needs ANTHROPIC_API_KEY, read from the environment or server/ai.env.
// ===================================================================
const path = require('path');
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');
const { postMovement, getDefaultWarehouseId } = require('../stockLedger');
const { nextBillNumber } = require('./purchaseBills');
const { nextPaymentNumber } = require('./payments');

// Bills uploaded here are already paid for (online orders), so each import
// also records a full payment and the bill shows as Paid.
const PAID_ON_UPLOAD = true;
const PAID_METHOD = 'UPI';
const { v4: uuidv4 } = require('uuid');

// The key lives in server/ai.env (set from Settings by the main admin).
const { getKey } = require('../aiKey');

const MODEL = 'claude-haiku-5-5';
// Haiku 5.5 list price (USD per million tokens, prompts up to 100K tokens).
const USD_PER_M_IN = 0.10;
const USD_PER_M_OUT = 0.50;
const INR_PER_USD = 85;

const MEDIA_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

let client = null;
let clientKey = null;
function getClient() {
  const key = getKey(); // read fresh, so a key saved in Settings works at once
  if (!key) return null;
  if (!client || clientKey !== key) {
    const Anthropic = require('@anthropic-ai/sdk');
    const Client = Anthropic.default || Anthropic;
    client = new Client({ apiKey: key });
    clientKey = key;
  }
  return client;
}

// What Claude must return. Structured outputs guarantee this exact shape.
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['invoices'],
  properties: {
    invoices: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['supplier_name', 'supplier_gstin', 'invoice_number', 'invoice_date', 'items', 'round_off', 'grand_total'],
        properties: {
          supplier_name: { type: 'string' },
          supplier_gstin: { type: 'string' },
          invoice_number: { type: 'string' },
          invoice_date: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'matched_item_id', 'qty', 'unit', 'rate', 'tax', 'pack_size', 'pack_unit'],
              properties: {
                name: { type: 'string' },
                matched_item_id: { type: 'integer' },
                qty: { type: 'number' },
                unit: { type: 'string' },
                rate: { type: 'number' },
                tax: { type: 'number' },
                pack_size: { type: 'number' },
                pack_unit: { type: 'string' }
              }
            }
          },
          round_off: { type: 'number' },
          grand_total: { type: 'number' }
        }
      }
    }
  }
};

const INSTRUCTIONS = `You read purchase bills / tax invoices for a restaurant and extract them for stock entry.

Rules:
- One file can hold several separate invoices (different invoice numbers or sellers). Return each one as its own entry in "invoices". Ignore pages that are only terms, return policies or ads.
- supplier_name: the seller ("Sold By"), not the buyer. supplier_gstin: the seller's GSTIN, or "" if none.
- invoice_number: the seller's invoice number exactly as printed. invoice_date: YYYY-MM-DD, or "" if not shown.
- items: one entry per real product line. Skip lines that are fees, delivery, handling, packing or charges, and lines whose final amount is 0.
- name: the full product name as printed (e.g. "Amul Taaza Toned Milk"), not a short category word.
- qty: the quantity bought. unit: a short unit for that quantity - "pcs", "pack", "kg", "g", "L", "ml", "box", "dozen" - use "pcs" if unsure.
- rate: price for ONE unit AFTER discounts and BEFORE GST (taxable value divided by qty). Round to 2 decimals.
- tax: total GST for that whole line (CGST + SGST + IGST + cess). 0 if none.
- round_off: any round-off amount printed on the invoice, else 0. grand_total: the invoice's final payable total.
- Keep qty, unit and rate exactly as the bill counts them; never convert units yourself.
- pack_size / pack_unit: the size of ONE unit when it is printed in the product name or line (e.g. "Amul Taaza 500 ml" -> 500, "ml"; "Oil 1 L Pouch" -> 1, "L"; "Rice 5 kg" -> 5, "kg"). If no size is printed, pack_size 0 and pack_unit "".
- matched_item_id: if the product is clearly the same thing as an item in the restaurant's item list below, give that item's id. Same product with a different brand or wording still counts (e.g. "English Oven Burger Buns" matches "Burger Bun"). If nothing in the list is the same product, give 0. Never guess an id that is not in the list.

Restaurant item list (id | name | unit):
`;

function itemListText(orgId) {
  const rows = db.prepare('SELECT id, name, unit FROM inventory WHERE org_id = ? ORDER BY name LIMIT 1500').all(orgId);
  return rows.length ? rows.map(r => `${r.id} | ${r.name} | ${r.unit}`).join('\n') : '(empty - no items yet)';
}

async function readBill(orgId, mediaType, base64) {
  const c = getClient();
  const fileBlock = mediaType === 'application/pdf'
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } };

  const response = await c.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: SCHEMA } },
    system: INSTRUCTIONS + itemListText(orgId),
    messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: 'Extract every invoice in this file.' }] }]
  });

  if (response.stop_reason === 'refusal') throw httpError(422, 'The bill could not be read. Try a clearer photo or the original PDF.');
  if (response.stop_reason === 'max_tokens') throw httpError(422, 'The bill is too long to read in one go. Upload fewer pages at a time.');
  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
  let data;
  try { data = JSON.parse(text); } catch { throw httpError(502, 'The bill reader returned an unreadable answer. Please try again.'); }

  const usage = response.usage || {};
  const inTok = (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) + (usage.cache_creation_input_tokens || 0);
  const outTok = usage.output_tokens || 0;
  const usd = (inTok * USD_PER_M_IN + outTok * USD_PER_M_OUT) / 1e6;
  return { invoices: data.invoices || [], cost: { input_tokens: inTok, output_tokens: outTok, usd: Math.round(usd * 1e5) / 1e5, inr: round2(usd * INR_PER_USD) } };
}

function httpError(status, message) { const e = new Error(message); e.status = status; return e; }

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const validDate = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) ? s : null);

// Unit spellings that mean the same thing, so "L" and "litre" don't raise a warning.
const UNIT_ALIASES = {
  pcs: ['pc', 'pcs', 'piece', 'pieces', 'nos', 'no', 'unit', 'units', 'ea', 'each'],
  kg: ['kg', 'kgs', 'kilo', 'kilogram', 'kilograms'],
  g: ['g', 'gm', 'gms', 'gram', 'grams'],
  l: ['l', 'lt', 'ltr', 'ltrs', 'litre', 'litres', 'liter', 'liters'],
  ml: ['ml', 'mls', 'millilitre', 'milliliter'],
  pack: ['pack', 'packs', 'pkt', 'pkts', 'packet', 'packets'],
  dozen: ['dozen', 'dz', 'doz']
};
function normUnit(u) {
  const s = String(u || '').toLowerCase().replace(/[^a-z]/g, '');
  for (const [k, list] of Object.entries(UNIT_ALIASES)) if (list.includes(s)) return k;
  return s;
}

function findOrCreateSupplier(orgId, name, gstin) {
  if (gstin) {
    const byGst = db.prepare("SELECT id, name FROM suppliers WHERE org_id = ? AND gstin != '' AND upper(gstin) = upper(?)").get(orgId, gstin);
    if (byGst) return { id: byGst.id, name: byGst.name, created: false };
  }
  const byName = db.prepare('SELECT id, name FROM suppliers WHERE org_id = ? AND lower(name) = lower(?)').get(orgId, name);
  if (byName) {
    if (gstin) db.prepare("UPDATE suppliers SET gstin = ? WHERE id = ? AND (gstin IS NULL OR gstin = '')").run(gstin, byName.id);
    return { id: byName.id, name: byName.name, created: false };
  }
  const info = db.prepare('INSERT INTO suppliers (org_id, name, gstin) VALUES (?, ?, ?)').run(orgId, name, gstin || '');
  return { id: info.lastInsertRowid, name, created: true };
}

// Display names used by the Item Master unit dropdown.
const UNIT_DISPLAY = { pcs: 'pcs', kg: 'kg', g: 'g', l: 'litre', ml: 'ml', pack: 'packet', dozen: 'dozen' };
// How many `to` units are in one `from` unit (null when not convertible).
function unitFactor(from, to) {
  if (from === to) return 1;
  const t = { 'ml>l': 0.001, 'l>ml': 1000, 'g>kg': 0.001, 'kg>g': 1000 };
  return t[`${from}>${to}`] ?? null;
}
const COUNT_UNITS = new Set(['pcs', 'pack']);

function findItem(orgId, line) {
  if (line.matched_item_id > 0) {
    const m = db.prepare('SELECT id, name, unit, pack_size FROM inventory WHERE id = ? AND org_id = ?').get(line.matched_item_id, orgId);
    if (m) return m;
  }
  return db.prepare('SELECT id, name, unit, pack_size FROM inventory WHERE org_id = ? AND lower(name) = lower(?)').get(orgId, line.name) || null;
}

// Work out how the bill's quantity maps onto the item's stock unit, creating
// the item when it is new. Returns the item plus `factor`: stock units per
// one bill unit (e.g. 1 pack of milk = 0.5 litre -> factor 0.5).
function resolveItem(orgId, line) {
  const lineU = normUnit(line.unit);
  const printedSize = Number(line.pack_size) > 0 ? Number(line.pack_size) : 0;
  const printedU = normUnit(line.pack_unit);
  const existing = findItem(orgId, line);

  if (existing) {
    const itemU = normUnit(existing.unit);
    if (lineU === itemU) return { item: existing, created: false, factor: 1 };
    if (COUNT_UNITS.has(lineU) && existing.pack_size > 0) {
      return { item: existing, created: false, factor: existing.pack_size, how: `1 ${line.unit} = ${existing.pack_size} ${existing.unit} (item pack size)` };
    }
    if (COUNT_UNITS.has(lineU) && printedSize) {
      const f = unitFactor(printedU, itemU);
      if (f) return { item: existing, created: false, factor: printedSize * f, how: `${printedSize} ${line.pack_unit} per ${line.unit} (printed on bill)` };
    }
    const f = unitFactor(lineU, itemU);
    if (f) return { item: existing, created: false, factor: f, how: `${line.unit} → ${existing.unit}` };
    return { item: existing, created: false, factor: 1,
      warning: `Bill says ${line.qty} ${line.unit}; this item is counted in ${existing.unit}. Set its pack size in Item Master so future bills convert.` };
  }

  // New item: if the bill prints a measurable size, stock it in that measure.
  if (COUNT_UNITS.has(lineU) && printedSize && ['l', 'ml', 'kg', 'g'].includes(printedU)) {
    const unit = UNIT_DISPLAY[printedU];
    const info = db.prepare('INSERT INTO inventory (org_id, name, qty, unit, alert_level, pack_size) VALUES (?, ?, 0, ?, 5, ?)')
      .run(orgId, line.name, unit, printedSize);
    return { item: { id: info.lastInsertRowid, name: line.name, unit, pack_size: printedSize }, created: true, factor: printedSize,
      how: `${printedSize} ${unit} per ${line.unit} (printed on bill)` };
  }
  const unit = UNIT_DISPLAY[lineU] || clean(line.unit).slice(0, 12) || 'pcs';
  const info = db.prepare('INSERT INTO inventory (org_id, name, qty, unit, alert_level) VALUES (?, ?, 0, ?, 5)').run(orgId, line.name, unit);
  return { item: { id: info.lastInsertRowid, name: line.name, unit, pack_size: 0 }, created: true, factor: 1 };
}

// Turn the extracted invoices into Submitted purchase bills. Each invoice is
// its own transaction: one bad invoice never half-writes, and never blocks
// the others in the same file.
function importInvoices(orgId, invoices, fileName) {
  const results = [];
  const warehouseId = getDefaultWarehouseId(orgId);
  if (!warehouseId) throw httpError(400, 'Create a warehouse first (Stock → Warehouses).');

  for (const inv of invoices) {
    const supplierName = clean(inv.supplier_name).slice(0, 120);
    const invoiceNo = clean(inv.invoice_number).slice(0, 80);
    const gstin = clean(inv.supplier_gstin).toUpperCase().slice(0, 20);
    const lines = (inv.items || [])
      .map(l => ({ ...l, name: clean(l.name).slice(0, 120), qty: Number(l.qty), rate: round2(l.rate), tax: round2(l.tax) }))
      .filter(l => l.name && Number.isFinite(l.qty) && l.qty > 0 && l.qty < 100000 && l.rate >= 0 && l.tax >= 0 && (l.rate > 0 || l.tax > 0));

    const base = { invoice_number: invoiceNo, supplier: supplierName, grand_total: round2(inv.grand_total) };
    if (!supplierName) { results.push({ ...base, status: 'skipped', reason: 'No seller name found on the invoice' }); continue; }
    if (!lines.length) { results.push({ ...base, status: 'skipped', reason: 'No stock items found on the invoice' }); continue; }

    try {
      const outcome = db.transaction(() => {
        const supplier = findOrCreateSupplier(orgId, supplierName, gstin);
        if (invoiceNo) {
          const dup = db.prepare(
            "SELECT bill_number FROM purchase_bills WHERE org_id = ? AND supplier_id = ? AND supplier_invoice_no = ? AND status != 'Cancelled'"
          ).get(orgId, supplier.id, invoiceNo);
          if (dup) return { status: 'duplicate', reason: `Already imported as ${dup.bill_number}`, bill_number: dup.bill_number };
        }

        const billId = uuidv4();
        const billNumber = nextBillNumber(orgId);
        const rows = lines.map(l => {
          const r = resolveItem(orgId, l);
          const qty = Math.round(l.qty * r.factor * 10000) / 10000;
          const amount = round2(l.qty * l.rate);
          return { line: l, ...r, qty, rate: Math.round((amount / qty) * 10000) / 10000, amount };
        });
        const subtotal = round2(rows.reduce((s, r) => s + r.amount, 0));
        const tax = round2(rows.reduce((s, r) => s + r.line.tax, 0) + (Number(inv.round_off) || 0));
        const total = round2(subtotal + tax);
        const notes = `Auto-imported from ${clean(fileName).slice(0, 80) || 'uploaded bill'}${invoiceNo ? ` · Supplier invoice ${invoiceNo}` : ''}`;

        db.prepare(`
          INSERT INTO purchase_bills (id, org_id, bill_number, supplier_id, warehouse_id, bill_date, status, subtotal, tax, total, notes, supplier_invoice_no)
          VALUES (?, ?, ?, ?, ?, ?, 'Submitted', ?, ?, ?, ?, ?)
        `).run(billId, orgId, billNumber, supplier.id, warehouseId, validDate(clean(inv.invoice_date)) || new Date().toISOString().slice(0, 10),
          subtotal, tax, total, notes, invoiceNo);

        if (PAID_ON_UPLOAD) {
          db.prepare(`INSERT INTO payments (id, org_id, payment_number, against_type, against_id, supplier_id, amount, method, payment_date, notes)
                      VALUES (?, ?, ?, 'Purchase Bill', ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), orgId, nextPaymentNumber(orgId), billId, supplier.id, total, PAID_METHOD,
              validDate(clean(inv.invoice_date)) || new Date().toISOString().slice(0, 10), 'Paid at purchase (bill upload)');
          db.prepare("UPDATE purchase_bills SET paid_amount = total, status = 'Paid' WHERE id = ? AND org_id = ?").run(billId, orgId);
        }

        for (const r of rows) {
          db.prepare(`INSERT INTO purchase_bill_items (bill_id, org_id, item_id, item_name, qty, rate, amount) VALUES (?, ?, ?, ?, ?, ?, ?)`)
            .run(billId, orgId, r.item.id, r.item.name, r.qty, r.rate, r.amount);
          postMovement({
            orgId, itemId: r.item.id, warehouseId,
            qtyChange: r.qty, incomingRate: r.rate,
            voucherType: 'Purchase Bill', voucherId: billId,
            notes: `Purchase Bill ${billNumber}`
          });
        }

        const printed = round2(inv.grand_total);
        return {
          status: 'imported', bill_id: billId, bill_number: billNumber, total,
          supplier_created: supplier.created,
          check_total: printed > 0 && Math.abs(printed - total) > 1 ? `Bill says ₹${printed}, imported ₹${total} — please check` : null,
          paid: PAID_ON_UPLOAD,
          items: rows.map(r => ({
            name: r.item.name, bill_name: r.line.name, qty: r.qty, unit: r.item.unit, rate: r.rate,
            bill_qty: `${r.line.qty} ${r.line.unit}`, converted: r.how || null,
            new_item: r.created, unit_warning: r.warning || null
          }))
        };
      })();
      results.push({ ...base, ...outcome });
    } catch (err) {
      console.error('[bill-scan] import failed:', err);
      results.push({ ...base, status: 'failed', reason: 'Could not save this invoice' });
    }
  }
  return results;
}

// POST /api/bill-scan  { file_name, media_type, data (base64) }
router.post('/', requireRole(['Admin', 'Manager']), async (req, res) => {
  const orgId = req.user.org_id;
  const { file_name, media_type, data } = req.body || {};
  if (!getClient()) return res.status(503).json({ error: 'Bill scanning is not set up yet: the main admin must add the AI key in Settings.' });
  if (!MEDIA_TYPES.has(media_type)) return res.status(400).json({ error: 'Upload a PDF or a photo (JPG, PNG or WEBP).' });
  if (!data || typeof data !== 'string') return res.status(400).json({ error: 'No file received.' });

  try {
    const { invoices, cost } = await readBill(orgId, media_type, data);
    if (!invoices.length) return res.status(422).json({ error: 'No invoice was found in this file.', cost });
    const results = importInvoices(orgId, invoices, file_name);
    res.json({ results, cost, model: MODEL });
  } catch (err) {
    const status = err.status && err.status < 600 ? err.status : 500;
    if (status >= 500) console.error('[bill-scan] error:', err);
    let message = err.message || 'Bill scan failed';
    if (err.status === 401) message = 'The Anthropic API key on the server is invalid.';
    else if (err.status === 429) message = 'Too many bills at once — wait a minute and try again.';
    else if (err.status === 400 && /credit/i.test(err.message || '')) message = 'Your Anthropic account is out of credit. Add credit and try again.';
    res.status(status === 401 || status === 400 && message.includes('credit') ? 502 : status).json({ error: message });
  }
});

module.exports = router;
module.exports.importInvoices = importInvoices;
