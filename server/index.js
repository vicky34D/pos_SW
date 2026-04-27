// ===================================================================
// STREETWOK POS — Express Server
// ===================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const { db } = require('./db');
const { authenticateToken, requireRole } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware — Allow requests from Electron desktop app + web
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (Electron file://, mobile apps, curl)
    if (!origin) return callback(null, true);
    // Allow any origin in development/production
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json());

// Auth Routes (Public)
app.use('/api/auth', require('./routes/auth'));

// Protected API Routes
app.use('/api/menu', authenticateToken, require('./routes/menu'));
app.use('/api/orders', authenticateToken, require('./routes/orders'));
app.use('/api/inventory', authenticateToken, require('./routes/inventory'));
app.use('/api/reports', authenticateToken, require('./routes/reports'));
app.use('/api/users', authenticateToken, require('./routes/users'));

// Settings routes (Protected)
app.get('/api/settings', authenticateToken, (req, res) => {
  const orgId = req.user.org_id;
  const rows = db.prepare('SELECT * FROM settings WHERE org_id = ?').all(orgId);
  const settings = {};
  rows.forEach(row => { settings[row.key] = row.value; });
  res.json(settings);
});

app.put('/api/settings', authenticateToken, requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const updates = req.body;
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, org_id, value) VALUES (?, ?, ?)');
  const bulkUpsert = db.transaction(() => {
    for (const [key, value] of Object.entries(updates)) {
      upsert.run(key, orgId, String(value));
    }
  });
  bulkUpsert();

  const rows = db.prepare('SELECT * FROM settings WHERE org_id = ?').all(orgId);
  const settings = {};
  rows.forEach(row => { settings[row.key] = row.value; });
  res.json(settings);
});

// Clear transactions (danger zone, Admin only)
app.delete('/api/orders/all', authenticateToken, requireRole(['Admin']), (req, res) => {
  const orgId = req.user.org_id;
  db.prepare('DELETE FROM order_items WHERE org_id = ?').run(orgId);
  db.prepare('DELETE FROM orders WHERE org_id = ?').run(orgId);
  db.prepare('UPDATE order_counter SET last_number = 0 WHERE org_id = ?').run(orgId);
  res.json({ success: true });
});

// Serve React build in production
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n  🏍️  StreetWok POS Server running on http://localhost:${PORT}`);
  console.log(`  📦 API: http://localhost:${PORT}/api\n`);
});
