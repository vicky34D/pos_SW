const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { v4: uuidv4 } = require('uuid');

// GET all parked (held) orders for this org, newest first.
router.get('/', (req, res) => {
  const orgId = req.user.org_id;
  const rows = db.prepare(
    'SELECT * FROM parked_orders WHERE org_id = ? ORDER BY created_at DESC'
  ).all(orgId);
  res.json(rows.map(r => ({
    ...r,
    items: safeParse(r.items, []),
    discount: safeParse(r.discount, null),
  })));
});

// POST park an in-progress order.
router.post('/', (req, res) => {
  const orgId = req.user.org_id;
  const { label, customer_name, order_type, items, discount } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'items are required to park an order' });
  }

  const id = `PARK-${Date.now()}-${uuidv4().substring(0, 6)}`;
  db.prepare(`
    INSERT INTO parked_orders (id, org_id, label, customer_name, order_type, items, discount)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, orgId,
    label || '',
    customer_name || '',
    order_type || 'takeaway',
    JSON.stringify(items),
    discount ? JSON.stringify(discount) : ''
  );

  const row = db.prepare('SELECT * FROM parked_orders WHERE id = ? AND org_id = ?').get(id, orgId);
  res.status(201).json({
    ...row,
    items: safeParse(row.items, []),
    discount: safeParse(row.discount, null),
  });
});

// DELETE a parked order (used both to discard and to recall-then-remove).
router.delete('/:id', (req, res) => {
  const orgId = req.user.org_id;
  const row = db.prepare('SELECT * FROM parked_orders WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  if (!row) return res.status(404).json({ error: 'Parked order not found' });
  db.prepare('DELETE FROM parked_orders WHERE id = ? AND org_id = ?').run(req.params.id, orgId);
  res.json({ deleted: req.params.id });
});

function safeParse(str, fallback) {
  if (!str) return fallback;
  try { return JSON.parse(str); } catch { return fallback; }
}

module.exports = router;
