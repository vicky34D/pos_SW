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
  { id: 'cigarettes', name: 'Cigarettes', emoji: '🚬' },
]

export default function MenuManagement({ showToast }) {
  const [items, setItems] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState({ name: '', price: '', category: 'burgers', description: '' })
  const [filterCat, setFilterCat] = useState('all')
  const [search, setSearch] = useState('')

  const fetchItems = async () => {
    try {
      const data = await api.getMenu()
      // Deduplicate by name+category
      const seen = new Set()
      const unique = data.filter(item => {
        const key = `${item.name}|${item.category}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      setItems(unique)
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

  const filtered = items.filter(item => {
    const matchesCat = filterCat === 'all' || item.category === filterCat
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
    return matchesCat && matchesSearch
  })

  const grouped = {}
  filtered.forEach(item => {
    const cat = item.category || 'other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(item)
  })

  return (
    <div className="view-section">
      <div className="top-header">
        <div className="header-left">
          <div className="header-title">Menu Management</div>
          <div className="header-subtitle">{items.length} items across {categoryOptions.length} categories</div>
        </div>
        <button className="btn-add-stock" onClick={openAdd}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
          Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="menu-mgmt-toolbar">
        <div className="search-wrapper" style={{ width: 'min(320px, 100%)' }}>
          <span className="search-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </span>
          <input placeholder="Search menu items..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="inventory-filter-group">
          <button className={`inventory-filter-btn${filterCat === 'all' ? ' active' : ''}`} onClick={() => setFilterCat('all')}>All</button>
          {categoryOptions.map(c => (
            <button key={c.id} className={`inventory-filter-btn${filterCat === c.id ? ' active' : ''}`} onClick={() => setFilterCat(c.id)}>
              {c.emoji} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Items Table */}
      <div className="report-card" style={{ flex: 1 }}>
        <div style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
          <table className="report-table menu-table">
            <thead>
              <tr>
                <th style={{ width: 50 }}></th>
                <th>Item Name</th>
                <th>Category</th>
                <th>Description</th>
                <th style={{ textAlign: 'right' }}>Price</th>
                <th style={{ textAlign: 'right', width: 140 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No menu items found</td></tr>
              ) : (
                filtered.map(item => {
                  const catInfo = categoryOptions.find(c => c.id === item.category)
                  return (
                    <tr key={item.id}>
                      <td style={{ textAlign: 'center', fontSize: '1.4rem' }}>{item.emoji}</td>
                      <td><span className="fw-bold">{item.name}</span></td>
                      <td><span className="mgmt-item-category">{catInfo?.emoji} {catInfo?.name || item.category}</span></td>
                      <td style={{ color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.description || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, fontFamily: "'Outfit', sans-serif" }}>₹{item.price}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="mgmt-actions" style={{ justifyContent: 'flex-end' }}>
                          <button className="mgmt-btn mgmt-btn-edit" onClick={() => openEdit(item)}>Edit</button>
                          <button className="mgmt-btn mgmt-btn-delete" onClick={() => handleDelete(item)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
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
                {categoryOptions.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
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
