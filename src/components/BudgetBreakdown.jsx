import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const DOMAIN_LABELS = {
  shared: 'Gezamenlijk',
  steven: 'Steven',
  jacomine: 'Jacomine',
}

const DOMAIN_COLORS = {
  shared: '#6366f1',
  steven: '#0ea5e9',
  jacomine: '#ec4899',
}

const ALL_DOMAINS = ['shared', 'steven', 'jacomine']

export default function BudgetBreakdown({ month }) {
  const { isAdmin } = useAuth()

  const [activeDomains, setActiveDomains] = useState(['shared', 'steven', 'jacomine'])
  const [sortedCats, setSortedCats] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingKey, setEditingKey] = useState(null)
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
      .select('amount, category_id, domain, categories(id, name, color)')
      .in('domain', ALL_DOMAINS)
      .eq('is_transfer', false)
      .lt('amount', 0)
      .gte('transaction_date', startDate)
      .lt('transaction_date', endStr)

    const { data: budgetData } = await supabase
      .from('budgets')
      .select('category_id, domain, monthly_amount')

    const grp = {}
    txs?.forEach((tx) => {
      const catId = tx.category_id || 'uncategorized'
      const catName = tx.categories?.name || 'Niet-toegewezen'
      const catColor = tx.categories?.color || '#BDC3C7'
      const dom = tx.domain
      const amt = Math.abs(tx.amount)
      if (!grp[catId]) grp[catId] = { id: catId, name: catName, color: catColor, total: 0, domains: {} }
      if (!grp[catId].domains[dom]) grp[catId].domains[dom] = { spent: 0, budget: null }
      grp[catId].domains[dom].spent += amt
      grp[catId].total += amt
    })

    budgetData?.forEach((b) => {
      if (!grp[b.category_id]) return
      if (!grp[b.category_id].domains[b.domain]) grp[b.category_id].domains[b.domain] = { spent: 0, budget: null }
      grp[b.category_id].domains[b.domain].budget = Number(b.monthly_amount)
    })

    setSortedCats(Object.values(grp).sort((a, b) => b.total - a.total))
    setLoading(false)
  }, [month])

  useEffect(() => { fetchData() }, [fetchData])

  async function saveBudget(categoryId, domain) {
    const amount = parseFloat(editValue.replace(',', '.'))
    if (isNaN(amount) || amount < 0) { setEditingKey(null); return }
    setSaving(true)
    await supabase.from('budgets').upsert(
      { category_id: categoryId, domain, monthly_amount: amount },
      { onConflict: 'category_id,domain' }
    )
    setSaving(false)
    setEditingKey(null)
    fetchData()
  }

  function toggleDomain(domain) {
    setActiveDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    )
  }

  function barColor(spent, budget) {
    if (!budget) return '#10b981'
    const pct = spent / budget
    if (pct >= 1) return '#ef4444'
    if (pct >= 0.8) return '#f59e0b'
    return '#10b981'
  }

  if (loading) return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="animate-pulse text-slate-400 text-sm">Laden...</div>
    </div>
  )

  const visibleCats = sortedCats.filter((cat) =>
    activeDomains.some((d) => (cat.domains[d]?.spent ?? 0) > 0 || cat.domains[d]?.budget != null)
  )

  const domainTotals = {}
  activeDomains.forEach((d) => {
    let spent = 0; let budget = 0
    sortedCats.forEach((cat) => {
      spent += cat.domains[d]?.spent ?? 0
      budget += cat.domains[d]?.budget ?? 0
    })
    domainTotals[d] = { spent, budget }
  })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h3 className="text-lg font-semibold text-brand-500">Uitgaven per categorie</h3>
        <div className="flex gap-2 flex-wrap items-center">
          {ALL_DOMAINS.map((d) => {
            const active = activeDomains.includes(d)
            return (
              <button
                key={d}
                onClick={() => toggleDomain(d)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  active ? 'text-white border-transparent' : 'bg-white text-slate-400 border-slate-200'
                }`}
                style={active ? { backgroundColor: DOMAIN_COLORS[d] } : {}}
              >
                {DOMAIN_LABELS[d]}
              </button>
            )
          })}
          {isAdmin && <span className="text-xs text-slate-400 ml-1">klik op rekening voor budget</span>}
        </div>
      </div>

      {activeDomains.length > 0 && (
        <div className="flex gap-4 flex-wrap mb-5 pb-4 border-b border-slate-100">
          {activeDomains.map((d) => {
            const { spent, budget } = domainTotals[d]
            const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : null
            return (
              <div key={d} className="flex-1 min-w-[110px]">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[d] }} />
                  <span className="text-xs font-medium text-slate-500">{DOMAIN_LABELS[d]}</span>
                </div>
                <p className="text-base font-bold text-slate-800">
                  €{spent.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                </p>
                {budget > 0 && (
                  <p className="text-xs text-slate-400">
                    van €{budget.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                    {pct !== null && ` · ${pct.toFixed(0)}%`}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {visibleCats.length === 0 ? (
        <p className="text-sm text-slate-400">Geen uitgaven gevonden voor de geselecteerde rekeningen.</p>
      ) : (
        <div className="space-y-5">
          {visibleCats.map((cat) => {
            const domainsToShow = activeDomains.filter(
              (d) => (cat.domains[d]?.spent ?? 0) > 0 || cat.domains[d]?.budget != null
            )
            if (domainsToShow.length === 0) return null
            return (
              <div key={cat.id}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm font-semibold text-slate-700">{cat.name}</span>
                  <span className="text-xs text-slate-400 ml-auto">
                    totaal €{cat.total.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="space-y-2 pl-5">
                  {domainsToShow.map((domain) => {
                    const info = cat.domains[domain] ?? { spent: 0, budget: null }
                    const editKey = `${cat.id}:${domain}`
                    const isEditing = editingKey === editKey
                    const pct = info.budget ? Math.min(100, (info.spent / info.budget) * 100) : null
                    const color = barColor(info.spent, info.budget)
                    return (
                      <div key={domain}>
                        <div className="flex items-center gap-2">
                          <button
                            className={`flex items-center gap-1.5 w-[90px] text-left ${
                              isAdmin ? 'hover:text-brand-500 cursor-pointer' : 'cursor-default'
                            }`}
                            onClick={() => {
                              if (!isAdmin) return
                              setEditingKey(isEditing ? null : editKey)
                              setEditValue(info.budget != null ? String(info.budget) : '')
                            }}
                            disabled={!isAdmin}
                          >
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: DOMAIN_COLORS[domain] }} />
                            <span className="text-xs text-slate-500">{DOMAIN_LABELS[domain]}</span>
                          </button>
                          <div className="flex items-center gap-1 shrink-0 ml-auto">
                            {isEditing ? (
                              <>
                                <span className="text-xs text-slate-400">Budget €</span>
                                <input
                                  type="number"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveBudget(cat.id, domain)
                                    if (e.key === 'Escape') setEditingKey(null)
                                  }}
                                  className="w-20 border border-brand-400 rounded px-2 py-0.5 text-sm text-right focus:outline-none"
                                  autoFocus min={0} step={10}
                                />
                                <button onClick={() => saveBudget(cat.id, domain)} disabled={saving}
                                  className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded hover:bg-brand-600">
                                  {saving ? '...' : '✓'}
                                </button>
                                <button onClick={() => setEditingKey(null)}
                                  className="text-xs text-slate-400 hover:text-slate-600 px-1">
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="text-xs font-medium text-slate-700">
                                  €{info.spent.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                                </span>
                                {info.budget != null && (
                                  <span className="text-xs text-slate-400">
                                     / €{Number(info.budget).toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {pct !== null && !isEditing && (
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                            <div className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
