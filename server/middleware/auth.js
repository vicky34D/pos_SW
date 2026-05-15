const jwt = require('jsonwebtoken');
const { getDefaultSessionUser } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key_change_in_production';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    req.user = getDefaultSessionUser();
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      req.user = getDefaultSessionUser();
      return next();
    }
    req.user = user; // { id, org_id, role, email, name }
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
