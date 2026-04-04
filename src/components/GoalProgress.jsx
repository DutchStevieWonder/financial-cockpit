import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function GoalProgress() {
  const [goals, setGoals] = useState([])
  const [totalWealth, setTotalWealth] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)

    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')

    // Calculate total shared wealth for progress
    const { data: invSnaps } = await supabase
      .from('investment_snapshots')
      .select('investment_account_id, total_value')
      .order('snapshot_date', { ascending: false })

    const { data: savSnaps } = await supabase
      .from('savings_snapshots')
      .select('savings_account_id, balance')
      .order('snapshot_date', { ascending: false })

    // Sum only the LATEST snapshot per account (same logic as NetWorthOverview)
    const seenInv = new Set()
    let invTotal = 0
    invSnaps?.forEach((s) => {
      if (!seenInv.has(s.investment_account_id)) {
        seenInv.add(s.investment_account_id)
        invTotal += Number(s.total_value)
      }
    })
    const seenSav = new Set()
    let savTotal = 0
    savSnaps?.forEach((s) => {
      if (!seenSav.has(s.savings_account_id)) {
        seenSav.add(s.savings_account_id)
        savTotal += Number(s.balance)
      }
    })

    setGoals(goalsData || [])
    setTotalWealth(invTotal + savTotal)
    setLoading(false)
  }

  if (loading) {
    return <div className="animate-pulse text-slate-400 p-4">Laden...</div>
  }

  if (goals.length === 0) return null

  return (
    <div className="space-y-4">
      {goals.map((goal) => {
        const progress = goal.target_amount
          ? Math.min(100, (totalWealth / goal.target_amount) * 100)
          : 0
        const remaining = goal.target_amount
          ? Math.max(0, goal.target_amount - totalWealth)
          : 0
        const targetDate = goal.target_date
          ? new Date(goal.target_date)
          : null
        const monthsLeft = targetDate
          ? Math.max(
              0,
              (targetDate.getFullYear() - new Date().getFullYear()) * 12 +
                targetDate.getMonth() -
                new Date().getMonth()
            )
          : null
        const monthlyNeeded =
          monthsLeft && monthsLeft > 0 ? remaining / monthsLeft : null

        return (
          <div
            key={goal.id}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
          >
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-brand-500">
                {goal.name}
              </h3>
              <span className="text-sm text-slate-400">
                {targetDate
                  ? `Doel: ${targetDate.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}`
                  : ''}
              </span>
            </div>

            {goal.description && (
              <p className="text-sm text-slate-500 mb-4">{goal.description}</p>
            )}

            {/* Progress bar */}
            <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden mb-2">
              <div
                className="h-full rounded-full bg-brand-400 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-slate-500">
                €{totalWealth.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
              </span>
              <span className="font-medium text-brand-500">
                {progress.toFixed(1)}%
              </span>
              <span className="text-slate-500">
                €{goal.target_amount?.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
              </span>
            </div>

            {monthlyNeeded && (
              <p className="text-sm text-slate-500 mt-3">
                Nog {monthsLeft} maanden. Benodigde inleg:{' '}
                <span className="font-medium text-brand-500">
                  €{monthlyNeeded.toLocaleString('nl-NL', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                  /maand
                </span>{' '}
                om het doel te halen (excl. rendement).
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
