import { useState, useEffect, useCallback } from 'react'
import * as api from '../api'

const emptyForm = { name: '', contact_person: '', phone: '', email: '', address: '', gstin: '' }

export default function SuppliersView({ showToast }) {
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editSupplier, setEditSupplier] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState(null)

  const load = useCallback(async () => {
    try { const data = await api.getSuppliers({ active: true }); setSuppliers(data) }
    catch (e) { showToast(e.message, 'error') }
    finally { setLoading(false) }
  }, [showToast])

  useEffect(() => { load() }, [load])

  const filtered = suppliers.filter(s =>
    !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.phone || '').includes(search) || (s.email || '').toLowerCase().includes(search.toLowerCase())
  )

  const openNew = () => { setEditSupplier(null); setForm(emptyForm); setShowForm(true) }
  const openEdit = (s) => { setEditSupplier(s); setForm({ name: s.name, contact_person: s.contact_person || '', phone: s.phone || '', email: s.email || '', address: s.address || '', gstin: s.gstin || '' }); setShowForm(true) }

  const openDetail = async (s) => {
    try { const d = await api.getSupplier(s.id); setDetail(d) }
    catch (e) { showToast(e.message, 'error') }
  }

  const handleSave = async () => {
    if (!form.name.trim()) return showToast('Supplier name is required', 'error')
    setSaving(true)
    try {
      if (editSupplier) { await api.updateSupplier(editSupplier.id, form); showToast('Supplier updated', 'success') }
      else { await api.createSupplier(form); showToast('Supplier created', 'success') }
      setShowForm(false); load()
    } catch (e) { showToast(e.message, 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this supplier?')) return
    try { await api.deleteSupplier(id); showToast('Supplier deactivated', 'success'); load() }
    catch (e) { showToast(e.message, 'error') }
  }

  const statusColor = (status) => {
    if (status === 'Paid') return 'badge-green'
    if (status === 'Partially Paid') return 'badge-orange'
    if (status === 'Submitted') return 'badge-blue'
    return 'badge-grey'
  }

  if (loading) return <div className="frappe-loading">Loading Suppliers…</div>

  return (
    <div className="frappe-page">
      <div className="frappe-page-head">
        <div className="frappe-page-head-left">
          <div className="frappe-breadcrumb">Buying <span>›</span> Suppliers</div>
          <h1 className="frappe-title">Suppliers</h1>
        </div>
        <button className="frappe-btn frappe-btn-primary" onClick={openNew}>+ New Supplier</button>
      </div>
      <div className="frappe-page-body">

      <div className="frappe-toolbar">
        <input className="frappe-search" placeholder="Search name, phone, email…" value={search} onChange={e => setSearch(e.target.value)} />
        <span className="frappe-count">{filtered.length} suppliers</span>
      </div>

      <div className="frappe-card-grid">
        {filtered.length === 0 && <div className="frappe-empty-state">No suppliers yet. Click "+ New Supplier" to add one.</div>}
        {filtered.map(s => (
          <div key={s.id} className="frappe-supplier-card" onClick={() => openDetail(s)}>
            <div className="supplier-avatar">{s.name.charAt(0).toUpperCase()}</div>
            <div className="supplier-info">
              <div className="supplier-name">{s.name}</div>
              {s.contact_person && <div className="supplier-meta">👤 {s.contact_person}</div>}
              {s.phone && <div className="supplier-meta">📞 {s.phone}</div>}
              {s.email && <div className="supplier-meta">✉️ {s.email}</div>}
              {s.gstin && <div className="supplier-meta">🏛️ GSTIN: {s.gstin}</div>}
            </div>
            <div className="supplier-actions" onClick={e => e.stopPropagation()}>
              <span className="frappe-tag">{s.bill_count || 0} bills</span>
              <button className="frappe-icon-btn" onClick={() => openEdit(s)}>✏️</button>
              <button className="frappe-icon-btn" onClick={() => handleDelete(s.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>

      {/* Supplier Detail Panel */}
      {detail && (
        <div className="frappe-modal-overlay" onClick={() => setDetail(null)}>
          <div className="frappe-modal" style={{maxWidth:'680px'}} onClick={e => e.stopPropagation()}>
            <div className="frappe-modal-head">
              <h2>{detail.name}</h2>
              <button className="frappe-modal-close" onClick={() => setDetail(null)}>✕</button>
            </div>
            <div className="frappe-detail-grid">
              {detail.contact_person && <div><label>Contact</label><span>{detail.contact_person}</span></div>}
              {detail.phone && <div><label>Phone</label><span>{detail.phone}</span></div>}
              {detail.email && <div><label>Email</label><span>{detail.email}</span></div>}
              {detail.gstin && <div><label>GSTIN</label><span>{detail.gstin}</span></div>}
              {detail.address && <div className="span-2"><label>Address</label><span>{detail.address}</span></div>}
            </div>
            <h3 style={{margin:'1.2rem 0 0.5rem',fontSize:'0.9rem',fontWeight:600,color:'var(--text-muted)'}}>RECENT BILLS</h3>
            <div className="frappe-table-wrap" style={{maxHeight:'220px',overflow:'auto'}}>
              <table className="frappe-table">
                <thead><tr><th>Bill No.</th><th>Date</th><th>Total</th><th>Paid</th><th>Status</th></tr></thead>
                <tbody>
                  {detail.bills?.map(b => (
                    <tr key={b.id}><td>{b.bill_number}</td><td>{b.bill_date}</td>
                      <td>₹{b.total?.toFixed(2)}</td><td>₹{b.paid_amount?.toFixed(2)}</td>
                      <td><span className={`badge ${statusColor(b.status)}`}>{b.status}</span></td>
                    </tr>
                  ))}
                  {!detail.bills?.length && <tr><td colSpan={5} className="frappe-empty">No bills yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Form Modal */}
      {showForm && (
        <div className="frappe-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="frappe-modal" onClick={e => e.stopPropagation()}>
            <div className="frappe-modal-head">
              <h2>{editSupplier ? 'Edit Supplier' : 'New Supplier'}</h2>
              <button className="frappe-modal-close" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <div className="frappe-form-grid">
              {[
                ['Supplier Name *','name','text','e.g. Fresh Farms Ltd'],
                ['Contact Person','contact_person','text',''],
                ['Phone','phone','tel',''],
                ['Email','email','email',''],
                ['GSTIN','gstin','text','22AAAAA0000A1Z5'],
              ].map(([label, key, type, ph]) => (
                <div className="frappe-field" key={key}>
                  <label>{label}</label>
                  <input className="frappe-input" type={type} placeholder={ph} value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} />
                </div>
              ))}
              <div className="frappe-field frappe-field-full">
                <label>Address</label>
                <textarea className="frappe-input" rows={2} value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
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
