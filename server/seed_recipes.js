// ===================================================================
// STREETWOK POS — Recipe & Inventory Seeder v2  (one-shot, idempotent)
//
// Restructures inventory into human units (ml / g / pcs) and gives EVERY
// menu item a recipe so each sale auto-deducts stock through the ledger:
//
//   - Chai is sold as 60 ml (Small) / 80 ml (Large) serves — recipes
//     deduct milk in ml, tea powder & sugar in grams, plus a paper cup.
//   - Momos are stocked as ready PIECES and a plate deducts 5 pcs.
//     (Sheets & filling stay as separate raw items for batch production.)
//   - Cigarettes deduct 1 stick per sale (1:1 resale items).
//   - Combos decompose into the sum of their parts.
//
// SAFETY RULES (so this can run on prod without wrecking real data):
//   - All qty changes are posted via the stock ledger (postMovement),
//     never raw UPDATEs, so bins / SLE / inventory.qty stay in sync.
//   - An item with ANY purchase-bill history is considered "real":
//     its unit, qty and alert level are left untouched. Recipe lines
//     convert into its unit when possible (kg<->g, litre<->ml) and are
//     skipped + reported when not.
//   - An item still holding the dummy seed qty (100) or zero, with no
//     purchases, is reset to a starter qty in the new unit (flagged
//     for review — set real stock via Purchase Bills / adjustments).
//
// Starter quantities and per-serve amounts are sensible defaults for a
// small street-food stall — review in Menu Management -> Recipe and
// Inventory, then adjust. Re-running OVERWRITES recipe edits, which is
// why the deploy workflow guards this behind a one-time marker file.
//
// Run:  node seed_recipes.js              (uses ./streetwok.db)
//       DB_PATH=/path/to.db node seed_recipes.js
// ===================================================================

const { db } = require('./db');
const { postMovement, getDefaultWarehouseId, getBin } = require('./stockLedger');

// ---------- Canonical inventory catalog ----------------------------
// unit is the HUMAN unit (ml / g / pcs). qty = starter stock, alert =
// low-stock warning level, both in that unit.
const CATALOG = [
  // Beverages
  { name: 'Milk',                  unit: 'ml',  qty: 10000, alert: 2000, group: 'Beverages', desc: 'Toned milk for chai & coffee' },
  { name: 'Tea Leaves',            unit: 'g',   qty: 1000,  alert: 200,  group: 'Beverages', desc: 'CTC chai patti' },
  { name: 'Coffee Powder',         unit: 'g',   qty: 500,   alert: 100,  group: 'Beverages', desc: 'Instant coffee' },
  { name: 'Sugar',                 unit: 'g',   qty: 5000,  alert: 1000, group: 'Beverages' },
  { name: 'Ginger & Chai Masala',  unit: 'g',   qty: 300,   alert: 75,   group: 'Beverages', desc: 'Crushed adrak + chai masala' },

  // Raw material — measured
  { name: 'French Fries (raw)',    unit: 'g',   qty: 10000, alert: 2500, group: 'Raw Material', desc: 'Frozen fries' },
  { name: 'Cooking Oil',           unit: 'ml',  qty: 10000, alert: 2500, group: 'Raw Material' },
  { name: 'Peri Peri Seasoning',   unit: 'g',   qty: 500,   alert: 100,  group: 'Raw Material' },
  { name: 'Loaded Fries Toppings', unit: 'g',   qty: 1500,  alert: 300,  group: 'Raw Material', desc: 'Cheese sauce + toppings mix' },
  { name: 'Chicken Popcorn Mix',   unit: 'g',   qty: 5000,  alert: 1000, group: 'Raw Material', desc: 'Frozen popcorn bites' },
  { name: 'Popcorn Sauce',         unit: 'g',   qty: 1500,  alert: 300,  group: 'Raw Material' },
  { name: 'Spring Roll Filling',   unit: 'g',   qty: 2000,  alert: 400,  group: 'Raw Material' },
  { name: 'Sauces & Ketchup',      unit: 'g',   qty: 3000,  alert: 600,  group: 'Raw Material', desc: 'Mayo / ketchup / burger sauces' },
  { name: 'Momo Chutney',          unit: 'g',   qty: 2000,  alert: 400,  group: 'Raw Material', desc: 'Spicy red momo chutney' },
  { name: 'Chicken Momo Filling',  unit: 'g',   qty: 3000,  alert: 600,  group: 'Raw Material', desc: 'For momo production (not deducted on sale)' },
  { name: 'Veg Momo Filling',      unit: 'g',   qty: 3000,  alert: 600,  group: 'Raw Material', desc: 'For momo production (not deducted on sale)' },
  { name: 'Momo Sheets',           unit: 'pcs', qty: 300,   alert: 60,   group: 'Raw Material', desc: 'For momo production (not deducted on sale)' },

  // Raw material — countable
  { name: 'Burger Buns',           unit: 'pcs', qty: 60,  alert: 15, group: 'Raw Material' },
  { name: 'Aloo Tikki Patty',      unit: 'pcs', qty: 30,  alert: 8,  group: 'Raw Material' },
  { name: 'Chicken Smash Patty',   unit: 'pcs', qty: 30,  alert: 8,  group: 'Raw Material' },
  { name: 'Zinger Patty',          unit: 'pcs', qty: 30,  alert: 8,  group: 'Raw Material' },
  { name: 'Momo Burger Patty',     unit: 'pcs', qty: 30,  alert: 8,  group: 'Raw Material' },
  { name: 'Cheese Slices',         unit: 'pcs', qty: 60,  alert: 15, group: 'Raw Material' },
  { name: 'Mozerella Cheese Sticks', unit: 'pcs', qty: 60, alert: 15, group: 'Raw Material' },
  { name: 'Potato Nuggets',        unit: 'pcs', qty: 150, alert: 30, group: 'Raw Material' },
  { name: 'Spring Roll Sheets',    unit: 'pcs', qty: 120, alert: 30, group: 'Raw Material' },
  { name: 'Chicken Wings (raw)',   unit: 'pcs', qty: 60,  alert: 16, group: 'Raw Material' },
  { name: 'Chicken Strips (raw)',  unit: 'pcs', qty: 60,  alert: 16, group: 'Raw Material', desc: '~45 g per strip' },
  { name: 'Chicken Momo (pcs)',    unit: 'pcs', qty: 150, alert: 30, group: 'Raw Material', desc: 'Ready momos — restock after each production batch' },
  { name: 'Veg Momo (pcs)',        unit: 'pcs', qty: 150, alert: 30, group: 'Raw Material', desc: 'Ready momos — restock after each production batch' },

  // Packaging
  { name: 'Paper Cups (Small)',    unit: 'pcs', qty: 200, alert: 50, group: 'Packaging', desc: 'Chai / small coffee cups' },
  { name: 'Paper Cups (Large)',    unit: 'pcs', qty: 100, alert: 25, group: 'Packaging', desc: 'Large coffee cups' },

  // Resale — cigarettes, stocked as single sticks
  { name: 'Gold Flake Small',      unit: 'pcs', qty: 100, alert: 20, group: 'Resale', desc: 'Sticks' },
  { name: 'Gold Flake Medium',     unit: 'pcs', qty: 100, alert: 20, group: 'Resale', desc: 'Sticks' },
  { name: 'Flake',                 unit: 'pcs', qty: 100, alert: 20, group: 'Resale', desc: 'Sticks' },
  { name: 'Silk Cut',              unit: 'pcs', qty: 100, alert: 20, group: 'Resale', desc: 'Sticks' },
];

// Old name -> new name. Applied only when the old row exists and the new
// name doesn't, so the row (and its ledger history) is kept.
const RENAMES = [
  ['Cups & Lids',     'Paper Cups (Small)'],
  ['Gold Flake Packs', 'Flake'],
];

// ---------- Recipes: per ONE sale, in catalog (canonical) units -----
const RECIPES = {
  // Drinks — chai serve sizes: Small 60 ml, Large 80 ml
  'Chai Small':         [['Milk', 40], ['Tea Leaves', 4], ['Sugar', 8],  ['Ginger & Chai Masala', 1],   ['Paper Cups (Small)', 1]],
  'Chai Large':         [['Milk', 55], ['Tea Leaves', 5], ['Sugar', 10], ['Ginger & Chai Masala', 1.5], ['Paper Cups (Small)', 1]],
  'Hot Coffee Small':   [['Coffee Powder', 2], ['Milk', 60],  ['Sugar', 8],  ['Paper Cups (Small)', 1]],
  'Hot Coffee Large':   [['Coffee Powder', 3], ['Milk', 100], ['Sugar', 10], ['Paper Cups (Large)', 1]],
  'Black Coffee Small': [['Coffee Powder', 2], ['Sugar', 8],  ['Paper Cups (Small)', 1]],
  'Black Coffee Large': [['Coffee Powder', 3], ['Sugar', 10], ['Paper Cups (Large)', 1]],

  // Fries — raw frozen weight per serve + frying oil absorbed/topped up
  'Add Fries':             [['French Fries (raw)', 80],  ['Cooking Oil', 8]],
  'Regular Fries':         [['French Fries (raw)', 130], ['Cooking Oil', 12]],
  'Fries Large':           [['French Fries (raw)', 200], ['Cooking Oil', 18]],
  'Peri Peri Fries Small': [['French Fries (raw)', 130], ['Cooking Oil', 12], ['Peri Peri Seasoning', 5]],
  'Peri Peri Fries Large': [['French Fries (raw)', 200], ['Cooking Oil', 18], ['Peri Peri Seasoning', 8]],
  'Loaded Fries':          [['French Fries (raw)', 170], ['Cooking Oil', 15], ['Loaded Fries Toppings', 40], ['Sauces & Ketchup', 20]],

  // Burgers
  'Aloo Tikki Burger':    [['Burger Buns', 1], ['Aloo Tikki Patty', 1],    ['Sauces & Ketchup', 15], ['Cooking Oil', 8]],
  'Smash Chicken Burger': [['Burger Buns', 1], ['Chicken Smash Patty', 1], ['Cheese Slices', 1], ['Sauces & Ketchup', 15], ['Cooking Oil', 8]],
  'Zinger Burger':        [['Burger Buns', 1], ['Zinger Patty', 1],        ['Sauces & Ketchup', 15], ['Cooking Oil', 15]],
  'Momo Burger':          [['Burger Buns', 1], ['Momo Burger Patty', 1],   ['Sauces & Ketchup', 15], ['Cooking Oil', 10]],

  // Momos — one plate = 5 ready pieces + chutney (fried/pan-fried add oil)
  'Steam Chicken Momo': [['Chicken Momo (pcs)', 5], ['Momo Chutney', 30]],
  'Steam Veg Momo':     [['Veg Momo (pcs)', 5],     ['Momo Chutney', 30]],
  'Fried Chicken Momo': [['Chicken Momo (pcs)', 5], ['Momo Chutney', 30], ['Cooking Oil', 15]],
  'Fried Veg Momo':     [['Veg Momo (pcs)', 5],     ['Momo Chutney', 30], ['Cooking Oil', 15]],
  'Pan Fried Momo':     [['Chicken Momo (pcs)', 5], ['Momo Chutney', 30], ['Cooking Oil', 20], ['Sauces & Ketchup', 15]],

  // Popcorn
  'Chicken Popcorn':      [['Chicken Popcorn Mix', 100], ['Cooking Oil', 12]],
  'Maxi Chicken Popcorn': [['Chicken Popcorn Mix', 160], ['Cooking Oil', 18]],
  'Saucy Popcorn':        [['Chicken Popcorn Mix', 100], ['Cooking Oil', 12], ['Popcorn Sauce', 25]],
  'Maxi Saucy Popcorn':   [['Chicken Popcorn Mix', 160], ['Cooking Oil', 18], ['Popcorn Sauce', 35]],

  // Snacks
  'Mozerella Sticks (5pcs)':  [['Mozerella Cheese Sticks', 5],  ['Cooking Oil', 10]],
  'Mozerella Sticks (10pcs)': [['Mozerella Cheese Sticks', 10], ['Cooking Oil', 15]],
  'Potato Nuggets Small':     [['Potato Nuggets', 6],  ['Cooking Oil', 10]],
  'Potato Nuggets Large':     [['Potato Nuggets', 10], ['Cooking Oil', 15]],
  'Spring Roll (3pcs)':       [['Spring Roll Sheets', 3], ['Spring Roll Filling', 60],  ['Cooking Oil', 10]],
  'Spring Roll (6pcs)':       [['Spring Roll Sheets', 6], ['Spring Roll Filling', 120], ['Cooking Oil', 15]],

  // Strips & wings
  'Peri Peri Strips (4pcs)': [['Chicken Strips (raw)', 4], ['Cooking Oil', 15], ['Peri Peri Seasoning', 5]],
  'Peri Peri Strips (6pcs)': [['Chicken Strips (raw)', 6], ['Cooking Oil', 20], ['Peri Peri Seasoning', 7]],
  'Fried Wings (4pcs)':      [['Chicken Wings (raw)', 4],  ['Cooking Oil', 15]],
  'Fried Wings (8pcs)':      [['Chicken Wings (raw)', 8],  ['Cooking Oil', 25]],

  // Cigarettes — 1 stick per sale
  'Gold Flake Small':  [['Gold Flake Small', 1]],
  'Gold Flake Medium': [['Gold Flake Medium', 1]],
  'Flake':             [['Flake', 1]],
  'Silk Cut':          [['Silk Cut', 1]],

  // Combos = sum of their parts
  'Saver Combo':          [['Burger Buns', 1], ['Aloo Tikki Patty', 1], ['Sauces & Ketchup', 15], ['French Fries (raw)', 130], ['Cooking Oil', 20], ['Milk', 40], ['Tea Leaves', 4], ['Sugar', 8], ['Ginger & Chai Masala', 1], ['Paper Cups (Small)', 1]],
  'Chicken Craver Combo': [['Burger Buns', 1], ['Chicken Smash Patty', 1], ['Cheese Slices', 1], ['Sauces & Ketchup', 15], ['French Fries (raw)', 130], ['Cooking Oil', 20], ['Milk', 40], ['Tea Leaves', 4], ['Sugar', 8], ['Ginger & Chai Masala', 1], ['Paper Cups (Small)', 1]],
  'Buddy Combo':          [['Burger Buns', 2], ['Chicken Smash Patty', 1], ['Aloo Tikki Patty', 1], ['Cheese Slices', 1], ['Sauces & Ketchup', 30], ['French Fries (raw)', 200], ['Cooking Oil', 34]],
  'Family Snack Box':     [['Chicken Strips (raw)', 4], ['Peri Peri Seasoning', 5], ['Chicken Popcorn Mix', 100], ['Chicken Wings (raw)', 4], ['French Fries (raw)', 200], ['Cooking Oil', 60]],
  'Signature Combo':      [['Chicken Strips (raw)', 4], ['Peri Peri Seasoning', 5], ['French Fries (raw)', 170], ['Loaded Fries Toppings', 40], ['Sauces & Ketchup', 20], ['Cooking Oil', 30]],
  'Momo Lover Combo':     [['Chicken Momo (pcs)', 5], ['Momo Chutney', 30], ['French Fries (raw)', 130], ['Cooking Oil', 12], ['Milk', 40], ['Tea Leaves', 4], ['Sugar', 8], ['Ginger & Chai Masala', 1], ['Paper Cups (Small)', 1]],
  'Crunchy Chicken Box':  [['Chicken Popcorn Mix', 80], ['Chicken Wings (raw)', 2], ['French Fries (raw)', 130], ['Cooking Oil', 30]],
  'Veggie Snack Box':     [['Mozerella Cheese Sticks', 3], ['Potato Nuggets', 5], ['French Fries (raw)', 130], ['Cooking Oil', 30]],
};

// ---------- Menu description updates (serving sizes) ---------------
const MENU_DESC = {
  'Chai Small':            '60 ml cutting chai',
  'Chai Large':            '80 ml chai',
  'Hot Coffee Small':      'Milk coffee ~100 ml',
  'Hot Coffee Large':      'Milk coffee ~150 ml',
  'Black Coffee Small':    'Black coffee ~100 ml',
  'Black Coffee Large':    'Black coffee ~150 ml',
  'Add Fries':             'Add-on, ~80 g',
  'Regular Fries':         '~130 g serving',
  'Fries Large':           '~200 g serving',
  'Peri Peri Fries Small': 'Peri peri seasoned, ~130 g',
  'Peri Peri Fries Large': 'Peri peri seasoned, ~200 g',
  'Loaded Fries':          'Cheese & toppings, ~170 g',
  'Chicken Popcorn':       '~100 g serving',
  'Maxi Chicken Popcorn':  '~160 g serving',
  'Saucy Popcorn':         '~100 g, with sauce',
  'Maxi Saucy Popcorn':    '~160 g, with sauce',
  'Potato Nuggets Small':  '6 pcs',
  'Potato Nuggets Large':  '10 pcs',
  'Steam Chicken Momo':    '5 pcs/plate',
  'Fried Chicken Momo':    '5 pcs/plate',
  'Steam Veg Momo':        '5 pcs/plate',
  'Fried Veg Momo':        '5 pcs/plate',
  'Pan Fried Momo':        '5 pcs/plate, saucy',
};

// Units the legacy seed used; value = canonical unit it converts into,
// or null when there is no honest conversion (e.g. "packs").
const LEGACY_UNITS = { kg: 'g', litre: 'ml', packs: null, pcs: 'pcs' };
// qty multiplier when converting a RECIPE amount from canonical into the
// row's actual unit (used when a purchased item keeps its old unit).
function convertQty(qty, canonicalUnit, rowUnit) {
  if (rowUnit === canonicalUnit) return qty;
  if (canonicalUnit === 'g'  && rowUnit === 'kg')    return qty / 1000;
  if (canonicalUnit === 'ml' && rowUnit === 'litre') return qty / 1000;
  return null; // not convertible
}

// ---------- Run ------------------------------------------------------
const org = db.prepare('SELECT id FROM organizations LIMIT 1').get();
if (!org) { console.error('No organization found.'); process.exit(1); }
const orgId = org.id;
const warehouseId = getDefaultWarehouseId(orgId);
if (!warehouseId) { console.error('No warehouse found.'); process.exit(1); }

db.prepare('INSERT OR IGNORE INTO item_groups (org_id, name) VALUES (?, ?)').run(orgId, 'Resale');

const hasPurchases = db.prepare(
  'SELECT 1 FROM purchase_bill_items WHERE org_id = ? AND item_id = ? LIMIT 1'
);
const getInv = db.prepare('SELECT * FROM inventory WHERE org_id = ? AND name = ?');

const report = {
  renamed: [], created: [], migrated: [], starterStock: [], preserved: [],
  recipes: [], skippedIngredients: [], skippedMenu: [], descUpdated: 0,
};

function ledgerBalance(itemId) {
  const bin = getBin(orgId, itemId, warehouseId);
  return bin ? bin.qty : null; // null = no bin yet
}

// Bring an item's ledger balance to `target` (Opening Stock when the item
// has no bin yet, Stock Adjustment otherwise).
function setBalance(itemId, target, why) {
  const bal = ledgerBalance(itemId);
  if (bal === null) {
    if (target > 0) {
      postMovement({ orgId, itemId, warehouseId, qtyChange: target, incomingRate: 0, voucherType: 'Opening Stock', notes: why });
    }
  } else if (Math.abs(bal - target) > 1e-9) {
    postMovement({ orgId, itemId, warehouseId, qtyChange: target - bal, incomingRate: 0, voucherType: 'Stock Adjustment', notes: why });
  }
}

const run = db.transaction(() => {
  // 1) Renames (keep row + history, just change the label).
  for (const [from, to] of RENAMES) {
    const src = getInv.get(orgId, from);
    const dst = getInv.get(orgId, to);
    if (src && !dst) {
      db.prepare('UPDATE inventory SET name = ? WHERE id = ?').run(to, src.id);
      report.renamed.push(`${from} -> ${to}`);
    }
  }

  // 2) Catalog: create missing items, migrate legacy units, set starters.
  for (const spec of CATALOG) {
    let row = getInv.get(orgId, spec.name);

    if (!row) {
      db.prepare(`
        INSERT INTO inventory (org_id, name, qty, unit, alert_level, item_group, description, valuation_rate, reorder_qty, is_stock_item)
        VALUES (?, ?, 0, ?, ?, ?, ?, 0, 0, 1)
      `).run(orgId, spec.name, spec.unit, spec.alert, spec.group, spec.desc || '');
      row = getInv.get(orgId, spec.name);
      setBalance(row.id, spec.qty, 'Starter stock (seed v2) — set real qty via purchase/adjustment');
      report.created.push(`${spec.name} (${spec.qty} ${spec.unit})`);
      continue;
    }

    if (hasPurchases.get(orgId, row.id)) {
      // Real purchase history — hands off structure and quantity.
      report.preserved.push(`${row.name} (${row.qty} ${row.unit})`);
      continue;
    }

    // Sync metadata (cheap, reversible) for items we manage.
    db.prepare('UPDATE inventory SET alert_level = ?, item_group = ?, description = ? WHERE id = ?')
      .run(spec.alert, spec.group, spec.desc || row.description || '', row.id);

    if (row.unit === spec.unit) {
      // Already in canonical unit. Give zero-stock items their starter and
      // make sure a qty entered via the UI is anchored in the ledger.
      const bal = ledgerBalance(row.id);
      if (bal === null && row.qty > 0 && row.qty !== 100) {
        setBalance(row.id, row.qty, 'Opening balance (seed v2)');
        report.preserved.push(`${row.name} (${row.qty} ${row.unit})`);
      } else if ((bal === null || bal === 0) && (row.qty === 0 || row.qty === 100)) {
        setBalance(row.id, spec.qty, 'Starter stock (seed v2) — set real qty via purchase/adjustment');
        report.starterStock.push(`${spec.name} (${spec.qty} ${spec.unit})`);
      }
      continue;
    }

    const isDummy = row.qty === 100 || row.qty === 0;
    if (LEGACY_UNITS[row.unit] !== undefined && isDummy) {
      // Untouched legacy seed row — migrate unit and reset to starter.
      db.prepare('UPDATE inventory SET unit = ? WHERE id = ?').run(spec.unit, row.id);
      setBalance(row.id, spec.qty, `Unit migration ${row.unit} -> ${spec.unit} + starter stock (seed v2)`);
      report.migrated.push(`${spec.name}: ${row.qty} ${row.unit} -> ${spec.qty} ${spec.unit}`);
    } else {
      // Unexpected unit or a quantity someone set on purpose — leave it.
      // Recipe amounts will be converted into this unit where possible.
      report.preserved.push(`${row.name} (${row.qty} ${row.unit})`);
    }
  }

  // 3) Recipes — replace the mapping for every menu item we know.
  const menuByName = new Map();
  for (const r of db.prepare('SELECT id, name FROM menu_items WHERE org_id = ?').all(orgId)) {
    menuByName.set(r.name.toLowerCase(), r);
  }
  const specUnit = new Map(CATALOG.map(s => [s.name.toLowerCase(), s.unit]));
  const delRecipe = db.prepare('DELETE FROM menu_recipes WHERE org_id = ? AND menu_item_id = ?');
  const insRecipe = db.prepare('INSERT INTO menu_recipes (org_id, menu_item_id, inventory_id, qty_per_unit) VALUES (?, ?, ?, ?)');

  for (const [menuName, ingredients] of Object.entries(RECIPES)) {
    const menu = menuByName.get(menuName.toLowerCase());
    if (!menu) { report.skippedMenu.push(menuName); continue; }

    const rows = [];
    for (const [ingName, qty] of ingredients) {
      const inv = getInv.get(orgId, ingName);
      if (!inv) { report.skippedIngredients.push(`${menuName}: ${ingName} (not found)`); continue; }
      const finalQty = convertQty(qty, specUnit.get(ingName.toLowerCase()) || inv.unit, inv.unit);
      if (finalQty === null) {
        report.skippedIngredients.push(`${menuName}: ${ingName} (can't convert to "${inv.unit}")`);
        continue;
      }
      rows.push([inv.id, finalQty]);
    }
    if (!rows.length) { report.skippedMenu.push(menuName); continue; }

    delRecipe.run(orgId, menu.id);
    for (const [invId, qty] of rows) insRecipe.run(orgId, menu.id, invId, qty);
    report.recipes.push(menuName);
  }

  // 4) Menu descriptions — encode serving sizes.
  const updDesc = db.prepare('UPDATE menu_items SET description = ? WHERE org_id = ? AND name = ?');
  for (const [name, desc] of Object.entries(MENU_DESC)) {
    const r = updDesc.run(desc, orgId, name);
    report.descUpdated += r.changes;
  }
});

run();

// ---------- Report ---------------------------------------------------
const fmtQty = (n) => (Math.round(n * 1000) / 1000).toString();
console.log('\n================= RECIPE & INVENTORY SEED v2 — DONE =================');
if (report.renamed.length)   console.log(`Renamed: ${report.renamed.join('; ')}`);
if (report.created.length)   console.log(`Created ${report.created.length} new stock items:\n   - ${report.created.join('\n   - ')}`);
if (report.migrated.length)  console.log(`Migrated to human units (qty RESET to starter — review!):\n   - ${report.migrated.join('\n   - ')}`);
if (report.starterStock.length) console.log(`Starter stock posted:\n   - ${report.starterStock.join('\n   - ')}`);
if (report.preserved.length) console.log(`Left untouched (real data detected):\n   - ${report.preserved.join('\n   - ')}`);
console.log(`Recipes set for ${report.recipes.length} menu items. Menu descriptions updated: ${report.descUpdated}.`);
if (report.skippedMenu.length)        console.log(`\n!! Menu items NOT mapped: ${report.skippedMenu.join(', ')}`);
if (report.skippedIngredients.length) console.log(`!! Ingredient lines skipped:\n   - ${report.skippedIngredients.join('\n   - ')}`);

// Full dump: every active menu item with its recipe, for eyeball review.
console.log('\n--------- CURRENT RECIPES (per 1 sale) ---------');
const menuRows = db.prepare(
  'SELECT id, name, category FROM menu_items WHERE org_id = ? AND active = 1 ORDER BY category, name'
).all(orgId);
const recipeFor = db.prepare(`
  SELECT i.name, r.qty_per_unit, i.unit FROM menu_recipes r
  JOIN inventory i ON i.id = r.inventory_id
  WHERE r.org_id = ? AND r.menu_item_id = ? ORDER BY i.name
`);
let lastCat = '';
for (const m of menuRows) {
  if (m.category !== lastCat) { console.log(`\n[${m.category.toUpperCase()}]`); lastCat = m.category; }
  const lines = recipeFor.all(orgId, m.id).map(r => `${r.name} ${fmtQty(r.qty_per_unit)}${r.unit === 'pcs' ? ' pc' : ' ' + r.unit}`);
  console.log(`  ${m.name}: ${lines.length ? lines.join(', ') : '— (no recipe — NOT deducting)'}`);
}
console.log('\nNOTE: quantities are sensible starters — rectify in Menu Management -> Recipe.');
console.log('Set real stock levels via Purchase Bills or Stock Adjustments.');
console.log('======================================================================\n');
