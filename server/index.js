// ===================================================================
// STREETWOK POS — Express Server
// ===================================================================

const express = require('express');
const cors = require('cors');
const path = require('path');
const { db, getDefaultSessionUser } = require('./db');
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
// Bill photos/PDFs are sent as base64, so that one route accepts a bigger body.
app.use('/api/bill-scan', express.json({ limit: '15mb' }));
app.use(express.json());

// Auth Routes (Public)
app.use('/api/auth', require('./routes/auth'));

app.get('/api/session', authenticateToken, (req, res) => {
  const user = req.user || getDefaultSessionUser();
  res.json({
    user: {
      id: user.id,
      org_id: user.org_id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_owner: !!user.is_owner,
      pages: user.pages
    }
  });
});

// Protected API Routes. requirePage() also checks the person's page access
// (Team → Access), so a hidden page can't be reached by calling its API.
const { requirePage } = require('./permissions');
const SALES_PAGES = ['pos', 'tables'];
const byMethod = (map) => (req, res, next) => requirePage(...(map[req.method] || map.default))(req, res, next);

app.use('/api/menu', authenticateToken, byMethod({ GET: [...SALES_PAGES, 'menu'], default: ['menu'] }), require('./routes/menu'));
app.use('/api/orders', authenticateToken, byMethod({ GET: ['orders', 'reports'], POST: SALES_PAGES, default: ['reports', 'orders', 'settings'] }), require('./routes/orders'));
app.use('/api/inventory', authenticateToken, requirePage('inventory', 'menu', 'stockledger', 'purchase'), require('./routes/inventory'));
app.use('/api/recipes', authenticateToken, requirePage('menu', 'inventory'), require('./routes/recipes'));
app.use('/api/reports', authenticateToken, (req, res, next) => (req.path === '/counter' ? next() : requirePage('reports')(req, res, next)), require('./routes/reports'));
app.use('/api/users', authenticateToken, (req, res, next) => (/^\/[^/]+\/password$/.test(req.path) ? next() : requirePage('team')(req, res, next)), require('./routes/users'));
app.use('/api/tables', authenticateToken, requirePage(...SALES_PAGES), require('./routes/tables'));
app.use('/api/parked', authenticateToken, requirePage(...SALES_PAGES), require('./routes/parked'));
// ERPNext-style stock & buying module
app.use('/api/warehouses', authenticateToken, requirePage('inventory', 'stockledger', 'purchase', 'expenses'), require('./routes/warehouses'));
app.use('/api/suppliers', authenticateToken, requirePage('suppliers', 'purchase', 'expenses'), require('./routes/suppliers'));
app.use('/api/purchase-bills', authenticateToken, requirePage('purchase'), require('./routes/purchaseBills'));
app.use('/api/bill-scan', authenticateToken, requirePage('purchase'), require('./routes/billScan'));
app.use('/api/admin', authenticateToken, require('./routes/admin'));
app.use('/api/expenses', authenticateToken, requirePage('expenses'), require('./routes/expenses'));
app.use('/api/payments', authenticateToken, requirePage('purchase', 'expenses'), require('./routes/payments'));
app.use('/api/stock', authenticateToken, requirePage('inventory', 'stockledger'), require('./routes/stockLedger'));

// Settings routes (Protected)
app.get('/api/settings', authenticateToken, (req, res) => {
  const orgId = req.user.org_id;
  const rows = db.prepare('SELECT * FROM settings WHERE org_id = ?').all(orgId);
  const settings = {};
  rows.forEach(row => { settings[row.key] = row.value; });
  res.json(settings);
});

app.put('/api/settings', authenticateToken, requireRole(['Admin', 'Manager']), requirePage('settings'), (req, res) => {
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
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n  🏍️  StreetWok POS Server running on http://localhost:${PORT}`);
  console.log(`  📦 API: http://localhost:${PORT}/api\n`);
});
