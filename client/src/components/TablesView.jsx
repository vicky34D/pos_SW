import React from 'react'

const TOTAL_TABLES = 10
const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN')

export default function TablesView({ tables, activeTable, onSelectTable }) {
  const nums = Array.from({ length: TOTAL_TABLES }, (_, i) => i + 1)

  // Live floor summary
  const summary = nums.reduce((acc, num) => {
    const items = tables[num]?.items || []
    if (items.length > 0) {
      acc.active += 1
      acc.amount += items.reduce((s, it) => s + it.price * it.qty, 0)
      acc.items += items.reduce((s, it) => s + it.qty, 0)
    }
    return acc
  }, { active: 0, amount: 0, items: 0 })

  return (
    <div className="view-section">
      <div className="top-header">
        <div className="header-left">
          <div className="header-title">Tables Dashboard</div>
          <div className="header-subtitle">Live view of dine-in tables and open orders</div>
        </div>
      </div>

      <div className="frappe-stat-row">
        <div className="frappe-stat-card">
          <div className="frappe-stat-label">Active Tables</div>
          <div className="frappe-stat-value">{summary.active}<span className="tbl-stat-sub"> / {TOTAL_TABLES}</span></div>
        </div>
        <div className="frappe-stat-card">
          <div className="frappe-stat-label">Items in Service</div>
          <div className="frappe-stat-value">{summary.items}</div>
        </div>
        <div className="frappe-stat-card">
          <div className="frappe-stat-label">Open Amount</div>
          <div className="frappe-stat-value text-primary">{fmt(summary.amount)}</div>
        </div>
      </div>

      <div className="tbl-grid">
        {nums.map(num => {
          const t = tables[num] || { items: [], customerName: '', orderType: 'dine-in' }
          const items = t.items || []
          const engaged = items.length > 0
          const total = items.reduce((s, it) => s + it.price * it.qty, 0)
          const itemCount = items.reduce((s, it) => s + it.qty, 0)
          const isActive = activeTable === num

          return (
            <div key={num} className={`tbl-card${engaged ? ' is-engaged' : ' is-empty'}${isActive ? ' is-active' : ''}`}>
              <div className="tbl-card-head">
                <div className="tbl-card-title">
                  <span className="tbl-card-icon">{engaged ? '🪑' : '🍽️'}</span>
                  <span>Table {num}</span>
                </div>
                <span className={`tbl-status${engaged ? ' occupied' : ' free'}`}>
                  {engaged ? `${itemCount} item${itemCount > 1 ? 's' : ''}` : 'Free'}
                </span>
              </div>

              {t.customerName && <div className="tbl-customer">👤 {t.customerName}</div>}

              <div className="tbl-card-body">
                {engaged ? (
                  <ul className="tbl-items">
                    {items.map((it, idx) => (
                      <li key={idx}>
                        <span className="tbl-item-name"><span className="tbl-item-qty">{it.qty}×</span> {it.name}</span>
                        <span className="tbl-item-price">{fmt(it.price * it.qty)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="tbl-empty">No active order</div>
                )}
              </div>

              <div className="tbl-card-foot">
                {engaged && (
                  <div className="tbl-total">
                    <span>Total</span>
                    <span className="tbl-total-value">{fmt(total)}</span>
                  </div>
                )}
                <button
                  className={`tbl-action${engaged ? ' primary' : ''}`}
                  onClick={() => onSelectTable(num)}
                >
                  {engaged ? 'Edit Order →' : '+ Start Order'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
