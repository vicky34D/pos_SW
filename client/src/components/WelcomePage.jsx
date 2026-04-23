import { useState } from 'react'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'

export default function WelcomePage({ onGetStarted, settings }) {
  const [error, setError] = useState('')

  // Hardcoded allowed users for demonstration
  const allowedUsers = ['admin@gmail.com', 'staff@gmail.com', 'sudipagharami@gmail.com']

  const handleLoginSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential)
      const email = decoded.email
      
      if (!email || !email.endsWith('@gmail.com')) {
        setError('Only Gmail accounts are allowed.')
        return
      }
      if (allowedUsers.includes(email.toLowerCase())) {
        onGetStarted(email)
      } else {
        setError(`Access denied. ${email} is not authorized.`)
      }
    } catch (err) {
      setError('Failed to decode login credentials.')
    }
  }

  const handleLoginError = () => {
    setError('Google Sign-In failed or was cancelled.')
  }

  // Get Client ID from env, or provide instructions placeholder
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE'

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="welcome-container">
        <div className="welcome-card">
          <div className="welcome-logo">
            {settings?.shop_name?.charAt(0) || 'S'}
          </div>
          <h1 className="welcome-title">Welcome to {settings?.shop_name || 'StreetWok'}</h1>
          <p className="welcome-tagline">{settings?.tagline || "The Biker's Cafe"}</p>
          
          <div className="welcome-features">
            <div className="feature-item">
              <span className="feature-icon">⚡️</span>
              <span>Fast Checkout</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📦</span>
              <span>Inventory Sync</span>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📊</span>
              <span>Real-time Reports</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
             <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={handleLoginError}
              useOneTap
              theme="outline"
              size="large"
              shape="pill"
            />
          </div>
          
          {error && <div className="login-error" style={{ marginTop: '1rem', width: '100%' }}>{error}</div>}
          
          {clientId === 'YOUR_GOOGLE_CLIENT_ID_HERE' && (
            <p style={{ fontSize: '0.75rem', color: '#e53e5c', marginTop: '1rem', padding: '0.5rem', background: 'rgba(229, 62, 92, 0.08)', borderRadius: '8px' }}>
              ⚠️ Missing Google Client ID.<br/>Please add VITE_GOOGLE_CLIENT_ID to your .env file in the client folder.
            </p>
          )}

          <p className="login-hint">Only authorized staff can access the POS</p>
        </div>
        
        <div className="welcome-footer">
          Powered by StreetWok POS System
        </div>
      </div>
    </GoogleOAuthProvider>
  )
}
