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

  return (
    <div className="view-container fade-in">
      <div className="view-header">
        <h2 className="view-title">Team Management</h2>
        {currentUser?.role === 'Admin' && (
          <button className="btn-primary" onClick={() => setIsAdding(!isAdding)}>
            {isAdding ? 'Cancel' : '+ Add Team Member'}
          </button>
        )}
      </div>

      {isAdding && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3>Add New Team Member</h3>
          <form className="settings-form" onSubmit={handleAddSubmit} style={{ display: 'grid', gap: '15px', gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group">
              <label>Full Name</label>
              <input type="text" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="text" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Designation</label>
              <input type="text" value={newUser.designation} onChange={e => setNewUser({...newUser, designation: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Temporary Password</label>
              <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Employee">Employee</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
            <div className="form-actions" style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn-primary">Create User</button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              {currentUser?.role === 'Admin' && <th style={{textAlign: 'right'}}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className={!user.active ? 'inactive-row' : ''} style={!user.active ? {opacity: 0.5} : {}}>
                <td>
                  <div style={{fontWeight: 'bold'}}>{user.name}</div>
                  <div style={{fontSize: '0.8rem', color: 'var(--text-light)'}}>{user.designation || 'No Designation'}</div>
                </td>
                <td>{user.email}</td>
                <td>
                  {currentUser?.role === 'Admin' ? (
                    <select 
                      value={user.role} 
                      onChange={(e) => handleRoleChange(user, e.target.value)}
                      disabled={!user.active || user.id === currentUser.id}
                      style={{ padding: '4px', borderRadius: '4px' }}
                    >
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="Employee">Employee</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  ) : (
                    <span className={`status-badge ${user.role.toLowerCase()}`}>{user.role}</span>
                  )}
                </td>
                <td>
                  <span className={`status-badge ${user.active ? 'completed' : 'cancelled'}`}>
                    {user.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                {currentUser?.role === 'Admin' && (
                  <td style={{textAlign: 'right'}}>
                    {user.id !== currentUser.id && (
                      <button 
                        className="btn-icon" 
                        onClick={() => handleToggleActive(user)}
                        title={user.active ? "Deactivate User" : "Activate User"}
                      >
                        {user.active ? '🚫' : '✅'}
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {users.length === 0 && (
              <tr><td colSpan="5" className="empty-state">No team members found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
