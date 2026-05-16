const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');

// GET all active tables
router.get('/', (req, res) => {
  const orgId = req.user.org_id;
  const tables = db.prepare(
    'SELECT * FROM active_tables WHERE org_id = ? ORDER BY table_number'
  ).all(orgId);

  // Parse items JSON
  const result = tables.map(t => ({
    ...t,
    items: JSON.parse(t.items || '[]')
  }));

  res.json(result);
});

// POST create or open a table
router.post('/', requireRole(['Admin', 'Manager', 'Employee']), (req, res) => {
  const orgId = req.user.org_id;
  const { table_number } = req.body;

  if (!table_number || table_number < 1) {
    return res.status(400).json({ error: 'Valid table_number is required' });
  }

  // Check if table already exists
  const existing = db.prepare(
    'SELECT * FROM active_tables WHERE org_id = ? AND table_number = ?'
  ).get(orgId, table_number);

  if (existing) {
    return res.json({ ...existing, items: JSON.parse(existing.items || '[]') });
  }

  db.prepare(
    'INSERT INTO active_tables (org_id, table_number, items) VALUES (?, ?, ?)'
  ).run(orgId, table_number, '[]');

  const table = db.prepare(
    'SELECT * FROM active_tables WHERE org_id = ? AND table_number = ?'
  ).get(orgId, table_number);

  res.status(201).json({ ...table, items: JSON.parse(table.items || '[]') });
});

// PUT update table (items, customer name, order type)
router.put('/:tableNumber', requireRole(['Admin', 'Manager', 'Employee']), (req, res) => {
  const orgId = req.user.org_id;
  const tableNumber = parseInt(req.params.tableNumber);
  const { items, customer_name, order_type } = req.body;

  const existing = db.prepare(
    'SELECT * FROM active_tables WHERE org_id = ? AND table_number = ?'
  ).get(orgId, tableNumber);

  if (!existing) {
    // Auto-create if doesn't exist
    db.prepare(
      'INSERT INTO active_tables (org_id, table_number, items, customer_name, order_type) VALUES (?, ?, ?, ?, ?)'
    ).run(orgId, tableNumber, JSON.stringify(items || []), customer_name || '', order_type || 'dine-in');
  } else {
    db.prepare(`
      UPDATE active_tables 
      SET items = ?, customer_name = ?, order_type = ?, updated_at = datetime('now')
      WHERE org_id = ? AND table_number = ?
    `).run(
      JSON.stringify(items || []),
      customer_name ?? existing.customer_name,
      order_type ?? existing.order_type,
      orgId,
      tableNumber
    );
  }

  const table = db.prepare(
    'SELECT * FROM active_tables WHERE org_id = ? AND table_number = ?'
  ).get(orgId, tableNumber);

  res.json({ ...table, items: JSON.parse(table.items || '[]') });
});

// DELETE close a table (after checkout)
router.delete('/:tableNumber', requireRole(['Admin', 'Manager', 'Employee']), (req, res) => {
  const orgId = req.user.org_id;
  const tableNumber = parseInt(req.params.tableNumber);

  db.prepare(
    'DELETE FROM active_tables WHERE org_id = ? AND table_number = ?'
  ).run(orgId, tableNumber);

  res.json({ success: true });
});

module.exports = router;
