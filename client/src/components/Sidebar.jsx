export default function Sidebar({ activeView, onViewChange, currentUser }) {
  const icons = {
    pos: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
    tables: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="10" width="18" height="4" rx="1"/><path d="M5 14v7M19 14v7M2 10l2-6h16l2 6"/></svg>,
    inventory: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>,
    suppliers: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    purchase: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    expenses: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>,
    stockledger: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
    reports: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>,
    menu: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
    team: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    settings: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  }

  // Items with mobileVisible:true appear in the bottom nav on mobile
  const navGroups = [
    {
      label: 'Sales',
      items: [
        { id: 'pos', label: 'Point of Sale', mobileLabel: 'POS', mobileVisible: true, roles: ['Admin','Manager','Employee','Viewer'] },
        { id: 'tables', label: 'Tables', mobileLabel: 'Tables', mobileVisible: true, roles: ['Admin','Manager','Employee','Viewer'] },
        { id: 'reports', label: 'Reports', mobileLabel: 'Reports', mobileVisible: true, roles: ['Admin','Manager','Employee'] },
      ]
    },
    {
      label: 'Inventory',
      items: [
        { id: 'inventory', label: 'Item Master', mobileVisible: false, roles: ['Admin','Manager','Employee','Viewer'] },
        { id: 'stockledger', label: 'Stock Ledger', mobileVisible: false, roles: ['Admin','Manager'] },
      ]
    },
    {
      label: 'Buying',
      items: [
        { id: 'suppliers', label: 'Suppliers', mobileVisible: false, roles: ['Admin','Manager'] },
        { id: 'purchase', label: 'Purchase Bills', mobileVisible: false, roles: ['Admin','Manager'] },
        { id: 'expenses', label: 'Expense Bills', mobileVisible: false, roles: ['Admin','Manager'] },
      ]
    },
    {
      label: 'Admin',
      items: [
        { id: 'menu', label: 'Menu Management', mobileLabel: 'Menu', mobileVisible: true, roles: ['Admin','Manager','Employee'] },
        { id: 'team', label: 'Team', mobileVisible: false, roles: ['Admin','Manager'] },
      ]
    }
  ]

  const userRole = currentUser?.role || 'Employee'
  const userInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U'

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-logo">SW</div>
        <div className="brand-text">
          <div className="brand-name">StreetWok</div>
          <div className="brand-tagline">POS · ERP</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-group">
          {navGroups.map(group => {
            const visible = group.items.filter(item => item.roles.includes(userRole))
            if (!visible.length) return null
            return (
              <div key={group.label} className="nav-section">
                <div className="nav-section-label">{group.label}</div>
                {visible.map(item => (
                  <button
                    key={item.id}
                    className={`nav-item${activeView === item.id ? ' active' : ''}${!item.mobileVisible ? ' mobile-hidden' : ''}`}
                    onClick={() => onViewChange(item.id)}
                    title={item.label}
                  >
                    {icons[item.id] || icons.settings}
                    <span className="nav-label">{item.mobileLabel || item.label}</span>
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {['Admin', 'Manager'].includes(userRole) && (
          <button
            className={`nav-item settings-nav${activeView === 'settings' ? ' active' : ''}`}
            onClick={() => onViewChange('settings')}
            title="Settings"
          >
            {icons.settings}
            <span className="nav-label">Settings</span>
          </button>
        )}
        {currentUser && (
          <div
            className="sidebar-user"
            title={`${currentUser.name} (${userRole}) — click to logout`}
            onClick={() => onViewChange('logout')}
          >
            <div className="user-avatar">{userInitial}</div>
            <div className="user-info">
              <div className="user-name">{currentUser.name}</div>
              <div className="user-role">{userRole}</div>
            </div>
          </div>
        )}
        {/* Mobile More button — taps open a drawer/overflow menu */}
        <button className="nav-item mobile-more-btn" title="More" onClick={() => onViewChange('more')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          <span className="nav-label">More</span>
        </button>
      </div>
    </aside>
  )
}
