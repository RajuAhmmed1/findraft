import axios from 'axios'

const PROD_API_FALLBACK = 'https://findraft-1.onrender.com/api'
const normalizeApiBase = (raw) => {
  if (!raw) return raw
  const value = raw.trim().replace(/\/+$/, '')

  // Keep relative dev proxy path unchanged.
  if (!/^https?:\/\//i.test(value)) return value

  return /\/api$/i.test(value) ? value : `${value}/api`
}

const baseURL = normalizeApiBase(
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? PROD_API_FALLBACK : '/api')
)

const api = axios.create({
  baseURL,
  timeout: 15000,
})

// Attach JWT token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('fd_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally — force logout
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('fd_token')
      localStorage.removeItem('fd_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
