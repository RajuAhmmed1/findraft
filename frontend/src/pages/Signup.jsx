import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Signup() {
  const [form, setForm]   = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy]   = useState(false)
  const { signup } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate   = useNavigate()

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async e => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) return setError('All fields are required.')
    if (form.password.length < 6) return setError('Password must be at least 6 characters.')
    setBusy(true); setError('')
    try {
      await signup(form.name, form.email, form.password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Signup failed. Please try again.')
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

        <h2 className="auth-heading">Create account</h2>
        <p className="auth-sub">Start tracking your finances for free.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Full name</label>
            <input className="form-input" type="text" placeholder="Alex Morgan" value={form.name} onChange={set('name')} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" placeholder="Min. 6 characters" value={form.password} onChange={set('password')} />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '10px', justifyContent: 'center' }}
            disabled={busy}
          >
            {busy ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <div style={{ marginTop: 20, fontSize: 13, color: 'var(--text3)', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 500 }}>Sign in</Link>
        </div>
      </div>
    </div>
  )
}
