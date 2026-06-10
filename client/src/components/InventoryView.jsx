import { useState, useEffect, useCallback } from 'react'
import * as api from '../api'

const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'bottle', 'packet', 'box', 'bag', 'dozen']

const statusBadge = (qty, alert) => {
  if (qty <= 0) return <span className="badge badge-red">Out of Stock</span>
  if (qty <= alert) return <span className="badge badge-orange">Low Stock</span>
  return <span className="badge badge-green">In Stock</span>
}

const emptyForm = {
  name: '', item_code: '', item_group: 'General', unit: 'pcs',
  qty: 0, alert_level: 5, reorder_qty: 0, valuation_rate: 0, description: ''
}

export default function InventoryView({ showToast }) {
  const [items, setItems] = useState([])
  const [valuation, setValuation] = useState({ items: [], total_stock_value: 0 })
  const [reorderItems, setReorderItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [activeTab, setActiveTab] = useState('items')
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [adjustments, setAdjustments] = useState([])

  const load = useCallback(async () => {
    try {
      const [inv, val, reorder] = await Promise.all([
        api.getInventory(),
        api.getStockValuation(),
        api.getReorderItems()
      ])
      setItems(inv)
      setValuation(val)
      setReorderItems(reorder)
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const groups = ['all', ...Array.from(new Set(items.map(i => i.item_group || 'General').filter(Boolean)))]

  const filtered = items.filter(item => {
    const matchSearch = !search || item.name.toLowerCase().includes(search.toLowerCase()) || (item.item_code || '').toLowerCase().includes(search.toLowerCase())
    const matchGroup = filterGroup === 'all' || (item.item_group || 'General') === filterGroup
    const matchStatus = filterStatus === 'all' ||
      (filterStatus === 'low' && item.qty <= item.alert_level && item.qty > 0) ||
      (filterStatus === 'out' && item.qty <= 0) ||
      (filterStatus === 'ok' && item.qty > item.alert_level)
    return matchSearch && matchGroup && matchStatus
  })

  const openNew = () => { setEditItem(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      name: item.name, item_code: item.item_code || '', item_group: item.item_group || 'General',
      unit: item.unit, qty: item.qty, alert_level: item.alert_level,
      reorder_qty: item.reorder_qty || 0, valuation_rate: item.valuation_rate || 0,
      description: item.description || ''
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) return showToast('Item name is required', 'error')
    setSaving(true)
    try {
      if (editItem) {
        await api.updateInventoryItem(editItem.id, form)
        showToast('Item updated', 'success')
      } else {
        await api.createInventoryItem(form)
        showToast('Item created', 'success')
      }
      setShowForm(false)
      load()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return
    try { await api.deleteInventoryItem(id); showToast('Deleted', 'success'); load() }
    catch (e) { showToast(e.message, 'error') }
  }

  const addAdjRow = () => setAdjustments(a => [...a, { item_id: '', qty_change: 0, incoming_rate: 0, notes: '' }])
  const setAdjRow = (i, field, val) => setAdjustments(a => a.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  const removeAdjRow = (i) => setAdjustments(a => a.filter((_, idx) => idx !== i))

  const submitAdjustment = async () => {
    const valid = adjustments.filter(r => r.item_id && r.qty_change !== 0)
    if (!valid.length) return showToast('Add at least one row with item + qty', 'error')
    try {
      await api.postStockAdjustment({ items: valid, voucher_type: 'Stock Adjustment' })
      showToast('Stock adjustment posted', 'success')
      setAdjustments([])
      load()
    } catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return <div className="frappe-loading">Loading Item Master…</div>

  return (
    <div className="frappe-page">
      <div className="frappe-page-head">
        <div className="frappe-page-head-left">
          <div className="frappe-breadcrumb">Inventory <span>›</span> Item Master</div>
          <h1 className="frappe-title">Item Master</h1>
        </div>
        <button className="frappe-btn frappe-btn-primary" onClick={openNew}>+ New Item</button>
      </div>
      <div className="frappe-page-body">

      {/* Summary strip */}
      <div className="frappe-stat-row">
        <div className="frappe-stat-card">
          <div className="frappe-stat-label">Total Items</div>
          <div className="frappe-stat-value">{items.length}</div>
        </div>
        <div className="frappe-stat-card">
          <div className="frappe-stat-label">Low / Out of Stock</div>
          <div className="frappe-stat-value text-danger">{items.filter(i => i.qty <= i.alert_level).length}</div>
        </div>
        <div className="frappe-stat-card">
          <div className="frappe-stat-label">Total Stock Value</div>
          <div className="frappe-stat-value">₹{valuation.total_stock_value?.toFixed(2)}</div>
        </div>
        <div className="frappe-stat-card">
          <div className="frappe-stat-label">Reorder Needed</div>
          <div className="frappe-stat-value text-orange">{reorderItems.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="frappe-tabs">
        {[['items','Items'], ['valuation','Valuation'], ['reorder','Reorder Alerts'], ['adjust','Stock Adjustment']].map(([id, label]) => (
          <button key={id} className={`frappe-tab${activeTab === id ? ' active' : ''}`} onClick={() => setActiveTab(id)}>
            {label}
            {id === 'reorder' && reorderItems.length > 0 && <span className="tab-badge">{reorderItems.length}</span>}
          </button>
        ))}
      </div>

      {/* === Items Tab === */}
      {activeTab === 'items' && (
        <>
          <div className="frappe-toolbar">
            <input className="frappe-search" placeholder="Search items or SKU…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="frappe-select" value={filterGroup} onChange={e => setFilterGroup(e.target.value)}>
              {groups.map(g => <option key={g} value={g}>{g === 'all' ? 'All Groups' : g}</option>)}
            </select>
            <select className="frappe-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="ok">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
            <span className="frappe-count">{filtered.length} of {items.length} items</span>
          </div>
          <div className="frappe-table-wrap">
            <table className="frappe-table">
              <thead>
                <tr>
                  <th>Item Name</th><th>SKU</th><th>Group</th><th>Qty</th>
                  <th>Unit</th><th>Val. Rate (₹)</th><th>Stock Value (₹)</th>
                  <th>Alert Lvl</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && <tr><td colSpan={10} className="frappe-empty">No items found</td></tr>}
                {filtered.map(item => (
                  <tr key={item.id} className="frappe-row" onClick={() => openEdit(item)}>
                    <td className="fw-medium">{item.name}</td>
                    <td className="text-muted">{item.item_code || '—'}</td>
                    <td><span className="frappe-tag">{item.item_group || 'General'}</span></td>
                    <td className={item.qty <= item.alert_level ? 'text-danger fw-bold' : ''}>{item.qty}</td>
                    <td>{item.unit}</td>
                    <td>{item.valuation_rate > 0 ? `₹${Number(item.valuation_rate).toFixed(2)}` : '—'}</td>
                    <td>{item.valuation_rate > 0 ? `₹${(item.qty * item.valuation_rate).toFixed(2)}` : '—'}</td>
                    <td>{item.alert_level}</td>
                    <td>{statusBadge(item.qty, item.alert_level)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <button className="frappe-icon-btn" onClick={() => openEdit(item)}>✏️</button>
                      <button className="frappe-icon-btn" onClick={() => handleDelete(item.id)}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* === Valuation Tab === */}
      {activeTab === 'valuation' && (
        <div className="frappe-table-wrap">
          <table className="frappe-table">
            <thead>
              <tr><th>Item</th><th>SKU</th><th>Group</th><th>Qty</th><th>Unit</th><th>Val. Rate (₹)</th><th>Stock Value (₹)</th></tr>
            </thead>
            <tbody>
              {valuation.items?.map(row => (
                <tr key={row.item_id} className="frappe-row">
                  <td className="fw-medium">{row.item_name}</td>
                  <td className="text-muted">{row.item_code || '—'}</td>
                  <td><span className="frappe-tag">{row.item_group || '—'}</span></td>
                  <td>{row.qty}</td><td>{row.unit}</td>
                  <td>₹{Number(row.valuation_rate).toFixed(4)}</td>
                  <td className="fw-medium">₹{Number(row.stock_value).toFixed(2)}</td>
                </tr>
              ))}
              {!valuation.items?.length && <tr><td colSpan={7} className="frappe-empty">No stock posted yet. Submit a Purchase Bill first.</td></tr>}
            </tbody>
            {valuation.items?.length > 0 && (
              <tfoot>
                <tr>
                  <td colSpan={6} className="fw-bold text-right">Total Stock Value</td>
                  <td className="fw-bold">₹{valuation.total_stock_value?.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* === Reorder Tab === */}
      {activeTab === 'reorder' && (
        <>
          <div className={`frappe-alert-banner ${reorderItems.length ? 'warning' : 'success'}`}>
            {reorderItems.length > 0
              ? `⚠️ ${reorderItems.length} item(s) are at or below reorder level — raise Purchase Bills`
              : '✅ All items are above their reorder level'}
          </div>
          <div className="frappe-table-wrap">
            <table className="frappe-table">
              <thead>
                <tr><th>Item</th><th>Group</th><th>Current Qty</th><th>Alert Level</th><th>Reorder Qty</th><th>Last Supplier</th><th>Val. Rate</th></tr>
              </thead>
              <tbody>
                {reorderItems.map(item => (
                  <tr key={item.id} className="frappe-row">
                    <td className="fw-medium">{item.name}</td>
                    <td><span className="frappe-tag">{item.item_group || 'General'}</span></td>
                    <td className="text-danger fw-bold">{item.qty} {item.unit}</td>
                    <td>{item.alert_level}</td>
                    <td>{item.reorder_qty || '—'}</td>
                    <td>{item.last_supplier || '—'}</td>
                    <td>{item.valuation_rate > 0 ? `₹${Number(item.valuation_rate).toFixed(2)}` : '—'}</td>
                  </tr>
                ))}
                {!reorderItems.length && <tr><td colSpan={7} className="frappe-empty">No items below reorder level</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* === Stock Adjustment Tab === */}
      {activeTab === 'adjust' && (
        <div className="frappe-form-section">
          <p className="text-muted mb-1">Post opening stock, write-offs, or manual corrections. Each row creates an immutable stock ledger entry.</p>
          <div className="frappe-table-wrap">
            <table className="frappe-table">
              <thead><tr><th>Item</th><th>Qty Change (+/-)</th><th>Incoming Rate (₹)</th><th>Notes</th><th></th></tr></thead>
              <tbody>
                {adjustments.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <select className="frappe-input" value={row.item_id} onChange={e => setAdjRow(i, 'item_id', e.target.value)}>
                        <option value="">Select item…</option>
                        {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                      </select>
                    </td>
                    <td><input className="frappe-input" type="number" value={row.qty_change} onChange={e => setAdjRow(i, 'qty_change', Number(e.target.value))} /></td>
                    <td><input className="frappe-input" type="number" step="0.01" placeholder="0" value={row.incoming_rate} onChange={e => setAdjRow(i, 'incoming_rate', Number(e.target.value))} /></td>
                    <td><input className="frappe-input" placeholder="Optional" value={row.notes} onChange={e => setAdjRow(i, 'notes', e.target.value)} /></td>
                    <td><button className="frappe-icon-btn" onClick={() => removeAdjRow(i)}>✕</button></td>
                  </tr>
                ))}
                {!adjustments.length && <tr><td colSpan={5} className="frappe-empty">Click "+ Add Row" to start</td></tr>}
              </tbody>
            </table>
          </div>
          <div style={{display:'flex', gap:'0.5rem', marginTop:'1rem'}}>
            <button className="frappe-btn frappe-btn-secondary" onClick={addAdjRow}>+ Add Row</button>
            {adjustments.length > 0 && <button className="frappe-btn frappe-btn-primary" onClick={submitAdjustment}>Post Adjustment</button>}
          </div>
        </div>
      )}

      {/* Item Form Modal */}
      {showForm && (
        <div className="frappe-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="frappe-modal" onClick={e => e.stopPropagation()}>
            <div className="frappe-modal-head">
              <h2>{editItem ? 'Edit Item' : 'New Item'}</h2>
              <button className="frappe-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="frappe-form-grid">
              {[
                ['Item Name *', 'name', 'text', 'e.g. Chicken Breast'],
                ['SKU / Item Code', 'item_code', 'text', 'e.g. CHK-001'],
              ].map(([label, key, type, placeholder]) => (
                <div className="frappe-field" key={key}>
                  <label>{label}</label>
                  <input className="frappe-input" type={type} placeholder={placeholder} value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div className="frappe-field">
                <label>Item Group</label>
                <input className="frappe-input" list="item-groups-dl" value={form.item_group}
                  onChange={e => setForm(f => ({ ...f, item_group: e.target.value }))} />
                <datalist id="item-groups-dl">
                  {['General','Raw Material','Packaging','Beverages'].map(g => <option key={g} value={g} />)}
                </datalist>
              </div>
              <div className="frappe-field">
                <label>Unit of Measure</label>
                <select className="frappe-input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div className="frappe-field">
                <label>Current Qty</label>
                <input className="frappe-input" type="number" step="0.001" value={form.qty}
                  onChange={e => setForm(f => ({ ...f, qty: Number(e.target.value) }))} />
              </div>
              <div className="frappe-field">
                <label>Alert Level</label>
                <input className="frappe-input" type="number" step="0.001" value={form.alert_level}
                  onChange={e => setForm(f => ({ ...f, alert_level: Number(e.target.value) }))} />
              </div>
              <div className="frappe-field">
                <label>Reorder Qty</label>
                <input className="frappe-input" type="number" step="0.001" value={form.reorder_qty}
                  onChange={e => setForm(f => ({ ...f, reorder_qty: Number(e.target.value) }))} />
              </div>
              <div className="frappe-field">
                <label>Opening Valuation Rate (₹)</label>
                <input className="frappe-input" type="number" step="0.01" value={form.valuation_rate}
                  onChange={e => setForm(f => ({ ...f, valuation_rate: Number(e.target.value) }))} />
              </div>
              <div className="frappe-field frappe-field-full">
                <label>Description</label>
                <input className="frappe-input" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <div className="frappe-modal-footer">
              <button className="frappe-btn frappe-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="frappe-btn frappe-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
      </div>{/* frappe-page-body */}
    </div>
  )
}
