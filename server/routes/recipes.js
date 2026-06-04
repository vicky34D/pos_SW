const express = require('express');
const router = express.Router();
const { db } = require('../db');
const { requireRole } = require('../middleware/auth');

// GET the recipe (ingredient list) for a menu item, joined with inventory info.
router.get('/:menuItemId', (req, res) => {
  const orgId = req.user.org_id;
  const rows = db.prepare(`
    SELECT r.id, r.inventory_id, r.qty_per_unit,
           i.name AS inventory_name, i.unit, i.qty AS stock_qty
    FROM menu_recipes r
    JOIN inventory i ON i.id = r.inventory_id AND i.org_id = r.org_id
    WHERE r.org_id = ? AND r.menu_item_id = ?
    ORDER BY i.name
  `).all(orgId, req.params.menuItemId);
  res.json(rows);
});

// PUT — replace the full recipe for a menu item.
// Body: { ingredients: [{ inventory_id, qty_per_unit }, ...] }
router.put('/:menuItemId', requireRole(['Admin', 'Manager']), (req, res) => {
  const orgId = req.user.org_id;
  const menuItemId = req.params.menuItemId;
  const { ingredients } = req.body;

  if (!Array.isArray(ingredients)) {
    return res.status(400).json({ error: 'ingredients array is required' });
  }

  // Validate the menu item belongs to this org.
  const menuItem = db.prepare('SELECT id FROM menu_items WHERE id = ? AND org_id = ?').get(menuItemId, orgId);
  if (!menuItem) return res.status(404).json({ error: 'Menu item not found' });

  const del = db.prepare('DELETE FROM menu_recipes WHERE org_id = ? AND menu_item_id = ?');
  const ins = db.prepare(`
    INSERT INTO menu_recipes (org_id, menu_item_id, inventory_id, qty_per_unit)
    VALUES (?, ?, ?, ?)
  `);

  const replace = db.transaction(() => {
    del.run(orgId, menuItemId);
    for (const ing of ingredients) {
      const invId = parseInt(ing.inventory_id, 10);
      const qty = parseFloat(ing.qty_per_unit);
      if (!invId || !(qty > 0)) continue; // skip blank/invalid rows
      // Ensure the inventory item exists for this org before linking.
      const inv = db.prepare('SELECT id FROM inventory WHERE id = ? AND org_id = ?').get(invId, orgId);
      if (!inv) continue;
      ins.run(orgId, menuItemId, invId, qty);
    }
  });

  replace();

  const rows = db.prepare(`
    SELECT r.id, r.inventory_id, r.qty_per_unit,
           i.name AS inventory_name, i.unit, i.qty AS stock_qty
    FROM menu_recipes r
    JOIN inventory i ON i.id = r.inventory_id AND i.org_id = r.org_id
    WHERE r.org_id = ? AND r.menu_item_id = ?
    ORDER BY i.name
  `).all(orgId, menuItemId);
  res.json(rows);
});

module.exports = router;
