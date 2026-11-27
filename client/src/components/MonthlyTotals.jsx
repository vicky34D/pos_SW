// Month-by-month totals for a list of bills (purchase or expense).
// Cancelled and Draft bills are not counted. Works on the rows the page has
// already loaded, so it adds no load on the server and changes no data.
const monthLabel = (ym) => {
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}
const inr = (n) => '₹' + (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function MonthlyTotals({ rows, dateKey, noun = 'bills', groupKey = null, groupLabel = '' }) {
  const months = {}
  for (const r of rows) {
    if (r.status === 'Cancelled' || r.status === 'Draft') continue
    const ym = String(r[dateKey] || r.created_at || '').slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(ym)) continue
    const m = months[ym] ||= { ym, count: 0, total: 0, paid: 0, groups: {} }
    m.count += 1
    m.total += Number(r.total) || 0
    m.paid += Number(r.paid_amount) || 0
    if (groupKey) {
      const g = r[groupKey] || 'Other'
      m.groups[g] = (m.groups[g] || 0) + (Number(r.total) || 0)
    }
  }
  const list = Object.values(months).sort((a, b) => b.ym.localeCompare(a.ym))
  const grand = list.reduce((s, m) => ({ count: s.count + m.count, total: s.total + m.total, paid: s.paid + m.paid }), { count: 0, total: 0, paid: 0 })

  return (
    <div className="frappe-table-wrap">
      <table className="frappe-table monthly-totals">
        <thead>
          <tr>
            <th>Month</th><th>No. of {noun}</th><th>Total (₹)</th><th>Paid (₹)</th><th>Unpaid (₹)</th>
            {groupKey && <th>{groupLabel}</th>}
          </tr>
        </thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={groupKey ? 6 : 5} className="frappe-empty">No {noun} yet</td></tr>}
          {list.map(m => (
            <tr key={m.ym}>
              <td className="fw-medium">{monthLabel(m.ym)}</td>
              <td>{m.count}</td>
              <td className="fw-bold">{inr(m.total)}</td>
              <td>{inr(m.paid)}</td>
              <td className={m.total - m.paid > 0.005 ? 'text-danger' : ''}>{inr(Math.max(0, m.total - m.paid))}</td>
              {groupKey && (
                <td className="monthly-groups">
                  {Object.entries(m.groups).sort((a, b) => b[1] - a[1]).map(([g, v]) => (
                    <span key={g} className="frappe-tag">{g}: {inr(v)}</span>
                  ))}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {list.length > 0 && (
          <tfoot>
            <tr>
              <td className="fw-bold">All months</td>
              <td className="fw-bold">{grand.count}</td>
              <td className="fw-bold">{inr(grand.total)}</td>
              <td className="fw-bold">{inr(grand.paid)}</td>
              <td className="fw-bold">{inr(Math.max(0, grand.total - grand.paid))}</td>
              {groupKey && <td />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}

export function ListTabs({ view, setView }) {
  return (
    <div className="list-tabs">
      <button className={`list-tab${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>All bills</button>
      <button className={`list-tab${view === 'monthly' ? ' active' : ''}`} onClick={() => setView('monthly')}>Monthly totals</button>
    </div>
  )
}
