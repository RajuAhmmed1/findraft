import { useContext } from 'react'

// ── Static formatter (pass currency explicitly) ─────────────
export const fmt = (n, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency,
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(n || 0)

// ── Hook: returns a formatter pre-bound to user's default currency ──
// Usage:  const fmtC = useFmt()   →   fmtC(4200)  uses global currency
import { CurrencyCtx } from '../context/CurrencyContext'

export function useFmt() {
  const ctx = useContext(CurrencyCtx)
  const currency = ctx?.currency || localStorage.getItem('fd_currency') || 'USD'
  return (n, overrideCurrency) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: overrideCurrency || currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(n || 0)
}

// ── Date helpers ─────────────────────────────────────────────
export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export const fmtDateInput = (d) => {
  if (!d) return ''
  return new Date(d).toISOString().slice(0, 10)
}

export const fmtDateISO = (d) => {
  if (!d) return ''
  const dd = new Date(d)
  return `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`
}

export const monthLabel = (m, y) =>
  new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

export const shortMonth = (m) =>
  ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][(m - 1) % 12]

// ── Misc ─────────────────────────────────────────────────────
export const pct = (val, total) =>
  total > 0 ? Math.round((val / total) * 100) : 0

export const initials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

export const currentMonth = () => new Date().getMonth() + 1
export const currentYear  = () => new Date().getFullYear()

export const deltaLabel = (curr, prev) => {
  if (!prev || prev === 0) return null
  const d = ((curr - prev) / prev) * 100
  return { pct: Math.abs(d).toFixed(1), dir: d >= 0 ? 'up' : 'down' }
}
