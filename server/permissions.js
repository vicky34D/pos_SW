// ===================================================================
// Page access. Each role may open a fixed set of pages; an admin can narrow
// that per person (users.pages, JSON array; NULL = the role's full set).
// Admins always see everything. Keep in sync with client/src/lib/pages.js.
// ===================================================================
const ALL = ['Admin', 'Manager', 'Employee', 'Viewer'];
const PAGE_ROLES = {
  pos: ALL,
  tables: ALL,
  reports: ['Admin', 'Manager', 'Employee'],
  orders: ['Admin', 'Manager', 'Employee'],
  inventory: ALL,
  stockledger: ['Admin', 'Manager'],
  suppliers: ['Admin', 'Manager'],
  purchase: ['Admin', 'Manager'],
  expenses: ['Admin', 'Manager'],
  menu: ['Admin', 'Manager', 'Employee'],
  team: ['Admin', 'Manager'],
  settings: ['Admin', 'Manager'],
};
const PAGE_IDS = Object.keys(PAGE_ROLES);

const rolePages = (role) => PAGE_IDS.filter(p => PAGE_ROLES[p].includes(role));

function parseCustom(raw) {
  if (raw == null || raw === '') return null;
  try { const a = JSON.parse(raw); return Array.isArray(a) ? a : null; } catch { return null; }
}

// Pages this user may open right now.
function effectivePages(role, rawCustom) {
  const allowed = rolePages(role);
  if (role === 'Admin') return allowed;
  const custom = parseCustom(rawCustom);
  return custom ? allowed.filter(p => custom.includes(p)) : allowed;
}

// Pass when the user may open at least one of the given pages.
function requirePage(...pages) {
  return (req, res, next) => {
    const mine = req.user?.pages || [];
    if (req.user?.role === 'Admin' || pages.some(p => mine.includes(p))) return next();
    return res.status(403).json({ error: 'You do not have access to this page' });
  };
}

module.exports = { PAGE_IDS, rolePages, parseCustom, effectivePages, requirePage };
