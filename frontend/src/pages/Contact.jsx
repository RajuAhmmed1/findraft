import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const FAQS = [
  {
    q: 'Can I invite my team members later?',
    a: 'Yes. You can start solo and expand as your workflow grows.',
  },
  {
    q: 'Do you support exports?',
    a: 'Yes. Reports and operational records can be exported for audits and sharing.',
  },
  {
    q: 'Is there a trial?',
    a: 'Yes. You can start with the free experience and upgrade when needed.',
  },
]

export default function Contact() {
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
          <Link to="/features" className="marketing-link">Features</Link>
          <Link to="/pricing" className="marketing-link">Pricing</Link>
          <Link to="/contact" className="marketing-link active">Contact</Link>
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
        <p className="marketing-kicker">Contact</p>
        <h1>We are ready to help you implement FinDraft faster.</h1>
        <p>
          Reach out for onboarding, migration planning, and process setup guidance.
        </p>
      </section>

      <section className="contact-grid">
        <article className="marketing-card">
          <h3>Talk to sales</h3>
          <p className="pricing-desc">For pricing, volume, and custom requirements.</p>
          <p><strong>Email:</strong> sales@findraft.com</p>
          <p><strong>Response time:</strong> within 24 hours</p>
        </article>

        <article className="marketing-card">
          <h3>Customer success</h3>
          <p className="pricing-desc">For implementation and workflow optimization.</p>
          <p><strong>Email:</strong> success@findraft.com</p>
          <p><strong>Coverage:</strong> Monday to Friday</p>
        </article>
      </section>

      <section className="marketing-grid-section">
        {FAQS.map((faq) => (
          <article key={faq.q} className="marketing-card">
            <h3>{faq.q}</h3>
            <p className="pricing-desc">{faq.a}</p>
          </article>
        ))}
      </section>

      <footer className="marketing-footer">
        <span>Explore <Link to="/features">features</Link> or <Link to="/pricing">pricing</Link>.</span>
      </footer>
    </div>
  )
}
