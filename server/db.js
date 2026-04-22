// ===================================================================
// STREETWOK POS — Database Setup & Seed Data
// Uses better-sqlite3 (synchronous, zero-config SQLite)
// ===================================================================

const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'streetwok.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ===== CREATE TABLES =====
db.exec(`
  CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    category TEXT NOT NULL,
    emoji TEXT DEFAULT '🍽️',
    description TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    qty REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'pcs',
    alert_level REAL NOT NULL DEFAULT 5,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    order_number INTEGER NOT NULL,
    customer_name TEXT DEFAULT 'Walk-in',
    order_type TEXT DEFAULT 'dine-in',
    payment_method TEXT NOT NULL,
    subtotal REAL NOT NULL,
    tax REAL NOT NULL,
    total REAL NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    menu_item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    item_price REAL NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (order_id) REFERENCES orders(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS order_counter (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    last_number INTEGER NOT NULL DEFAULT 0
  );
`);

// ===== SEED DEFAULT DATA =====

// Initialize order counter if not exists
const counterRow = db.prepare('SELECT * FROM order_counter WHERE id = 1').get();
if (!counterRow) {
  db.prepare('INSERT INTO order_counter (id, last_number) VALUES (1, 0)').run();
}

// Seed default settings
const defaultSettings = {
  shop_name: 'StreetWok',
  tagline: "The Biker's Cafe",
  phone: '',
  address: '',
  tax_rate: '5'
};

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
for (const [key, value] of Object.entries(defaultSettings)) {
  insertSetting.run(key, value);
}

// Seed default menu items
const defaultMenuItems = [
  // BURGERS
  { id: 'b1', name: 'Aloo Tikki Burger', price: 59, category: 'burgers', emoji: '🍔' },
  { id: 'b2', name: 'Smash Chicken Burger', price: 79, category: 'burgers', emoji: '🍔' },
  { id: 'b3', name: 'Momo Burger', price: 79, category: 'burgers', emoji: '🍔' },
  { id: 'b4', name: 'Zinger Burger', price: 79, category: 'burgers', emoji: '🍔' },
  // FRIES
  { id: 'f1', name: 'Regular Fries', price: 49, category: 'fries', emoji: '🍟' },
  { id: 'f2', name: 'Fries Large', price: 79, category: 'fries', emoji: '🍟' },
  { id: 'f3', name: 'Peri Peri Small', price: 79, category: 'fries', emoji: '🍟' },
  { id: 'f4', name: 'Peri Peri Large', price: 89, category: 'fries', emoji: '🍟' },
  { id: 'f5', name: 'Loaded Fries', price: 109, category: 'fries', emoji: '🍟' },
  { id: 'f6', name: 'Add Fries', price: 39, category: 'fries', emoji: '🍟' },
  // PERI PERI STRIPS
  { id: 'ps1', name: 'Peri Peri Strips (4pcs)', price: 99, category: 'strips', emoji: '🍗' },
  { id: 'ps2', name: 'Peri Peri Strips (6pcs)', price: 149, category: 'strips', emoji: '🍗' },
  // CHAI & COFFEE
  { id: 'd1', name: 'Chai Small', price: 10, category: 'drinks', emoji: '🍵' },
  { id: 'd2', name: 'Chai Large', price: 20, category: 'drinks', emoji: '🍵' },
  { id: 'd3', name: 'Hot Coffee Small', price: 30, category: 'drinks', emoji: '☕' },
  { id: 'd4', name: 'Hot Coffee Large', price: 60, category: 'drinks', emoji: '☕' },
  { id: 'd5', name: 'Black Coffee Small', price: 25, category: 'drinks', emoji: '☕' },
  { id: 'd6', name: 'Black Coffee Large', price: 50, category: 'drinks', emoji: '☕' },
  // POPCORN
  { id: 'pc1', name: 'Chicken Popcorn', price: 59, category: 'popcorn', emoji: '🍿' },
  { id: 'pc2', name: 'Saucy Popcorn', price: 79, category: 'popcorn', emoji: '🍿' },
  { id: 'pc3', name: 'Maxi Chicken Popcorn', price: 99, category: 'popcorn', emoji: '🍿' },
  { id: 'pc4', name: 'Maxi Saucy Popcorn', price: 119, category: 'popcorn', emoji: '🍿' },
  // SNACKS
  { id: 's1', name: 'Mozzarella Sticks (5pcs)', price: 59, category: 'snacks', emoji: '🧀' },
  { id: 's2', name: 'Mozzarella Sticks (10pcs)', price: 109, category: 'snacks', emoji: '🧀' },
  { id: 's3', name: 'Spring Roll (3pcs)', price: 59, category: 'snacks', emoji: '🌯' },
  { id: 's4', name: 'Spring Roll (6pcs)', price: 109, category: 'snacks', emoji: '🌯' },
  { id: 's5', name: 'Potato Nuggets Small', price: 59, category: 'snacks', emoji: '🥔' },
  { id: 's6', name: 'Potato Nuggets Large', price: 109, category: 'snacks', emoji: '🥔' },
  // FRIED WINGS
  { id: 'w1', name: 'Fried Wings (4pcs)', price: 149, category: 'wings', emoji: '🍗' },
  { id: 'w2', name: 'Fried Wings (8pcs)', price: 249, category: 'wings', emoji: '🍗' },
  // MOMOS
  { id: 'm1', name: 'Steam Chicken Momo', price: 69, category: 'momos', emoji: '🥟' },
  { id: 'm2', name: 'Fried Chicken Momo', price: 79, category: 'momos', emoji: '🥟' },
  { id: 'm3', name: 'Steam Veg Momo', price: 49, category: 'momos', emoji: '🥟' },
  { id: 'm4', name: 'Fried Veg Momo', price: 59, category: 'momos', emoji: '🥟' },
  { id: 'm5', name: 'Pan Fried Momo (5pcs)', price: 99, category: 'momos', emoji: '🥟' },
  // COMBOS
  { id: 'c1', name: 'Saver Combo', price: 129, category: 'combos', emoji: '🎁', desc: 'Veg Burger + Fries + Chai' },
  { id: 'c2', name: 'Chicken Craver Combo', price: 149, category: 'combos', emoji: '🎁', desc: 'Smash/Zinger + Fries + Chai' },
  { id: 'c3', name: 'Buddy Combo', price: 249, category: 'combos', emoji: '🎁', desc: 'Any 2 Burgers + Large Fries' },
  { id: 'c4', name: 'Family Snack Box', price: 399, category: 'combos', emoji: '🎁', desc: 'Strips + Popcorn + Wings + Fries' },
  { id: 'c5', name: 'StreetWok Signature', price: 199, category: 'combos', emoji: '🎁', desc: 'Peri Peri Strips + Loaded Fries' },
  { id: 'c6', name: 'Momo Lover Combo', price: 129, category: 'combos', emoji: '🎁', desc: 'Steam Momo + Fries + Chai' },
  { id: 'c7', name: 'Crunchy Chicken Box', price: 149, category: 'combos', emoji: '🎁', desc: 'Popcorn + Wings + Fries' },
  { id: 'c8', name: 'Veggie Snack Box', price: 149, category: 'combos', emoji: '🎁', desc: 'Cheese Sticks + Nuggets + Fries' },
];

const insertMenu = db.prepare(
  'INSERT OR IGNORE INTO menu_items (id, name, price, category, emoji, description) VALUES (?, ?, ?, ?, ?, ?)'
);
for (const item of defaultMenuItems) {
  insertMenu.run(item.id, item.name, item.price, item.category, item.emoji, item.desc || '');
}

// Seed default inventory
const defaultInventory = [
  { name: 'Chicken Breast', qty: 20, unit: 'kg', alert: 5 },
  { name: 'Burger Patty (Veg)', qty: 50, unit: 'pcs', alert: 10 },
  { name: 'Burger Patty (Chicken)', qty: 50, unit: 'pcs', alert: 10 },
  { name: 'Burger Buns', qty: 100, unit: 'pcs', alert: 20 },
  { name: 'French Fries (Frozen)', qty: 30, unit: 'kg', alert: 8 },
  { name: 'Cooking Oil', qty: 20, unit: 'litre', alert: 5 },
  { name: 'Momo Sheets', qty: 200, unit: 'pcs', alert: 50 },
  { name: 'Chicken Mince', qty: 15, unit: 'kg', alert: 5 },
  { name: 'Vegetables Mix', qty: 10, unit: 'kg', alert: 3 },
  { name: 'Cheese Slices', qty: 80, unit: 'pcs', alert: 20 },
  { name: 'Mozzarella Cheese', qty: 5, unit: 'kg', alert: 2 },
  { name: 'Tea Leaves', qty: 3, unit: 'kg', alert: 1 },
  { name: 'Milk', qty: 15, unit: 'litre', alert: 5 },
  { name: 'Coffee Powder', qty: 2, unit: 'kg', alert: 0.5 },
  { name: 'Sugar', qty: 5, unit: 'kg', alert: 2 },
  { name: 'Spring Roll Sheets', qty: 100, unit: 'pcs', alert: 30 },
  { name: 'Peri Peri Seasoning', qty: 3, unit: 'kg', alert: 1 },
  { name: 'Sauces (Assorted)', qty: 15, unit: 'packs', alert: 5 },
  { name: 'Packaging Boxes', qty: 200, unit: 'pcs', alert: 50 },
  { name: 'Paper Bags', qty: 150, unit: 'pcs', alert: 40 },
  { name: 'Napkins', qty: 300, unit: 'pcs', alert: 100 },
];

const insertInv = db.prepare(
  'INSERT OR IGNORE INTO inventory (name, qty, unit, alert_level) VALUES (?, ?, ?, ?)'
);
for (const item of defaultInventory) {
  insertInv.run(item.name, item.qty, item.unit, item.alert);
}

module.exports = db;
