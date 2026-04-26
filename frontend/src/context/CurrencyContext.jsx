import { createContext, useContext, useState, useEffect } from 'react'
import { useAuth } from './AuthContext'

export const CurrencyCtx = createContext({ currency: 'USD', setCurrency: () => {} })

export function CurrencyProvider({ children }) {
  const { user } = useAuth()
  const [currency, setCurrency] = useState(
    () => localStorage.getItem('fd_currency') || 'USD'
  )

  // Sync whenever user object changes (login, profile save, page reload)
  useEffect(() => {
    if (user?.defaultCurrency) {
      setCurrency(user.defaultCurrency)
      localStorage.setItem('fd_currency', user.defaultCurrency)
    }
  }, [user?.defaultCurrency])

  const set = (c) => {
    setCurrency(c)
    localStorage.setItem('fd_currency', c)
  }

  return (
    <CurrencyCtx.Provider value={{ currency, setCurrency: set }}>
      {children}
    </CurrencyCtx.Provider>
  )
}

export const useCurrency = () => useContext(CurrencyCtx)
