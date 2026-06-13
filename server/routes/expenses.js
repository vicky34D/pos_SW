const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Salary', 'Maintenance', 'Marketing', 'Packaging', 'Other'];

// Round money to 2 decimals (paise) so totals/balances never drift.
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Next sequence number = max existing suffix + 1. Ordering by created_at was
// only second-precise, so two expenses in the same second collided (EXP-00002 x2).
function nextExpenseNumber(orgId) {
  const rows = db.prepare(
    "SELECT expense_number FROM expense_bills WHERE org_id = ? AND expense_number LIKE 'EXP-%'"
  ).all(orgId);
  let max = 0;
  for (const r of rows) {
    const n = parseInt(r.expense_number.split('-')[1], 10);
    if (Number.isFinite(n) && n > max) max = n;
  }
  return `EXP-${String(max + 1).padStart(5, '0')}`;
}

// GET all expense bills
router.get('/', (req, res) => {
  const orgId = req.user.org_id;
  const { status, category, from, to } = req.query;
  let sql = `SELECT eb.*, s.name AS supplier_name
             FROM expense_bills eb LEFT JOIN suppliers s ON eb.supplier_id = s.id
             WHERE eb.org_id = ?`;
  const params = [orgId];
  if (status) { sql += ' AND eb.status = ?'; params.push(status); }
  if (category) { sql += ' AND eb.category = ?'; params.push(category); }
  if (from && to) { sql += ' AND date(eb.expense_date) BETWEEN date(?) AND date(?)'; params.push(from, to); }
  sql += ' ORDER BY eb.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/categories', (req, res) => res.json(EXPENSE_CATEGORIES));

// GET single expense bill
router.get('/:id', (req, res) => {
  const orgId = req.user.org_id;
  const bill = db.prepare(`
    SELECT eb.*, s.name AS supplier_name FROM expense_bills eb
    LEFT JOIN suppliers s ON eb.supplier_id = s.id
    WHERE eb.id = ? AND eb.org_id = ?
  `).get(req.params.id, orgId);
  if (!bill) return res.status(404).json({ error: 'Expense bill not found' });
  bill.payments = db.prepare(
    'SELECT * FROM payments WHERE against_id = ? AND org_id = ? ORDER BY created_at DESC'
  ).all(req.params.id, orgId);
  res.json(bill);
});

// POST create expense bill
router.post('/', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const { category, payee, supplier_id, expense_date, due_date, amount, tax, notes } = req.body;
  if (!amount) return res.status(400).json({ error: 'amount is required' });

  const billId = uuidv4();
  const expNumber = nextExpenseNumber(orgId);
  const amtNum = round2(amount);
  const taxNum = round2(tax);

  db.prepare(`INSERT INTO expense_bills
    (id, org_id, expense_number, category, payee, supplier_id, expense_date, due_date, amount, tax, total, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(billId, orgId, expNumber, category || 'Other', payee || '', supplier_id || null,
    expense_date || null, due_date || null, amtNum, taxNum, round2(amtNum + taxNum), notes || '');

  res.status(201).json(db.prepare('SELECT * FROM expense_bills WHERE id = ?').get(billId));
});

// PUT update expense bill
router.put('/:id', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const existing = db.prepare('SELECT * FROM expense_bills WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  if (!existing) return res.status(404).json({ error: 'Expense bill not found' });
  if (existing.status === 'Paid') return res.status(400).json({ error: 'Cannot edit a fully paid expense' });

  const { category, payee, supplier_id, expense_date, due_date, amount, tax, notes, status } = req.body;
  const amtNum = amount !== undefined ? round2(amount) : round2(existing.amount);
  const taxNum = tax !== undefined ? round2(tax) : round2(existing.tax);

  db.prepare(`UPDATE expense_bills SET category=?, payee=?, supplier_id=?, expense_date=?, due_date=?,
              amount=?, tax=?, total=?, notes=?, status=? WHERE id=? AND org_id=?`).run(
    category ?? existing.category, payee ?? existing.payee, supplier_id ?? existing.supplier_id,
    expense_date ?? existing.expense_date, due_date ?? existing.due_date,
    amtNum, taxNum, round2(amtNum + taxNum), notes ?? existing.notes,
    status ?? existing.status, req.params.id, orgId
  );
  res.json(db.prepare('SELECT * FROM expense_bills WHERE id = ?').get(req.params.id));
});

// DELETE (cancel) expense bill
router.delete('/:id', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const existing = db.prepare('SELECT * FROM expense_bills WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  if (!existing) return res.status(404).json({ error: 'Expense bill not found' });
  db.prepare("UPDATE expense_bills SET status = 'Cancelled' WHERE id = ? AND org_id = ?").run(req.params.id, orgId);
  res.json({ success: true });
});

module.exports = router;
