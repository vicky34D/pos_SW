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

  return (
    <div className="pastel-welcome-container">
      <div className="pastel-header"></div>
      <div className="pastel-login-card" style={{ textAlign: 'center', padding: '40px' }}>
        <h1 className="pastel-title">StreetWok POS</h1>
        <p className="pastel-subtitle" style={{ marginBottom: '25px' }}>
          Please sign in to your account
        </p>

        {error && <div className="error-message" style={{ marginBottom: '15px' }}>{error}</div>}

        <form onSubmit={handleLogin} className="pastel-form">
          <div className="input-group">
            <input 
              type="email" 
              placeholder="Email address" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <div className="input-group">
            <input 
              type="password" 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <button 
            type="submit" 
            className="pastel-btn-primary" 
            disabled={loading}
            style={{ width: '100%', padding: '12px', fontSize: '16px', marginTop: '10px' }}
          >
            {loading ? 'Verifying...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}
