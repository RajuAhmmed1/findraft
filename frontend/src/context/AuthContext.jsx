import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../utils/api'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('fd_token')
    const saved  = localStorage.getItem('fd_user')
    if (token && saved) {
      try { setUser(JSON.parse(saved)) } catch {}
    }
    // Verify token is still valid
    if (token) {
      api.get('/auth/me')
        .then(r => { setUser(r.data.user); localStorage.setItem('fd_user', JSON.stringify(r.data.user)) })
        .catch(() => { localStorage.removeItem('fd_token'); localStorage.removeItem('fd_user'); setUser(null) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    localStorage.setItem('fd_token', res.data.token)
    localStorage.setItem('fd_user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data.user
  }, [])

  const signup = useCallback(async (name, email, password) => {
    const res = await api.post('/auth/signup', { name, email, password })
    localStorage.setItem('fd_token', res.data.token)
    localStorage.setItem('fd_user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data.user
  }, [])

  const googleLogin = useCallback(async (credential) => {
    const res = await api.post('/auth/google', { credential })
    localStorage.setItem('fd_token', res.data.token)
    localStorage.setItem('fd_user', JSON.stringify(res.data.user))
    setUser(res.data.user)
    return res.data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('fd_token')
    localStorage.removeItem('fd_user')
    setUser(null)
  }, [])

  const updateUser = useCallback((updated) => {
    setUser(updated)
    localStorage.setItem('fd_user', JSON.stringify(updated))
  }, [])

  return (
    <AuthCtx.Provider value={{ user, loading, login, signup, googleLogin, logout, updateUser }}>
      {children}
    </AuthCtx.Provider>
  )
}

export const useAuth = () => useContext(AuthCtx)
