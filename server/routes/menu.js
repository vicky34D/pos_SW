const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');

// GET all menu items
router.get('/', (req, res) => {
  const orgId = req.user.org_id;
  const { category, search } = req.query;
  let sql = 'SELECT * FROM menu_items WHERE active = 1 AND org_id = ?';
  const params = [orgId];

  if (category && category !== 'all') {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    sql += ' AND name LIKE ?';
    params.push(`%${search}%`);
  }
  sql += ' ORDER BY category, name';

  const items = db.prepare(sql).all(...params);
  res.json(items);
});

// GET single menu item
router.get('/:id', (req, res) => {
  const orgId = req.user.org_id;
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// POST create menu item
router.post('/', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const { name, price, category, emoji, description } = req.body;
  if (!name || !price || !category) {
    return res.status(400).json({ error: 'name, price, and category are required' });
  }
  const id = 'custom_' + Date.now();
  db.prepare(
    'INSERT INTO menu_items (id, org_id, name, price, category, emoji, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, orgId, name, price, category, emoji || '🍽️', description || '');

  const item = db.prepare('SELECT * FROM menu_items WHERE id = ? AND org_id = ?').get(id, orgId);
  res.status(201).json(item);
});

// PUT update menu item
router.put('/:id', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const { name, price, category, emoji, description } = req.body;
  const existing = db.prepare('SELECT * FROM menu_items WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  db.prepare(
    'UPDATE menu_items SET name = ?, price = ?, category = ?, emoji = ?, description = ? WHERE id = ? AND org_id = ?'
  ).run(
    name || existing.name,
    price ?? existing.price,
    category || existing.category,
    emoji || existing.emoji,
    description ?? existing.description,
    req.params.id,
    orgId
  );

  const updated = db.prepare('SELECT * FROM menu_items WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  res.json(updated);
});

// DELETE menu item (soft delete)
router.delete('/:id', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const result = db.prepare('UPDATE menu_items SET active = 0 WHERE id = ? AND org_id = ?').run(req.params.id, orgId);
  if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true });
});

module.exports = router;
