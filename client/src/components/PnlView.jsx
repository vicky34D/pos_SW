import { useState, useEffect } from 'react'
import * as api from '../api'

// Profit & Loss: Sales - Purchases - Expenses, month by month.
const inr = (n) => {
  const v = Number(n) || 0
  return (v < 0 ? '-₹' : '₹') + Math.abs(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
const monthName = (ym, short = false) => {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', short ? { month: 'short', year: 'numeric' } : { month: 'long', year: 'numeric' })
}
const pctChange = (now, before) => {
  if (!before) return null
  return Math.round(((now - before) / Math.abs(before)) * 100)
}

function Change({ now, before, goodWhenUp = true }) {
  const p = pctChange(now, before)
  if (p === null) return <span className="pnl-change">no data last month</span>
  const up = p >= 0
  const good = up === goodWhenUp
  return <span className={`pnl-change ${p === 0 ? '' : good ? 'is-good' : 'is-bad'}`}>{up ? '▲' : '▼'} {Math.abs(p)}% vs last month</span>
}

function StatCard({ label, value, before, goodWhenUp, accent, sub }) {
  return (
    <div className={`pnl-card pnl-${accent}`}>
      <div className="pnl-card-label">{label}</div>
      <div className="pnl-card-value">{inr(value)}</div>
      {sub ? <div className="pnl-change">{sub}</div> : <Change now={value} before={before} goodWhenUp={goodWhenUp} />}
    </div>
  )
}

function MiniPnl({ title, note, m }) {
  return (
    <div className="pnl-mini">
      <div className="pnl-mini-head">
        <div className="pnl-mini-title">{title}</div>
        {note && <div className="pnl-mini-note">{note}</div>}
      </div>
      <div className="pnl-mini-row"><span>Sales</span><span>{inr(m.sales)}</span></div>
      <div className="pnl-mini-row"><span>− Purchases</span><span>{inr(m.purchases)}</span></div>
      <div className="pnl-mini-row"><span>− Expenses</span><span>{inr(m.expenses)}</span></div>
      <div className={`pnl-mini-row pnl-mini-net ${m.net < 0 ? 'is-loss' : 'is-profit'}`}><span>Net {m.net < 0 ? 'loss' : 'profit'}</span><span>{inr(m.net)}</span></div>
    </div>
  )
}

export default function PnlView() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getPnl().then(setData).catch(e => setError(e.message))
  }, [])

  if (error) return <div className="frappe-page"><div className="frappe-page-body"><div className="frappe-empty">Could not load P&L: {error}</div></div></div>
  if (!data) return <div className="frappe-loading">Loading P&L…</div>

  const { current: cur, previous: prev, projected, forecast, all_time: all, months } = data
  const maxBar = Math.max(1, ...months.map(m => Math.max(m.sales, m.purchases + m.expenses)))

  return (
    <div className="frappe-page">
      <div className="frappe-page-head">
        <div className="frappe-page-head-left">
          <div className="frappe-breadcrumb">Sales <span>›</span> P&L</div>
          <h1 className="frappe-title">Profit & Loss</h1>
        </div>
      </div>
      <div className="frappe-page-body">

        <div className="pnl-formula">Net P&L = Sales − Purchases − Expenses</div>

        <div className="pnl-section-title">{monthName(cur.month)} so far</div>
        <div className="pnl-cards">
          <StatCard label="Sales" value={cur.sales} before={prev.sales} goodWhenUp accent="sales" />
          <StatCard label="Purchases" value={cur.purchases} before={prev.purchases} goodWhenUp={false} accent="purchase" />
          <StatCard label="Expenses" value={cur.expenses} before={prev.expenses} goodWhenUp={false} accent="expense" />
          <StatCard label={cur.net < 0 ? 'Net loss' : 'Net profit'} value={cur.net} before={prev.net} goodWhenUp accent={cur.net < 0 ? 'loss' : 'profit'} />
        </div>

        <div className="pnl-section-title">Previous and upcoming</div>
        <div className="pnl-minis">
          <MiniPnl title={`Last month · ${monthName(prev.month, true)}`} note="Actual" m={prev} />
          <MiniPnl title={`This month · ${monthName(cur.month, true)}`} note={`Estimate at the current pace (${projected.days_counted} of ${projected.days_in_month} days counted)`} m={projected} />
          <MiniPnl
            title={`Next month · ${monthName(forecast.month, true)}`}
            note={forecast.based_on.length ? `Estimate: average of ${forecast.based_on.map(m => monthName(m, true)).join(', ')}` : 'Estimate: needs at least one full month of data'}
            m={forecast}
          />
        </div>

        <div className="pnl-section-title">All time</div>
        <div className="pnl-cards">
          <StatCard label="Total revenue" value={all.sales} accent="sales" sub={`${all.orders} orders`} />
          <StatCard label="Total purchases" value={all.purchases} accent="purchase" sub="Submitted and paid bills" />
          <StatCard label="Total expenses" value={all.expenses} accent="expense" sub="All expense bills" />
          <StatCard label={all.net < 0 ? 'Total net loss' : 'Total net profit'} value={all.net} accent={all.net < 0 ? 'loss' : 'profit'} sub="Since you started" />
        </div>

        <div className="pnl-section-title">Month by month</div>
        <div className="frappe-table-wrap">
          <table className="frappe-table pnl-table">
            <thead>
              <tr><th>Month</th><th>Sales (₹)</th><th>Purchases (₹)</th><th>Expenses (₹)</th><th>Net P&L (₹)</th><th>Margin</th><th className="pnl-bar-col"></th></tr>
            </thead>
            <tbody>
              {months.map(m => (
                <tr key={m.month}>
                  <td className="fw-medium">{monthName(m.month)}{m.month === cur.month && <span className="frappe-tag">so far</span>}
                    <div className="pnl-sub">{m.orders} orders · {m.purchase_bills} purchase · {m.expense_bills} expense</div>
                  </td>
                  <td>{inr(m.sales)}</td>
                  <td>{inr(m.purchases)}</td>
                  <td>{inr(m.expenses)}</td>
                  <td className={`fw-bold ${m.net < 0 ? 'text-danger' : 'text-green'}`}>{inr(m.net)}</td>
                  <td>{m.sales ? `${Math.round((m.net / m.sales) * 100)}%` : '—'}</td>
                  <td className="pnl-bar-col">
                    <div className="pnl-bar"><span className="pnl-bar-in" style={{ width: `${(m.sales / maxBar) * 100}%` }} /></div>
                    <div className="pnl-bar"><span className="pnl-bar-out" style={{ width: `${((m.purchases + m.expenses) / maxBar) * 100}%` }} /></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pnl-legend"><span className="pnl-dot pnl-dot-in" /> Sales <span className="pnl-dot pnl-dot-out" /> Purchases + expenses</div>

        <div className="pnl-foot">
          Sales are all POS orders (by Indian date). Purchases count submitted and paid bills (not drafts or cancelled). Expenses count all expense bills except cancelled. Estimates are guides, not promises.
        </div>
      </div>
    </div>
  )
}
