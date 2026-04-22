const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all inventory items
router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM inventory ORDER BY name').all();
  res.json(items);
});

// POST add new inventory item
router.post('/', (req, res) => {
  const { name, qty, unit, alert_level } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  try {
    db.prepare(
      'INSERT INTO inventory (name, qty, unit, alert_level) VALUES (?, ?, ?, ?)'
    ).run(name, qty || 0, unit || 'pcs', alert_level || 5);

    const item = db.prepare('SELECT * FROM inventory WHERE name = ?').get(name);
    res.status(201).json(item);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Item already exists' });
    }
    throw err;
  }
});

// PUT update inventory item
router.put('/:id', (req, res) => {
  const { qty, name, unit, alert_level } = req.body;
  const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  db.prepare(
    'UPDATE inventory SET name = ?, qty = ?, unit = ?, alert_level = ? WHERE id = ?'
  ).run(
    name || existing.name,
    qty ?? existing.qty,
    unit || existing.unit,
    alert_level ?? existing.alert_level,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM inventory WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// PUT bulk update inventory quantities
router.put('/', (req, res) => {
  const { updates } = req.body; // [{ id, qty }, ...]
  if (!updates || !Array.isArray(updates)) {
    return res.status(400).json({ error: 'updates array is required' });
  }

  const updateStmt = db.prepare('UPDATE inventory SET qty = ? WHERE id = ?');
  const bulkUpdate = db.transaction(() => {
    for (const item of updates) {
      updateStmt.run(item.qty, item.id);
    }
  });

  bulkUpdate();
  const items = db.prepare('SELECT * FROM inventory ORDER BY name').all();
  res.json(items);
});

// DELETE inventory item
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM inventory WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true });
});

module.exports = router;
