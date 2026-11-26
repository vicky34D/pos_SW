import { useState } from 'react'
import { login, setAuthToken } from '../api'

export default function WelcomePage({ onGetStarted }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    if (e) e.preventDefault()
    if (!email || !password) {
      setError('Please enter email and password')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await login({ email, password })
      if (res.action === 'login_success') {
        setAuthToken(res.token)
        onGetStarted(res.user)
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening'

  return (
    <div className="pastel-welcome-container dh-login">
      <div className="dh-login-shell">
        <div className="dh-login-brand">
          <div className="dh-logo"><span className="dh-logo-mark">D</span>DHARS</div>
          <div className="dh-login-hero">
            <h1 className="dh-login-title">{greeting}! 👋</h1>
            <p className="dh-login-sub">Your counter is ready. Sign in to start taking orders.</p>
          </div>
          <div className="dh-login-chips">
            <div className="dh-chip dh-chip-lime"><span>⚡</span><b>Fast</b> billing</div>
            <div className="dh-chip dh-chip-violet"><span>🧾</span><b>KOT</b> &amp; receipts</div>
            <div className="dh-chip dh-chip-white"><span>📊</span><b>Live</b> reports</div>
          </div>
        </div>

        <div className="pastel-login-card dh-login-card">
          <h2 className="dh-card-title">Sign in</h2>
          <p className="dh-card-sub">Use your staff email and password.</p>

          {error && <div className="error-message" style={{ marginBottom: '15px' }}>{error}</div>}

          <form onSubmit={handleLogin} className="pastel-form">
            <label className="dh-field">
              <span>Email</span>
              <div className="input-group">
                <input
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </label>
            <label className="dh-field">
              <span>Password</span>
              <div className="input-group">
                <input
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </label>
            <button type="submit" className="pastel-btn-primary dh-login-btn" disabled={loading}>
              {loading ? 'Verifying…' : 'Login'} <span aria-hidden="true">↗</span>
            </button>
          </form>
          <p className="dh-card-foot">DHARS POS · Point of Sale</p>
        </div>
      </div>
    </div>
  )
}
