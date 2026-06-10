// ===================================================================
// STREETWOK POS — Database Setup & Seed Data
// Uses better-sqlite3 (synchronous, zero-config SQLite)
// ===================================================================

const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'streetwok.db');
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

  CREATE TABLE IF NOT EXISTS active_tables (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id TEXT NOT NULL,
    table_number INTEGER NOT NULL,
    customer_name TEXT DEFAULT '',
    order_type TEXT DEFAULT 'dine-in',
    items TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    UNIQUE(org_id, table_number)
  );

  -- Recipe / ingredient mapping: how much of each inventory item one unit of a
  -- menu item consumes. Drives automatic stock deduction at checkout. A menu
  -- item with no rows here is simply not tracked (no deduction) — opt-in per item.
  CREATE TABLE IF NOT EXISTS menu_recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id TEXT NOT NULL,
    menu_item_id TEXT NOT NULL,
    inventory_id INTEGER NOT NULL,
    qty_per_unit REAL NOT NULL DEFAULT 1,
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id),
    FOREIGN KEY (inventory_id) REFERENCES inventory(id),
    UNIQUE(org_id, menu_item_id, inventory_id)
  );

  -- ===================================================================
  -- ERPNext-style Stock & Buying module
  -- ===================================================================

  -- Physical / logical stock locations. Every org gets one "Main Store".
  CREATE TABLE IF NOT EXISTS warehouses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    is_default INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    UNIQUE(org_id, name)
  );

  -- Optional item categorisation (Frappe "Item Group").
  CREATE TABLE IF NOT EXISTS item_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    UNIQUE(org_id, name)
  );

  -- Stock Ledger Entry — the immutable source of truth. Every increase or
  -- decrease in stock is one row here; bins + inventory.qty are caches derived
  -- from it. valuation_rate is the moving-average cost AFTER this movement.
  CREATE TABLE IF NOT EXISTS stock_ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    posting_datetime TEXT DEFAULT (datetime('now')),
    voucher_type TEXT NOT NULL,        -- Purchase Bill | Sales Order | Stock Adjustment | Opening Stock
    voucher_id TEXT,                   -- id of the source document
    qty_change REAL NOT NULL,          -- +incoming / -outgoing
    incoming_rate REAL DEFAULT 0,      -- unit cost of incoming stock (0 for outgoing)
    valuation_rate REAL DEFAULT 0,     -- moving-avg unit cost after this entry
    balance_qty REAL NOT NULL,         -- item+warehouse qty after this entry
    balance_value REAL NOT NULL,       -- item+warehouse stock value after this entry
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    FOREIGN KEY (item_id) REFERENCES inventory(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
  );

  -- Bin — cached current balance & valuation per item per warehouse.
  CREATE TABLE IF NOT EXISTS bins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    qty REAL NOT NULL DEFAULT 0,
    valuation_rate REAL NOT NULL DEFAULT 0,
    stock_value REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    FOREIGN KEY (item_id) REFERENCES inventory(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id),
    UNIQUE(org_id, item_id, warehouse_id)
  );

  -- Suppliers (Frappe "Supplier").
  CREATE TABLE IF NOT EXISTS suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    org_id TEXT NOT NULL,
    name TEXT NOT NULL,
    contact_person TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    gstin TEXT DEFAULT '',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    UNIQUE(org_id, name)
  );

  -- Purchase Bill (supplier invoice). Submitting it posts stock + payable.
  CREATE TABLE IF NOT EXISTS purchase_bills (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    bill_number TEXT NOT NULL,         -- supplier's invoice no / internal no
    supplier_id INTEGER NOT NULL,
    warehouse_id INTEGER NOT NULL,
    bill_date TEXT DEFAULT (date('now')),
    due_date TEXT,
    status TEXT DEFAULT 'Draft',       -- Draft | Submitted | Partially Paid | Paid | Cancelled
    subtotal REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (warehouse_id) REFERENCES warehouses(id)
  );

  CREATE TABLE IF NOT EXISTS purchase_bill_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bill_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    item_id INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    qty REAL NOT NULL DEFAULT 0,
    rate REAL NOT NULL DEFAULT 0,      -- purchase unit cost
    amount REAL NOT NULL DEFAULT 0,    -- qty * rate
    FOREIGN KEY (bill_id) REFERENCES purchase_bills(id),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    FOREIGN KEY (item_id) REFERENCES inventory(id)
  );

  -- Expense Bill — non-stock business costs (rent, utilities, etc.).
  CREATE TABLE IF NOT EXISTS expense_bills (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    expense_number TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    payee TEXT DEFAULT '',
    supplier_id INTEGER,               -- optional link to a supplier
    expense_date TEXT DEFAULT (date('now')),
    due_date TEXT,
    status TEXT DEFAULT 'Submitted',   -- Submitted | Partially Paid | Paid | Cancelled
    amount REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    paid_amount REAL NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );

  -- Payment Entry — money paid against a purchase or expense bill.
  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    payment_number TEXT NOT NULL,
    against_type TEXT NOT NULL,        -- Purchase Bill | Expense Bill
    against_id TEXT NOT NULL,
    supplier_id INTEGER,
    amount REAL NOT NULL DEFAULT 0,
    method TEXT DEFAULT 'Cash',        -- Cash | Bank | UPI | Card | Cheque
    payment_date TEXT DEFAULT (date('now')),
    notes TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (org_id) REFERENCES organizations(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id)
  );
`);

// ===== LIGHTWEIGHT MIGRATIONS (additive, idempotent) =====
// Upgrade the existing `inventory` table into a proper Item master without
// dropping data. Each ALTER is guarded so re-runs are no-ops.
(function migrateInventoryToItemMaster() {
  const cols = db.prepare("PRAGMA table_info(inventory)").all().map(c => c.name);
  const addCol = (name, ddl) => {
    if (!cols.includes(name)) db.exec(`ALTER TABLE inventory ADD COLUMN ${ddl}`);
  };
  addCol('item_code', "item_code TEXT");                       // SKU
  addCol('item_group', "item_group TEXT DEFAULT 'General'");
  addCol('barcode', "barcode TEXT");
  addCol('description', "description TEXT DEFAULT ''");
  addCol('valuation_rate', "valuation_rate REAL NOT NULL DEFAULT 0"); // moving-avg cost
  addCol('reorder_qty', "reorder_qty REAL NOT NULL DEFAULT 0");       // suggested purchase qty
  addCol('is_stock_item', "is_stock_item INTEGER NOT NULL DEFAULT 1");
})();

// ===== SEED FUNCTION FOR NEW ORGS =====

function seedOrganizationData(orgId, shopName) {
  // Initialize order counter
  const counterRow = db.prepare('SELECT * FROM order_counter WHERE org_id = ?').get(orgId);
  if (!counterRow) {
    db.prepare('INSERT INTO order_counter (org_id, last_number) VALUES (?, 0)').run(orgId);
  }

  // Ensure a default warehouse exists (stock postings need one).
  const whCount = db.prepare('SELECT COUNT(*) AS cnt FROM warehouses WHERE org_id = ?').get(orgId);
  if (!whCount || whCount.cnt === 0) {
    db.prepare('INSERT INTO warehouses (org_id, name, is_default) VALUES (?, ?, 1)').run(orgId, 'Main Store');
  }

  // Seed a few default item groups.
  const insertGroup = db.prepare('INSERT OR IGNORE INTO item_groups (org_id, name) VALUES (?, ?)');
  for (const g of ['General', 'Raw Material', 'Packaging', 'Beverages']) {
    insertGroup.run(orgId, g);
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

  // Seed default menu items — only if org has none yet
  const existingMenuCount = db.prepare('SELECT COUNT(*) as cnt FROM menu_items WHERE org_id = ? AND active = 1').get(orgId);
  if (!existingMenuCount || existingMenuCount.cnt === 0) {
    const defaultMenuItems = [
      // BURGERS
      { name: 'Aloo Tikki Burger', price: 69, category: 'burgers', emoji: '🍔', desc: 'Classic veg burger' },
      { name: 'Smash Chicken Burger', price: 89, category: 'burgers', emoji: '🍔', desc: 'Juicy smash patty' },
      { name: 'Momo Burger', price: 79, category: 'burgers', emoji: '🍔', desc: 'Momo-style fusion burger' },
      { name: 'Zinger Burger', price: 79, category: 'burgers', emoji: '🍔', desc: 'Crispy zinger' },
      // FRIES
      { name: 'Regular Fries', price: 49, category: 'fries', emoji: '🍟' },
      { name: 'Fries Large', price: 79, category: 'fries', emoji: '🍟' },
      { name: 'Peri Peri Fries Small', price: 79, category: 'fries', emoji: '🍟', desc: 'Peri peri seasoned' },
      { name: 'Peri Peri Fries Large', price: 119, category: 'fries', emoji: '🍟', desc: 'Peri peri seasoned' },
      { name: 'Loaded Fries', price: 149, category: 'fries', emoji: '🍟', desc: 'Cheese & toppings' },
      { name: 'Add Fries', price: 39, category: 'fries', emoji: '🍟', desc: 'Add-on fries' },
      // STRIPS
      { name: 'Peri Peri Strips (4pcs)', price: 109, category: 'strips', emoji: '🍗', desc: '4 pieces' },
      { name: 'Peri Peri Strips (6pcs)', price: 149, category: 'strips', emoji: '🍗', desc: '6 pieces' },
      // DRINKS
      { name: 'Chai Small', price: 15, category: 'drinks', emoji: '🍵' },
      { name: 'Chai Large', price: 25, category: 'drinks', emoji: '🍵' },
      { name: 'Hot Coffee Small', price: 30, category: 'drinks', emoji: '☕' },
      { name: 'Hot Coffee Large', price: 60, category: 'drinks', emoji: '☕' },
      { name: 'Black Coffee Small', price: 25, category: 'drinks', emoji: '☕' },
      { name: 'Black Coffee Large', price: 50, category: 'drinks', emoji: '☕' },
      // POPCORN
      { name: 'Chicken Popcorn', price: 59, category: 'popcorn', emoji: '🍿' },
      { name: 'Saucy Popcorn', price: 79, category: 'popcorn', emoji: '🍿', desc: 'With sauce' },
      { name: 'Maxi Chicken Popcorn', price: 99, category: 'popcorn', emoji: '🍿', desc: 'Large portion' },
      { name: 'Maxi Saucy Popcorn', price: 129, category: 'popcorn', emoji: '🍿', desc: 'Large with sauce' },
      // SNACKS
      { name: 'Mozerella Sticks (5pcs)', price: 69, category: 'snacks', emoji: '🧀', desc: '5 pieces' },
      { name: 'Mozerella Sticks (10pcs)', price: 129, category: 'snacks', emoji: '🧀', desc: '10 pieces' },
      { name: 'Spring Roll (3pcs)', price: 69, category: 'snacks', emoji: '🌯', desc: '3 pieces' },
      { name: 'Spring Roll (6pcs)', price: 129, category: 'snacks', emoji: '🌯', desc: '6 pieces' },
      { name: 'Potato Nuggets Small', price: 59, category: 'snacks', emoji: '🥔' },
      { name: 'Potato Nuggets Large', price: 109, category: 'snacks', emoji: '🥔' },
      // WINGS
      { name: 'Fried Wings (4pcs)', price: 149, category: 'wings', emoji: '🍗', desc: '4 pieces' },
      { name: 'Fried Wings (8pcs)', price: 249, category: 'wings', emoji: '🍗', desc: '8 pieces' },
      // MOMOS (5 pcs per plate)
      { name: 'Steam Chicken Momo', price: 69, category: 'momos', emoji: '🥟', desc: '5 pcs/plate' },
      { name: 'Fried Chicken Momo', price: 69, category: 'momos', emoji: '🥟', desc: '5 pcs/plate' },
      { name: 'Steam Veg Momo', price: 59, category: 'momos', emoji: '🥟', desc: '5 pcs/plate' },
      { name: 'Fried Veg Momo', price: 69, category: 'momos', emoji: '🥟', desc: '5 pcs/plate' },
      { name: 'Pan Fried Momo', price: 99, category: 'momos', emoji: '🥟', desc: '5 pcs/plate' },
      // COMBOS
      { name: 'Saver Combo', price: 129, category: 'combos', emoji: '🎁', desc: 'Veg Burger + Regular Fries + Chai' },
      { name: 'Chicken Craver Combo', price: 159, category: 'combos', emoji: '🎁', desc: 'Chicken Burger + Fries + Chai' },
      { name: 'Buddy Combo', price: 249, category: 'combos', emoji: '🎁', desc: '2 Burgers + Large Fries' },
      { name: 'Family Snack Box', price: 399, category: 'combos', emoji: '🎁', desc: 'Strips + Popcorn + Wings + Fries' },
      { name: 'Signature Combo', price: 199, category: 'combos', emoji: '🎁', desc: 'Peri Peri Strips 4pcs + Loaded Fries' },
      { name: 'Momo Lover Combo', price: 139, category: 'combos', emoji: '🎁', desc: 'Steam Chicken Momo + Fries + Chai' },
      { name: 'Crunchy Chicken Box', price: 149, category: 'combos', emoji: '🎁', desc: 'Popcorn + Wings 2pcs + Fries' },
      { name: 'Veggie Snack Box', price: 149, category: 'combos', emoji: '🎁', desc: 'Cheese Sticks + Nuggets + Fries' },
      // CIGARETTES
      { name: 'Gold Flake Small', price: 15, category: 'cigarettes', emoji: '🚬', desc: 'Gold Flake Kings' },
      { name: 'Gold Flake Medium', price: 20, category: 'cigarettes', emoji: '🚬', desc: 'Gold Flake Medium' },
      { name: 'Flake', price: 25, category: 'cigarettes', emoji: '🚬', desc: 'Classic Flake' },
      { name: 'Silk Cut', price: 30, category: 'cigarettes', emoji: '🚬', desc: 'Silk Cut' },
    ];

    const insertMenu = db.prepare(
      'INSERT OR IGNORE INTO menu_items (id, org_id, name, price, category, emoji, description) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const item of defaultMenuItems) {
      const id = 'seed_' + item.category + '_' + item.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + orgId;
      insertMenu.run(id, orgId, item.name, item.price, item.category, item.emoji, item.desc || '');
    }
  }

  // Seed default inventory
  const defaultInventory = [
    { name: 'Burger Buns', qty: 100, unit: 'pcs', alert: 20 },
    { name: 'Aloo Tikki Patty', qty: 100, unit: 'pcs', alert: 15 },
    { name: 'Chicken Smash Patty', qty: 100, unit: 'pcs', alert: 15 },
    { name: 'Zinger Patty', qty: 100, unit: 'pcs', alert: 15 },
    { name: 'Momo Burger Patty', qty: 100, unit: 'pcs', alert: 15 },
    { name: 'French Fries (raw)', qty: 100, unit: 'kg', alert: 10 },
    { name: 'Cooking Oil', qty: 100, unit: 'litre', alert: 10 },
    { name: 'Peri Peri Seasoning', qty: 100, unit: 'packs', alert: 5 },
    { name: 'Loaded Fries Toppings', qty: 100, unit: 'packs', alert: 10 },
    { name: 'Chicken Strips (raw)', qty: 100, unit: 'kg', alert: 10 },
    { name: 'Tea Leaves', qty: 100, unit: 'packs', alert: 5 },
    { name: 'Milk', qty: 100, unit: 'litre', alert: 10 },
    { name: 'Coffee Powder', qty: 100, unit: 'packs', alert: 5 },
    { name: 'Sugar', qty: 100, unit: 'kg', alert: 5 },
    { name: 'Cups & Lids', qty: 100, unit: 'packs', alert: 10 },
    { name: 'Chicken Popcorn Mix', qty: 100, unit: 'kg', alert: 10 },
    { name: 'Popcorn Sauce', qty: 100, unit: 'packs', alert: 5 },
    { name: 'Mozerella Cheese Sticks', qty: 100, unit: 'pcs', alert: 20 },
    { name: 'Spring Roll Sheets', qty: 100, unit: 'pcs', alert: 20 },
    { name: 'Spring Roll Filling', qty: 100, unit: 'kg', alert: 5 },
    { name: 'Potato Nuggets', qty: 100, unit: 'pcs', alert: 20 },
    { name: 'Chicken Wings (raw)', qty: 100, unit: 'pcs', alert: 20 },
    { name: 'Momo Sheets', qty: 100, unit: 'packs', alert: 10 },
    { name: 'Chicken Momo Filling', qty: 100, unit: 'kg', alert: 5 },
    { name: 'Veg Momo Filling', qty: 100, unit: 'kg', alert: 5 },
    { name: 'Momo Chutney', qty: 100, unit: 'packs', alert: 5 },
    { name: 'Cheese Slices', qty: 100, unit: 'pcs', alert: 20 },
    { name: 'Sauces & Ketchup', qty: 100, unit: 'packs', alert: 5 },
    { name: 'Packaging (Boxes)', qty: 100, unit: 'pcs', alert: 20 },
    { name: 'Napkins', qty: 100, unit: 'packs', alert: 5 },
  ];

  const insertInv = db.prepare(
    'INSERT OR IGNORE INTO inventory (org_id, name, qty, unit, alert_level) VALUES (?, ?, ?, ?, ?)'
  );
  for (const item of defaultInventory) {
    insertInv.run(orgId, item.name, item.qty, item.unit, item.alert);
  }
}

function ensureDefaultOrganization() {
  let org = db.prepare('SELECT id, name FROM organizations ORDER BY created_at ASC LIMIT 1').get();

  if (!org) {
    const orgId = uuidv4();
    const orgName = process.env.DEFAULT_ORG_NAME || 'StreetWok';
    db.prepare('INSERT INTO organizations (id, name) VALUES (?, ?)').run(orgId, orgName);
    seedOrganizationData(orgId, orgName);
    org = { id: orgId, name: orgName };
  } else {
    seedOrganizationData(org.id, org.name);
  }

  let user = db.prepare(`
    SELECT id, org_id, email, name, role, active
    FROM users
    WHERE org_id = ? AND active = 1
    ORDER BY
      CASE role
        WHEN 'Admin' THEN 0
        WHEN 'Manager' THEN 1
        ELSE 2
      END,
      created_at ASC
    LIMIT 1
  `).get(org.id);

  if (!user) {
    const userId = uuidv4();
    const userName = process.env.DEFAULT_USER_NAME || 'Store Admin';
    const userEmail = process.env.DEFAULT_USER_EMAIL || 'store@streetwok.local';
    const defaultPasswordHash = '$2b$10$AUYwt30F/uydaBnmjUpp1uMJ6tOySCpPjhemamC.FwIRIzjI1er9W'; // admin123
    db.prepare(`
      INSERT INTO users (id, org_id, email, name, role, active, password_hash)
      VALUES (?, ?, ?, ?, 'Admin', 1, ?)
    `).run(userId, org.id, userEmail, userName, defaultPasswordHash);

    user = {
      id: userId,
      org_id: org.id,
      email: userEmail,
      name: userName,
      role: 'Admin',
      active: 1
    };
  }

  // Ensure any existing users without a password can login with admin123
  db.prepare(`
    UPDATE users SET password_hash = ? WHERE password_hash IS NULL
  `).run('$2b$10$AUYwt30F/uydaBnmjUpp1uMJ6tOySCpPjhemamC.FwIRIzjI1er9W');

  return user;
}

function getDefaultSessionUser() {
  return ensureDefaultOrganization();
}

ensureDefaultOrganization();

module.exports = { db, seedOrganizationData, ensureDefaultOrganization, getDefaultSessionUser };
