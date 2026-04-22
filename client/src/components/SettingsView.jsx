import { useState, useEffect } from 'react'
import * as api from '../api'

export default function SettingsView({ settings, setSettings, showToast }) {
  const [form, setForm] = useState({ ...settings })

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

  const clearTransactions = async () => {
    if (!confirm('Are you sure you want to clear all transactions? This cannot be undone!')) return
    try {
      await api.clearAllOrders()
      showToast('Transactions cleared', 'info')
    } catch (e) {
      showToast(e.message, 'error')
    }
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

      <div className="settings-section">
        <div className="settings-title">Danger Zone</div>
        <div className="settings-row">
          <span className="settings-label">Clear all transaction history</span>
          <button className="btn-danger-action" onClick={clearTransactions}>Clear Transactions</button>
        </div>
      </div>
    </div>
  )
}
