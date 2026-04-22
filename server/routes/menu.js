const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all menu items
router.get('/', (req, res) => {
  const { category, search } = req.query;
  let sql = 'SELECT * FROM menu_items WHERE active = 1';
  const params = [];

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
  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// POST create menu item
router.post('/', (req, res) => {
  const { name, price, category, emoji, description } = req.body;
  if (!name || !price || !category) {
    return res.status(400).json({ error: 'name, price, and category are required' });
  }
  const id = 'custom_' + Date.now();
  db.prepare(
    'INSERT INTO menu_items (id, name, price, category, emoji, description) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, name, price, category, emoji || '🍽️', description || '');

  const item = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(id);
  res.status(201).json(item);
});

// PUT update menu item
router.put('/:id', (req, res) => {
  const { name, price, category, emoji, description } = req.body;
  const existing = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  db.prepare(
    'UPDATE menu_items SET name = ?, price = ?, category = ?, emoji = ?, description = ? WHERE id = ?'
  ).run(
    name || existing.name,
    price ?? existing.price,
    category || existing.category,
    emoji || existing.emoji,
    description ?? existing.description,
    req.params.id
  );

  const updated = db.prepare('SELECT * FROM menu_items WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE menu item (soft delete)
router.delete('/:id', (req, res) => {
  const result = db.prepare('UPDATE menu_items SET active = 0 WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Item not found' });
  res.json({ success: true });
});

module.exports = router;
