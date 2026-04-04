import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Buffer indicator for the partner view
 * Shows how much money is available this month based on income vs expenses
 * Tone: neutral, motivating, never judgmental
 */
export default function BufferIndicator({ month }) {
  const [income, setIncome] = useState(0)
  const [expenses, setExpenses] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [month])

  async function fetchData() {
    setLoading(true)

    const startDate = `${month}-01`
    const endDate = new Date(month + '-01')
    endDate.setMonth(endDate.getMonth() + 1)
    const endStr = endDate.toISOString().split('T')[0]

    const { data: transactions } = await supabase
      .from('transactions')
      .select('amount')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endStr)

    let inc = 0
    let exp = 0
    transactions?.forEach((tx) => {
      if (tx.amount > 0) inc += tx.amount
      else exp += Math.abs(tx.amount)
    })

    setIncome(inc)
    setExpenses(exp)
    setLoading(false)
  }

  const buffer = income - expenses
  const percentage = income > 0 ? Math.max(0, (buffer / income) * 100) : 0

  if (loading) {
    return <div className="animate-pulse text-slate-400 p-4">Laden...</div>
  }

  // Determine the message — always positive/neutral tone
  let statusMessage
  let statusColor
  if (buffer > 500) {
    statusMessage = `Je houdt deze maand €${buffer.toFixed(0)} over`
    statusColor = 'text-emerald-600'
  } else if (buffer > 0) {
    statusMessage = `Je houdt deze maand €${buffer.toFixed(0)} over`
    statusColor = 'text-emerald-600'
  } else if (buffer === 0) {
    statusMessage = 'Deze maand kom je precies uit'
    statusColor = 'text-slate-600'
  } else {
    statusMessage = `Je zit deze maand €${Math.abs(buffer).toFixed(0)} boven je inkomen`
    statusColor = 'text-amber-600'
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-sm font-medium text-slate-500 mb-1">
        Beschikbaar deze maand
      </h3>
      <p className={`text-3xl font-bold ${statusColor} mb-2`}>
        €{buffer.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
      </p>
      <p className="text-sm text-slate-500 mb-4">{statusMessage}</p>

      {/* Progress bar */}
      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${Math.min(100, percentage)}%`,
            backgroundColor:
              percentage > 20 ? '#10b981' : percentage > 5 ? '#f59e0b' : '#94a3b8',
          }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-slate-400">
        <span>
          Ontvangen: €{income.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
        </span>
        <span>
          Uitgegeven: €{expenses.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
        </span>
      </div>
    </div>
  )
}
