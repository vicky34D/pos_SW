// ===================================================================
// Purchase Bills — Supplier Invoices
// Submitting a bill posts stock into the ledger (moving-avg valuation).
// ===================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');
const { postMovement, getDefaultWarehouseId } = require('../stockLedger');
const { v4: uuidv4 } = require('uuid');

// Round money to 2 decimals (paise). Keeps stored REALs exact so totals and
// balances never drift (the cause of bills stuck on "Partially Paid").
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Next sequence number = max existing suffix + 1. Ordering by created_at was
// only second-precise, so two bills in the same second produced duplicates.
function nextBillNumber(orgId) {
  const rows = db.prepare(
    "SELECT bill_number FROM purchase_bills WHERE org_id = ? AND bill_number LIKE 'PB-%'"
  ).all(orgId);
  let max = 0;
  for (const r of rows) {
    const n = parseInt(r.bill_number.split('-')[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `PB-${String(max + 1).padStart(5, '0')}`;
}

// GET all purchase bills (with summary)
router.get('/', (req, res) => {
  const orgId = req.user.org_id;
  const { status, supplier_id, from, to } = req.query;
  let sql = `SELECT pb.*, s.name AS supplier_name
             FROM purchase_bills pb
             LEFT JOIN suppliers s ON pb.supplier_id = s.id
             WHERE pb.org_id = ?`;
  const params = [orgId];
  if (status) { sql += ' AND pb.status = ?'; params.push(status); }
  if (supplier_id) { sql += ' AND pb.supplier_id = ?'; params.push(supplier_id); }
  if (from && to) { sql += ' AND date(pb.bill_date) BETWEEN date(?) AND date(?)'; params.push(from, to); }
  sql += ' ORDER BY pb.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// GET single bill with items + payments
router.get('/:id', (req, res) => {
  const orgId = req.user.org_id;
  const bill = db.prepare(`
    SELECT pb.*, s.name AS supplier_name, w.name AS warehouse_name
    FROM purchase_bills pb
    LEFT JOIN suppliers s ON pb.supplier_id = s.id
    LEFT JOIN warehouses w ON pb.warehouse_id = w.id
    WHERE pb.id = ? AND pb.org_id = ?
  `).get(req.params.id, orgId);
  if (!bill) return res.status(404).json({ error: 'Purchase bill not found' });
  bill.items = db.prepare(`
    SELECT pbi.*, i.unit FROM purchase_bill_items pbi
    LEFT JOIN inventory i ON pbi.item_id = i.id
    WHERE pbi.bill_id = ? AND pbi.org_id = ?
  `).all(req.params.id, orgId);
  bill.payments = db.prepare(
    'SELECT * FROM payments WHERE against_id = ? AND org_id = ? ORDER BY created_at DESC'
  ).all(req.params.id, orgId);
  res.json(bill);
});

// POST create draft bill
router.post('/', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const { supplier_id, warehouse_id, bill_date, due_date, items, notes } = req.body;
  if (!supplier_id) return res.status(400).json({ error: 'supplier_id is required' });
  if (!items || !items.length) return res.status(400).json({ error: 'items array is required' });

  const billId = uuidv4();
  const billNumber = nextBillNumber(orgId);
  const whId = warehouse_id || getDefaultWarehouseId(orgId);

  let subtotal = 0;
  for (const it of items) { subtotal += round2((Number(it.qty) || 0) * (Number(it.rate) || 0)); }
  subtotal = round2(subtotal);
  const tax = round2(req.body.tax);
  const total = round2(subtotal + tax);

  const insertBill = db.transaction(() => {
    db.prepare(`
      INSERT INTO purchase_bills (id, org_id, bill_number, supplier_id, warehouse_id, bill_date, due_date, status, subtotal, tax, total, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'Draft', ?, ?, ?, ?)
    `).run(billId, orgId, billNumber, supplier_id, whId, bill_date || null, due_date || null, subtotal, tax, total, notes || '');

    for (const it of items) {
      if (!it.item_id) continue;
      const item = db.prepare('SELECT name FROM inventory WHERE id = ? AND org_id = ?').get(it.item_id, orgId);
      if (!item) continue;
      const amount = round2((Number(it.qty) || 0) * (Number(it.rate) || 0));
      db.prepare(`INSERT INTO purchase_bill_items (bill_id, org_id, item_id, item_name, qty, rate, amount)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(billId, orgId, it.item_id, item.name, it.qty, it.rate, amount);
    }
  });

  insertBill();
  const bill = db.prepare('SELECT * FROM purchase_bills WHERE id = ?').get(billId);
  bill.items = db.prepare('SELECT * FROM purchase_bill_items WHERE bill_id = ?').all(billId);
  res.status(201).json(bill);
});

// POST submit bill — posts stock into ledger
router.post('/:id/submit', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const bill = db.prepare('SELECT * FROM purchase_bills WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  if (!bill) return res.status(404).json({ error: 'Purchase bill not found' });
  if (bill.status !== 'Draft') return res.status(400).json({ error: 'Only Draft bills can be submitted' });

  const items = db.prepare('SELECT * FROM purchase_bill_items WHERE bill_id = ? AND org_id = ?').all(req.params.id, orgId);

  const submitBill = db.transaction(() => {
    for (const it of items) {
      postMovement({
        orgId, itemId: it.item_id, warehouseId: bill.warehouse_id,
        qtyChange: it.qty, incomingRate: it.rate,
        voucherType: 'Purchase Bill', voucherId: bill.id,
        notes: `Purchase Bill ${bill.bill_number}`
      });
    }
    db.prepare("UPDATE purchase_bills SET status = 'Submitted' WHERE id = ? AND org_id = ?").run(req.params.id, orgId);
  });

  submitBill();
  const updated = db.prepare('SELECT * FROM purchase_bills WHERE id = ?').get(req.params.id);
  updated.items = items;
  res.json(updated);
});

// POST cancel bill — reverses all stock movements
router.post('/:id/cancel', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const bill = db.prepare('SELECT * FROM purchase_bills WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  if (!bill) return res.status(404).json({ error: 'Purchase bill not found' });
  if (bill.status === 'Cancelled') return res.status(400).json({ error: 'Bill already cancelled' });
  if (bill.status === 'Draft') {
    db.prepare("UPDATE purchase_bills SET status = 'Cancelled' WHERE id = ? AND org_id = ?").run(req.params.id, orgId);
    return res.json({ success: true });
  }

  const items = db.prepare('SELECT * FROM purchase_bill_items WHERE bill_id = ? AND org_id = ?').all(req.params.id, orgId);
  const cancelBill = db.transaction(() => {
    for (const it of items) {
      postMovement({
        orgId, itemId: it.item_id, warehouseId: bill.warehouse_id,
        qtyChange: -it.qty,
        voucherType: 'Purchase Bill', voucherId: bill.id,
        notes: `Cancellation of ${bill.bill_number}`
      });
    }
    db.prepare("UPDATE purchase_bills SET status = 'Cancelled' WHERE id = ? AND org_id = ?").run(req.params.id, orgId);
  });
  cancelBill();
  res.json({ success: true });
});

// PUT update draft bill
router.put('/:id', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const bill = db.prepare('SELECT * FROM purchase_bills WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  if (!bill) return res.status(404).json({ error: 'Purchase bill not found' });
  if (bill.status !== 'Draft') return res.status(400).json({ error: 'Only Draft bills can be edited' });

  const { supplier_id, warehouse_id, bill_date, due_date, items, notes, tax } = req.body;

  const updateBill = db.transaction(() => {
    let subtotal = 0;
    if (items) {
      db.prepare('DELETE FROM purchase_bill_items WHERE bill_id = ? AND org_id = ?').run(req.params.id, orgId);
      for (const it of items) {
        const item = db.prepare('SELECT name FROM inventory WHERE id = ? AND org_id = ?').get(it.item_id, orgId);
        if (!item) continue;
        const amount = round2((Number(it.qty) || 0) * (Number(it.rate) || 0));
        subtotal += amount;
        db.prepare(`INSERT INTO purchase_bill_items (bill_id, org_id, item_id, item_name, qty, rate, amount)
                    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(req.params.id, orgId, it.item_id, item.name, it.qty, it.rate, amount);
      }
    } else {
      const row = db.prepare('SELECT COALESCE(SUM(amount),0) AS s FROM purchase_bill_items WHERE bill_id = ?').get(req.params.id);
      subtotal = row.s;
    }
    subtotal = round2(subtotal);
    const taxVal = tax !== undefined ? round2(tax) : round2(bill.tax);
    db.prepare(`UPDATE purchase_bills SET supplier_id=?, warehouse_id=?, bill_date=?, due_date=?, subtotal=?, tax=?, total=?, notes=?
                WHERE id=? AND org_id=?`).run(
      supplier_id ?? bill.supplier_id, warehouse_id ?? bill.warehouse_id,
      bill_date ?? bill.bill_date, due_date ?? bill.due_date,
      subtotal, taxVal, round2(subtotal + taxVal), notes ?? bill.notes,
      req.params.id, orgId
    );
  });
  updateBill();
  const updated = db.prepare('SELECT * FROM purchase_bills WHERE id = ?').get(req.params.id);
  updated.items = db.prepare('SELECT * FROM purchase_bill_items WHERE bill_id = ?').all(req.params.id);
  res.json(updated);
});

module.exports = router;
