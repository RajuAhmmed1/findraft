import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Login() {
  const [form, setForm]   = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)
  const { login, googleLogin }  = useAuth()
  const { theme, toggle } = useTheme()
  const navigate   = useNavigate()
  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID)

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    if (!form.email || !form.password) return setError('All fields are required.')
    setBusy(true); setError('')
    try {
      await login(form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const submitGoogle = async (credential) => {
    setBusy(true)
    setError('')
    try {
      await googleLogin(credential)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Google login failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div className="auth-logo">
            <div className="logo-mark">Fd</div>
            <span className="logo-name">Fin<em>Draft</em></span>
          </div>
          <button className="icon-btn" onClick={toggle}>{theme === 'dark' ? '☀' : '☽'}</button>
        </div>

        <h2 className="auth-heading">Welcome back</h2>
        <p className="auth-sub">Sign in to your financial dashboard.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={set('email')}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Your password"
              value={form.password}
              onChange={set('password')}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', justifyContent: 'center' }}
            disabled={busy}
          >
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        {googleEnabled && (
          <>
            <div className="auth-divider">
              <div className="auth-divider-line" />
              <span>or continue with</span>
              <div className="auth-divider-line" />
            </div>

            <div className="google-login-wrap">
              <GoogleLogin
                onSuccess={(credentialResponse) => {
                  if (!credentialResponse.credential) {
                    setError('Google did not return a valid credential.')
                    return
                  }
                  submitGoogle(credentialResponse.credential)
                }}
                onError={() => setError('Google login failed. Please try again.')}
                theme={theme === 'dark' ? 'filled_black' : 'outline'}
                text="continue_with"
                shape="pill"
                size="large"
                width="320"
              />
            </div>
          </>
        )}

        <div className="auth-switch" style={{ marginTop: 20, fontSize: 13, color: 'var(--text3)', textAlign: 'center' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: 'var(--primary)', fontWeight: 500 }}>Sign up free</Link>
        </div>
      </div>
    </div>
  )
}
