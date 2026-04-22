import { useState, useEffect } from 'react'
import * as api from '../api'

export default function InventoryView({ showToast }) {
  const [inventory, setInventory] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', qty: 0, unit: 'pcs', alert_level: 5 })

  useEffect(() => {
    api.getInventory().then(setInventory).catch(e => showToast(e.message, 'error'))
  }, [])

  const handleQtyChange = (id, val) => {
    setInventory(prev => prev.map(item =>
      item.id === id ? { ...item, qty: parseFloat(val) || 0 } : item
    ))
  }

  const saveAll = async () => {
    try {
      const updates = inventory.map(i => ({ id: i.id, qty: i.qty }))
      const result = await api.bulkUpdateInventory(updates)
      setInventory(result)
      showToast('Inventory saved successfully', 'success')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const addItem = async () => {
    if (!newItem.name.trim()) return showToast('Enter item name', 'error')
    try {
      const item = await api.createInventoryItem(newItem)
      setInventory(prev => [...prev, item].sort((a, b) => a.name.localeCompare(b.name)))
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

  return (
    <div className="view-section">
      <div className="top-header">
        <div className="header-left">
          <div className="header-title">Inventory Management</div>
          <div className="header-subtitle">Track and manage your stock levels</div>
        </div>
        <button className="btn-add-stock" onClick={() => setShowModal(true)}>+ Add Item</button>
      </div>

      <div className="inventory-grid">
        {inventory.map(item => {
          const badge = getBadge(item)
          return (
            <div key={item.id} className="stock-card">
              <div className="stock-card-header">
                <span className="stock-name">{item.name}</span>
                <span className={`stock-badge ${badge.cls}`}>{badge.text}</span>
              </div>
              <div className="stock-qty">
                <label>Qty:</label>
                <input
                  type="number"
                  value={item.qty}
                  min="0"
                  step="0.5"
                  onChange={e => handleQtyChange(item.id, e.target.value)}
                />
                <span className="stock-unit">{item.unit}</span>
              </div>
            </div>
          )
        })}
      </div>

      <button className="btn-save-stock" onClick={saveAll}>✅ Save All Changes</button>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Add New Stock Item</div>
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
