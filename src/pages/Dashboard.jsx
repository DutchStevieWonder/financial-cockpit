import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useMonth } from '../context/MonthContext'
import DashboardKPIs from '../components/DashboardKPIs'
import PersonalFinanceBlock from '../components/PersonalFinanceBlock'
import CategoryBreakdown from '../components/CategoryBreakdown'
import BudgetBreakdown from '../components/BudgetBreakdown'
import SavingsDashboard from '../components/SavingsDashboard'
import NetWorthOverview from '../components/NetWorthOverview'
import GoalProgress from '../components/GoalProgress'

function getMonthOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = d.toISOString().substring(0, 7)
    const label = d.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
    options.push({ value, label })
  }
  return options
}

function prevMonthOf(month) {
  const d = new Date(month + '-01')
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().substring(0, 7)
}

export default function Dashboard() {
  const { profile } = useAuth()
  const { month, setMonth } = useMonth()
  const months = getMonthOptions()

  const [compareMode, setCompareMode]   = useState(false)
  const [compareMonth, setCompareMonth] = useState(() => prevMonthOf(new Date().toISOString().substring(0, 7)))

  return (
    <div className="space-y-6">
      {/* KPI summary cards */}
      <DashboardKPIs month={month} />

      {/* Welcome + month selectors */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Welkom, {profile?.display_name}</h2>
          <p className="text-sm text-slate-500">Overzicht van je financi\u00ebn</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-col gap-0.5">
            <label className="text-xs text-slate-400 px-1">Maand</label>
            <select
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
            >
              {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>

          <button
            onClick={() => { if (!compareMode) setCompareMonth(prevMonthOf(month)); setCompareMode(!compareMode) }}
            className={`mt-5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
              compareMode ? 'bg-brand-500 text-white border-brand-500' : 'bg-white text-slate-500 border-slate-300 hover:border-brand-400'
            }`}
          >
            \u21cc Vergelijk
          </button>

          {compareMode && (
            <div className="flex flex-col gap-0.5">
              <label className="text-xs text-slate-400 px-1">Vergelijk met</label>
              <select
                value={compareMonth}
                onChange={e => setCompareMonth(e.target.value)}
                className="border border-brand-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400 bg-brand-50"
              >
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Personal finance — eigen domein only */}
      <PersonalFinanceBlock month={month} />

      {/* Spending per category — stacked per account + drill-down + optional comparison */}
      <CategoryBreakdown month={month} compareMonth={compareMode ? compareMonth : undefined} />

      {/* Budget tracking per domain */}
      <BudgetBreakdown month={month} />

      {/* Sparen & Beleggen */}
      <SavingsDashboard month={month} />

      {/* Net worth & goals */}
      <NetWorthOverview />
      <GoalProgress />
    </div>
  )
}
