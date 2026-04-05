import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function BudgetBreakdown({ month }) {
  const { isAdmin } = useAuth()
  const [rows, setRows] = useState([])
  const [budgets, setBudgets] = useState({})
  const [totalSpent, setTotalSpent] = useState(0)
  const [totalBudget, setTotalBudget] = useState(0)
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)

    const startDate = `${month}-01`
    const endDate = new Date(month + '-01')
    endDate.setMonth(endDate.getMonth() + 1)
    const endStr = endDate.toISOString().split('T')[0]

    const { data: txs } = await supabase
      .from('transactions')
      .select('amount, category_id, categories(id, name, color)')
      .eq('domain', 'shared')
      .eq('is_transfer', false)
      .lt('amount', 0)
      .gte('transaction_date', startDate)
      .lt('transaction_date', endStr)

    const { data: budgetData } = await supabase
      .from('budgets')
      .select('category_id, monthly_amount')

    const budgetMap = {}
    budgetData?.forEach((b) => { budgetMap[b.category_id] = b.monthly_amount })
    setBudgets(budgetMap)

    const grouped = {}
    let total = 0
    txs?.forEach((tx) => {
      const catId = tx.category_id || 'uncategorized'
      const catName = tx.categories?.name || 'Niet-toegewezen'
      const catColor = tx.categories?.color || '#BDC3C7'
      const amt = Math.abs(tx.amount)
      total += amt
      if (!grouped[catId]) {
        grouped[catId] = { id: catId, name: catName, color: catColor, spent: 0 }
      }
      grouped[catId].spent += amt
    })

    const sorted = Object.values(grouped).sort((a, b) => b.spent - a.spent)
    setRows(sorted)
    setTotalSpent(total)
    setTotalBudget(budgetData?.reduce((s, b) => s + Number(b.monthly_amount), 0) ?? 0)
    setLoading(false)
  }, [month])

  useEffect(() => { fetchData() }, [fetchData])

  async function saveBudget(categoryId) {
    const amount = parseFloat(editValue.replace(',', '.'))
    if (isNaN(amount) || amount < 0) { setEditingId(null); return }
    setSaving(true)
    await supabase.from('budgets').upsert(
      { category_id: categoryId, monthly_amount: amount },
      { onConflict: 'category_id' }
    )
    setSaving(false)
    setEditingId(null)
    fetchData()
  }

  function getBudgetColor(spent, budget) {
    if (!budget) return '#10b981'
    const pct = spent / budget
    if (pct >= 1) return '#ef4444'
    if (pct >= 0.8) return '#f59e0b'
    return '#10b981'
  }

  function getBudgetPct(spent, budget) {
    if (!budget) return null
    return Math.min(100, (spent / budget) * 100)
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse text-slate-400 text-sm">Laden...</div>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-brand-500 mb-2">Gezamenlijke uitgaven</h3>
        <p className="text-sm text-slate-400">Geen uitgaven gevonden voor deze periode.</p>
      </div>
    )
  }

  const overallPct = totalBudget > 0 ? Math.min(100, (totalSpent / totalBudget) * 100) : null
  const overallColor = getBudgetColor(totalSpent, totalBudget || null)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-lg font-semibold text-brand-500">Gezamenlijke uitgaven</h3>
        {isAdmin && (
          <span className="text-xs text-slate-400">Klik op een categorie om budget in te stellen</span>
        )}
      </div>

      {overallPct !== null && (
        <div className="mb-5">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Totaal: €{totalSpent.toLocaleString('nl-NL', { minimumFractionDigits: 0 })} van €{totalBudget.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}</span>
            <span>{overallPct.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${overallPct}%`, backgroundColor: overallColor }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((row) => {
          const budget = budgets[row.id]
          const pct = getBudgetPct(row.spent, budget)
          const barColor = getBudgetColor(row.spent, budget)
          const isEditing = editingId === row.id

          return (
            <div key={row.id} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <button
                  className={`flex items-center gap-2 flex-1 min-w-0 text-left rounded-md px-1 py-0.5
                    ${isAdmin ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}`}
                  onClick={() => {
                    if (!isAdmin) return
                    setEditingId(isEditing ? null : row.id)
                    setEditValue(budget != null ? String(budget) : '')
                  }}
                  disabled={!isAdmin}
                >
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                  <span className="text-sm text-slate-700 truncate">{row.name}</span>
                </button>

                <div className="flex items-center gap-2 shrink-0">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400">Budget €</span>
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveBudget(row.id)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className="w-20 border border-brand-400 rounded px-2 py-0.5 text-sm text-right focus:outline-none"
                        autoFocus
                        min={0}
                        step={10}
                      />
                      <button
                        onClick={() => saveBudget(row.id)}
                        disabled={saving}
                        className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded hover:bg-brand-600"
                      >
                        {saving ? '...' : '✓'}
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 hover:text-slate-600 px-1">✕</button>
                    </div>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-slate-800">
                        €{row.spent.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                      </span>
                      {budget != null && (
                        <span className="text-xs text-slate-400">/ €{Number(budget).toLocaleString('nl-NL', { minimumFractionDigits: 0 })}</span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {pct !== null && !isEditing && (
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${pct}%`, backgroundColor: barColor }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-between pt-4 mt-2 border-t-2 border-slate-100">
        <span className="text-sm font-semibold text-slate-700">Totaal uitgegeven</span>
        <span className="text-sm font-bold text-slate-900">
          €{totalSpent.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
        </span>
      </div>
    </div>
  )
}
