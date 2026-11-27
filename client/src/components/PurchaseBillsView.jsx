import { useState, useEffect, useCallback, useRef } from 'react'
import * as api from '../api'
import MonthlyTotals, { ListTabs } from './MonthlyTotals'

// Phone photos are shrunk to ~1600px JPEG before upload: small enough to send
// quickly, still sharp enough to read every line of a bill.
async function fileToPayload(file) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
  if (isPdf) {
    if (file.size > 8 * 1024 * 1024) throw new Error('PDF is larger than 8 MB')
    const data = await new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result).split(',')[1])
      r.onerror = () => reject(new Error('Could not read the file'))
      r.readAsDataURL(file)
    })
    return { file_name: file.name, media_type: 'application/pdf', data }
  }
  if (!file.type.startsWith('image/')) throw new Error('Upload a PDF or a photo')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const data = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
  return { file_name: file.name, media_type: 'image/jpeg', data }
}

const STATUS_COLORS = { Draft:'badge-grey', Submitted:'badge-blue', 'Partially Paid':'badge-orange', Paid:'badge-green', Cancelled:'badge-red' }

const emptyForm = { supplier_id: '', warehouse_id: '', bill_date: new Date().toISOString().slice(0,10), due_date: '', notes: '', tax: 0, items: [] }
const emptyItem = { item_id: '', qty: 1, rate: 0 }

const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100

export default function PurchaseBillsView({ showToast }) {
  const [bills, setBills] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null)
  const [payingBill, setPayingBill] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [view, setView] = useState('list')
  const [scanResult, setScanResult] = useState(null)
  const fileInputRef = useRef(null)
  const [payForm, setPayForm] = useState({ amount: 0, method: 'Cash', payment_date: new Date().toISOString().slice(0,10), notes: '' })

  const load = useCallback(async () => {
    try {
      const [b, s, w, inv] = await Promise.all([
        api.getPurchaseBills(),
        api.getSuppliers({ active: true }),
        api.getWarehouses(),
        api.getInventory()
      ])
      setBills(b); setSuppliers(s); setWarehouses(w); setInventory(inv)
    } catch (e) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const filtered = bills.filter(b => {
    const matchSearch = !search || b.bill_number.toLowerCase().includes(search.toLowerCase()) || (b.supplier_name || '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || b.status === filterStatus
    return matchSearch && matchStatus
  })

  // Totals for header
  const totalOwed = bills.filter(b => !['Paid','Cancelled'].includes(b.status)).reduce((s, b) => s + (b.total - b.paid_amount), 0)

  const openDetail = async (id) => {
    try { const d = await api.getPurchaseBill(id); setDetail(d) }
    catch (e) { showToast(e.message, 'error') }
  }

  const handleScanFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setScanning(true)
    try {
      const payload = await fileToPayload(file)
      const res = await api.scanBill(payload)
      setScanResult(res)
      const imported = res.results.filter(r => r.status === 'imported').length
      showToast(imported ? `${imported} bill${imported > 1 ? 's' : ''} imported as paid — stock updated` : 'Nothing new imported', imported ? 'success' : 'info')
      load()
    } catch (err) { showToast(err.message, 'error') }
    finally { setScanning(false) }
  }

  const openNew = () => {
    setForm({ ...emptyForm, warehouse_id: warehouses.find(w => w.is_default)?.id || warehouses[0]?.id || '', items: [{ ...emptyItem }] })
    setShowForm(true)
  }

  const setItemRow = (i, field, val) => {
    setForm(f => {
      const items = f.items.map((r, idx) => idx === i ? { ...r, [field]: val } : r)
      return { ...f, items }
    })
  }

  const computedSubtotal = r2(form.items.reduce((s, it) => s + r2((Number(it.qty) || 0) * (Number(it.rate) || 0)), 0))
  const computedTotal = r2(computedSubtotal + Number(form.tax || 0))

  const handleSaveDraft = async () => {
    if (!form.supplier_id) return showToast('Select a supplier', 'error')
    if (!form.items.filter(it => it.item_id).length) return showToast('Add at least one item', 'error')
    setSaving(true)
    try {
      await api.createPurchaseBill({ ...form, items: form.items.filter(it => it.item_id) })
      showToast('Purchase Bill saved as Draft', 'success')
      setShowForm(false); load()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleSubmit = async (id) => {
    if (!window.confirm('Submit this bill? This will post stock into the inventory ledger.')) return
    try { await api.submitPurchaseBill(id); showToast('Bill submitted — stock posted!', 'success'); load(); if (detail?.id === id) openDetail(id) }
    catch (e) { showToast(e.message, 'error') }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this bill? If submitted, stock will be reversed.')) return
    try { await api.cancelPurchaseBill(id); showToast('Bill cancelled', 'success'); load(); setDetail(null) }
    catch (e) { showToast(e.message, 'error') }
  }

  const openPayment = (bill) => {
    setPayingBill(bill)
    setPayForm({ amount: Math.max(0, bill.total - bill.paid_amount), method: 'Cash', payment_date: new Date().toISOString().slice(0,10), notes: '' })
  }

  const handlePayment = async () => {
    if (!payForm.amount || payForm.amount <= 0) return showToast('Enter payment amount', 'error')
    try {
      await api.createPayment({ against_type: 'Purchase Bill', against_id: payingBill.id, supplier_id: payingBill.supplier_id, ...payForm })
      showToast('Payment recorded', 'success')
      setPayingBill(null); load(); if (detail?.id === payingBill.id) openDetail(payingBill.id)
    } catch (e) { showToast(e.message, 'error') }
  }

  if (loading) return <div className="frappe-loading">Loading Purchase Bills…</div>

  return (
    <div className="frappe-page">
      <div className="frappe-page-head">
        <div className="frappe-page-head-left">
          <div className="frappe-breadcrumb">Buying <span>›</span> Purchase Bills</div>
          <h1 className="frappe-title">Purchase Bills</h1>
        </div>
        <div className="bill-scan-actions">
          <input ref={fileInputRef} type="file" accept="application/pdf,image/*" hidden onChange={handleScanFile} />
          <button className="frappe-btn frappe-btn-primary" onClick={() => fileInputRef.current?.click()} disabled={scanning}>
            {scanning ? 'Reading bill…' : '⬆ Upload Bill'}
          </button>
          <button className="frappe-btn" onClick={openNew}>+ New Bill</button>
        </div>
      </div>
      {scanning && (
        <div className="bill-scan-progress">Reading your bill with AI — this takes about 10–30 seconds. Stock updates automatically.</div>
      )}
      <div className="frappe-page-body">

      <div className="frappe-stat-row">
        <div className="frappe-stat-card">
          <div className="frappe-stat-label">Total Bills</div>
          <div className="frappe-stat-value">{bills.length}</div>
        </div>
        <div className="frappe-stat-card">
          <div className="frappe-stat-label">Pending Payment</div>
          <div className="frappe-stat-value text-danger">₹{totalOwed.toFixed(2)}</div>
        </div>
        <div className="frappe-stat-card">
          <div className="frappe-stat-label">Drafts</div>
          <div className="frappe-stat-value">{bills.filter(b => b.status === 'Draft').length}</div>
        </div>
      </div>

      <ListTabs view={view} setView={setView} />
      {view === 'monthly' ? <MonthlyTotals rows={bills} dateKey="bill_date" noun="bills" /> : (<>
      <div className="frappe-toolbar">
        <input className="frappe-search" placeholder="Search bill no or supplier…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="frappe-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          {['Draft','Submitted','Partially Paid','Paid','Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="frappe-count">{filtered.length} bills</span>
      </div>

      <div className="frappe-table-wrap">
        <table className="frappe-table">
          <thead>
            <tr><th>Bill No.</th><th>Supplier</th><th>Date</th><th>Due Date</th><th>Total (₹)</th><th>Paid (₹)</th><th>Balance (₹)</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={9} className="frappe-empty">No bills found</td></tr>}
            {filtered.map(b => (
              <tr key={b.id} className="frappe-row" onClick={() => openDetail(b.id)}>
                <td className="fw-medium text-primary">{b.bill_number}</td>
                <td>{b.supplier_name || '—'}</td>
                <td>{b.bill_date}</td>
                <td className={b.due_date && new Date(b.due_date) < new Date() && b.status !== 'Paid' ? 'text-danger' : ''}>{b.due_date || '—'}</td>
                <td>₹{b.total?.toFixed(2)}</td>
                <td>₹{b.paid_amount?.toFixed(2)}</td>
                <td className={(b.total - b.paid_amount) > 0 ? 'text-danger' : ''}>{b.status !== 'Cancelled' ? `₹${(b.total - b.paid_amount).toFixed(2)}` : '—'}</td>
                <td><span className={`badge ${STATUS_COLORS[b.status] || 'badge-grey'}`}>{b.status}</span></td>
                <td onClick={e => e.stopPropagation()}>
                  {b.status === 'Draft' && <button className="frappe-btn frappe-btn-sm frappe-btn-primary" onClick={() => handleSubmit(b.id)}>Submit</button>}
                  {['Submitted','Partially Paid'].includes(b.status) && <button className="frappe-btn frappe-btn-sm frappe-btn-success" onClick={() => openPayment(b)}>Pay</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>)}

      {/* Bill Detail Modal */}
      {detail && (
        <div className="frappe-modal-overlay" onClick={() => setDetail(null)}>
          <div className="frappe-modal frappe-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="frappe-modal-head">
              <div>
                <h2>{detail.bill_number}</h2>
                <span className={`badge ${STATUS_COLORS[detail.status] || 'badge-grey'}`}>{detail.status}</span>
              </div>
              <button className="frappe-modal-close" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="frappe-detail-grid">
              <div><label>Supplier</label><span>{detail.supplier_name}</span></div>
              <div><label>Warehouse</label><span>{detail.warehouse_name}</span></div>
              <div><label>Bill Date</label><span>{detail.bill_date}</span></div>
              <div><label>Due Date</label><span>{detail.due_date || '—'}</span></div>
            </div>
            <h3 className="frappe-section-head">Items</h3>
            <div className="frappe-table-wrap">
              <table className="frappe-table">
                <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Rate (₹)</th><th>Amount (₹)</th></tr></thead>
                <tbody>
                  {detail.items?.map((it, i) => (
                    <tr key={i}><td>{it.item_name}</td><td>{it.qty}</td><td>{it.unit || '—'}</td><td>₹{it.rate?.toFixed(2)}</td><td>₹{it.amount?.toFixed(2)}</td></tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr><td colSpan={4} className="text-right fw-bold">Subtotal</td><td>₹{detail.subtotal?.toFixed(2)}</td></tr>
                  {detail.tax > 0 && <tr><td colSpan={4} className="text-right">Tax</td><td>₹{detail.tax?.toFixed(2)}</td></tr>}
                  <tr><td colSpan={4} className="text-right fw-bold">Total</td><td className="fw-bold">₹{detail.total?.toFixed(2)}</td></tr>
                  <tr><td colSpan={4} className="text-right">Paid</td><td className="text-green">₹{detail.paid_amount?.toFixed(2)}</td></tr>
                  <tr><td colSpan={4} className="text-right fw-bold">Balance Due</td><td className="text-danger fw-bold">₹{(detail.total - detail.paid_amount)?.toFixed(2)}</td></tr>
                </tfoot>
              </table>
            </div>
            {detail.payments?.length > 0 && (
              <>
                <h3 className="frappe-section-head">Payments</h3>
                <div className="frappe-table-wrap">
                  <table className="frappe-table">
                    <thead><tr><th>Payment No.</th><th>Date</th><th>Method</th><th>Amount (₹)</th></tr></thead>
                    <tbody>{detail.payments.map(p => <tr key={p.id}><td>{p.payment_number}</td><td>{p.payment_date}</td><td>{p.method}</td><td>₹{p.amount?.toFixed(2)}</td></tr>)}</tbody>
                  </table>
                </div>
              </>
            )}
            <div className="frappe-modal-footer">
              {detail.status === 'Draft' && <button className="frappe-btn frappe-btn-primary" onClick={() => handleSubmit(detail.id)}>Submit Bill</button>}
              {['Submitted','Partially Paid'].includes(detail.status) && <button className="frappe-btn frappe-btn-success" onClick={() => openPayment(detail)}>Record Payment</button>}
              {detail.status !== 'Cancelled' && <button className="frappe-btn frappe-btn-danger" onClick={() => handleCancel(detail.id)}>Cancel</button>}
              <button className="frappe-btn frappe-btn-secondary" onClick={() => setDetail(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Bill scan result */}
      {scanResult && (
        <div className="frappe-modal-overlay" onClick={() => setScanResult(null)}>
          <div className="frappe-modal frappe-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="frappe-modal-head">
              <h2>Bill upload result</h2>
              <button className="frappe-modal-close" onClick={() => setScanResult(null)}>✕</button>
            </div>
            {scanResult.results.map((r, i) => (
              <div key={i} className={`bill-scan-card is-${r.status}`}>
                <div className="bill-scan-card-head">
                  <div>
                    <div className="bill-scan-supplier">{r.supplier || 'Unknown seller'}{r.supplier_created && <span className="bill-scan-tag">new supplier</span>}</div>
                    <div className="bill-scan-meta">Invoice {r.invoice_number || '—'}{r.bill_number ? ` → ${r.bill_number}` : ''}</div>
                  </div>
                  <span className="bill-scan-status">
                    {r.status === 'imported' ? `✓ Imported${r.paid ? ' · Paid' : ''} · ₹${r.total?.toFixed(2)}` : r.status === 'duplicate' ? 'Already imported' : r.status === 'skipped' ? 'Skipped' : 'Failed'}
                  </span>
                </div>
                {r.reason && <div className="bill-scan-reason">{r.reason}</div>}
                {r.check_total && <div className="bill-scan-warn">⚠ {r.check_total}</div>}
                {r.items?.length > 0 && (
                  <table className="frappe-table">
                    <thead><tr><th>Item</th><th>Qty added</th><th>Rate (₹ per unit)</th></tr></thead>
                    <tbody>
                      {r.items.map((it, j) => (
                        <tr key={j}>
                          <td>{it.name}{it.new_item && <span className="bill-scan-tag">new item</span>}{it.bill_name !== it.name && <div className="bill-scan-meta">on bill: {it.bill_name}</div>}{it.converted && <div className="bill-scan-meta">bill: {it.bill_qty} · {it.converted}</div>}{it.unit_warning && <div className="bill-scan-warn">⚠ {it.unit_warning}</div>}</td>
                          <td>{it.qty} {it.unit}</td>
                          <td>₹{Number(it.rate).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
            <div className="bill-scan-foot">
              AI cost for this upload: ₹{scanResult.cost?.inr?.toFixed(2)} ({scanResult.cost?.input_tokens} + {scanResult.cost?.output_tokens} tokens).
              If something is wrong, open the bill and Cancel it — the stock is reversed.
            </div>
          </div>
        </div>
      )}

      {/* New Bill Form Modal */}
      {showForm && (
        <div className="frappe-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="frappe-modal frappe-modal-lg" onClick={e => e.stopPropagation()}>
            <div className="frappe-modal-head">
              <h2>New Purchase Bill</h2>
              <button className="frappe-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="frappe-form-grid">
              <div className="frappe-field">
                <label>Supplier *</label>
                <select className="frappe-input" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}>
                  <option value="">Select supplier…</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="frappe-field">
                <label>Warehouse</label>
                <select className="frappe-input" value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))}>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="frappe-field">
                <label>Bill Date</label>
                <input className="frappe-input" type="date" value={form.bill_date} onChange={e => setForm(f => ({ ...f, bill_date: e.target.value }))} />
              </div>
              <div className="frappe-field">
                <label>Due Date</label>
                <input className="frappe-input" type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
              </div>
            </div>

            <h3 className="frappe-section-head">Items</h3>
            <div className="frappe-table-wrap">
              <table className="frappe-table">
                <thead><tr><th>Item</th><th>Qty</th><th>Rate (₹)</th><th>Amount (₹)</th><th></th></tr></thead>
                <tbody>
                  {form.items.map((row, i) => (
                    <tr key={i}>
                      <td>
                        <select className="frappe-input" value={row.item_id} onChange={e => setItemRow(i, 'item_id', e.target.value)}>
                          <option value="">Select item…</option>
                          {inventory.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
                        </select>
                      </td>
                      <td><input className="frappe-input" type="number" min="0.001" step="0.001" value={row.qty} onChange={e => setItemRow(i, 'qty', Number(e.target.value))} /></td>
                      <td><input className="frappe-input" type="number" min="0" step="0.01" value={row.rate} onChange={e => setItemRow(i, 'rate', Number(e.target.value))} /></td>
                      <td>₹{r2((Number(row.qty)||0) * (Number(row.rate)||0)).toFixed(2)}</td>
                      <td><button className="frappe-icon-btn" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }))}>✕</button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={3} className="text-right fw-bold">Subtotal</td>
                    <td>₹{computedSubtotal.toFixed(2)}</td><td></td>
                  </tr>
                  <tr>
                    <td colSpan={2} className="text-right">Tax (₹)</td>
                    <td><input className="frappe-input" type="number" step="0.01" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: Number(e.target.value) }))} /></td>
                    <td>₹{Number(form.tax||0).toFixed(2)}</td><td></td>
                  </tr>
                  <tr>
                    <td colSpan={3} className="text-right fw-bold">Total</td>
                    <td className="fw-bold">₹{computedTotal.toFixed(2)}</td><td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <button className="frappe-btn frappe-btn-secondary" style={{marginTop:'0.5rem'}}
              onClick={() => setForm(f => ({ ...f, items: [...f.items, { ...emptyItem }] }))}>+ Add Item</button>

            <div className="frappe-field frappe-field-full" style={{marginTop:'0.75rem'}}>
              <label>Notes</label>
              <input className="frappe-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="frappe-modal-footer">
              <button className="frappe-btn frappe-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="frappe-btn frappe-btn-primary" onClick={handleSaveDraft} disabled={saving}>{saving ? 'Saving…' : 'Save Draft'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {payingBill && (
        <div className="frappe-modal-overlay" onClick={() => setPayingBill(null)}>
          <div className="frappe-modal" style={{maxWidth:'420px'}} onClick={e => e.stopPropagation()}>
            <div className="frappe-modal-head">
              <h2>Record Payment — {payingBill.bill_number}</h2>
              <button className="frappe-modal-close" onClick={() => setPayingBill(null)}>✕</button>
            </div>
            <div className="frappe-form-grid">
              <div className="frappe-field">
                <label>Amount (₹) *</label>
                <input className="frappe-input" type="number" step="0.01" value={payForm.amount} onChange={e => setPayForm(f => ({ ...f, amount: Number(e.target.value) }))} />
                <span className="frappe-hint">Balance due: ₹{(payingBill.total - payingBill.paid_amount).toFixed(2)}</span>
              </div>
              <div className="frappe-field">
                <label>Payment Method</label>
                <select className="frappe-input" value={payForm.method} onChange={e => setPayForm(f => ({ ...f, method: e.target.value }))}>
                  {['Cash','Bank','UPI','Card','Cheque'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="frappe-field">
                <label>Payment Date</label>
                <input className="frappe-input" type="date" value={payForm.payment_date} onChange={e => setPayForm(f => ({ ...f, payment_date: e.target.value }))} />
              </div>
              <div className="frappe-field frappe-field-full">
                <label>Notes</label>
                <input className="frappe-input" value={payForm.notes} onChange={e => setPayForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="frappe-modal-footer">
              <button className="frappe-btn frappe-btn-secondary" onClick={() => setPayingBill(null)}>Cancel</button>
              <button className="frappe-btn frappe-btn-success" onClick={handlePayment}>Record Payment</button>
            </div>
          </div>
        </div>
      )}
      </div>{/* frappe-page-body */}
    </div>
  )
}
