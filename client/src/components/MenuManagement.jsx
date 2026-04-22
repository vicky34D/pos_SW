import { useState, useEffect } from 'react'
import * as api from '../api'

const categoryOptions = [
  { id: 'burgers', name: 'Burgers', emoji: '🍔' },
  { id: 'fries', name: 'Fries', emoji: '🍟' },
  { id: 'strips', name: 'Strips', emoji: '🍗' },
  { id: 'drinks', name: 'Chai & Coffee', emoji: '☕' },
  { id: 'popcorn', name: 'Popcorn', emoji: '🍿' },
  { id: 'snacks', name: 'Snacks', emoji: '🧀' },
  { id: 'wings', name: 'Wings', emoji: '🍗' },
  { id: 'momos', name: 'Momos', emoji: '🥟' },
  { id: 'combos', name: 'Combos', emoji: '🎁' },
]

export default function MenuManagement({ showToast }) {
  const [items, setItems] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', price: '', category: 'burgers', description: '' })

  const fetchItems = async () => {
    try {
      const data = await api.getMenu()
      setItems(data)
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  useEffect(() => { fetchItems() }, [])

  const openAdd = () => {
    setEditItem(null)
    setForm({ name: '', price: '', category: 'burgers', description: '' })
    setShowModal(true)
  }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({ name: item.name, price: item.price, category: item.category, description: item.description || '' })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return showToast('Enter item name', 'error')
    if (!form.price || parseFloat(form.price) <= 0) return showToast('Enter valid price', 'error')

    const catInfo = categoryOptions.find(c => c.id === form.category)
    const payload = { ...form, price: parseFloat(form.price), emoji: catInfo?.emoji || '🍽️' }

    try {
      if (editItem) {
        await api.updateMenuItem(editItem.id, payload)
        showToast(`${form.name} updated`, 'success')
      } else {
        await api.createMenuItem(payload)
        showToast(`${form.name} added`, 'success')
      }
      setShowModal(false)
      fetchItems()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.name}" from menu?`)) return
    try {
      await api.deleteMenuItem(item.id)
      showToast(`${item.name} removed`, 'info')
      fetchItems()
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  return (
    <div className="view-section">
      <div className="top-header">
        <div className="header-left">
          <div className="header-title">Menu Management</div>
          <div className="header-subtitle">Add, edit or remove menu items</div>
        </div>
        <button className="btn-add-stock" onClick={openAdd}>+ Add Item</button>
      </div>

      <div className="menu-mgmt-grid">
        {items.map(item => {
          const catInfo = categoryOptions.find(c => c.id === item.category)
          return (
            <div key={item.id} className="menu-mgmt-card">
              <div className="mgmt-card-header">
                <span className="mgmt-item-name">{item.emoji} {item.name}</span>
                <span className="mgmt-item-price">₹{item.price}</span>
              </div>
              <span className="mgmt-item-category">{catInfo?.name || item.category}</span>
              {item.description && (
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {item.description}
                </div>
              )}
              <div className="mgmt-actions">
                <button className="mgmt-btn mgmt-btn-edit" onClick={() => openEdit(item)}>Edit</button>
                <button className="mgmt-btn mgmt-btn-delete" onClick={() => handleDelete(item)}>Delete</button>
              </div>
            </div>
          )
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">{editItem ? 'Edit Menu Item' : 'Add New Menu Item'}</div>
            <div className="modal-form-group">
              <label>Item Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Chicken Burger" />
            </div>
            <div className="modal-form-group">
              <label>Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {categoryOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="modal-form-group">
              <label>Price (₹)</label>
              <input type="number" value={form.price} min="0" onChange={e => setForm({ ...form, price: e.target.value })} />
            </div>
            <div className="modal-form-group">
              <label>Description (optional)</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="e.g. Combo details" />
            </div>
            <div className="modal-actions">
              <button className="btn-modal btn-modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-modal btn-modal-confirm" onClick={handleSave}>Save Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
