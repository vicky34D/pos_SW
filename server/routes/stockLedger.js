// ===================================================================
// Stock Ledger + Bin + Adjustment API
// ===================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');
const { postMovement, getDefaultWarehouseId, totalStockValue } = require('../stockLedger');

// GET stock ledger entries (filterable)
router.get('/entries', (req, res) => {
  const orgId = req.user.org_id;
  const { item_id, warehouse_id, voucher_type, from, to, limit = 100 } = req.query;
  let sql = `SELECT sle.*, i.name AS item_name, i.unit, w.name AS warehouse_name
             FROM stock_ledger_entries sle
             LEFT JOIN inventory i ON sle.item_id = i.id
             LEFT JOIN warehouses w ON sle.warehouse_id = w.id
             WHERE sle.org_id = ?`;
  const params = [orgId];
  if (item_id) { sql += ' AND sle.item_id = ?'; params.push(item_id); }
  if (warehouse_id) { sql += ' AND sle.warehouse_id = ?'; params.push(warehouse_id); }
  if (voucher_type) { sql += ' AND sle.voucher_type = ?'; params.push(voucher_type); }
  if (from && to) { sql += ' AND date(sle.posting_datetime) BETWEEN date(?) AND date(?)'; params.push(from, to); }
  sql += ` ORDER BY sle.posting_datetime DESC, sle.id DESC LIMIT ?`;
  params.push(Number(limit) > 500 ? 500 : Number(limit));
  res.json(db.prepare(sql).all(...params));
});

// GET stock balance (bins) — current position per item per warehouse
router.get('/balance', (req, res) => {
  const orgId = req.user.org_id;
  const { warehouse_id, item_id } = req.query;
  let sql = `SELECT b.*, i.name AS item_name, i.unit, i.alert_level, i.reorder_qty, i.item_code, i.item_group,
             w.name AS warehouse_name
             FROM bins b
             LEFT JOIN inventory i ON b.item_id = i.id
             LEFT JOIN warehouses w ON b.warehouse_id = w.id
             WHERE b.org_id = ?`;
  const params = [orgId];
  if (warehouse_id) { sql += ' AND b.warehouse_id = ?'; params.push(warehouse_id); }
  if (item_id) { sql += ' AND b.item_id = ?'; params.push(item_id); }
  sql += ' ORDER BY i.name ASC';
  res.json(db.prepare(sql).all(...params));
});

// GET stock valuation summary
router.get('/valuation', (req, res) => {
  const orgId = req.user.org_id;
  const rows = db.prepare(`
    SELECT b.item_id, i.name AS item_name, i.unit, i.item_code, i.item_group,
           COALESCE(SUM(b.qty),0) AS qty, COALESCE(AVG(b.valuation_rate),0) AS valuation_rate,
           COALESCE(SUM(b.stock_value),0) AS stock_value
    FROM bins b LEFT JOIN inventory i ON b.item_id = i.id
    WHERE b.org_id = ? GROUP BY b.item_id ORDER BY stock_value DESC
  `).all(orgId);
  const total = totalStockValue(orgId);
  res.json({ items: rows, total_stock_value: total });
});

// GET items below reorder level
router.get('/reorder', (req, res) => {
  const orgId = req.user.org_id;
  const rows = db.prepare(`
    SELECT i.id, i.name, i.unit, i.item_code, i.item_group, i.qty, i.alert_level, i.reorder_qty,
           i.valuation_rate,
           COALESCE(
             (SELECT s.name FROM purchase_bill_items pbi
              JOIN purchase_bills pb ON pbi.bill_id = pb.id
              JOIN suppliers s ON pb.supplier_id = s.id
              WHERE pbi.item_id = i.id AND pb.org_id = ? ORDER BY pb.bill_date DESC LIMIT 1),
             ''
           ) AS last_supplier
    FROM inventory i WHERE i.org_id = ? AND i.is_stock_item = 1 AND i.qty <= i.alert_level
    ORDER BY (i.qty - i.alert_level) ASC
  `).all(orgId, orgId);
  res.json(rows);
});

// POST stock adjustment (opening stock, write-off, manual correction)
router.post('/adjustment', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const { items, warehouse_id, notes, voucher_type = 'Stock Adjustment' } = req.body;
  if (!items || !items.length) return res.status(400).json({ error: 'items array required' });

  const whId = warehouse_id || getDefaultWarehouseId(orgId);
  const results = [];

  const adjust = db.transaction(() => {
    for (const it of items) {
      if (!it.item_id || it.qty_change === undefined) continue;
      const entry = postMovement({
        orgId, itemId: it.item_id, warehouseId: whId,
        qtyChange: Number(it.qty_change),
        incomingRate: Number(it.incoming_rate) || undefined,
        voucherType: voucher_type,
        notes: notes || it.notes || ''
      });
      results.push(entry);
    }
  });
  adjust();
  res.status(201).json(results);
});

module.exports = router;
