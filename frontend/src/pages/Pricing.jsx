import { Link, useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'

const PLANS = [
  {
    name: 'Starter',
    price: '$0',
    period: '/month',
    description: 'For individuals getting financial visibility.',
    points: ['Core tracking and dashboard', 'Monthly reports', 'Single workspace'],
    cta: 'Start free',
    to: '/signup',
  },
  {
    name: 'Growth',
    price: '$19',
    period: '/month',
    description: 'For active operators and small teams.',
    points: ['Loans and advanced work tracking', 'CSV export and filters', 'Priority support'],
    cta: 'Start trial',
    to: '/signup',
    featured: true,
  },
  {
    name: 'Scale',
    price: 'Custom',
    period: '',
    description: 'For organizations needing controls at scale.',
    points: ['Admin workflows and governance', 'High-volume operational support', 'Dedicated onboarding'],
    cta: 'Talk to sales',
    to: '/contact',
  },
]

export default function Pricing() {
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
          <Link to="/pricing" className="marketing-link active">Pricing</Link>
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
        <p className="marketing-kicker">Simple pricing</p>
        <h1>Choose the plan that matches your operating stage.</h1>
        <p>No hidden fees. Upgrade or downgrade anytime as your team evolves.</p>
      </section>

      <section className="pricing-grid">
        {PLANS.map((plan) => (
          <article key={plan.name} className={`pricing-card ${plan.featured ? 'featured' : ''}`}>
            <h3>{plan.name}</h3>
            <p className="pricing-amount">{plan.price}<span>{plan.period}</span></p>
            <p className="pricing-desc">{plan.description}</p>
            <ul className="marketing-list">
              {plan.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            <button className={`btn ${plan.featured ? 'btn-primary' : ''}`} onClick={() => navigate(plan.to)}>{plan.cta}</button>
          </article>
        ))}
      </section>

      <footer className="marketing-footer">
        <span>Need a custom package? <Link to="/contact">Contact our team</Link>.</span>
      </footer>
    </div>
  )
}
