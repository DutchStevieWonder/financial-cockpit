import { createContext, useContext, useState } from 'react'

const STORAGE_KEY = 'fc_selected_month'

const MonthContext = createContext(null)

export function MonthProvider({ children }) {
  const [month, setMonthState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || new Date().toISOString().substring(0, 7)
    } catch {
      return new Date().toISOString().substring(0, 7)
    }
  })

  function setMonth(m) {
    try {
      localStorage.setItem(STORAGE_KEY, m)
    } catch {
      // localStorage geblokkeerd (bijv. prive-modus) — stil negeren
    }
    setMonthState(m)
  }

  return (
    <MonthContext.Provider value={{ month, setMonth }}>
      {children}
    </MonthContext.Provider>
  )
}

export function useMonth() {
  const ctx = useContext(MonthContext)
  if (!ctx) throw new Error('useMonth must be used within MonthProvider')
  return ctx
}
