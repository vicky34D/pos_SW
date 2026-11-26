import { useState, useEffect } from 'react'
import * as api from '../api'
import { ALL_PAGES, rolePages } from '../lib/pages'

// What each role can open and change. The server enforces the same rules on
// every request, so hiding a button here is only a convenience.
const ROLE_INFO = {
  Admin: {
    tag: 'Full access',
    can: 'Everything: sales, menu, stock, purchases, expenses, reports, settings and the team.',
  },
  Manager: {
    tag: 'Runs the shop',
    can: 'Sales, tables, menu, item master, stock, suppliers, purchase & expense bills, reports and settings. Can see the team but not change it.',
  },
  Employee: {
    tag: 'Counter staff',
    can: 'Take orders (POS, tables, held orders), see order history, reports, the menu and stock levels. Cannot edit the menu, stock or bills. Untick pages to show them less.',
  },
  Viewer: {
    tag: 'Read only',
    can: 'Can look at the POS, tables and stock levels. Cannot take orders or change anything.',
  },
}
const ROLES = ['Admin', 'Manager', 'Employee', 'Viewer']
const emptyUser = { name: '', email: '', phone: '', designation: '', password: '', role: 'Employee', pages: null }

// The pages a person can open: their own list, or everything their role allows.
const pagesOf = (u) => {
  const byRole = rolePages(u.role)
  return u.role === 'Admin' || !Array.isArray(u.pages) ? byRole : byRole.filter(p => u.pages.includes(p))
}

// Tick boxes for the pages a role allows. `value` null = all of them.
function PagePicker({ role, value, onChange }) {
  const allowed = rolePages(role)
  const picked = Array.isArray(value) ? value.filter(p => allowed.includes(p)) : allowed
  const toggle = (id) => {
    const next = picked.includes(id) ? picked.filter(p => p !== id) : [...picked, id]
    onChange(next.length === allowed.length ? null : next)
  }
  return (
    <div className="team-pages">
      {ALL_PAGES.filter(p => allowed.includes(p.id)).map(p => (
        <label key={p.id} className={`team-page-chip${picked.includes(p.id) ? ' is-on' : ''}`}>
          <input type="checkbox" checked={picked.includes(p.id)} onChange={() => toggle(p.id)} />
          {p.label}
        </label>
      ))}
    </div>
  )
}

const makePassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = crypto.getRandomValues(new Uint8Array(10))
  return Array.from(bytes, b => chars[b % chars.length]).join('')
}

export default function UserManagement({ showToast, currentUser }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newUser, setNewUser] = useState(emptyUser)
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [accessEdit, setAccessEdit] = useState({}) // userId -> draft pages (null = all)

  const isAdmin = currentUser?.role === 'Admin'
  const isOwner = !!currentUser?.is_owner

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    try { setUsers(await api.getUsers()) }
    catch (err) { showToast(err.message, 'error') }
    finally { setLoading(false) }
  }

  // Mirrors the server rules so the screen only offers what will work.
  const canManage = (user) => {
    if (!isAdmin || user.id === currentUser.id) return false
    if (user.is_owner) return false
    if (user.role === 'Admin' && !isOwner) return false
    return true
  }
  const roleChoices = isOwner ? ROLES : ROLES.filter(r => r !== 'Admin')

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.createUser(newUser)
      showToast(`${newUser.name} added as ${newUser.role}. Share the email and password with them.`, 'success')
      setIsAdding(false)
      setNewUser(emptyUser)
      fetchUsers()
    } catch (err) { showToast(err.message, 'error') }
    finally { setSaving(false) }
  }

  const handleToggleActive = async (user) => {
    if (user.active && !window.confirm(`Deactivate ${user.name}? They will be signed out and cannot log in until re-activated.`)) return
    try {
      await api.updateUserRole(user.id, { active: user.active ? 0 : 1 })
      showToast(`${user.name} ${user.active ? 'deactivated' : 'activated'}`, 'success')
      fetchUsers()
    } catch (err) { showToast(err.message, 'error') }
  }

  const handleRoleChange = async (user, role) => {
    if (role === user.role) return
    try {
      await api.updateUserRole(user.id, { role })
      showToast(`${user.name} is now ${role}`, 'success')
      fetchUsers()
    } catch (err) { showToast(err.message, 'error') }
  }

  const saveAccess = async (user) => {
    const pages = accessEdit[user.id]
    if (Array.isArray(pages) && pages.length === 0) return showToast('Tick at least one page', 'error')
    try {
      await api.updateUserRole(user.id, { pages })
      showToast(`Access saved for ${user.name}. It applies right away.`, 'success')
      setAccessEdit(a => { const n = { ...a }; delete n[user.id]; return n })
      fetchUsers()
    } catch (err) { showToast(err.message, 'error') }
  }

  const handleResetPassword = async (user) => {
    const pw = window.prompt(`New password for ${user.name} (at least 6 characters):`, makePassword())
    if (pw === null) return
    try {
      await api.setUserPassword(user.id, { password: pw })
      showToast(`Password changed for ${user.name}. Share it with them privately.`, 'success')
    } catch (err) { showToast(err.message, 'error') }
  }

  const handleChangeMyPassword = async () => {
    const current = window.prompt('Your current password:')
    if (current === null) return
    const next = window.prompt('New password (at least 6 characters):')
    if (next === null) return
    try {
      await api.setUserPassword(currentUser.id, { current_password: current, password: next })
      showToast('Your password was changed', 'success')
    } catch (err) { showToast(err.message, 'error') }
  }

  const handleMakeOwner = async (user) => {
    if (!window.confirm(`Make ${user.name} the main admin? You will stay an Admin but lose main-admin control.`)) return
    try {
      await api.makeUserOwner(user.id)
      showToast(`${user.name} is now the main admin`, 'success')
      window.location.reload()
    } catch (err) { showToast(err.message, 'error') }
  }

  if (loading) return <div className="view-container"><div className="loading-state">Loading team members...</div></div>

  const activeUsers = users.filter(u => u.active)
  const owner = users.find(u => u.is_owner)

  return (
    <div className="view-section">
      <div className="top-header">
        <div className="header-left">
          <div className="header-title">Team</div>
          <div className="header-subtitle">
            Create staff logins and choose what each person can access{owner ? ` · Main admin: ${owner.name}` : ''}
          </div>
        </div>
        <div className="bill-scan-actions">
          <button className="btn-modal btn-modal-cancel" onClick={handleChangeMyPassword}>Change my password</button>
          {isAdmin && (
            <button className="btn-add-stock" onClick={() => setIsAdding(!isAdding)}>
              {isAdding ? 'Close Form' : '+ Add Team Member'}
            </button>
          )}
        </div>
      </div>

      <div className="team-summary-grid">
        <div className="team-summary-card">
          <div className="team-summary-label">Total Members</div>
          <div className="team-summary-value">{users.length}</div>
        </div>
        <div className="team-summary-card">
          <div className="team-summary-label">Active</div>
          <div className="team-summary-value">{activeUsers.length}</div>
        </div>
        <div className="team-summary-card">
          <div className="team-summary-label">Inactive</div>
          <div className="team-summary-value">{users.length - activeUsers.length}</div>
        </div>
      </div>

      {isAdding && (
        <div className="team-form-panel">
          <div className="team-panel-title">Add Team Member</div>
          <form className="team-form-grid" onSubmit={handleAddSubmit}>
            <div className="team-form-field">
              <label>Full Name</label>
              <input type="text" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} required />
            </div>
            <div className="team-form-field">
              <label>Email (used to log in)</label>
              <input type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} required />
            </div>
            <div className="team-form-field">
              <label>Phone Number</label>
              <input type="text" value={newUser.phone} onChange={e => setNewUser({ ...newUser, phone: e.target.value })} />
            </div>
            <div className="team-form-field">
              <label>Designation</label>
              <input type="text" placeholder="e.g. Cashier, Chef" value={newUser.designation} onChange={e => setNewUser({ ...newUser, designation: e.target.value })} />
            </div>
            <div className="team-form-field">
              <label>Password (min 6 characters)</label>
              <div className="team-pw-row">
                <input type={showPw ? 'text' : 'password'} minLength={6} value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                <button type="button" className="team-pw-btn" onClick={() => setShowPw(s => !s)}>{showPw ? 'Hide' : 'Show'}</button>
                <button type="button" className="team-pw-btn" onClick={() => { setNewUser({ ...newUser, password: makePassword() }); setShowPw(true) }}>Generate</button>
              </div>
            </div>
            <div className="team-form-field">
              <label>Role</label>
              <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value, pages: null })}>
                {roleChoices.map(r => <option key={r} value={r}>{r} — {ROLE_INFO[r].tag}</option>)}
              </select>
              <div className="team-role-help">{ROLE_INFO[newUser.role].can}</div>
            </div>
            {newUser.role !== 'Admin' && (
              <div className="team-form-field team-form-wide">
                <label>Pages they can open (untick to hide)</label>
                <PagePicker role={newUser.role} value={newUser.pages} onChange={pages => setNewUser({ ...newUser, pages })} />
              </div>
            )}
            <div className="team-form-actions">
              <button type="submit" className="btn-save-stock" disabled={saving}>{saving ? 'Creating…' : 'Create User'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="team-list">
        {users.map(user => {
          const manageable = canManage(user)
          const isMe = user.id === currentUser?.id
          return (
            <div key={user.id} className={`team-card ${user.active ? '' : 'team-card-inactive'}`}>
              <div className="team-card-main">
                <div className="team-avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</div>
                <div className="team-meta">
                  <div className="team-name-row">
                    <span className="team-name">{user.name}{isMe ? ' (you)' : ''}</span>
                    {user.is_owner && <span className="team-owner-badge">Main admin</span>}
                    <span className={`team-status ${user.active ? 'active' : 'inactive'}`}>{user.active ? 'Active' : 'Inactive'}</span>
                  </div>
                  <div className="team-designation">{user.designation || 'No designation set'}</div>
                  <div className="team-contact-row">
                    <span>{user.email}</span>
                    <span>{user.phone || 'No phone'}</span>
                  </div>
                  <div className="team-access-row">
                    <span className="team-access-label">Can open:</span>
                    {user.role === 'Admin'
                      ? <span className="team-page-chip is-on is-static">All pages</span>
                      : pagesOf(user).map(id => <span key={id} className="team-page-chip is-on is-static">{ALL_PAGES.find(p => p.id === id)?.label}</span>)}
                    {manageable && user.role !== 'Admin' && !(user.id in accessEdit) && (
                      <button className="team-pw-btn" onClick={() => setAccessEdit(a => ({ ...a, [user.id]: user.pages }))}>Edit access</button>
                    )}
                  </div>
                  {user.id in accessEdit && (
                    <div className="team-access-editor">
                      <PagePicker role={user.role} value={accessEdit[user.id]} onChange={pages => setAccessEdit(a => ({ ...a, [user.id]: pages }))} />
                      <div className="team-access-actions">
                        <button className="btn-save-stock" onClick={() => saveAccess(user)}>Save access</button>
                        <button className="team-pw-btn" onClick={() => setAccessEdit(a => ({ ...a, [user.id]: null }))}>All pages</button>
                        <button className="team-pw-btn" onClick={() => setAccessEdit(a => { const n = { ...a }; delete n[user.id]; return n })}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="team-card-controls">
                <div className="team-field-block">
                  <label>Role</label>
                  {manageable ? (
                    <select value={user.role} onChange={(e) => handleRoleChange(user, e.target.value)} disabled={!user.active}>
                      {(roleChoices.includes(user.role) ? roleChoices : [user.role, ...roleChoices]).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  ) : (
                    <div className="team-role-readonly">{user.role}</div>
                  )}
                </div>
                {manageable && (
                  <>
                    <button className="team-toggle-btn" onClick={() => handleResetPassword(user)}>Reset password</button>
                    <button className="team-toggle-btn" onClick={() => handleToggleActive(user)}>{user.active ? 'Deactivate' : 'Activate'}</button>
                  </>
                )}
                {isOwner && !isMe && user.active && user.role === 'Admin' && (
                  <button className="team-toggle-btn" onClick={() => handleMakeOwner(user)}>Make main admin</button>
                )}
              </div>
            </div>
          )
        })}

        {users.length === 0 && (
          <div className="inventory-empty-state">
            <div className="inventory-empty-title">No team members found</div>
            <div className="inventory-empty-copy">Create the first staff profile to start managing access.</div>
          </div>
        )}
      </div>

      <div className="team-panel-title" style={{ marginTop: 18 }}>What each role can access</div>
      <div className="team-roles-grid">
        {ROLES.map(r => (
          <div key={r} className="team-role-card">
            <div className="team-role-name">{r} <span>{ROLE_INFO[r].tag}</span></div>
            <div className="team-role-help">{ROLE_INFO[r].can}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
