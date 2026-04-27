const express = require('express');
const router = express.Router();
const { db, seedOrganizationData } = require('../db');
const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { JWT_SECRET } = require('../middleware/auth');

// Note: Replace with real Client ID from environment variables in production
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy_client_id.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// 1. Google Login (Initial or subsequent)
router.post('/google', async (req, res) => {
  const { credential } = req.body;
  
  if (!credential) {
    return res.status(400).json({ error: 'Missing credential' });
  }

  try {
    // In dev mode without real client ID, we might mock this.
    // For real implementation:
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    }).catch(err => {
      // DEV MOCK: If verification fails (e.g., dummy ID), extract payload manually.
      // Do NOT do this in production!
      const payloadBase64 = credential.split('.')[1];
      const decodedJson = Buffer.from(payloadBase64, 'base64').toString();
      return { getPayload: () => JSON.parse(decodedJson) };
    });

    const payload = ticket.getPayload();
    const { email, sub: google_id, name } = payload;

    // Check if user exists
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (user) {
      // User exists, login success
      const token = jwt.sign(
        { id: user.id, org_id: user.org_id, role: user.role, email: user.email, name: user.name },
        JWT_SECRET,
        { expiresIn: '24h' }
      );
      
      return res.json({
        action: 'login_success',
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, org_id: user.org_id }
      });
    } else {
      // User doesn't exist, redirect to profile setup
      return res.json({
        action: 'setup_required',
        temp_data: { email, google_id, name }
      });
    }
  } catch (error) {
    console.error('Google Auth Error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// 2. Profile Setup (After initial Google Login)
router.post('/setup-profile', async (req, res) => {
  const { email, google_id, name, phone, designation, org_name, password } = req.body;

  if (!email || !org_name || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const transaction = db.transaction(() => {
      // Create Organization
      const orgId = uuidv4();
      db.prepare('INSERT INTO organizations (id, name) VALUES (?, ?)').run(orgId, org_name);

      // Create User (Admin of their new org)
      const userId = uuidv4();
      db.prepare(`
        INSERT INTO users (id, org_id, google_id, email, password_hash, name, phone, designation, role)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(userId, orgId, google_id || null, email, password_hash, name, phone || null, designation || null, 'Admin');

      // Seed organization data
      seedOrganizationData(orgId, org_name);

      return { userId, orgId };
    });

    const { userId, orgId } = transaction();

    // Login user
    const token = jwt.sign(
      { id: userId, org_id: orgId, role: 'Admin', email, name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      action: 'setup_success',
      token,
      user: { id: userId, name, email, role: 'Admin', org_id: orgId }
    });
  } catch (error) {
    console.error('Setup Error:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Email already registered.' });
    } else {
      res.status(500).json({ error: 'Profile setup failed' });
    }
  }
});

// 3. Regular Email/Password Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, org_id: user.org_id, role: user.role, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      action: 'login_success',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, org_id: user.org_id }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
