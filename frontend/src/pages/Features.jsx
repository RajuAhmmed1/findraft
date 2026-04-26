import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const FEATURE_BLOCKS = [
  {
    title: 'Financial clarity',
    items: [
      'Live dashboard with category-level visibility',
      'Income and expense tracking with flexible notes',
      'Personal and family cash flow in one timeline',
    ],
  },
  {
    title: 'Operations that scale',
    items: [
      'Work-hour tracking across multiple organizations',
      'Loan tracking with repayments and outstanding balance',
      'Monthly and custom-range reporting with exports',
    ],
  },
  {
    title: 'Control and governance',
    items: [
      'Role-based access with admin user management',
      'Status controls and account-level activity visibility',
      'Fast profile updates with modern avatar workflow',
    ],
  },
]

export default function Features() {
  const navigate = useNavigate()
  const { theme, toggle } = useTheme()

  return (
    <div className="marketing-page">
      <nav className="landing-nav">
        <button className="brand-btn" onClick={() => navigate('/')}>
          <div className="logo-mark">Fd</div>
          <span className="logo-name">Fin<em>Draft</em></span>
        </button>
        <div className="marketing-nav-links">
          <Link to="/features" className="marketing-link active">Features</Link>
          <Link to="/pricing" className="marketing-link">Pricing</Link>
          <Link to="/contact" className="marketing-link">Contact</Link>
        </div>
        <div className="flex-center gap8">
          <button className="icon-btn" onClick={toggle} title="Toggle theme">
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button className="btn" onClick={() => navigate('/login')}>Sign in</button>
          <button className="btn btn-primary" onClick={() => navigate('/signup')}>Start free</button>
        </div>
      </nav>

      <section className="marketing-hero">
        <p className="marketing-kicker">Product capabilities</p>
        <h1>Everything teams need to run money operations with confidence.</h1>
        <p>
          FinDraft combines planning, tracking, analysis, and governance into one product so teams can move
          from scattered spreadsheets to a consistent operating rhythm.
        </p>
      </section>

      <section className="marketing-grid-section">
        {FEATURE_BLOCKS.map((block) => (
          <article key={block.title} className="marketing-card">
            <h3>{block.title}</h3>
            <ul className="marketing-list">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="marketing-cta-banner">
        <h2>Build a finance system your team can trust daily.</h2>
        <p>Start free and upgrade when your workflows and team grow.</p>
        <div className="hero-cta">
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/signup')}>Create account</button>
          <button className="btn btn-lg" onClick={() => navigate('/pricing')}>See pricing</button>
        </div>
      </section>

      <footer className="marketing-footer">
        <span>© {new Date().getFullYear()} FinDraft. All rights reserved.</span>
      </footer>
    </div>
  )
}
