import { useState, useEffect } from 'react'
import * as api from '../api'

export default function ReportsView() {
  const [tab, setTab] = useState('today')
  const [summary, setSummary] = useState({})
  const [daily, setDaily] = useState([])
  const [monthly, setMonthly] = useState([])
  const [todayItems, setTodayItems] = useState([])
  const [topItems, setTopItems] = useState([])
  const [orders, setOrders] = useState([])

  useEffect(() => {
    api.getReportSummary().then(setSummary).catch(() => {})
    api.getDailyReport().then(setDaily).catch(() => {})
    api.getMonthlyReport().then(setMonthly).catch(() => {})
    api.getTodayItems().then(setTodayItems).catch(() => {})
    api.getTopItems().then(setTopItems).catch(() => {})
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

  const formatMonth = (m) => {
    const [y, mo] = m.split('-')
    const d = new Date(y, parseInt(mo) - 1)
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
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

      {/* Summary Stats */}
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

      {/* Tabs */}
      <div className="report-tabs">
        <button className={`report-tab${tab === 'today' ? ' active' : ''}`} onClick={() => setTab('today')}>📊 Today</button>
        <button className={`report-tab${tab === 'daily' ? ' active' : ''}`} onClick={() => setTab('daily')}>📅 Daily</button>
        <button className={`report-tab${tab === 'monthly' ? ' active' : ''}`} onClick={() => setTab('monthly')}>🗓 Monthly</button>
        <button className={`report-tab${tab === 'top' ? ' active' : ''}`} onClick={() => setTab('top')}>🏆 Top Items</button>
        <button className={`report-tab${tab === 'transactions' ? ' active' : ''}`} onClick={() => setTab('transactions')}>📋 Orders</button>
      </div>

      {/* Today's Item Sales */}
      {tab === 'today' && (
        <div className="report-section">
          <div className="report-card">
            <div className="report-card-header">
              <h5>Today's Item-wise Sales</h5>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {summary.today_orders || 0} orders today
              </span>
            </div>
            <div style={{ padding: '1rem' }}>
              {todayItems.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                  No sales today yet — start taking orders!
                </div>
              ) : (
                <div className="today-items-grid">
                  {todayItems.map((item, i) => (
                    <div key={i} className="today-item-card">
                      <div className="today-item-name">{item.name}</div>
                      <div className="today-item-stats">
                        <span className="today-item-qty">
                          🔢 {item.total_qty} sold
                        </span>
                        <span className="today-item-revenue">₹{Math.round(item.total_revenue)}</span>
                      </div>
                      {item.is_momo && (
                        <div style={{ marginTop: '0.4rem' }}>
                          <span className="momo-plate-badge">
                            🥟 {item.plates} plate{item.plates !== 1 ? 's' : ''}
                            {item.extra_pcs > 0 ? ` + ${item.extra_pcs} pcs` : ''} (5 pcs/plate)
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Daily Breakdown */}
      {tab === 'daily' && (
        <div className="report-section">
          <div className="report-card">
            <div className="report-card-header"><h5>Daily Breakdown</h5></div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
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
      )}

      {/* Monthly Breakdown */}
      {tab === 'monthly' && (
        <div className="report-section">
          <div className="report-card">
            <div className="report-card-header"><h5>Monthly Report</h5></div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table className="report-table">
                <thead>
                  <tr><th>Month</th><th>Orders</th><th>Cash</th><th>UPI</th><th>Card</th><th>Total</th></tr>
                </thead>
                <tbody>
                  {monthly.length === 0 ? (
                    <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No monthly data yet</td></tr>
                  ) : monthly.map((row, i) => (
                    <tr key={i}>
                      <td className="fw-bold">{formatMonth(row.month)}</td>
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
      )}

      {/* Top Items */}
      {tab === 'top' && (
        <div className="report-section">
          <div className="report-card">
            <div className="report-card-header"><h5>Top Selling Items (All Time)</h5></div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table className="report-table">
                <thead>
                  <tr><th>#</th><th>Item</th><th>Qty Sold</th><th>Revenue</th></tr>
                </thead>
                <tbody>
                  {topItems.length === 0 ? (
                    <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>No data yet</td></tr>
                  ) : topItems.map((item, i) => (
                    <tr key={i}>
                      <td className="fw-bold">{i + 1}</td>
                      <td className="fw-bold">{item.name}</td>
                      <td>{item.total_qty}</td>
                      <td className="fw-bold text-primary">₹{Math.round(item.total_revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      {tab === 'transactions' && (
        <div className="report-section">
          <div className="report-card">
            <div className="report-card-header"><h5>Recent Transactions</h5></div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
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
      )}
    </div>
  )
}
