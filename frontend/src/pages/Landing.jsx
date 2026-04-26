import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const FEATURES = [
  { icon: '📊', title: 'Smart Dashboard', desc: 'Live overview of all your finances with monthly trends and instant insights.' },
  { icon: '💰', title: 'Income & Expenses', desc: 'Track every dollar in and out with categories, notes, and multi-currency support.' },
  { icon: '⏱️', title: 'Work Hour Tracker', desc: 'Log hours across multiple organizations with automatic net earnings calculation.' },
  { icon: '👨‍👩‍👧', title: 'Family Transfers', desc: 'Track money sent to family separately with monthly totals at a glance.' },
  { icon: '📈', title: 'Detailed Reports', desc: 'Filter by month or date range. Export to CSV anytime.' },
  { icon: '🌙', title: 'Dark Mode', desc: 'Beautiful in light and dark. Switches instantly from the top bar.' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  return (
    <div className="landing-page">
      <nav className="landing-nav">
        <div className="flex-center gap12">
          <div className="logo-mark">Fd</div>
          <span className="logo-name">Fin<em>Draft</em></span>
        </div>
        <div className="flex-center gap8">
          <button className="icon-btn" onClick={toggle} title="Toggle theme">
            {theme === 'dark' ? '☀' : '☽'}
          </button>
          <button className="btn" onClick={() => navigate('/login')}>Sign In</button>
          <button className="btn btn-primary" onClick={() => navigate('/signup')}>Get Started Free</button>
        </div>
      </nav>

      <div className="landing-hero">
        <div className="hero-badge">✦ Built for modern professionals</div>
        <h1 className="hero-h1">
          Your finances,<br />
          <span className="accent">finally clear.</span>
        </h1>
        <p className="hero-p">
          Track income, expenses, work hours, and family transfers — all in one beautiful, unified dashboard.
        </p>
        <div className="hero-cta">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/signup')}>
            Start for free →
          </button>
          <button className="btn btn-lg" onClick={() => navigate('/login')}>
            Sign in ↗
          </button>
        </div>
      </div>

      <div className="features-grid">
        {FEATURES.map(f => (
          <div key={f.title} className="feature-card">
            <div className="feature-icon">{f.icon}</div>
            <div className="feature-title">{f.title}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', padding: '60px 24px 80px', color: 'var(--text3)', fontSize: 13 }}>
        © {new Date().getFullYear()} FinDraft. All rights reserved.
      </div>
    </div>
  )
}
