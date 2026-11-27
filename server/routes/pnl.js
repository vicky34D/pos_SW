// ===================================================================
// Profit & Loss by month (read-only: this route never changes data).
//   Sales     = all POS orders (orders.total), by the order's Indian date.
//   Purchases = purchase bills except Draft and Cancelled, by bill date.
//   Expenses  = expense bills except Cancelled, by expense date.
//   Net P&L   = Sales - Purchases - Expenses.
// Also: all-time revenue, this month vs last month, and an estimate for
// this month (current daily pace) and next month (average of the last
// 3 complete months).
// ===================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../db');

const IST = '+330 minutes'; // orders.created_at is stored in UTC
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

function istToday() {
  return new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
}
function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}
const daysInMonth = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };

function monthlyRows(orgId) {
  const months = {};
  const row = (ym) => (months[ym] ||= { month: ym, sales: 0, orders: 0, purchases: 0, purchase_bills: 0, expenses: 0, expense_bills: 0 });

  db.prepare(`
    SELECT strftime('%Y-%m', created_at, '${IST}') AS ym, SUM(total) AS v, COUNT(*) AS c
    FROM orders WHERE org_id = ? GROUP BY ym
  `).all(orgId).forEach(r => { if (r.ym) { const m = row(r.ym); m.sales = r2(r.v); m.orders = r.c; } });

  db.prepare(`
    SELECT substr(bill_date, 1, 7) AS ym, SUM(total) AS v, COUNT(*) AS c
    FROM purchase_bills WHERE org_id = ? AND status NOT IN ('Draft', 'Cancelled') GROUP BY ym
  `).all(orgId).forEach(r => { if (r.ym) { const m = row(r.ym); m.purchases = r2(r.v); m.purchase_bills = r.c; } });

  db.prepare(`
    SELECT substr(COALESCE(NULLIF(expense_date, ''), created_at), 1, 7) AS ym, SUM(total) AS v, COUNT(*) AS c
    FROM expense_bills WHERE org_id = ? AND status != 'Cancelled' GROUP BY ym
  `).all(orgId).forEach(r => { if (r.ym) { const m = row(r.ym); m.expenses = r2(r.v); m.expense_bills = r.c; } });

  return months;
}

const withNet = (m) => ({ ...m, net: r2(m.sales - m.purchases - m.expenses) });
const empty = (ym) => withNet({ month: ym, sales: 0, orders: 0, purchases: 0, purchase_bills: 0, expenses: 0, expense_bills: 0 });

router.get('/', (req, res) => {
  const orgId = req.user.org_id;
  const today = istToday();
  const thisMonth = today.slice(0, 7);
  const lastMonth = shiftMonth(thisMonth, -1);
  const nextMonth = shiftMonth(thisMonth, 1);

  const map = monthlyRows(orgId);
  map[thisMonth] ||= empty(thisMonth); // always show the current month
  const months = Object.values(map).map(withNet).sort((a, b) => b.month.localeCompare(a.month));
  const get = (ym) => months.find(m => m.month === ym) || empty(ym);

  const current = get(thisMonth);
  const previous = get(lastMonth);

  // This month at the current daily pace.
  const dayOfMonth = Number(today.slice(8, 10));
  const pace = daysInMonth(thisMonth) / dayOfMonth;
  const projected = withNet({
    month: thisMonth,
    sales: r2(current.sales * pace),
    purchases: r2(current.purchases * pace),
    expenses: r2(current.expenses * pace),
  });

  // Next month: average of the last 3 complete months that have any data.
  const complete = months.filter(m => m.month < thisMonth).slice(0, 3);
  const avg = (k) => (complete.length ? r2(complete.reduce((s, m) => s + m[k], 0) / complete.length) : 0);
  const forecast = withNet({ month: nextMonth, sales: avg('sales'), purchases: avg('purchases'), expenses: avg('expenses') });

  const totals = months.reduce((s, m) => ({
    sales: s.sales + m.sales, purchases: s.purchases + m.purchases, expenses: s.expenses + m.expenses, orders: s.orders + m.orders,
  }), { sales: 0, purchases: 0, expenses: 0, orders: 0 });

  res.json({
    today,
    all_time: withNet({ sales: r2(totals.sales), purchases: r2(totals.purchases), expenses: r2(totals.expenses), orders: totals.orders }),
    current,
    previous,
    projected: { ...projected, days_counted: dayOfMonth, days_in_month: daysInMonth(thisMonth) },
    forecast: { ...forecast, based_on: complete.map(m => m.month) },
    months,
  });
});

module.exports = router;
