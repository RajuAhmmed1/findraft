import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { CurrencyProvider } from './context/CurrencyContext'
import AppShell    from './components/AppShell'
import Landing     from './pages/Landing'
import Features    from './pages/Features'
import Pricing     from './pages/Pricing'
import Contact     from './pages/Contact'
import Login       from './pages/Login'
import Signup      from './pages/Signup'
import Dashboard   from './pages/Dashboard'
import IncomePage  from './pages/IncomePage'
import ExpensePage from './pages/ExpensePage'
import FamilyPage  from './pages/FamilyPage'
import LoansPage   from './pages/LoansPage'
import OrgsPage    from './pages/OrgsPage'
import WorkPage    from './pages/WorkPage'
import ReportsPage from './pages/ReportsPage'
import Settings    from './pages/Settings'
import AdminPage   from './pages/AdminPage'

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ color:'var(--text3)', fontSize:13 }}>Loading…</div>
    </div>
  )
  return user ? children : <Navigate to="/login" replace />
}

function PublicOnly({ children }) {
  const { user } = useAuth()
  return user ? <Navigate to="/dashboard" replace /> : children
}

function ProtectedAdmin({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)' }}>
      <div style={{ color:'var(--text3)', fontSize:13 }}>Loading…</div>
    </div>
  )
  return user?.role === 'admin' ? children : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CurrencyProvider>
          <ToastProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/"       element={<Landing />} />
                <Route path="/features" element={<Features />} />
                <Route path="/pricing"  element={<Pricing />} />
                <Route path="/contact"  element={<Contact />} />
                <Route path="/login"  element={<PublicOnly><Login   /></PublicOnly>} />
                <Route path="/signup" element={<PublicOnly><Signup  /></PublicOnly>} />
                <Route path="/" element={<Protected><AppShell /></Protected>}>
                  <Route path="dashboard"     element={<Dashboard   />} />
                  <Route path="income"        element={<IncomePage  />} />
                  <Route path="expenses"      element={<ExpensePage />} />
                  <Route path="family"        element={<FamilyPage  />} />
                  <Route path="loans"         element={<LoansPage   />} />
                  <Route path="organizations" element={<OrgsPage    />} />
                  <Route path="work"          element={<WorkPage    />} />
                  <Route path="reports"       element={<ReportsPage />} />
                  <Route path="settings"      element={<Settings    />} />
                  <Route path="admin"         element={<ProtectedAdmin><AdminPage /></ProtectedAdmin>} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </ToastProvider>
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
