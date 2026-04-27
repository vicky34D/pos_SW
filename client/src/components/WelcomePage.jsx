import { useState } from 'react'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { googleLogin, login, setupProfile, setAuthToken } from '../api'

export default function WelcomePage({ onGetStarted }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Setup Profile State
  const [isSettingUp, setIsSettingUp] = useState(false)
  const [setupData, setSetupData] = useState({
    email: '',
    google_id: '',
    name: '',
    phone: '',
    designation: '',
    org_name: '',
    password: ''
  })

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please enter both email and password.')
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
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoading(true)
    setError('')
    try {
      const res = await googleLogin(credentialResponse.credential)
      if (res.action === 'login_success') {
        setAuthToken(res.token)
        onGetStarted(res.user)
      } else if (res.action === 'setup_required') {
        setIsSettingUp(true)
        setSetupData({
          ...setupData,
          email: res.temp_data.email,
          google_id: res.temp_data.google_id,
          name: res.temp_data.name
        })
      }
    } catch (err) {
      setError(err.message || 'Google login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleError = () => {
    setError('Google Sign-In failed or was cancelled.')
  }

  const handleSetupSubmit = async (e) => {
    e.preventDefault()
    if (!setupData.org_name || !setupData.password) {
      setError('Organization name and password are required.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await setupProfile(setupData)
      if (res.action === 'setup_success') {
        setAuthToken(res.token)
        onGetStarted(res.user)
      }
    } catch (err) {
      setError(err.message || 'Profile setup failed')
    } finally {
      setLoading(false)
    }
  }

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '691116683990-p0eucmu9rs1bd0es55ks177pr567otvs.apps.googleusercontent.com'

  if (isSettingUp) {
    return (
      <div className="pastel-welcome-container">
        <div className="pastel-header">
          <button className="back-btn" onClick={() => setIsSettingUp(false)}>‹ Back</button>
        </div>
        <div className="pastel-login-card" style={{ maxWidth: '400px' }}>
          <h1 className="pastel-title">Setup Profile</h1>
          <p className="pastel-subtitle">Complete your organization setup</p>
          <form className="pastel-form" onSubmit={handleSetupSubmit}>
            <div className="input-group">
              <input type="text" placeholder="Full Name" value={setupData.name} onChange={e => setSetupData({...setupData, name: e.target.value})} required />
            </div>
            <div className="input-group">
              <input type="email" placeholder="Email" value={setupData.email} disabled />
            </div>
            <div className="input-group">
              <input type="text" placeholder="Phone (optional)" value={setupData.phone} onChange={e => setSetupData({...setupData, phone: e.target.value})} />
            </div>
            <div className="input-group">
              <input type="text" placeholder="Designation (optional)" value={setupData.designation} onChange={e => setSetupData({...setupData, designation: e.target.value})} />
            </div>
            <div className="input-group">
              <input type="text" placeholder="Organization Name" value={setupData.org_name} onChange={e => setSetupData({...setupData, org_name: e.target.value})} required />
            </div>
            <div className="input-group">
              <input type="password" placeholder="Create Password" value={setupData.password} onChange={e => setSetupData({...setupData, password: e.target.value})} required />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="pastel-btn-primary" disabled={loading}>
              {loading ? 'Setting up...' : 'Complete Setup'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="pastel-welcome-container">
        <div className="pastel-header"></div>
        <div className="pastel-login-card">
          <h1 className="pastel-title">Welcome Back</h1>
          <p className="pastel-subtitle">
            Ready to continue your shift?<br/>
            Your POS is right here.
          </p>

          <form className="pastel-form" onSubmit={handleEmailLogin}>
            <div className="input-group">
              <input 
                type="email" 
                placeholder="Enter email" 
                value={email}
                onChange={(e) => {setEmail(e.target.value); setError('');}}
                required
              />
            </div>
            
            <div className="input-group">
              <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => {setPassword(e.target.value); setError('');}}
                required
              />
              <span className="eye-icon">👁</span>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="pastel-btn-primary" disabled={loading}>
              {loading ? 'Logging In...' : 'Log In'}
            </button>
          </form>

          <div className="divider">
            <span>Or</span>
          </div>

          <div className="social-login-container">
            <div className="google-btn-wrapper" style={{display: 'flex', justifyContent: 'center'}}>
               <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                useOneTap
                theme="outline"
                size="large"
                shape="pill"
                type="standard"
              />
            </div>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  )
}
