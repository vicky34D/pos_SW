import { useState, useEffect, useCallback } from 'react'
import * as api from '../api'

const VOUCHER_COLORS = {
  'Purchase Bill': 'badge-green',
  'Sales Order': 'badge-blue',
  'Stock Adjustment': 'badge-orange',
  'Opening Stock': 'badge-grey'
}

export default function StockLedgerView({ showToast }) {
  const [entries, setEntries] = useState([])
  const [balance, setBalance] = useState([])
  const [items, setItems] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ledger')
  const [filters, setFilters] = useState({ item_id: '', warehouse_id: '', voucher_type: '', from: '', to: '', limit: 100 })

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }))

  const load = useCallback(async () => {
    try {
      const [inv, wh] = await Promise.all([api.getInventory(), api.getWarehouses()])
      setItems(inv); setWarehouses(wh)
    } catch (e) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [showToast])

  const loadEntries = useCallback(async () => {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
      const data = await api.getStockLedgerEntries(params)
      setEntries(data)
    } catch (e) { showToast(e.message, 'error') }
  }, [filters, showToast])

  const loadBalance = useCallback(async () => {
    try {
      const params = {}
      if (filters.warehouse_id) params.warehouse_id = filters.warehouse_id
      if (filters.item_id) params.item_id = filters.item_id
      const data = await api.getStockBalance(params)
      setBalance(data)
    } catch (e) { showToast(e.message, 'error') }
  }, [filters, showToast])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (activeTab === 'ledger') loadEntries()
    if (activeTab === 'balance') loadBalance()
  }, [activeTab, loadEntries, loadBalance])

  if (loading) return <div className="frappe-loading">Loading Stock Ledger…</div>

  return (
    <div className="frappe-page">
      <div className="frappe-page-head">
        <div>
          <h1 className="frappe-title">Stock Ledger</h1>
          <div className="frappe-breadcrumb">Inventory › Stock Ledger</div>
        </div>
      </div>

      <div className="frappe-tabs">
        {[['ledger','Stock Ledger Entries'],['balance','Current Stock Balance']].map(([id, label]) => (
          <button key={id} className={`frappe-tab${activeTab === id ? ' active' : ''}`} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </div>

      {/* Filters */}
      <div className="frappe-toolbar" style={{flexWrap:'wrap'}}>
        <select className="frappe-select" value={filters.item_id} onChange={e => setFilter('item_id', e.target.value)}>
          <option value="">All Items</option>
          {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
        </select>
        <select className="frappe-select" value={filters.warehouse_id} onChange={e => setFilter('warehouse_id', e.target.value)}>
          <option value="">All Warehouses</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        {activeTab === 'ledger' && (
          <select className="frappe-select" value={filters.voucher_type} onChange={e => setFilter('voucher_type', e.target.value)}>
            <option value="">All Voucher Types</option>
            {['Purchase Bill','Sales Order','Stock Adjustment','Opening Stock'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        )}
        <input className="frappe-input" type="date" placeholder="From" value={filters.from} onChange={e => setFilter('from', e.target.value)} style={{maxWidth:'140px'}} />
        <input className="frappe-input" type="date" placeholder="To" value={filters.to} onChange={e => setFilter('to', e.target.value)} style={{maxWidth:'140px'}} />
        <button className="frappe-btn frappe-btn-secondary" onClick={() => activeTab === 'ledger' ? loadEntries() : loadBalance()}>Apply Filters</button>
      </div>

      {/* Stock Ledger Tab */}
      {activeTab === 'ledger' && (
        <div className="frappe-table-wrap">
          <table className="frappe-table">
            <thead>
              <tr>
                <th>Date</th><th>Item</th><th>Warehouse</th><th>Voucher Type</th>
                <th>Voucher ID</th><th>Qty Change</th><th>In Rate (₹)</th>
                <th>Val. Rate (₹)</th><th>Balance Qty</th><th>Balance Value (₹)</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && <tr><td colSpan={10} className="frappe-empty">No ledger entries. Submit a Purchase Bill or sale to create entries.</td></tr>}
              {entries.map(e => (
                <tr key={e.id} className="frappe-row">
                  <td className="text-muted">{e.posting_datetime?.slice(0,16)}</td>
                  <td className="fw-medium">{e.item_name}</td>
                  <td>{e.warehouse_name}</td>
                  <td><span className={`badge ${VOUCHER_COLORS[e.voucher_type] || 'badge-grey'}`}>{e.voucher_type}</span></td>
                  <td className="text-muted" style={{fontSize:'0.75rem', maxWidth:'120px', overflow:'hidden', textOverflow:'ellipsis'}}>{e.voucher_id || '—'}</td>
                  <td className={e.qty_change > 0 ? 'text-green fw-bold' : 'text-danger fw-bold'}>
                    {e.qty_change > 0 ? '+' : ''}{e.qty_change} {e.unit}
                  </td>
                  <td>{e.incoming_rate > 0 ? `₹${Number(e.incoming_rate).toFixed(2)}` : '—'}</td>
                  <td>₹{Number(e.valuation_rate).toFixed(4)}</td>
                  <td>{e.balance_qty} {e.unit}</td>
                  <td>₹{Number(e.balance_value).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Balance Tab */}
      {activeTab === 'balance' && (
        <div className="frappe-table-wrap">
          <table className="frappe-table">
            <thead>
              <tr><th>Item</th><th>SKU</th><th>Group</th><th>Warehouse</th><th>Qty</th><th>Unit</th><th>Val. Rate (₹)</th><th>Stock Value (₹)</th><th>Alert Level</th></tr>
            </thead>
            <tbody>
              {balance.length === 0 && <tr><td colSpan={9} className="frappe-empty">No bins yet. Submit a Purchase Bill to post stock.</td></tr>}
              {balance.map(b => (
                <tr key={b.id} className={`frappe-row${b.qty <= b.alert_level ? ' row-warning' : ''}`}>
                  <td className="fw-medium">{b.item_name}</td>
                  <td className="text-muted">{b.item_code || '—'}</td>
                  <td><span className="frappe-tag">{b.item_group || '—'}</span></td>
                  <td>{b.warehouse_name}</td>
                  <td className={b.qty <= b.alert_level ? 'text-danger fw-bold' : ''}>{b.qty}</td>
                  <td>{b.unit}</td>
                  <td>₹{Number(b.valuation_rate).toFixed(4)}</td>
                  <td className="fw-medium">₹{Number(b.stock_value).toFixed(2)}</td>
                  <td>{b.alert_level}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
