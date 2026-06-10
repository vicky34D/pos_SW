const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');

// GET all suppliers
router.get('/', (req, res) => {
  const orgId = req.user.org_id;
  const { active } = req.query;
  let sql = 'SELECT s.*, (SELECT COUNT(*) FROM purchase_bills pb WHERE pb.supplier_id = s.id AND pb.org_id = ?) AS bill_count FROM suppliers s WHERE s.org_id = ?';
  const params = [orgId, orgId];
  if (active !== undefined) { sql += ' AND s.active = ?'; params.push(active === 'true' ? 1 : 0); }
  sql += ' ORDER BY s.name ASC';
  res.json(db.prepare(sql).all(...params));
});

// GET single supplier
router.get('/:id', (req, res) => {
  const orgId = req.user.org_id;
  const supplier = db.prepare('SELECT * FROM suppliers WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found' });
  supplier.bills = db.prepare('SELECT * FROM purchase_bills WHERE supplier_id = ? AND org_id = ? ORDER BY created_at DESC LIMIT 10').all(req.params.id, orgId);
  res.json(supplier);
});

// POST create supplier
router.post('/', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const { name, contact_person, phone, email, address, gstin } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  try {
    const info = db.prepare(`
      INSERT INTO suppliers (org_id, name, contact_person, phone, email, address, gstin)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(orgId, name, contact_person || '', phone || '', email || '', address || '', gstin || '');
    res.status(201).json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(info.lastInsertRowid));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Supplier already exists' });
    throw err;
  }
});

// PUT update supplier
router.put('/:id', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const existing = db.prepare('SELECT * FROM suppliers WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  if (!existing) return res.status(404).json({ error: 'Supplier not found' });
  const { name, contact_person, phone, email, address, gstin, active } = req.body;
  db.prepare(`UPDATE suppliers SET name=?, contact_person=?, phone=?, email=?, address=?, gstin=?, active=?
              WHERE id=? AND org_id=?`).run(
    name ?? existing.name, contact_person ?? existing.contact_person,
    phone ?? existing.phone, email ?? existing.email,
    address ?? existing.address, gstin ?? existing.gstin,
    active !== undefined ? (active ? 1 : 0) : existing.active,
    req.params.id, orgId
  );
  res.json(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(req.params.id));
});

// DELETE supplier (soft delete — set active=0)
router.delete('/:id', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const result = db.prepare('UPDATE suppliers SET active = 0 WHERE id = ? AND org_id = ?').run(req.params.id, orgId);
  if (result.changes === 0) return res.status(404).json({ error: 'Supplier not found' });
  res.json({ success: true });
});

module.exports = router;
