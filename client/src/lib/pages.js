// Every page in the app, which roles may open it, and the user's own access.
// The server enforces the same table (server/permissions.js) — keep in sync.
const ALL = ['Admin', 'Manager', 'Employee', 'Viewer']

export const PAGE_GROUPS = [
  { label: 'Sales', items: [
    { id: 'pos', label: 'Point of Sale', mobileLabel: 'POS', mobileVisible: true, roles: ALL },
    { id: 'tables', label: 'Tables', mobileLabel: 'Tables', mobileVisible: true, roles: ALL },
    { id: 'reports', label: 'Reports', mobileLabel: 'Reports', mobileVisible: true, roles: ['Admin', 'Manager', 'Employee'] },
    { id: 'orders', label: 'Order History', mobileLabel: 'History', mobileVisible: false, roles: ['Admin', 'Manager', 'Employee'] },
  ] },
  { label: 'Inventory', items: [
    { id: 'inventory', label: 'Item Master', mobileVisible: false, roles: ALL },
    { id: 'stockledger', label: 'Stock Ledger', mobileVisible: false, roles: ['Admin', 'Manager'] },
  ] },
  { label: 'Buying', items: [
    { id: 'suppliers', label: 'Suppliers', mobileVisible: false, roles: ['Admin', 'Manager'] },
    { id: 'purchase', label: 'Purchase Bills', mobileVisible: false, roles: ['Admin', 'Manager'] },
    { id: 'expenses', label: 'Expense Bills', mobileVisible: false, roles: ['Admin', 'Manager'] },
  ] },
  { label: 'Admin', items: [
    { id: 'menu', label: 'Menu Management', mobileLabel: 'Menu', mobileVisible: true, roles: ['Admin', 'Manager', 'Employee'] },
    { id: 'team', label: 'Team', mobileVisible: false, roles: ['Admin', 'Manager'] },
    { id: 'settings', label: 'Settings', mobileVisible: false, roles: ['Admin', 'Manager'], footer: true },
  ] },
]

export const ALL_PAGES = PAGE_GROUPS.flatMap(g => g.items)

export const rolePages = (role) => ALL_PAGES.filter(p => p.roles.includes(role)).map(p => p.id)

// Pages the signed-in user may open (server sends `pages`; fall back to role).
export function userPages(user) {
  if (!user) return []
  const byRole = rolePages(user.role || 'Employee')
  if (user.role === 'Admin' || !Array.isArray(user.pages)) return byRole
  return byRole.filter(p => user.pages.includes(p))
}

export const firstPage = (user) => {
  const pages = userPages(user)
  return pages.includes('pos') ? 'pos' : (pages[0] || 'pos')
}
