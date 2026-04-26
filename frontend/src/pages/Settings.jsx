import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'
import { useCurrency } from '../context/CurrencyContext'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import AvatarUploadModal from '../components/AvatarUploadModal'

const CURRENCIES = [
  { code: 'USD', label: 'USD — US Dollar ($)' },
  { code: 'EUR', label: 'EUR — Euro (€)' },
  { code: 'GBP', label: 'GBP — British Pound (£)' },
  { code: 'JPY', label: 'JPY — Japanese Yen (¥)' },
  { code: 'KRW', label: 'KRW — Korean Won (₩)' },
  { code: 'AUD', label: 'AUD — Australian Dollar (A$)' },
  { code: 'CAD', label: 'CAD — Canadian Dollar (C$)' },
  { code: 'SGD', label: 'SGD — Singapore Dollar (S$)' },
  { code: 'INR', label: 'INR — Indian Rupee (₹)' },
  { code: 'CNY', label: 'CNY — Chinese Yuan (¥)' },
  { code: 'CHF', label: 'CHF — Swiss Franc (CHF)' },
  { code: 'MYR', label: 'MYR — Malaysian Ringgit (RM)' },
]

export default function Settings() {
  const { user, updateUser, logout } = useAuth()
  const { theme, setTheme }          = useTheme()
  const { addToast }                 = useToast()
  const { currency, setCurrency }    = useCurrency()   // ← global currency state
  const navigate = useNavigate()

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatarUrl: user?.avatarUrl || ''
  })
  const [prefs,   setPrefs]   = useState({
    defaultCurrency: user?.defaultCurrency || currency || 'USD',
    theme: user?.theme || theme
  })
  const [pw,   setPw]   = useState({ current: '', newPw: '', confirm: '' })
  const [busy, setBusy] = useState(false)
  const [showAvatarModal, setShowAvatarModal] = useState(false)

  const setP    = k => e => setProfile(f => ({ ...f, [k]: e.target.value }))
  const setPref = k => e => setPrefs(f => ({ ...f, [k]: e.target.value }))
  const setPwF  = k => e => setPw(f => ({ ...f, [k]: e.target.value }))

  const saveProfile = async () => {
    if (!profile.name.trim() || !profile.email.trim())
      return addToast('Name and email are required.', 'error')
    setBusy(true)
    try {
      const res = await api.put('/auth/profile', profile)
      updateUser(res.data.user)
      addToast('Profile saved!')
    } catch (e) {
      addToast(e.response?.data?.error || 'Failed to save.', 'error')
    } finally { setBusy(false) }
  }

  const savePrefs = async () => {
    setBusy(true)
    try {
      // Apply theme immediately
      setTheme(prefs.theme)
      // Apply currency globally and immediately — this triggers re-render across all pages
      setCurrency(prefs.defaultCurrency)
      // Persist to backend
      const res = await api.put('/auth/profile', {
        defaultCurrency: prefs.defaultCurrency,
        theme: prefs.theme
      })
      updateUser(res.data.user)
      addToast(`Preferences saved — currency set to ${prefs.defaultCurrency}`)
    } catch (e) {
      addToast(e.response?.data?.error || 'Failed to save.', 'error')
    } finally { setBusy(false) }
  }

  const changePassword = async () => {
    if (!pw.current || !pw.newPw)      return addToast('All password fields are required.', 'error')
    if (pw.newPw.length < 6)           return addToast('New password must be 6+ characters.', 'error')
    if (pw.newPw !== pw.confirm)       return addToast('Passwords do not match.', 'error')
    setBusy(true)
    try {
      await api.put('/auth/profile', { currentPassword: pw.current, newPassword: pw.newPw })
      setPw({ current: '', newPw: '', confirm: '' })
      addToast('Password changed successfully!')
    } catch (e) {
      addToast(e.response?.data?.error || 'Failed to change password.', 'error')
    } finally { setBusy(false) }
  }

  const saveAvatar = async (avatarUrl) => {
    setBusy(true)
    try {
      const res = await api.put('/auth/profile', { avatarUrl })
      updateUser(res.data.user)
      setProfile(p => ({ ...p, avatarUrl }))
      setShowAvatarModal(false)
      addToast('Profile picture updated!')
    } catch (e) {
      addToast(e.response?.data?.error || 'Failed to save profile picture.', 'error')
    } finally { setBusy(false) }
  }

  return (
    <div>
      <div className="g2 mb20">
        {/* ── Profile ── */}
        <div className="card">
          <div className="card-header"><div className="card-title">Profile</div></div>

          <div className="settings-profile-row">
            <div className="avatar avatar-lg">
              {profile.avatarUrl
                ? <img src={profile.avatarUrl} alt={user?.name || 'Profile'} className="avatar-img" />
                : <span className="avatar-fallback">👤</span>}
            </div>
            <div>
              <div style={{ fontWeight:600, fontSize:15 }}>{user?.name}</div>
              <div className="text-sm text-muted">{user?.email}</div>
              <div className="text-xs" style={{ marginTop:3, color:'var(--primary)' }}>Currency: {currency}</div>
              <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setShowAvatarModal(true)}>
                {profile.avatarUrl ? 'Change Photo' : 'Upload Photo'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={profile.name} onChange={setP('name')} />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" value={profile.email} onChange={setP('email')} />
          </div>
          <button className="btn btn-primary" onClick={saveProfile} disabled={busy}>
            {busy ? 'Saving…' : 'Save Profile'}
          </button>
        </div>

        {/* ── Preferences ── */}
        <div className="card">
          <div className="card-header"><div className="card-title">Preferences</div></div>

          <div className="form-group">
            <label className="form-label">Default Currency</label>
            <select className="form-select" value={prefs.defaultCurrency} onChange={setPref('defaultCurrency')}>
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
            <div className="form-hint">
              Changes currency display across the entire app instantly.
              Currently: <strong>{currency}</strong>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Theme</label>
            <div style={{ display:'flex', gap:8, marginTop:4 }}>
              {['light','dark'].map(t => (
                <div
                  key={t}
                  onClick={() => setPrefs(f => ({ ...f, theme: t }))}
                  style={{
                    flex:1, padding:'10px 16px', borderRadius:9, cursor:'pointer',
                    border: prefs.theme===t ? '2px solid var(--primary)' : '2px solid var(--border)',
                    background: prefs.theme===t ? 'var(--primary-lt)' : 'var(--surface2)',
                    textAlign:'center', fontWeight:500, fontSize:13,
                    color: prefs.theme===t ? 'var(--primary)' : 'var(--text2)',
                    transition:'all .15s'
                  }}
                >
                  {t === 'light' ? '☀ Light' : '☽ Dark'}
                </div>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" onClick={savePrefs} disabled={busy}>
            {busy ? 'Saving…' : 'Save Preferences'}
          </button>
        </div>
      </div>

      <div className="g2">
        {/* ── Change Password ── */}
        <div className="card">
          <div className="card-header"><div className="card-title">Change Password</div></div>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input className="form-input" type="password" value={pw.current} onChange={setPwF('current')} placeholder="••••••••" />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" value={pw.newPw} onChange={setPwF('newPw')} placeholder="Min. 6 characters" />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input className="form-input" type="password" value={pw.confirm} onChange={setPwF('confirm')} placeholder="Repeat new password" />
          </div>
          <button className="btn btn-primary" onClick={changePassword} disabled={busy}>
            {busy ? 'Updating…' : 'Update Password'}
          </button>
        </div>

        {/* ── Account ── */}
        <div className="card">
          <div className="card-header"><div className="card-title">Account</div></div>
          <div style={{ background:'var(--surface2)', borderRadius:10, padding:'14px 16px', marginBottom:16 }}>
            <div className="text-xs text-muted mb4">Signed in as</div>
            <div style={{ fontWeight:600 }}>{user?.email}</div>
          </div>
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:16 }}>
            <div className="text-sm mb12" style={{ fontWeight:500, color:'var(--red)' }}>Danger Zone</div>
            <button
              className="btn"
              style={{ color:'var(--red)', borderColor:'var(--red)' }}
              onClick={() => { logout(); navigate('/') }}
            >⏻ Sign Out</button>
          </div>
        </div>
      </div>

      {showAvatarModal && (
        <AvatarUploadModal
          initialUrl={profile.avatarUrl}
          loading={busy}
          onClose={() => setShowAvatarModal(false)}
          onApply={saveAvatar}
        />
      )}
    </div>
  )
}
