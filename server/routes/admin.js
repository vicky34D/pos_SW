// ===================================================================
// Admin maintenance — "Start fresh" for purchases and stock.
// Main admin only. Takes a full database backup first, then permanently
// deletes every purchase bill, expense bill, their payments, the whole stock
// ledger and stock balances, and sets every item's stock and value to 0.
// Kept: items, suppliers, warehouses, menu, recipes, sales/orders, users.
// ===================================================================
const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const { db } = require('../db');

const CONFIRM_TEXT = 'DELETE';
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

const count = (sql, orgId) => db.prepare(sql).get(orgId).c;

function summary(orgId) {
  return {
    purchase_bills: count('SELECT COUNT(*) c FROM purchase_bills WHERE org_id = ?', orgId),
    expense_bills: count('SELECT COUNT(*) c FROM expense_bills WHERE org_id = ?', orgId),
    payments: count("SELECT COUNT(*) c FROM payments WHERE org_id = ? AND against_type IN ('Purchase Bill','Expense Bill')", orgId),
    stock_ledger_entries: count('SELECT COUNT(*) c FROM stock_ledger_entries WHERE org_id = ?', orgId),
    stock_value: Math.round(db.prepare('SELECT COALESCE(SUM(stock_value),0) v FROM bins WHERE org_id = ?').get(orgId).v * 100) / 100,
  };
}

function requireOwner(req, res, next) {
  if (!req.user?.is_owner) return res.status(403).json({ error: 'Only the main admin can do this' });
  next();
}

// GET what "Start fresh" would delete
router.get('/start-fresh', requireOwner, (req, res) => {
  res.json({ ...summary(req.user.org_id), confirm_text: CONFIRM_TEXT });
});

// POST do it
router.post('/start-fresh', requireOwner, async (req, res) => {
  const orgId = req.user.org_id;
  if (req.body?.confirm !== CONFIRM_TEXT) return res.status(400).json({ error: `Type ${CONFIRM_TEXT} to confirm` });

  // 1) Full backup first: if this fails, nothing is deleted.
  let backupFile;
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    backupFile = path.join(BACKUP_DIR, `before-start-fresh-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
    await db.backup(backupFile);
  } catch (err) {
    console.error('[start-fresh] backup failed:', err);
    return res.status(500).json({ error: 'Backup failed, so nothing was deleted' });
  }

  // 2) Delete in one transaction: all or nothing.
  const before = summary(orgId);
  db.transaction(() => {
    db.prepare("DELETE FROM payments WHERE org_id = ? AND against_type IN ('Purchase Bill','Expense Bill')").run(orgId);
    db.prepare('DELETE FROM purchase_bill_items WHERE org_id = ?').run(orgId);
    db.prepare('DELETE FROM purchase_bills WHERE org_id = ?').run(orgId);
    db.prepare('DELETE FROM expense_bills WHERE org_id = ?').run(orgId);
    db.prepare('DELETE FROM stock_ledger_entries WHERE org_id = ?').run(orgId);
    db.prepare('DELETE FROM bins WHERE org_id = ?').run(orgId);
    db.prepare('UPDATE inventory SET qty = 0, valuation_rate = 0 WHERE org_id = ?').run(orgId);
  })();

  console.log(`[start-fresh] org ${orgId} by ${req.user.email}: deleted`, before, 'backup', backupFile);
  res.json({ success: true, deleted: before, after: summary(orgId), backup: path.basename(backupFile) });
});

module.exports = router;
