import { useState, useEffect } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { supabase } from '../lib/supabase'

const COLORS = [
  '#4A90D9', '#5BB5A2', '#F5A623', '#E8743B', '#9B59B6',
  '#8E6C4F', '#3498DB', '#95A5A6', '#2C3E50', '#E74C3C',
  '#E91E63', '#FF9800', '#27AE60', '#BDC3C7',
]

export default function CategoryBreakdown({ month }) {
  const [data, setData] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [month])

  async function fetchData() {
    setLoading(true)

    // Calculate date range for the month
    const startDate = `${month}-01`
    const endDate = new Date(month + '-01')
    endDate.setMonth(endDate.getMonth() + 1)
    const endStr = endDate.toISOString().split('T')[0]

    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('amount, categories(name, color)')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endStr)
      .lt('amount', 0) // Only expenses

    if (error) {
      console.error('Error fetching categories:', error)
      setLoading(false)
      return
    }

    // Group by category
    const grouped = {}
    let totalExpenses = 0

    transactions?.forEach((tx) => {
      const catName = tx.categories?.name || 'Niet-toegewezen'
      const catColor = tx.categories?.color || '#BDC3C7'
      const absAmount = Math.abs(tx.amount)
      totalExpenses += absAmount

      if (!grouped[catName]) {
        grouped[catName] = { name: catName, value: 0, color: catColor }
      }
      grouped[catName].value += absAmount
    })

    const sorted = Object.values(grouped).sort((a, b) => b.value - a.value)
    setData(sorted)
    setTotal(totalExpenses)
    setLoading(false)
  }

  if (loading) {
    return <div className="animate-pulse text-slate-400 p-4">Laden...</div>
  }

  if (data.length === 0) {
    return (
      <div className="text-slate-400 text-sm p-4">
        Geen uitgaven gevonden voor deze maand.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-semibold text-brand-500 mb-4">
        Uitgaven per categorie
      </h3>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Pie chart */}
        <div className="w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color || COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) =>
                  `€${value.toLocaleString('nl-NL', {
                    minimumFractionDigits: 2,
                  })}`
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend / list */}
        <div className="flex-1 w-full">
          {data.map((cat, i) => {
            const percentage = total > 0 ? ((cat.value / total) * 100).toFixed(1) : 0
            return (
              <div
                key={cat.name}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full inline-block"
                    style={{
                      backgroundColor:
                        cat.color || COLORS[i % COLORS.length],
                    }}
                  />
                  <span className="text-sm text-slate-700">{cat.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-slate-800">
                    €{cat.value.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-xs text-slate-400 ml-2">
                    {percentage}%
                  </span>
                </div>
              </div>
            )
          })}

          <div className="flex items-center justify-between pt-3 mt-1 border-t-2 border-slate-200">
            <span className="text-sm font-semibold text-slate-700">Totaal</span>
            <span className="text-sm font-bold text-slate-900">
              €{total.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
