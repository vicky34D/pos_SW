export default function Sidebar({ activeView, onViewChange, currentUser, onLogout }) {
  const navItems = [
    { id: 'pos', icon: '⊞', label: 'POS' },
    { id: 'inventory', icon: '📦', label: 'Stock' },
    { id: 'reports', icon: '📊', label: 'Reports' },
    { id: 'menu', icon: '📋', label: 'Menu' },
  ]

  const userInitial = currentUser ? currentUser.charAt(0).toUpperCase() : 'U';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">SW</div>

      <div className="nav-group">
        {navItems.map(item => (
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

      {currentUser && (
        <div className="sidebar-user" onClick={onLogout} title={`Logged in as ${currentUser}. Click to Logout.`}>
          <div className="user-avatar">{userInitial}</div>
          <span className="logout-icon">⏻</span>
        </div>
      )}
    </aside>
  )
}
