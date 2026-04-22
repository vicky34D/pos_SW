import { useState, useEffect } from 'react'
import * as api from '../api'

export default function ReportsView() {
  const [summary, setSummary] = useState({})
  const [daily, setDaily] = useState([])
  const [orders, setOrders] = useState([])

  useEffect(() => {
    api.getReportSummary().then(setSummary).catch(() => {})
    api.getDailyReport().then(setDaily).catch(() => {})
    api.getOrders().then(setOrders).catch(() => {})
  }, [])

  const exportCSV = () => {
    if (orders.length === 0) return
    const rows = [['Order #', 'Date', 'Time', 'Customer', 'Items', 'Payment', 'Type', 'Subtotal', 'Tax', 'Total']]
    orders.forEach(tx => {
      const d = new Date(tx.created_at)
      const items = tx.items.map(i => `${i.item_name} x${i.quantity}`).join('; ')
      rows.push([tx.order_number, d.toLocaleDateString('en-IN'), d.toLocaleTimeString('en-IN'), tx.customer_name, `"${items}"`, tx.payment_method, tx.order_type, tx.subtotal, tx.tax, tx.total])
    })
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `streetwok-sales-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="view-section">
      <div className="top-header">
        <div className="header-left">
          <div className="header-title">Sales & Revenue</div>
          <div className="header-subtitle">Track your business performance</div>
        </div>
        <button className="btn-export" onClick={exportCSV}>📥 Export CSV</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card revenue">
          <div className="stat-label">Total Revenue</div>
          <div className="stat-value">₹{summary.total_revenue || 0}</div>
        </div>
        <div className="stat-card today">
          <div className="stat-label">Today's Revenue</div>
          <div className="stat-value">₹{summary.today_revenue || 0}</div>
        </div>
        <div className="stat-card transactions">
          <div className="stat-label">Total Orders</div>
          <div className="stat-value">{summary.total_orders || 0}</div>
        </div>
        <div className="stat-card avg">
          <div className="stat-label">Avg Order Value</div>
          <div className="stat-value">₹{summary.avg_order_value || 0}</div>
        </div>
      </div>

      <div className="report-section">
        <div className="report-card">
          <div className="report-card-header"><h5>Daily Breakdown</h5></div>
          <div style={{ maxHeight: 250, overflowY: 'auto' }}>
            <table className="report-table">
              <thead>
                <tr><th>Date</th><th>Orders</th><th>Cash</th><th>UPI</th><th>Card</th><th>Total</th></tr>
              </thead>
              <tbody>
                {daily.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No sales data yet</td></tr>
                ) : daily.map((row, i) => (
                  <tr key={i}>
                    <td className="fw-bold">{new Date(row.date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>{row.orders}</td>
                    <td className="text-success">₹{Math.round(row.cash)}</td>
                    <td className="text-info">₹{Math.round(row.upi)}</td>
                    <td className="text-warning">₹{Math.round(row.card)}</td>
                    <td className="fw-bold text-primary">₹{Math.round(row.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="report-section">
        <div className="report-card">
          <div className="report-card-header"><h5>Recent Transactions</h5></div>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <table className="report-table">
              <thead>
                <tr><th>Order #</th><th>Time</th><th>Customer</th><th>Items</th><th>Payment</th><th>Total</th></tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No transactions yet</td></tr>
                ) : orders.slice(0, 50).map(tx => (
                  <tr key={tx.id}>
                    <td className="fw-bold">#{tx.order_number}</td>
                    <td>{new Date(tx.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>{tx.customer_name}</td>
                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.items.map(i => `${i.item_name} ×${i.quantity}`).join(', ')}
                    </td>
                    <td><span className="stock-badge" style={{
                      background: tx.payment_method === 'Cash' ? 'var(--success-bg)' : tx.payment_method === 'UPI' ? 'var(--info-bg)' : 'var(--warning-bg)',
                      color: tx.payment_method === 'Cash' ? 'var(--success)' : tx.payment_method === 'UPI' ? 'var(--info)' : 'var(--warning)'
                    }}>{tx.payment_method}</span></td>
                    <td className="fw-bold text-primary">₹{tx.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
