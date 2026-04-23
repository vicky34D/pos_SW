import { useState } from 'react'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'

export default function WelcomePage({ onGetStarted }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // Hardcoded allowed users
  const allowedUsers = ['admin@gmail.com', 'staff@gmail.com', 'sudipagharami@gmail.com', 'vicky233012@gmail.com']

  const handleEmailLogin = (e) => {
    e.preventDefault()
    if (!email) {
      setError('Please enter your email.')
      return
    }
    // Simple mock logic for the new UI
    if (allowedUsers.includes(email.toLowerCase())) {
      onGetStarted(email)
    } else {
      setError(`Access denied. ${email} is not authorized.`)
    }
  }

  const handleLoginSuccess = (credentialResponse) => {
    try {
      const decoded = jwtDecode(credentialResponse.credential)
      const decodedEmail = decoded.email
      
      if (!decodedEmail || !decodedEmail.endsWith('@gmail.com')) {
        setError('Only Gmail accounts are allowed.')
        return
      }
      if (allowedUsers.includes(decodedEmail.toLowerCase())) {
        onGetStarted(decodedEmail)
      } else {
        setError(`Access denied. ${decodedEmail} is not authorized.`)
      }
    } catch (err) {
      setError('Failed to decode login credentials.')
    }
  }

  const handleLoginError = () => {
    setError('Google Sign-In failed or was cancelled.')
  }

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE'

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <div className="pastel-welcome-container">
        
        {/* Top pattern / back button area mock */}
        <div className="pastel-header">
          <button className="back-btn">‹ Back</button>
        </div>

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

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" /> Remember me
              </label>
              <a href="#" className="forgot-password">Forgot password?</a>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="pastel-btn-primary">
              Log In
            </button>
          </form>

          <div className="divider">
            <span>Sign in with</span>
          </div>

          <div className="social-login-container">
            <div className="google-btn-wrapper">
               <GoogleLogin
                onSuccess={handleLoginSuccess}
                onError={handleLoginError}
                useOneTap
                theme="outline"
                size="large"
                shape="circle"
                type="icon"
              />
            </div>
          </div>

          <p className="signup-prompt">
            Don't have an account? <a href="#">Sign Up</a>
          </p>
        </div>
      </div>
    </GoogleOAuthProvider>
  )
}
