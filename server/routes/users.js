const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

// GET all users in the organization
router.get('/', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const users = db.prepare('SELECT id, email, name, phone, designation, role, active, created_at FROM users WHERE org_id = ? ORDER BY name').all(orgId);
  res.json(users);
});

// POST create a new user in the organization
router.post('/', requireRole(['Admin']), async (req, res) => {
  const orgId = req.user.org_id;
  const { email, name, password, role, phone, designation } = req.body;

  if (!email || !name || !password || !role) {
    return res.status(400).json({ error: 'Email, name, password, and role are required' });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    const id = uuidv4();

    db.prepare(`
      INSERT INTO users (id, org_id, email, name, password_hash, role, phone, designation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, orgId, email, name, password_hash, role, phone || null, designation || null);

    const newUser = db.prepare('SELECT id, email, name, phone, designation, role, active, created_at FROM users WHERE id = ?').get(id);
    res.status(201).json(newUser);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT update user role or details
router.put('/:id', requireRole(['Admin']), (req, res) => {
  const orgId = req.user.org_id;
  const { role, active } = req.body;

  // Ensure user exists in this org
  const existing = db.prepare('SELECT * FROM users WHERE id = ? AND org_id = ?').get(req.params.id, orgId);
  if (!existing) return res.status(404).json({ error: 'User not found' });

  // Prevent admin from deactivating themselves
  if (req.user.id === req.params.id && active === 0) {
    return res.status(403).json({ error: 'Cannot deactivate your own account' });
  }

  db.prepare(
    'UPDATE users SET role = ?, active = ? WHERE id = ? AND org_id = ?'
  ).run(
    role || existing.role,
    active !== undefined ? active : existing.active,
    req.params.id,
    orgId
  );

  const updated = db.prepare('SELECT id, email, name, phone, designation, role, active, created_at FROM users WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE (soft delete / deactivate) user
router.delete('/:id', requireRole(['Admin']), (req, res) => {
  const orgId = req.user.org_id;
  
  if (req.user.id === req.params.id) {
    return res.status(403).json({ error: 'Cannot delete your own account' });
  }

  const result = db.prepare('UPDATE users SET active = 0 WHERE id = ? AND org_id = ?').run(req.params.id, orgId);
  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  
  res.json({ success: true });
});

module.exports = router;
