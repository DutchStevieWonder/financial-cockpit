import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function fmt(n) {
  return Math.abs(n).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function pctChange(current, prev) {
  if (!prev || prev === 0) return null
  return ((current - prev) / Math.abs(prev)) * 100
}

function dateRange(month) {
  const start = `${month}-01`
  const endDate = new Date(month + '-01')
  endDate.setMonth(endDate.getMonth() + 1)
  return { start, end: endDate.toISOString().split('T')[0] }
}

async function summarizeMonth(month) {
  const { start, end } = dateRange(month)
  const { data } = await supabase
    .from('transactions')
    .select('amount, categories(name)')
    .gte('transaction_date', start)
    .lt('transaction_date', end)
    .eq('is_transfer', false)

  let inkomen = 0
  let uitgaven = 0
  let gespaard = 0

  data?.forEach((tx) => {
    if (tx.amount > 0) {
      inkomen += tx.amount
    } else {
      const abs = Math.abs(tx.amount)
      uitgaven += abs
      if (tx.categories?.name === 'Sparen & Investeren') gespaard += abs
    }
  })

  return { inkomen, uitgaven, saldo: inkomen - uitgaven, gespaard }
}

export default function DashboardKPIs({ month }) {
  const [curr, setCurr] = useState(null)
  const [prev, setPrev] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const prevDate = new Date(month + '-01')
      prevDate.setMonth(prevDate.getMonth() - 1)
      const prevMonth = prevDate.toISOString().substring(0, 7)
      const [c, p] = await Promise.all([
        summarizeMonth(month),
        summarizeMonth(prevMonth),
      ])
      setCurr(c)
      setPrev(p)
      setLoading(false)
    }
    load()
  }, [month])

  if (loading || !curr || !prev) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 p-4 animate-pulse h-[76px]" />
        ))}
      </div>
    )
  }

  const cards = [
    {
      label: 'Inkomen',
      value: curr.inkomen,
      prevValue: prev.inkomen,
      color: '#10b981',
      higherIsBetter: true,
    },
    {
      label: 'Uitgaven',
      value: curr.uitgaven,
      prevValue: prev.uitgaven,
      color: '#f59e0b',
      higherIsBetter: false,
    },
    {
      label: 'Saldo',
      value: curr.saldo,
      prevValue: prev.saldo,
      color: curr.saldo >= 0 ? '#10b981' : '#ef4444',
      higherIsBetter: true,
    },
    {
      label: 'Gespaard',
      value: curr.gespaard,
      prevValue: prev.gespaard,
      color: '#6366f1',
      higherIsBetter: true,
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {cards.map((card) => {
        const pct = pctChange(card.value, card.prevValue)
        const isUp = pct !== null && pct > 0
        const isGood = card.higherIsBetter ? isUp : !isUp
        const deltaColor = pct === null ? '' : isGood ? 'text-emerald-600' : 'text-red-500'
        const deltaSymbol = pct === null ? '' : isUp ? '\u25b2' : '\u25bc'

        return (
          <div
            key={card.label}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-4"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                {card.label}
              </span>
              {pct !== null && (
                <span className={`text-xs font-semibold ${deltaColor}`}>
                  {deltaSymbol} {Math.abs(pct).toFixed(0)}%
                </span>
              )}
            </div>
            <p className="text-xl font-bold" style={{ color: card.color }}>
              {card.value < 0 ? '-' : ''}\u20ac{fmt(card.value)}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">
              vorig: \u20ac{fmt(card.prevValue)}
            </p>
          </div>
        )
      })}
    </div>
  )
}
