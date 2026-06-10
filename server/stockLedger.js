// ===================================================================
// STREETWOK POS — Stock Ledger Engine
// ERPNext-style stock accounting with moving-average valuation.
//
// Every stock change goes through postMovement(): it appends an immutable
// stock_ledger_entry, then updates the cached bin (per item+warehouse balance
// and valuation) and the inventory.qty / valuation_rate cache (totals across
// all warehouses). Reads stay fast; the ledger stays the source of truth.
// ===================================================================

const { db } = require('./db');

// Round currency-ish values to 4 dp to avoid float drift in valuation.
const r4 = (n) => Math.round((n + Number.EPSILON) * 10000) / 10000;

function getDefaultWarehouseId(orgId) {
  const wh = db.prepare(
    'SELECT id FROM warehouses WHERE org_id = ? ORDER BY is_default DESC, id ASC LIMIT 1'
  ).get(orgId);
  return wh ? wh.id : null;
}

function getBin(orgId, itemId, warehouseId) {
  return db.prepare(
    'SELECT * FROM bins WHERE org_id = ? AND item_id = ? AND warehouse_id = ?'
  ).get(orgId, itemId, warehouseId);
}

// Recompute inventory.qty (sum of bins) and valuation_rate (value-weighted)
// caches for an item across all warehouses.
function refreshItemCache(orgId, itemId) {
  const agg = db.prepare(
    'SELECT COALESCE(SUM(qty),0) AS qty, COALESCE(SUM(stock_value),0) AS value FROM bins WHERE org_id = ? AND item_id = ?'
  ).get(orgId, itemId);
  const qty = r4(agg.qty);
  const value = r4(agg.value);
  const rate = qty > 0 ? r4(value / qty) : 0;
  db.prepare('UPDATE inventory SET qty = ?, valuation_rate = ? WHERE id = ? AND org_id = ?')
    .run(qty, rate, itemId, orgId);
  return { qty, value, rate };
}

/**
 * Post one stock movement. Caller is responsible for wrapping multiple calls
 * in a db.transaction() if atomicity across items is needed.
 *
 * @param {object} m
 * @param {string} m.orgId
 * @param {number} m.itemId        inventory.id
 * @param {number} [m.warehouseId] defaults to org default warehouse
 * @param {number} m.qtyChange     +incoming / -outgoing
 * @param {number} [m.incomingRate] unit cost for incoming stock (ignored for outgoing)
 * @param {string} m.voucherType   'Purchase Bill' | 'Sales Order' | 'Stock Adjustment' | 'Opening Stock'
 * @param {string} [m.voucherId]
 * @param {string} [m.notes]
 * @returns {object} the created stock_ledger_entry row
 */
function postMovement(m) {
  const orgId = m.orgId;
  const itemId = m.itemId;
  const warehouseId = m.warehouseId || getDefaultWarehouseId(orgId);
  if (!warehouseId) throw new Error('No warehouse available for stock posting');

  const qtyChange = r4(Number(m.qtyChange) || 0);
  if (qtyChange === 0) throw new Error('qtyChange must be non-zero');

  const bin = getBin(orgId, itemId, warehouseId);
  const prevQty = bin ? bin.qty : 0;
  const prevValue = bin ? bin.stock_value : 0;
  const prevRate = bin ? bin.valuation_rate : 0;

  let newQty = r4(prevQty + qtyChange);
  let newValue;
  let newRate;
  let incomingRate = 0;

  if (qtyChange > 0) {
    // Incoming: moving-average. New rate blends old value with incoming value.
    incomingRate = r4(Number(m.incomingRate) || prevRate || 0);
    newValue = r4(prevValue + qtyChange * incomingRate);
    newRate = newQty > 0 ? r4(newValue / newQty) : incomingRate;
  } else {
    // Outgoing: valued at current moving-average rate; rate unchanged.
    newRate = prevRate;
    newValue = r4(newQty * newRate);
    if (newQty <= 0) { newQty = r4(newQty); newValue = newQty <= 0 ? 0 : newValue; }
  }

  // Append immutable ledger entry.
  const info = db.prepare(`
    INSERT INTO stock_ledger_entries
      (org_id, item_id, warehouse_id, voucher_type, voucher_id, qty_change,
       incoming_rate, valuation_rate, balance_qty, balance_value, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    orgId, itemId, warehouseId, m.voucherType, m.voucherId || null, qtyChange,
    incomingRate, newRate, newQty, newValue, m.notes || ''
  );

  // Upsert the bin cache.
  db.prepare(`
    INSERT INTO bins (org_id, item_id, warehouse_id, qty, valuation_rate, stock_value)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(org_id, item_id, warehouse_id)
    DO UPDATE SET qty = excluded.qty, valuation_rate = excluded.valuation_rate, stock_value = excluded.stock_value
  `).run(orgId, itemId, warehouseId, newQty, newRate, newValue);

  refreshItemCache(orgId, itemId);

  return db.prepare('SELECT * FROM stock_ledger_entries WHERE id = ?').get(info.lastInsertRowid);
}

// Current stock value of the whole org (sum of all bins).
function totalStockValue(orgId) {
  const row = db.prepare('SELECT COALESCE(SUM(stock_value),0) AS v FROM bins WHERE org_id = ?').get(orgId);
  return r4(row.v);
}

module.exports = { postMovement, getDefaultWarehouseId, getBin, refreshItemCache, totalStockValue };
