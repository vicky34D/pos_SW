const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// GET all orders (with optional date filter)
router.get('/', (req, res) => {
  const orgId = req.user.org_id;
  const { date, from, to } = req.query;
  let sql = 'SELECT * FROM orders WHERE org_id = ?';
  const params = [orgId];

  if (date) {
    sql += " AND date(created_at) = date(?)";
    params.push(date);
  } else if (from && to) {
    sql += " AND date(created_at) BETWEEN date(?) AND date(?)";
    params.push(from, to);
  }

  sql += ' ORDER BY created_at DESC';
  const orders = db.prepare(sql).all(...params);

  // Attach items to each order
  const getItems = db.prepare('SELECT * FROM order_items WHERE order_id = ? AND org_id = ?');
  const result = orders.map(order => ({
    ...order,
    items: getItems.all(order.id, orgId)
  }));

  res.json(result);
});

// GET single order
router.get('/:id', (req, res) => {
  const orgId = req.user.org_id;
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  if (!order) return res.status(404).json({ error: 'Order not found' });

  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ? AND org_id = ?').all(order.id, orgId);
  res.json(order);
});

// POST create order (checkout)
router.post('/', requireRole(['Admin', 'Manager', 'Employee']), (req, res) => {
  const orgId = req.user.org_id;
  const { customer_name, order_type, payment_method, items, subtotal, tax, total } = req.body;

  if (!items || !items.length || !payment_method) {
    return res.status(400).json({ error: 'items and payment_method are required' });
  }

  // Get next order number for this org
  const counter = db.prepare('SELECT last_number FROM order_counter WHERE org_id = ?').get(orgId);
  const nextNumber = (counter?.last_number || 0) + 1;

  const orderId = `SW-${Date.now()}-${uuidv4().substring(0, 8)}`;

  const insertOrder = db.prepare(`
    INSERT INTO orders (id, org_id, order_number, customer_name, order_type, payment_method, subtotal, tax, total)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, org_id, menu_item_id, item_name, item_price, quantity)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const updateCounter = db.prepare('UPDATE order_counter SET last_number = ? WHERE org_id = ?');

  // Transaction for atomicity
  const createOrder = db.transaction(() => {
    insertOrder.run(orderId, orgId, nextNumber, customer_name || 'Walk-in', order_type || 'dine-in', payment_method, subtotal, tax, total);

    for (const item of items) {
      insertItem.run(orderId, orgId, item.id, item.name, item.price, item.qty);
    }

    updateCounter.run(nextNumber, orgId);
  });

  createOrder();

  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND org_id = ?').get(orderId, orgId);
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ? AND org_id = ?').all(orderId, orgId);

  res.status(201).json(order);
});

module.exports = router;
