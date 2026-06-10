import { useState, useEffect, useCallback } from 'react'
import * as api from '../api'

const STATUS_COLORS = { Submitted:'badge-blue', 'Partially Paid':'badge-orange', Paid:'badge-green', Cancelled:'badge-red' }
const CATEGORIES = ['Rent','Utilities','Salary','Maintenance','Marketing','Packaging','Other']

const emptyForm = { category: 'Other', payee: '', supplier_id: '', expense_date: new Date().toISOString().slice(0,10), due_date: '', amount: '', tax: 0, notes: '' }

export default function ExpensesView({ showToast }) {
  const [expenses, setExpenses] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCat, setFilterCat] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null)
  const [payingExp, setPayingExp] = useState(null)
  const [payForm, setPayForm] = useState({ amount: 0, method: 'Cash', payment_date: new Date().toISOString().slice(0,10), notes: '' })

  const load = useCallback(async () => {
    try {
      const [exp, sup] = await Promise.all([api.getExpenses(), api.getSuppliers({ active: true })])
      setExpenses(exp); setSuppliers(sup)
    } catch (e) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const filtered = expenses.filter(e => {
    const matchSearch = !search || e.expense_number.includes(search) || (e.payee || '').toLowerCase().includes(search.toLowerCase()) || (e.category || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || e.status === filterStatus
    const matchCat = filterCat === 'all' || e.category === filterCat
    return matchSearch && matchStatus && matchCat
  })

  const totalUnpaid = expenses.filter(e => !['Paid','Cancelled'].includes(e.status)).reduce((s, e) => s + (e.total - e.paid_amount), 0)
  const totalThisMonth = expenses.filter(e => {
    const d = new Date(e.expense_date); const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && e.status !== 'Cancelled'
  }).reduce((s, e) => s + e.total, 0)

  const openDetail = async (id) => {
    try { const d = await api.getExpense(id); setDetail(d) }
    catch (e) { showToast(e.message, 'error') }
  }

  const handleSave = async () => {
    if (!form.amount || Number(form.amount) <= 0) return showToast('Enter a valid amount', 'error')
    setSaving(true)
    try {
      await api.createExpense({ ...form, supplier_id: form.supplier_id || null })
      showToast('Expense recorded', 'success'); setShowForm(false); load()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const openPayment = (exp) => {
    setPayingExp(exp)
    setPayForm({ amount: Math.max(0, exp.total - exp.paid_amount), method: 'Cash', payment_date: new Date().toISOString().slice(0,10), notes: '' })
  }

  const handlePayment = async () => {
    if (!payForm.amount || payForm.amount <= 0) return showToast('Enter payment amount', 'error')
    try {
      await api.createPayment({ against_type: 'Expense Bill', against_id: payingExp.id, supplier_id: payingExp.supplier_id || null, ...payForm })
      showToast('Payment recorded', 'success')
      setPayingExp(null); load(); if (detail?.id === payingExp.id) openDetail(payingExp.id)
    } catch (e) { showToast(e.message, 'error') }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this expense?')) return
    try { await api.deleteExpense(id); showToast('Expense cancelled', 'success'); load(); setDetail(null) }
    catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return <div className="frappe-loading">Loading Expenses…</div>

  return (
    <div className="frappe-page">
      <div className="frappe-page-head">
        <div>
          <h1 className="frappe-title">Expense Bills</h1>
          <div className="frappe-breadcrumb">Buying › Expenses</div>
        </div>
        <button className="frappe-btn frappe-btn-primary" onClick={() => { setForm(emptyForm); setShowForm(true) }}>+ New Expense</button>
      </div>

      <div className="frappe-stat-row">
        <div className="frappe-stat-card">
          <div className="frappe-stat-label">Total Expenses</div>
          <div className="frappe-stat-value">{expenses.filter(e => e.status !== 'Cancelled').length}</div>
        </div>
        <div className="frappe-stat-card">
          <div className="frappe-stat-label">Pending Payment</div>
          <div className="frappe-stat-value text-danger">₹{totalUnpaid.toFixed(2)}</div>
        </div>
        <div className="frappe-stat-card">
          <div className="frappe-stat-label">This Month</div>
          <div className="frappe-stat-value">₹{totalThisMonth.toFixed(2)}</div>
        </div>
      </div>

      <div className="frappe-toolbar">
        <input className="frappe-search" placeholder="Search expense, payee, category…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="frappe-select" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="frappe-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          {['Submitted','Partially Paid','Paid','Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="frappe-count">{filtered.length} records</span>
      </div>

      <div className="frappe-table-wrap">
        <table className="frappe-table">
          <thead>
            <tr><th>Expense No.</th><th>Category</th><th>Payee</th><th>Date</th><th>Total (₹)</th><th>Paid (₹)</th><th>Balance (₹)</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={9} className="frappe-empty">No expense records found</td></tr>}
            {filtered.map(e => (
              <tr key={e.id} className="frappe-row" onClick={() => openDetail(e.id)}>
                <td className="fw-medium text-primary">{e.expense_number}</td>
                <td><span className="frappe-tag">{e.category}</span></td>
                <td>{e.payee || e.supplier_name || '—'}</td>
                <td>{e.expense_date}</td>
                <td>₹{e.total?.toFixed(2)}</td>
                <td>₹{e.paid_amount?.toFixed(2)}</td>
                <td className={(e.total - e.paid_amount) > 0 && e.status !== 'Cancelled' ? 'text-danger' : ''}>
                  {e.status !== 'Cancelled' ? `₹${(e.total - e.paid_amount).toFixed(2)}` : '—'}
                </td>
                <td><span className={`badge ${STATUS_COLORS[e.status] || 'badge-grey'}`}>{e.status}</span></td>
                <td onClick={ev => ev.stopPropagation()}>
                  {['Submitted','Partially Paid'].includes(e.status) && <button className="frappe-btn frappe-btn-sm frappe-btn-success" onClick={() => openPayment(e)}>Pay</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {detail && (
        <div className="frappe-modal-overlay" onClick={() => setDetail(null)}>
          <div className="frappe-modal" style={{maxWidth:'560px'}} onClick={e => e.stopPropagation()}>
            <div className="frappe-modal-head">
              <div>
                <h2>{detail.expense_number}</h2>
                <span className={`badge ${STATUS_COLORS[detail.status] || 'badge-grey'}`}>{detail.status}</span>
              </div>
              <button className="frappe-modal-close" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="frappe-detail-grid">
              <div><label>Category</label><span>{detail.category}</span></div>
              <div><label>Payee</label><span>{detail.payee || detail.supplier_name || '—'}</span></div>
              <div><label>Date</label><span>{detail.expense_date}</span></div>
              <div><label>Due Date</label><span>{detail.due_date || '—'}</span></div>
              <div><label>Amount</label><span>₹{detail.amount?.toFixed(2)}</span></div>
              <div><label>Tax</label><span>₹{detail.tax?.toFixed(2)}</span></div>
              <div><label>Total</label><span className="fw-bold">₹{detail.total?.toFixed(2)}</span></div>
              <div><label>Paid</label><span className="text-green">₹{detail.paid_amount?.toFixed(2)}</span></div>
              <div><label>Balance</label><span className="text-danger fw-bold">₹{(detail.total - detail.paid_amount)?.toFixed(2)}</span></div>
              {detail.notes && <div className="span-2"><label>Notes</label><span>{detail.notes}</span></div>}
            </div>
            {detail.payments?.length > 0 && (
              <>
                <h3 className="frappe-section-head">Payments</h3>
                <div className="frappe-table-wrap">
                  <table className="frappe-table">
                    <thead><tr><th>Payment No.</th><th>Date</th><th>Method</th><th>Amount</th></tr></thead>
                    <tbody>{detail.payments.map(p => <tr key={p.id}><td>{p.payment_number}</td><td>{p.payment_date}</td><td>{p.method}</td><td>₹{p.amount?.toFixed(2)}</td></tr>)}</tbody>
                  </table>
                </div>
              </>
            )}
            <div className="frappe-modal-footer">
              {['Submitted','Partially Paid'].includes(detail.status) && <button className="frappe-btn frappe-btn-success" onClick={() => openPayment(detail)}>Record Payment</button>}
              {detail.status !== 'Cancelled' && <button className="frappe-btn frappe-btn-danger" onClick={() => handleCancel(detail.id)}>Cancel</button>}
              <button className="frappe-btn frappe-btn-secondary" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* New Expense Form */}
      {showForm && (
        <div className="frappe-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="frappe-modal" style={{maxWidth:'560px'}} onClick={e => e.stopPropagation()}>
            <div className="frappe-modal-head">
              <h2>New Expense Bill</h2>
              <button className="frappe-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="frappe-form-grid">
              <div className="frappe-field">
                <label>Category</label>
                <select className="frappe-input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="frappe-field">
                <label>Payee / Vendor</label>
                <input className="frappe-input" placeholder="e.g. City Electric Co." value={form.payee} onChange={e => setForm(f => ({ ...f, payee: e.target.value }))} />
              </div>
              <div className="frappe-field">
                <label>Linked Supplier (optional)</label>
                <select className="frappe-input" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                  <option value="">None</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="frappe-field">
                <label>Expense Date</label>
                <input className="frappe-input" type="date" value={form.expense_date} onChange={e => setForm(f => ({ ...f, expense_date: e.target.value }))} />
              </div>
              <div className="frappe-field">
                <label>Due Date</label>
                <input className="frappe-input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
              <div className="frappe-field">
                <label>Amount (₹) *</label>
                <input className="frappe-input" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="frappe-field">
                <label>Tax (₹)</label>
                <input className="frappe-input" type="number" step="0.01" placeholder="0" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: Number(e.target.value) }))} />
              </div>
              <div className="frappe-field frappe-field-full">
                <label>Notes</label>
                <input className="frappe-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="frappe-modal-footer">
              <button className="frappe-btn frappe-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="frappe-btn frappe-btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payingExp && (
        <div className="frappe-modal-overlay" onClick={() => setPayingExp(null)}>
          <div className="frappe-modal" style={{maxWidth:'420px'}} onClick={e => e.stopPropagation()}>
            <div className="frappe-modal-head">
              <h2>Pay — {payingExp.expense_number}</h2>
              <button className="frappe-modal-close" onClick={() => setPayingExp(null)}>✕</button>
            </div>
            <div className="frappe-form-grid">
              <div className="frappe-field">
                <label>Amount (₹) *</label>
                <input className="frappe-input" type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: Number(e.target.value) }))} />
                <span className="frappe-hint">Balance: ₹{(payingExp.total - payingExp.paid_amount).toFixed(2)}</span>
              </div>
              <div className="frappe-field">
                <label>Method</label>
                <select className="frappe-input" value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                  {['Cash','Bank','UPI','Card','Cheque'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="frappe-field">
                <label>Date</label>
                <input className="frappe-input" type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <div className="frappe-field frappe-field-full">
                <label>Notes</label>
                <input className="frappe-input" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="frappe-modal-footer">
              <button className="frappe-btn frappe-btn-secondary" onClick={() => setPayingExp(null)}>Cancel</button>
              <button className="frappe-btn frappe-btn-success" onClick={handlePayment}>Record Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
