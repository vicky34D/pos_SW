const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');

// GET all warehouses
router.get('/', (req, res) => {
  const orgId = req.user.org_id;
  const rows = db.prepare('SELECT * FROM warehouses WHERE org_id = ? ORDER BY is_default DESC, name ASC').all(orgId);
  res.json(rows);
});

// POST create warehouse
router.post('/', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const { name, is_default } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    if (is_default) {
      db.prepare('UPDATE warehouses SET is_default = 0 WHERE org_id = ?').run(orgId);
    }
    const info = db.prepare('INSERT INTO warehouses (org_id, name, is_default) VALUES (?, ?, ?)').run(orgId, name, is_default ? 1 : 0);
    res.status(201).json(db.prepare('SELECT * FROM warehouses WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Warehouse already exists' });
    throw err;
  }
});

// PUT update warehouse
router.put('/:id', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const { name, is_default } = req.body;
  const existing = db.prepare('SELECT * FROM warehouses WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  if (!existing) return res.status(404).json({ error: 'Warehouse not found' });
  if (is_default) db.prepare('UPDATE warehouses SET is_default = 0 WHERE org_id = ?').run(orgId);
  db.prepare('UPDATE warehouses SET name = ?, is_default = ? WHERE id = ? AND org_id = ?').run(
    name || existing.name, is_default ? 1 : existing.is_default, req.params.id, orgId
  );
  res.json(db.prepare('SELECT * FROM warehouses WHERE id = ?').get(req.params.id));
});

// DELETE warehouse (only if no bins/SLEs point to it)
router.delete('/:id', requireRole(['Admin']), (req, res) => {
  const orgId = req.user.org_id;
  const inUse = db.prepare('SELECT COUNT(*) AS cnt FROM bins WHERE warehouse_id = ? AND org_id = ?').get(req.params.id, orgId);
  if (inUse.cnt > 0) return res.status(409).json({ error: 'Warehouse has stock — cannot delete' });
  db.prepare('DELETE FROM warehouses WHERE id = ? AND org_id = ?').run(req.params.id, orgId);
  res.json({ success: true });
});

module.exports = router;
