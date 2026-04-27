// ===================================================================
// STREETWOK POS — Database Setup & Seed Data
// Uses better-sqlite3 (synchronous, zero-config SQLite)
// ===================================================================

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'streetwok.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ===== CREATE TABLES =====
db.exec(`
  CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    google_id TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    name TEXT NOT NULL,
    phone TEXT,
    designation TEXT,
    role TEXT DEFAULT 'Employee', -- Admin, Manager, Employee, Viewer
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id)
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    emoji TEXT DEFAULT '🍽️',
    description TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id)
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    qty REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'pcs',
    alert_level REAL NOT NULL DEFAULT 5,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    UNIQUE(org_id, name)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    order_number INTEGER NOT NULL,
    customer_name TEXT DEFAULT 'Walk-in',
    order_type TEXT DEFAULT 'dine-in',
    payment_method TEXT NOT NULL,
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id)
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    menu_item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (org_id) REFERENCES organizations(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT,
    org_id TEXT NOT NULL,
    value TEXT NOT NULL,
    PRIMARY KEY (key, org_id),
    FOREIGN KEY (org_id) REFERENCES organizations(id)
  );

  CREATE TABLE IF NOT EXISTS order_counter (
    org_id TEXT PRIMARY KEY,
    last_number INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (org_id) REFERENCES organizations(id)
  );
`);

// ===== SEED FUNCTION FOR NEW ORGS =====

function seedOrganizationData(orgId, shopName) {
  // Initialize order counter
  const counterRow = db.prepare('SELECT * FROM order_counter WHERE org_id = ?').get(orgId);
  if (!counterRow) {
    db.prepare('INSERT INTO order_counter (org_id, last_number) VALUES (?, 0)').run(orgId);
  }

  // Seed default settings
  const defaultSettings = {
    shop_name: shopName || 'My Cafe',
    tagline: 'Best Cafe in town',
    phone: '',
    address: '',
    tax_rate: '5'
  };

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, org_id, value) VALUES (?, ?, ?)');
  for (const [key, value] of Object.entries(defaultSettings)) {
    insertSetting.run(key, orgId, value);
  }

  // Seed default menu items
  const defaultMenuItems = [
    // BURGERS
    { id: uuidv4(), name: 'Aloo Tikki Burger', price: 59, category: 'burgers', emoji: '🍔' },
    { id: uuidv4(), name: 'Smash Chicken Burger', price: 79, category: 'burgers', emoji: '🍔' },
    { id: uuidv4(), name: 'Zinger Burger', price: 79, category: 'burgers', emoji: '🍔' },
    // FRIES
    { id: uuidv4(), name: 'Regular Fries', price: 49, category: 'fries', emoji: '🍟' },
    { id: uuidv4(), name: 'Loaded Fries', price: 109, category: 'fries', emoji: '🍟' },
    // CHAI & COFFEE
    { id: uuidv4(), name: 'Chai Small', price: 10, category: 'drinks', emoji: '🍵' },
    { id: uuidv4(), name: 'Hot Coffee Small', price: 30, category: 'drinks', emoji: '☕' }
  ];

  const insertMenu = db.prepare(
    'INSERT OR IGNORE INTO menu_items (id, org_id, name, price, category, emoji, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  for (const item of defaultMenuItems) {
    insertMenu.run(item.id, orgId, item.name, item.price, item.category, item.emoji, item.desc || '');
  }

  // Seed default inventory
  const defaultInventory = [
    { name: 'Burger Patty', qty: 50, unit: 'pcs', alert: 10 },
    { name: 'Burger Buns', qty: 100, unit: 'pcs', alert: 20 },
    { name: 'French Fries', qty: 30, unit: 'kg', alert: 8 },
    { name: 'Cooking Oil', qty: 20, unit: 'litre', alert: 5 }
  ];

  const insertInv = db.prepare(
    'INSERT OR IGNORE INTO inventory (org_id, name, qty, unit, alert_level) VALUES (?, ?, ?, ?, ?)'
  );
  for (const item of defaultInventory) {
    insertInv.run(orgId, item.name, item.qty, item.unit, item.alert);
  }
}

module.exports = { db, seedOrganizationData };
