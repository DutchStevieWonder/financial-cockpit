import { createContext, useContext, useState } from 'react'

const MonthContext = createContext(null)

export function MonthProvider({ children }) {
  const [month, setMonth] = useState(() => {
    // Default to current month
    return new Date().toISOString().substring(0, 7)
  })

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
