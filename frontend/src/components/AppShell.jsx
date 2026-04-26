import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const isMobile = () => window.innerWidth <= 640

const NAV = [
  { path: '/dashboard',     icon: '⊞', label: 'Dashboard' },
  { path: '/income',        icon: '↑', label: 'Income' },
  { path: '/work',          icon: '◷', label: 'Work Tracker' },
  { path: '/expenses',      icon: '↓', label: 'Expenses' },
  { path: '/family',        icon: '♥', label: 'Family Transfers' },
  { path: '/loans',         icon: 'L', label: 'Loans' },
  { path: '/organizations', icon: '⬡', label: 'Organizations' },
  { path: '/reports',       icon: '↗', label: 'Reports' },
  { path: '/settings',      icon: '⚙', label: 'Settings' },
]

const ADMIN_NAV = { path: '/admin', icon: '★', label: 'Admin' }

const PAGE_TITLES = {
  '/dashboard':     'Dashboard',
  '/income':        'Income',
  '/work':          'Work Tracker',
  '/expenses':      'Expenses',
  '/family':        'Family Transfers',
  '/loans':         'Loans',
  '/organizations': 'Organizations',
  '/reports':       'Reports',
  '/settings':      'Settings',
  '/admin':         'Admin Dashboard',
}

export default function AppShell() {
  const [collapsed,   setCollapsed]   = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const { user, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate  = useNavigate()
  const location  = useLocation()

  const title = PAGE_TITLES[location.pathname] || 'FinDraft'
  const navItems = user?.role === 'admin' ? [...NAV, ADMIN_NAV] : NAV

  // Close mobile sidebar on resize to desktop
  useEffect(() => {
    const onResize = () => { if (!isMobile()) setMobileOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleNav = (path) => {
    navigate(path)
    setMobileOpen(false)
  }

  const toggleSidebar = () => {
    if (isMobile()) setMobileOpen(o => !o)
    else setCollapsed(c => !c)
  }

  return (
    <div className="app-shell">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.4)', zIndex:99 }}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <button
          className="sidebar-logo"
          type="button"
          title="Go to landing page"
          onClick={() => handleNav('/')}
          style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer' }}
        >
          <div className="logo-mark">Fd</div>
          {!collapsed && <span className="logo-name">Fin<em>Draft</em></span>}
        </button>

        <nav className="sidebar-nav">
          {!collapsed && <div className="nav-group-label">Menu</div>}
          {navItems.map(item => (
            <button
              key={item.path}
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => handleNav(item.path)}
              title={collapsed ? item.label : undefined}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-row" onClick={() => handleNav('/settings')}>
            <div className="avatar">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt={user?.name || 'Profile'} className="avatar-img" />
                : <span className="avatar-fallback">👤</span>}
            </div>
            {!collapsed && (
              <>
                <div style={{ flex:1, minWidth:0 }}>
                  <div className="user-name">{user?.name}</div>
                  <div className="user-plan">{user?.defaultCurrency || 'USD'}</div>
                </div>
                <button
                  title="Logout"
                  aria-label="Logout"
                  onClick={e => { e.stopPropagation(); logout(); navigate('/') }}
                  style={{ border:'none', background:'var(--red-lt)', color:'var(--red)', cursor:'pointer', fontSize:18, lineHeight:1, padding:'6px 8px', borderRadius:8 }}
                >⏻</button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className="main-area">
        <header className="topbar">
          <button
            className="icon-btn"
            onClick={toggleSidebar}
          >☰</button>
          <span className="topbar-title">{title}</span>
          <div className="topbar-actions">
            <button className="icon-btn" onClick={toggle} title="Toggle theme">
              {theme === 'dark' ? '☀' : '☽'}
            </button>
          </div>
        </header>

        <div className="page-scroll">
          <div className="page-anim">
            <Outlet />
          </div>
        </div>
      </div>

      {/* ── Mobile bottom nav (visible ≤640px) ── */}
      <nav className="mobile-bottom-nav">
        {NAV.slice(0, 5).map(item => (
          <button
            key={item.path}
            className={`mobile-bottom-btn ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => handleNav(item.path)}
          >
            <span style={{ fontSize: 18 }}>{item.icon}</span>
            <span style={{ fontSize: 10 }}>{item.label.split(' ')[0]}</span>
          </button>
        ))}
        <button
          className={`mobile-bottom-btn ${['/organizations','/reports','/settings','/loans'].includes(location.pathname) ? 'active' : ''}`}
          onClick={() => setMobileOpen(o => !o)}
        >
          <span style={{ fontSize: 18 }}>☰</span>
          <span style={{ fontSize: 10 }}>More</span>
        </button>
      </nav>
    </div>
  )
}
