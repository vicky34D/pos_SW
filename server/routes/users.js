const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

// Roles, lowest to highest. What each can do is enforced on every API route
// with requireRole(); the Team screen shows the same summary to the admin.
const ROLES = ['Viewer', 'Employee', 'Manager', 'Admin'];
const MIN_PASSWORD = 6;
const PUBLIC_COLS = 'id, email, name, phone, designation, role, active, is_owner, created_at';

const getUser = (id, orgId) => db.prepare(`SELECT ${PUBLIC_COLS} FROM users WHERE id = ? AND org_id = ?`).get(id, orgId);

// Only the main admin may create Admins or change/reset another Admin;
// nobody but the main admin may touch the main admin's account.
function guardTarget(req, target, { newRole } = {}) {
  if (target.is_owner && req.user.id !== target.id) return 'The main admin account can only be changed by the main admin';
  if (!req.user.is_owner && target.role === 'Admin' && req.user.id !== target.id) return 'Only the main admin can change another Admin';
  if (!req.user.is_owner && newRole === 'Admin') return 'Only the main admin can give the Admin role';
  return null;
}

// GET all users in the organization
router.get('/', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const users = db.prepare(`SELECT ${PUBLIC_COLS} FROM users WHERE org_id = ? ORDER BY is_owner DESC, active DESC, name`).all(orgId);
  res.json(users.map(u => ({ ...u, is_owner: !!u.is_owner })));
});

// POST create a new user in the organization
router.post('/', requireRole(['Admin']), async (req, res) => {
  const orgId = req.user.org_id;
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const { password, role, phone, designation } = req.body;

  if (!email || !name || !password || !role) {
    return res.status(400).json({ error: 'Name, email, password and role are required' });
  }
  if (!ROLES.includes(role)) return res.status(400).json({ error: 'Unknown role' });
  if (String(password).length < MIN_PASSWORD) return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters` });
  if (role === 'Admin' && !req.user.is_owner) return res.status(403).json({ error: 'Only the main admin can create Admins' });
  if (db.prepare('SELECT 1 FROM users WHERE lower(email) = ?').get(email)) {
    return res.status(409).json({ error: 'A user with this email already exists' });
  }

  try {
    const password_hash = await bcrypt.hash(String(password), 10);
    const id = uuidv4();
    db.prepare(`
      INSERT INTO users (id, org_id, email, name, password_hash, role, phone, designation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, orgId, email, name, password_hash, role, phone || null, designation || null);
    res.status(201).json(getUser(id, orgId));
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'A user with this email already exists' });
    console.error(err);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT update role, active flag or details
router.put('/:id', requireRole(['Admin']), (req, res) => {
  const orgId = req.user.org_id;
  const target = getUser(req.params.id, orgId);
  if (!target) return res.status(404).json({ error: 'User not found' });

  const { role, active, name, phone, designation } = req.body;
  if (role !== undefined && !ROLES.includes(role)) return res.status(400).json({ error: 'Unknown role' });
  const denied = guardTarget(req, target, { newRole: role });
  if (denied) return res.status(403).json({ error: denied });

  if (req.user.id === target.id && active === 0) return res.status(403).json({ error: 'You cannot deactivate your own account' });
  if (req.user.id === target.id && role && role !== target.role) return res.status(403).json({ error: 'You cannot change your own role' });
  if (target.is_owner && ((role && role !== 'Admin') || active === 0)) {
    return res.status(403).json({ error: 'The main admin must stay an active Admin' });
  }

  db.prepare(`
    UPDATE users SET role = ?, active = ?, name = ?, phone = ?, designation = ? WHERE id = ? AND org_id = ?
  `).run(
    role || target.role,
    active !== undefined ? (active ? 1 : 0) : target.active,
    name !== undefined && String(name).trim() ? String(name).trim() : target.name,
    phone !== undefined ? (phone || null) : target.phone,
    designation !== undefined ? (designation || null) : target.designation,
    target.id, orgId
  );
  res.json(getUser(target.id, orgId));
});

// POST set a new password for a user (admin reset, or your own)
router.post('/:id/password', requireRole(['Admin', 'Manager', 'Employee', 'Viewer']), async (req, res) => {
  const orgId = req.user.org_id;
  const target = getUser(req.params.id, orgId);
  if (!target) return res.status(404).json({ error: 'User not found' });
  const self = req.user.id === target.id;
  if (!self && req.user.role !== 'Admin') return res.status(403).json({ error: 'Insufficient permissions' });
  const denied = self ? null : guardTarget(req, target);
  if (denied) return res.status(403).json({ error: denied });

  const password = String(req.body.password || '');
  if (password.length < MIN_PASSWORD) return res.status(400).json({ error: `Password must be at least ${MIN_PASSWORD} characters` });
  if (self) {
    const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(target.id);
    if (!row.password_hash || !(await bcrypt.compare(String(req.body.current_password || ''), row.password_hash))) {
      return res.status(403).json({ error: 'Current password is wrong' });
    }
  }
  const hash = await bcrypt.hash(password, 10);
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ? AND org_id = ?').run(hash, target.id, orgId);
  res.json({ success: true });
});

// POST hand the main admin role to another active Admin (main admin only)
router.post('/:id/make-owner', requireRole(['Admin']), (req, res) => {
  const orgId = req.user.org_id;
  if (!req.user.is_owner) return res.status(403).json({ error: 'Only the main admin can do this' });
  const target = getUser(req.params.id, orgId);
  if (!target || !target.active || target.role !== 'Admin') return res.status(400).json({ error: 'Pick an active Admin' });
  if (target.id === req.user.id) return res.json(getUser(target.id, orgId));
  db.transaction(() => {
    db.prepare('UPDATE users SET is_owner = 0 WHERE org_id = ?').run(orgId);
    db.prepare('UPDATE users SET is_owner = 1 WHERE id = ? AND org_id = ?').run(target.id, orgId);
  })();
  res.json(getUser(target.id, orgId));
});

// DELETE (soft delete / deactivate) user
router.delete('/:id', requireRole(['Admin']), (req, res) => {
  const orgId = req.user.org_id;
  if (req.user.id === req.params.id) return res.status(403).json({ error: 'Cannot deactivate your own account' });
  const target = getUser(req.params.id, orgId);
  if (!target) return res.status(404).json({ error: 'User not found' });
  const denied = guardTarget(req, target);
  if (denied) return res.status(403).json({ error: denied });
  db.prepare('UPDATE users SET active = 0 WHERE id = ? AND org_id = ?').run(target.id, orgId);
  res.json({ success: true });
});

module.exports = router;
