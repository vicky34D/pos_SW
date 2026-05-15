import { useState, useEffect } from 'react'
import * as api from '../api'

export default function UserManagement({ showToast, currentUser }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    password: '',
    role: 'Employee'
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const data = await api.getUsers()
      setUsers(data)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.createUser(newUser)
      showToast('User created successfully', 'success')
      setIsAdding(false)
      setNewUser({ name: '', email: '', phone: '', designation: '', password: '', role: 'Employee' })
      fetchUsers()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleToggleActive = async (user) => {
    if (user.id === currentUser.id) {
      showToast('You cannot deactivate your own account', 'error')
      return
    }
    try {
      await api.updateUserRole(user.id, { role: user.role, active: user.active ? 0 : 1 })
      showToast(`User ${user.active ? 'deactivated' : 'activated'}`, 'success')
      fetchUsers()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleRoleChange = async (user, newRole) => {
    if (user.id === currentUser.id && newRole !== 'Admin') {
      showToast('You cannot remove your own Admin role', 'error')
      return
    }
    try {
      await api.updateUserRole(user.id, { role: newRole })
      showToast(`Role updated to ${newRole}`, 'success')
      fetchUsers()
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (loading) return <div className="view-container"><div className="loading-state">Loading team members...</div></div>

  const activeUsers = users.filter(user => user.active)
  const inactiveUsers = users.filter(user => !user.active)

  return (
    <div className="view-section">
      <div className="top-header">
        <div className="header-left">
          <div className="header-title">Team</div>
          <div className="header-subtitle">Manage roles, access, and staff status</div>
        </div>
        {currentUser?.role === 'Admin' && (
          <button className="btn-add-stock" onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? 'Close Form' : 'Add Team Member'}
          </button>
        )}
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
          <div className="team-summary-value">{inactiveUsers.length}</div>
        </div>
      </div>

      {isAdding && (
        <div className="team-form-panel">
          <div className="team-panel-title">Add Team Member</div>
          <form className="team-form-grid" onSubmit={handleAddSubmit}>
            <div className="team-form-field">
              <label>Full Name</label>
              <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
            </div>
            <div className="team-form-field">
              <label>Email Address</label>
              <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
            </div>
            <div className="team-form-field">
              <label>Phone Number</label>
              <input type="text" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} />
            </div>
            <div className="team-form-field">
              <label>Designation</label>
              <input type="text" value={newUser.designation} onChange={e => setNewUser({...newUser, designation: e.target.value})} />
            </div>
            <div className="team-form-field">
              <label>Temporary Password</label>
              <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
            </div>
            <div className="team-form-field">
              <label>Role</label>
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Employee">Employee</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
            <div className="team-form-actions">
              <button type="submit" className="btn-save-stock">Create User</button>
            </div>
          </form>
        </div>
      )}

      <div className="team-list">
        {users.map(user => (
          <div key={user.id} className={`team-card ${user.active ? '' : 'team-card-inactive'}`}>
            <div className="team-card-main">
              <div className="team-avatar">{user.name?.charAt(0)?.toUpperCase() || 'U'}</div>
              <div className="team-meta">
                <div className="team-name-row">
                  <span className="team-name">{user.name}</span>
                  <span className={`team-status ${user.active ? 'active' : 'inactive'}`}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="team-designation">{user.designation || 'No designation set'}</div>
                <div className="team-contact-row">
                  <span>{user.email}</span>
                  <span>{user.phone || 'No phone'}</span>
                </div>
              </div>
            </div>

            <div className="team-card-controls">
              <div className="team-field-block">
                <label>Role</label>
                {currentUser?.role === 'Admin' ? (
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user, e.target.value)}
                    disabled={!user.active || user.id === currentUser.id}
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Employee">Employee</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                ) : (
                  <div className="team-role-readonly">{user.role}</div>
                )}
              </div>

              {currentUser?.role === 'Admin' && user.id !== currentUser.id && (
                <button
                  className="team-toggle-btn"
                  onClick={() => handleToggleActive(user)}
                >
                  {user.active ? 'Deactivate' : 'Activate'}
                </button>
              )}
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div className="inventory-empty-state">
            <div className="inventory-empty-title">No team members found</div>
            <div className="inventory-empty-copy">Create the first staff profile to start managing access.</div>
          </div>
        )}
      </div>
    </div>
  )
}
