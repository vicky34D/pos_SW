const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');

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
    db.prepare(
      'INSERT INTO inventory (org_id, name, qty, unit, alert_level) VALUES (?, ?, ?, ?, ?)'
    ).run(orgId, name, qty || 0, unit || 'pcs', alert_level || 5);

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

  db.prepare(
    'UPDATE inventory SET name = ?, qty = ?, unit = ?, alert_level = ? WHERE id = ? AND org_id = ?'
  ).run(
    name || existing.name,
    qty ?? existing.qty,
    unit || existing.unit,
    alert_level ?? existing.alert_level,
    req.params.id,
    orgId
  );

  const updated = db.prepare('SELECT * FROM inventory WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  res.json(updated);
});

// PUT bulk update inventory quantities
router.put('/', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const { updates } = req.body; // [{ id, qty }, ...]
  if (!updates || !Array.isArray(updates)) {
    return res.status(400).json({ error: 'updates array is required' });
  }

  const updateStmt = db.prepare('UPDATE inventory SET qty = ? WHERE id = ? AND org_id = ?');
  const bulkUpdate = db.transaction(() => {
    for (const item of updates) {
      updateStmt.run(item.qty, item.id, orgId);
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
