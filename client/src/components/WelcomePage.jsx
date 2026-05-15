import { useState } from 'react'
import { login, setAuthToken } from '../api'

export default function WelcomePage({ onGetStarted }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleStart = async () => {
    setLoading(true)
    setError('')
    try {
      // Auto-login with demo credentials
      const res = await login({ email: 'admin@example.com', password: 'password123' })
      if (res.action === 'login_success') {
        setAuthToken(res.token)
        onGetStarted(res.user)
      }
    } catch (err) {
      setError(err.message || 'Failed to start POS')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pastel-welcome-container">
      <div className="pastel-header"></div>
      <div className="pastel-login-card" style={{ textAlign: 'center', padding: '40px' }}>
        <h1 className="pastel-title">StreetWok POS</h1>
        <p className="pastel-subtitle" style={{ marginBottom: '30px' }}>
          Welcome to The Biker's Cafe.<br/>
          Click below to start your shift.
        </p>

        {error && <div className="error-message" style={{ marginBottom: '20px' }}>{error}</div>}

        <button 
          onClick={handleStart} 
          className="pastel-btn-primary" 
          disabled={loading}
          style={{ width: '100%', padding: '15px', fontSize: '18px' }}
        >
          {loading ? 'Starting...' : 'Start POS'}
        </button>
      </div>
    </div>
  )
}
