const express = require('express');
const router = express.Router();
const db = require('../db');

// GET summary stats
router.get('/summary', (req, res) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const totalRevenue = db.prepare('SELECT COALESCE(SUM(total), 0) as value FROM orders').get();
  const todayRevenue = db.prepare(
    "SELECT COALESCE(SUM(total), 0) as value FROM orders WHERE date(created_at) = date(?)"
  ).get(todayStr);
  const totalOrders = db.prepare('SELECT COUNT(*) as value FROM orders').get();
  const todayOrders = db.prepare(
    "SELECT COUNT(*) as value FROM orders WHERE date(created_at) = date(?)"
  ).get(todayStr);

  const avgOrder = totalOrders.value > 0
    ? Math.round(totalRevenue.value / totalOrders.value)
    : 0;

  res.json({
    total_revenue: Math.round(totalRevenue.value * 100) / 100,
    today_revenue: Math.round(todayRevenue.value * 100) / 100,
    total_orders: totalOrders.value,
    today_orders: todayOrders.value,
    avg_order_value: avgOrder
  });
});

// GET daily breakdown
router.get('/daily', (req, res) => {
  const rows = db.prepare(`
    SELECT
      date(created_at) as date,
      COUNT(*) as orders,
      COALESCE(SUM(CASE WHEN payment_method = 'Cash' THEN total ELSE 0 END), 0) as cash,
      COALESCE(SUM(CASE WHEN payment_method = 'UPI' THEN total ELSE 0 END), 0) as upi,
      COALESCE(SUM(CASE WHEN payment_method = 'Card' THEN total ELSE 0 END), 0) as card,
      COALESCE(SUM(total), 0) as total
    FROM orders
    GROUP BY date(created_at)
    ORDER BY date(created_at) DESC
    LIMIT 90
  `).all();

  res.json(rows);
});

// GET top selling items
router.get('/top-items', (req, res) => {
  const rows = db.prepare(`
    SELECT
      item_name as name,
      SUM(quantity) as total_qty,
      SUM(item_price * quantity) as total_revenue
    FROM order_items
    GROUP BY menu_item_id
    ORDER BY total_qty DESC
    LIMIT 10
  `).all();

  res.json(rows);
});

// GET order counter
router.get('/counter', (req, res) => {
  const counter = db.prepare('SELECT last_number FROM order_counter WHERE id = 1').get();
  res.json({ last_number: counter?.last_number || 0 });
});

module.exports = router;
