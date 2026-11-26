const jwt = require('jsonwebtoken');
const { db } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    // Re-read the account so role changes and deactivation apply at once,
    // not only after the 24h token expires.
    const row = db.prepare('SELECT id, org_id, email, name, role, active, is_owner FROM users WHERE id = ?').get(user.id);
    if (!row || !row.active) {
      return res.status(401).json({ error: 'This account is deactivated or no longer exists' });
    }
    req.user = { id: row.id, org_id: row.org_id, role: row.role, email: row.email, name: row.name, is_owner: !!row.is_owner };
    next();
  });
}

function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticateToken, requireRole, JWT_SECRET };
