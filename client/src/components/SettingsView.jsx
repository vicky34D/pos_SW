import { useState, useEffect } from 'react'
import * as api from '../api'

const PASSCODE = '252525'

export default function SettingsView({ settings, setSettings, showToast, currentUser }) {
  const [form, setForm] = useState({ ...settings })
  const [showPasscodeModal, setShowPasscodeModal] = useState(false)
  const [passcodeInput, setPasscodeInput] = useState('')
  const [passcodeError, setPasscodeError] = useState('')
  const [pendingAction, setPendingAction] = useState(null)

  useEffect(() => { setForm({ ...settings }) }, [settings])

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleBlur = async (key) => {
    try {
      const updated = await api.updateSettings({ [key]: form[key] })
      setSettings(updated)
      showToast('Settings saved', 'success')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const requirePasscode = (action) => {
    setPendingAction(() => action)
    setPasscodeInput('')
    setPasscodeError('')
    setShowPasscodeModal(true)
  }

  const handlePasscodeSubmit = () => {
    if (passcodeInput === PASSCODE) {
      setShowPasscodeModal(false)
      if (pendingAction) pendingAction()
      setPendingAction(null)
    } else {
      setPasscodeError('Incorrect passcode. Access denied.')
      setPasscodeInput('')
    }
  }

  const clearTransactions = () => {
    requirePasscode(async () => {
      if (!confirm('Are you sure you want to clear ALL transactions? This cannot be undone!')) return
      try {
        await api.clearAllOrders()
        showToast('All transactions cleared', 'info')
      } catch (e) {
        showToast(e.message, 'error')
      }
    })
  }

  return (
    <div className="view-section">
      <div className="top-header">
        <div className="header-left">
          <div className="header-title">Settings</div>
          <div className="header-subtitle">Configure your POS system</div>
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Business Info</div>
        <div className="settings-row">
          <span className="settings-label">Shop Name</span>
          <input className="settings-input" value={form.shop_name || ''} onChange={e => handleChange('shop_name', e.target.value)} onBlur={() => handleBlur('shop_name')} />
        </div>
        <div className="settings-row">
          <span className="settings-label">Tagline</span>
          <input className="settings-input" value={form.tagline || ''} onChange={e => handleChange('tagline', e.target.value)} onBlur={() => handleBlur('tagline')} />
        </div>
        <div className="settings-row">
          <span className="settings-label">Phone</span>
          <input className="settings-input" value={form.phone || ''} onChange={e => handleChange('phone', e.target.value)} onBlur={() => handleBlur('phone')} />
        </div>
        <div className="settings-row">
          <span className="settings-label">Address</span>
          <input className="settings-input" value={form.address || ''} onChange={e => handleChange('address', e.target.value)} onBlur={() => handleBlur('address')} />
        </div>
      </div>

      <div className="settings-section">
        <div className="settings-title">Tax & Pricing</div>
        <div className="settings-row">
          <span className="settings-label">GST Rate (%)</span>
          <input className="settings-input" type="number" min="0" max="28" value={form.tax_rate || '5'} onChange={e => handleChange('tax_rate', e.target.value)} onBlur={() => handleBlur('tax_rate')} />
        </div>
      </div>

      {currentUser?.is_owner && <AiKeySection showToast={showToast} />}

      <div className="settings-section">
        <div className="settings-title" style={{ color: 'var(--danger)' }}>⚠️ Danger Zone</div>
        <div className="settings-row">
          <div>
            <span className="settings-label">Clear all transaction history</span>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Requires passcode. This action cannot be undone.
            </div>
          </div>
          <button className="btn-danger-action" onClick={clearTransactions}>
            🔐 Clear Transactions
          </button>
        </div>
        <div className="settings-row">
          <div>
            <span className="settings-label">Previous day data & reports</span>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Historical data is protected and cannot be deleted.
            </div>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--success)', fontWeight: 600 }}>🔒 Protected</span>
        </div>
      </div>

      {/* Passcode Modal */}
      {showPasscodeModal && (
        <div className="modal-overlay" onClick={() => setShowPasscodeModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '0.5rem' }}>🔐</div>
            <div className="modal-title">Enter Passcode</div>
            <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              This action is protected. Enter the admin passcode to continue.
            </p>
            <div className="modal-form-group">
              <label>Passcode</label>
              <input
                type="password"
                value={passcodeInput}
                onChange={e => { setPasscodeInput(e.target.value); setPasscodeError('') }}
                onKeyDown={e => e.key === 'Enter' && handlePasscodeSubmit()}
                placeholder="Enter passcode..."
                autoFocus
                style={{ letterSpacing: '0.3em', fontSize: '1.1rem', textAlign: 'center' }}
              />
              {passcodeError && (
                <div style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: '0.4rem', textAlign: 'center' }}>
                  {passcodeError}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-modal btn-modal-cancel" onClick={() => setShowPasscodeModal(false)}>Cancel</button>
              <button className="btn-modal btn-modal-confirm" onClick={handlePasscodeSubmit}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Main admin only: the Anthropic API key that powers "Upload Bill".
// The key is sent once to the server and never shown again (only its last 4).
function AiKeySection({ showToast }) {
  const [status, setStatus] = useState(null)
  const [editing, setEditing] = useState(false)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.getAiKeyStatus().then(setStatus).catch(() => setStatus({ configured: false }))
  }, [])

  const save = async () => {
    setBusy(true); setError('')
    try {
      const res = await api.saveAiKey(key.trim())
      setStatus(res); setEditing(false); setKey('')
      showToast(res.warning || 'AI key saved. Bill upload is ready.', res.warning ? 'info' : 'success')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!confirm('Remove the AI key? Bill upload will stop working until a new key is added.')) return
    try {
      setStatus(await api.removeAiKey())
      showToast('AI key removed', 'info')
    } catch (e) {
      showToast(e.message, 'error')
    }
  }

  const showForm = editing || (status && !status.configured)

  return (
    <div className="settings-section">
      <div className="settings-title">AI Bill Upload</div>
      <div className="settings-row">
        <div>
          <span className="settings-label">Anthropic API key</span>
          <div className="ai-key-hint">
            Powers Purchase Bills → Upload Bill. Only you (main admin) see this. Get a key at console.anthropic.com → API Keys.
          </div>
        </div>
        {status === null ? (
          <span className="ai-key-hint">Checking…</span>
        ) : status.configured && !editing ? (
          <div className="ai-key-status">
            <span className="ai-key-ok">✓ Key saved (ends in …{status.last4})</span>
            <button className="btn-modal btn-modal-cancel" onClick={() => { setEditing(true); setError('') }}>Replace</button>
            {status.source === 'settings' && <button className="btn-modal btn-modal-cancel" onClick={remove}>Remove</button>}
          </div>
        ) : (
          <span className="ai-key-missing">Not set: Upload Bill is off</span>
        )}
      </div>
      {showForm && (
        <div className="ai-key-form">
          <input
            className="settings-input"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-ant-…"
            value={key}
            onChange={e => { setKey(e.target.value); setError('') }}
            onKeyDown={e => e.key === 'Enter' && key.trim() && !busy && save()}
          />
          <button className="btn-modal btn-modal-confirm" disabled={!key.trim() || busy} onClick={save}>
            {busy ? 'Checking key…' : 'Save key'}
          </button>
          {editing && <button className="btn-modal btn-modal-cancel" onClick={() => { setEditing(false); setKey(''); setError('') }}>Cancel</button>}
          {error && <div className="ai-key-error">{error}</div>}
        </div>
      )}
    </div>
  )
}
