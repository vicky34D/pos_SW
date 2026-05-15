import { useState, useEffect, useMemo } from 'react'
import * as api from '../api'

export default function InventoryView({ showToast }) {
  const [inventory, setInventory] = useState([])
  const [draftInventory, setDraftInventory] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isSaving, setIsSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', qty: 0, unit: 'pcs', alert_level: 5 })

  useEffect(() => {
    api.getInventory()
      .then(data => {
        setInventory(data)
        setDraftInventory(data)
      })
      .catch(e => showToast(e.message, 'error'))
  }, [])

  const getStatus = (item) => {
    if (item.qty <= 0) return 'out'
    if (item.qty <= item.alert_level) return 'low'
    return 'in'
  }

  const filteredInventory = useMemo(() => {
    return draftInventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase())
      const status = getStatus(item)
      const matchesStatus = statusFilter === 'all' ? true : status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [draftInventory, search, statusFilter])

  const hasChanges = useMemo(() => {
    if (inventory.length !== draftInventory.length) return true
    return draftInventory.some((item, index) => {
      const original = inventory[index]
      if (!original) return true
      return (
        item.name !== original.name ||
        Number(item.qty) !== Number(original.qty) ||
        item.unit !== original.unit ||
        Number(item.alert_level) !== Number(original.alert_level)
      )
    })
  }, [inventory, draftInventory])

  const handleFieldChange = (id, field, value) => {
    setDraftInventory(prev => prev.map(item =>
      item.id === id
        ? {
            ...item,
            [field]: field === 'qty' || field === 'alert_level' ? (value === '' ? '' : parseFloat(value) || 0) : value
          }
        : item
    ))
  }

  const reloadInventory = async () => {
    try {
      const data = await api.getInventory()
      setInventory(data)
      setDraftInventory(data)
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const saveAll = async () => {
    setIsSaving(true)
    try {
      await Promise.all(
        draftInventory.map(item =>
          api.updateInventoryItem(item.id, {
            name: item.name.trim(),
            qty: Number(item.qty) || 0,
            unit: item.unit,
            alert_level: Number(item.alert_level) || 0
          })
        )
      )
      await reloadInventory()
      showToast('Inventory saved successfully', 'success')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const addItem = async () => {
    if (!newItem.name.trim()) return showToast('Enter item name', 'error')
    try {
      const item = await api.createInventoryItem(newItem)
      const next = [...draftInventory, item].sort((a, b) => a.name.localeCompare(b.name))
      setInventory(next)
      setDraftInventory(next)
      setShowModal(false)
      setNewItem({ name: '', qty: 0, unit: 'pcs', alert_level: 5 })
      showToast(`${item.name} added`, 'success')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const getBadge = (item) => {
    if (item.qty <= 0) return { cls: 'out-of-stock', text: 'Out of Stock' }
    if (item.qty <= item.alert_level) return { cls: 'low-stock', text: 'Low Stock' }
    return { cls: 'in-stock', text: 'In Stock' }
  }

  const removeItem = async (item) => {
    try {
      await api.deleteInventoryItem(item.id)
      const next = draftInventory.filter(entry => entry.id !== item.id)
      setInventory(next)
      setDraftInventory(next)
      showToast(`${item.name} removed`, 'success')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  return (
    <div className="view-section">
      <div className="top-header">
        <div className="header-left">
          <div className="header-title">Inventory</div>
          <div className="header-subtitle">Manage stock, alert levels, and item units</div>
        </div>
        <div className="inventory-header-actions">
          <button className="btn-secondary-action" onClick={reloadInventory}>Refresh</button>
          <button className="btn-add-stock" onClick={() => setShowModal(true)}>Add Item</button>
        </div>
      </div>

      <div className="inventory-toolbar">
        <div className="search-wrapper inventory-search">
          <span className="search-icon">⌕</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search stock item"
          />
        </div>
        <div className="inventory-filter-group">
          <button className={`inventory-filter-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>All</button>
          <button className={`inventory-filter-btn ${statusFilter === 'in' ? 'active' : ''}`} onClick={() => setStatusFilter('in')}>In Stock</button>
          <button className={`inventory-filter-btn ${statusFilter === 'low' ? 'active' : ''}`} onClick={() => setStatusFilter('low')}>Low</button>
          <button className={`inventory-filter-btn ${statusFilter === 'out' ? 'active' : ''}`} onClick={() => setStatusFilter('out')}>Out</button>
        </div>
      </div>

      <div className="inventory-summary-bar">
        <span>{draftInventory.length} items</span>
        <span>{draftInventory.filter(item => getStatus(item) === 'low').length} low stock</span>
        <span>{draftInventory.filter(item => getStatus(item) === 'out').length} out of stock</span>
      </div>

      <div className="inventory-grid">
        {filteredInventory.map(item => {
          const badge = getBadge(item)
          return (
            <div key={item.id} className="stock-card">
              <div className="stock-card-header">
                <span className="stock-name">{item.name}</span>
                <span className={`stock-badge ${badge.cls}`}>{badge.text}</span>
              </div>
              <div className="inventory-card-grid">
                <div className="inventory-field inventory-field-wide">
                  <label>Name</label>
                  <input
                    type="text"
                    value={item.name}
                    onChange={e => handleFieldChange(item.id, 'name', e.target.value)}
                  />
                </div>
                <div className="inventory-field">
                  <label>Qty</label>
                  <input
                    type="number"
                    value={item.qty}
                    min="0"
                    step="0.5"
                    onChange={e => handleFieldChange(item.id, 'qty', e.target.value)}
                  />
                </div>
                <div className="inventory-field">
                  <label>Unit</label>
                  <select
                    value={item.unit}
                    onChange={e => handleFieldChange(item.id, 'unit', e.target.value)}
                  >
                    <option value="kg">kg</option>
                    <option value="litre">litre</option>
                    <option value="pcs">pcs</option>
                    <option value="packs">packs</option>
                    <option value="dozen">dozen</option>
                    <option value="grams">grams</option>
                  </select>
                </div>
                <div className="inventory-field">
                  <label>Alert at</label>
                  <input
                    type="number"
                    value={item.alert_level}
                    min="0"
                    step="0.5"
                    onChange={e => handleFieldChange(item.id, 'alert_level', e.target.value)}
                  />
                </div>
              </div>
              <div className="stock-card-footer">
                <div className="stock-note">
                  {item.qty <= item.alert_level ? 'Needs restock soon' : 'Stock level healthy'}
                </div>
                <button className="inventory-delete-btn" onClick={() => removeItem(item)}>Remove</button>
              </div>
            </div>
          )
        })}
        {filteredInventory.length === 0 && (
          <div className="inventory-empty-state">
            <div className="inventory-empty-title">No stock items found</div>
            <div className="inventory-empty-copy">Try a different search or add a new item.</div>
          </div>
        )}
      </div>

      <div className="inventory-footer-actions">
        <button className="btn-secondary-action" onClick={() => setDraftInventory(inventory)} disabled={!hasChanges}>Discard Changes</button>
        <button className="btn-save-stock" onClick={saveAll} disabled={!hasChanges || isSaving}>
          {isSaving ? 'Saving...' : 'Save Inventory'}
        </button>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add Stock Item</div>
            <div className="modal-form-group">
              <label>Item Name</label>
              <input value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} placeholder="e.g. Chicken Breast" />
            </div>
            <div className="modal-form-group">
              <label>Quantity</label>
              <input type="number" value={newItem.qty} min="0" onChange={e => setNewItem({ ...newItem, qty: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="modal-form-group">
              <label>Unit</label>
              <select value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })}>
                <option value="kg">Kilograms</option>
                <option value="litre">Litres</option>
                <option value="pcs">Pieces</option>
                <option value="packs">Packs</option>
                <option value="dozen">Dozen</option>
                <option value="grams">Grams</option>
              </select>
            </div>
            <div className="modal-form-group">
              <label>Low Stock Alert</label>
              <input type="number" value={newItem.alert_level} min="0" onChange={e => setNewItem({ ...newItem, alert_level: parseFloat(e.target.value) || 0 })} />
            </div>
            <div className="modal-actions">
              <button className="btn-modal btn-modal-cancel" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn-modal btn-modal-confirm" onClick={addItem}>Add Item</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
