// ===================================================================
// Payment Entry — records money paid against a Purchase Bill or Expense Bill.
// On submit: updates paid_amount and recalculates bill status.
// ===================================================================
const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

function nextPaymentNumber(orgId) {
  const last = db.prepare(
    "SELECT payment_number FROM payments WHERE org_id = ? AND payment_number LIKE 'PAY-%' ORDER BY created_at DESC LIMIT 1"
  ).get(orgId);
  const num = last ? (parseInt(last.payment_number.split('-')[1], 10) + 1) : 1;
  return `PAY-${String(num).padStart(5, '0')}`;
}

function reconcileBillStatus(orgId, againstType, againstId) {
  const table = againstType === 'Purchase Bill' ? 'purchase_bills' : 'expense_bills';
  const bill = db.prepare(`SELECT total, paid_amount FROM ${table} WHERE id = ? AND org_id = ?`).get(againstId, orgId);
  if (!bill) return;
  let status;
  if (bill.paid_amount <= 0) status = againstType === 'Purchase Bill' ? 'Submitted' : 'Submitted';
  else if (bill.paid_amount < bill.total) status = 'Partially Paid';
  else status = 'Paid';
  db.prepare(`UPDATE ${table} SET status = ? WHERE id = ? AND org_id = ?`).run(status, againstId, orgId);
}

// GET all payments (optional filter by bill)
router.get('/', (req, res) => {
  const orgId = req.user.org_id;
  const { against_id, against_type, supplier_id, from, to } = req.query;
  let sql = `SELECT p.*, s.name AS supplier_name FROM payments p
             LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.org_id = ?`;
  const params = [orgId];
  if (against_id) { sql += ' AND p.against_id = ?'; params.push(against_id); }
  if (against_type) { sql += ' AND p.against_type = ?'; params.push(against_type); }
  if (supplier_id) { sql += ' AND p.supplier_id = ?'; params.push(supplier_id); }
  if (from && to) { sql += ' AND date(p.payment_date) BETWEEN date(?) AND date(?)'; params.push(from, to); }
  sql += ' ORDER BY p.created_at DESC';
  res.json(db.prepare(sql).all(...params));
});

// POST create payment
router.post('/', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const { against_type, against_id, supplier_id, amount, method, payment_date, notes } = req.body;
  if (!against_type || !against_id) return res.status(400).json({ error: 'against_type and against_id are required' });
  if (!amount || Number(amount) <= 0) return res.status(400).json({ error: 'amount must be positive' });

  const table = against_type === 'Purchase Bill' ? 'purchase_bills' : 'expense_bills';
  const bill = db.prepare(`SELECT * FROM ${table} WHERE id = ? AND org_id = ?`).get(against_id, orgId);
  if (!bill) return res.status(404).json({ error: 'Bill not found' });
  if (bill.status === 'Cancelled') return res.status(400).json({ error: 'Cannot pay a cancelled bill' });

  const paymentId = uuidv4();
  const payNumber = nextPaymentNumber(orgId);
  const amtNum = Number(amount);

  const recordPayment = db.transaction(() => {
    db.prepare(`INSERT INTO payments (id, org_id, payment_number, against_type, against_id, supplier_id, amount, method, payment_date, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      paymentId, orgId, payNumber, against_type, against_id,
      supplier_id || bill.supplier_id || null, amtNum,
      method || 'Cash', payment_date || null, notes || ''
    );
    // Update paid_amount on the bill
    db.prepare(`UPDATE ${table} SET paid_amount = MIN(total, paid_amount + ?) WHERE id = ? AND org_id = ?`)
      .run(amtNum, against_id, orgId);
    reconcileBillStatus(orgId, against_type, against_id);
  });
  recordPayment();

  res.status(201).json(db.prepare('SELECT * FROM payments WHERE id = ?').get(paymentId));
});

// DELETE payment (reversal)
router.delete('/:id', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const payment = db.prepare('SELECT * FROM payments WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  if (!payment) return res.status(404).json({ error: 'Payment not found' });

  const table = payment.against_type === 'Purchase Bill' ? 'purchase_bills' : 'expense_bills';

  const reversePayment = db.transaction(() => {
    db.prepare(`UPDATE ${table} SET paid_amount = MAX(0, paid_amount - ?) WHERE id = ? AND org_id = ?`)
      .run(payment.amount, payment.against_id, orgId);
    reconcileBillStatus(orgId, payment.against_type, payment.against_id);
    db.prepare('DELETE FROM payments WHERE id = ? AND org_id = ?').run(req.params.id, orgId);
  });
  reversePayment();
  res.json({ success: true });
});

module.exports = router;
