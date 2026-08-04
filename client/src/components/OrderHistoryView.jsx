import { useState, useEffect, useCallback } from 'react'
import * as api from '../api'
import Receipt from './Receipt'

const todayStr = () => new Date().toLocaleDateString('en-CA') // YYYY-MM-DD (local)

export default function OrderHistoryView({ settings, showToast }) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [date, setDate] = useState('')
  const [detail, setDetail] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await api.getOrders(date ? { date } : undefined)
      setOrders(data)
    } catch (e) {
      showToast?.(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [date, showToast])

  useEffect(() => { load() }, [load])

  const q = search.trim().toLowerCase()
  const filtered = orders.filter(o =>
    !q ||
    String(o.order_number).includes(q) ||
    (o.customer_name || '').toLowerCase().includes(q) ||
    (o.payment_method || '').toLowerCase().includes(q)
  )

  const totalValue = filtered.reduce((s, o) => s + Number(o.total || 0), 0)

  const fmtTime = (ts) => {
    const d = new Date(ts)
    return `${d.toLocaleDateString('en-IN')} ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
  }

  const payBadge = (m) => {
    if (m === 'Cash') return 'badge-green'
    if (m === 'UPI') return 'badge-blue'
    if (m === 'Card') return 'badge-orange'
    return 'badge-grey'
  }

  const reprint = () => window.print()

  if (loading) return <div className="frappe-loading">Loading orders…</div>

  return (
    <div className="frappe-page">
      <div className="frappe-page-head">
        <div className="frappe-page-head-left">
          <div className="frappe-breadcrumb">Sales <span>›</span> Order History</div>
          <h1 className="frappe-title">Order History</h1>
        </div>
      </div>
      <div className="frappe-page-body">

        <div className="frappe-toolbar">
          <input
            className="frappe-search"
            placeholder="Search order #, customer, payment…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <input
            type="date"
            className="frappe-select"
            value={date}
            max={todayStr()}
            onChange={e => setDate(e.target.value)}
          />
          {date && (
            <button className="frappe-btn frappe-btn-secondary frappe-btn-sm" onClick={() => setDate('')}>Clear date</button>
          )}
          <span className="frappe-count">{filtered.length} orders · ₹{totalValue.toFixed(0)}</span>
        </div>

        <div className="frappe-table-wrap">
          <table className="frappe-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Time</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Items</th>
                <th>Payment</th>
                <th className="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan="7" className="frappe-empty">No orders found.</td></tr>
              )}
              {filtered.map(o => {
                const itemCount = (o.items || []).reduce((s, i) => s + (i.quantity || 0), 0)
                return (
                  <tr key={o.id} className="frappe-row" onClick={() => setDetail(o)}>
                    <td className="fw-bold">#{o.order_number}</td>
                    <td className="text-muted">{fmtTime(o.created_at)}</td>
                    <td>{o.customer_name}</td>
                    <td className="text-muted">{o.order_type}</td>
                    <td>{itemCount}</td>
                    <td><span className={`badge ${payBadge(o.payment_method)}`}>{o.payment_method}</span></td>
                    <td className="text-right fw-bold">₹{Number(o.total).toFixed(2)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt detail + reprint */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-box" style={{ maxWidth: 380 }} onClick={e => e.stopPropagation()}>
            <Receipt receipt={detail} settings={settings} />
            <div className="modal-actions" style={{ marginTop: '1rem' }}>
              <button className="btn-modal btn-modal-cancel" onClick={() => setDetail(null)}>Close</button>
              <button className="btn-modal btn-modal-confirm" onClick={reprint}>🖨 Reprint</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
