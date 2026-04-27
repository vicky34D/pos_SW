export default function Sidebar({ activeView, onViewChange, currentUser, onLogout }) {
  const navItems = [
    { id: 'pos', icon: '⊞', label: 'POS', roles: ['Admin', 'Manager', 'Employee', 'Viewer'] },
    { id: 'inventory', icon: '📦', label: 'Stock', roles: ['Admin', 'Manager', 'Employee', 'Viewer'] },
    { id: 'reports', icon: '📊', label: 'Reports', roles: ['Admin', 'Manager', 'Employee'] },
    { id: 'menu', icon: '📋', label: 'Menu', roles: ['Admin', 'Manager', 'Employee'] },
    { id: 'team', icon: '👥', label: 'Team', roles: ['Admin', 'Manager'] },
  ]

  const userRole = currentUser?.role || 'Employee';
  const visibleNavItems = navItems.filter(item => item.roles.includes(userRole));

  const userInitial = currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">SW</div>

      <div className="nav-group">
        {visibleNavItems.map(item => (
          <div key={item.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              className={`nav-item${activeView === item.id ? ' active' : ''}`}
              onClick={() => onViewChange(item.id)}
              title={item.label}
            >
              <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
            </div>
            <span className={`nav-label${activeView === item.id ? '' : ''}`}
              style={activeView === item.id ? { color: 'white' } : {}}>
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <div className="nav-spacer" />

      {['Admin', 'Manager'].includes(userRole) && (
        <div className="nav-group">
          <div
            className={`nav-item${activeView === 'settings' ? ' active' : ''}`}
            onClick={() => onViewChange('settings')}
            title="Settings"
          >
            <span style={{ fontSize: '1.2rem' }}>⚙️</span>
          </div>
          <span className="nav-label" style={activeView === 'settings' ? { color: 'white' } : {}}>
            Settings
          </span>
        </div>
      )}

      {currentUser && (
        <div className="sidebar-user" onClick={onLogout} title={`Logged in as ${currentUser.name} (${userRole}). Click to Logout.`}>
          <div className="user-avatar">{userInitial}</div>
          <span className="logout-icon">⏻</span>
        </div>
      )}
    </aside>
  )
}
