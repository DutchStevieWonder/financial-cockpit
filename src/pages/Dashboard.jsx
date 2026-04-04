import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import CategoryBreakdown from '../components/CategoryBreakdown'
import BufferIndicator from '../components/BufferIndicator'
import NetWorthOverview from '../components/NetWorthOverview'
import GoalProgress from '../components/GoalProgress'

function getMonthOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = d.toISOString().substring(0, 7)
    const label = d.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

export default function Dashboard() {
  const { profile, isAdmin } = useAuth()
  const [month, setMonth] = useState(() => new Date().toISOString().substring(0, 7))
  const months = getMonthOptions()

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-xl font-bold text-slate-800">
          Welkom, {profile?.display_name}
        </h2>
        <p className="text-sm text-slate-500">
          {profile?.domain === 'partner'
            ? 'Jouw persoonlijke overzicht'
            : 'Overzicht van je financiën'}
        </p>
      </div>

      {/* Month selector */}
      <div>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm
                     focus:outline-none focus:ring-2 focus:ring-brand-400"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {/* Buffer indicator — shown for partner, also useful for Steven */}
      <BufferIndicator month={month} />

      {/* Category breakdown */}
      <CategoryBreakdown month={month} />

      {/* Net worth — visible for both */}
      <NetWorthOverview />

      {/* Goal progress — shared goals visible for both */}
      <GoalProgress />
    </div>
  )
}
