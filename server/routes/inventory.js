const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');
const { postMovement, refreshItemCache } = require('../stockLedger');

// inventory.qty is a cache derived from the stock ledger — refreshItemCache()
// recomputes it from bins after every movement, so a raw UPDATE here would be
// silently overwritten by the next sale/purchase. Setting an absolute qty must
// therefore post the delta through the ledger instead.
function setQtyViaLedger(orgId, itemId, targetQty) {
  const target = Number(targetQty);
  if (!Number.isFinite(target)) return;

  const ledger = db.prepare(
    'SELECT COUNT(*) AS bins, COALESCE(SUM(qty), 0) AS qty FROM bins WHERE org_id = ? AND item_id = ?'
  ).get(orgId, itemId);

  // Same 4dp rounding as the ledger engine, so tiny float drift isn't posted.
  const delta = Math.round((target - ledger.qty + Number.EPSILON) * 10000) / 10000;
  if (delta === 0) {
    // Ledger already matches the requested qty; just sync the cache so a
    // stale displayed value (e.g. from an old raw edit) honours the edit.
    refreshItemCache(orgId, itemId);
    return;
  }

  postMovement({
    orgId,
    itemId,
    qtyChange: delta,
    voucherType: ledger.bins === 0 && delta > 0 ? 'Opening Stock' : 'Stock Adjustment',
    notes: 'Manual edit via Inventory screen'
  });
}

// GET all inventory items
router.get('/', (req, res) => {
  const orgId = req.user.org_id;
  const items = db.prepare('SELECT * FROM inventory WHERE org_id = ? ORDER BY name').all(orgId);
  res.json(items);
});

// POST add new inventory item
router.post('/', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const { name, qty, unit, alert_level } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    const create = db.transaction(() => {
      db.prepare(
        'INSERT INTO inventory (org_id, name, qty, unit, alert_level) VALUES (?, ?, ?, ?, ?)'
      ).run(orgId, name, 0, unit || 'pcs', alert_level || 5);

      const row = db.prepare('SELECT id FROM inventory WHERE org_id = ? AND name = ?').get(orgId, name);
      if (qty) setQtyViaLedger(orgId, row.id, qty); // posts Opening Stock so the first sale deducts from it
    });
    create();

    const item = db.prepare('SELECT * FROM inventory WHERE org_id = ? AND name = ?').get(orgId, name);
    res.status(201).json(item);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Item already exists' });
    }
    throw err;
  }
});

// PUT update inventory item
router.put('/:id', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const { qty, name, unit, alert_level } = req.body;
  const existing = db.prepare('SELECT * FROM inventory WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  const update = db.transaction(() => {
    db.prepare(
      'UPDATE inventory SET name = ?, unit = ?, alert_level = ? WHERE id = ? AND org_id = ?'
    ).run(
      name || existing.name,
      unit || existing.unit,
      alert_level ?? existing.alert_level,
      existing.id,
      orgId
    );

    if (qty !== undefined && qty !== null) {
      setQtyViaLedger(orgId, existing.id, qty);
    }
  });
  update();

  const updated = db.prepare('SELECT * FROM inventory WHERE id = ? AND org_id = ?').get(existing.id, orgId);
  res.json(updated);
});

// PUT bulk update inventory quantities
router.put('/', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const { updates } = req.body; // [{ id, qty }, ...]
  if (!updates || !Array.isArray(updates)) {
    return res.status(400).json({ error: 'updates array is required' });
  }

  const getItem = db.prepare('SELECT id FROM inventory WHERE id = ? AND org_id = ?');
  const bulkUpdate = db.transaction(() => {
    for (const item of updates) {
      const existing = getItem.get(item.id, orgId);
      if (!existing || item.qty === undefined || item.qty === null) continue;
      setQtyViaLedger(orgId, existing.id, item.qty);
    }
  });

  bulkUpdate();
  const items = db.prepare('SELECT * FROM inventory WHERE org_id = ? ORDER BY name').all(orgId);
  res.json(items);
});

// DELETE inventory item
router.delete('/:id', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const result = db.prepare('DELETE FROM inventory WHERE id = ? AND org_id = ?').run(req.params.id, orgId);
  if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true });
});

module.exports = router;
