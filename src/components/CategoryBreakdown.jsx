import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// ─── Account colour palette ───────────────────────────────────────────────────
const ACCOUNT_COLORS = {
  'Eetrekening':    '#10b981', // emerald  – boodschappen rekening
  'Vaste lasten':   '#6366f1', // indigo   – vaste lasten rekening
  'Steven privé':   '#0ea5e9', // sky      – Steven's eigen rekening
  'Jacomine privé': '#ec4899', // pink     – Jacomine's eigen rekening
}
function accountColor(name) {
  return ACCOUNT_COLORS[name] || '#94a3b8'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  return Math.abs(n).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function dateRange(month) {
  const start = `${month}-01`
  const d = new Date(month + '-01')
  d.setMonth(d.getMonth() + 1)
  return { start, end: d.toISOString().split('T')[0] }
}

function monthLabel(month) {
  return new Date(month + '-15').toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })
}

// ─── Data fetching ────────────────────────────────────────────────────────────
async function fetchMonthData(month) {
  const { start, end } = dateRange(month)
  const { data, error } = await supabase
    .from('transactions')
    .select('amount, category_id, bank_account_id, categories(id, name, color), bank_accounts(id, name)')
    .gte('transaction_date', start)
    .lt('transaction_date', end)
    .eq('is_transfer', false)
    .lt('amount', 0)

  if (error) {
    console.error('[CategoryBreakdown] fetch error', error)
    return { sorted: [], grandTotal: 0 }
  }

  const grp = {}
  let grandTotal = 0

  data?.forEach((tx) => {
    const catId   = tx.category_id   || '__none__'
    const catName = tx.categories?.name  || 'Niet-toegewezen'
    const catColor= tx.categories?.color || '#BDC3C7'
    const accId   = tx.bank_account_id   || '__unknown__'
    const accName = tx.bank_accounts?.name || 'Onbekend'
    const amt     = Math.abs(tx.amount)

    grandTotal += amt

    if (!grp[catId]) {
      grp[catId] = { id: catId, name: catName, color: catColor, total: 0, accounts: {} }
    }
    grp[catId].total += amt

    if (!grp[catId].accounts[accId]) {
      grp[catId].accounts[accId] = { name: accName, total: 0 }
    }
    grp[catId].accounts[accId].total += amt
  })

  const sorted = Object.values(grp).sort((a, b) => b.total - a.total)
  return { sorted, grandTotal }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function CategoryBreakdown({ month, compareMonth }) {
  const [dataA, setDataA] = useState({ sorted: [], grandTotal: 0 })
  const [dataB, setDataB] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [drillTxs, setDrillTxs] = useState([])
  const [drillLoading, setDrillLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setExpanded(null)
    const [a, b] = await Promise.all([
      fetchMonthData(month),
      compareMonth ? fetchMonthData(compareMonth) : Promise.resolve(null),
    ])
    setDataA(a)
    setDataB(b)
    setLoading(false)
  }, [month, compareMonth])

  useEffect(() => { load() }, [load])

  // ── Drill-down: fetch top transactions for a category ──────────────────────
  async function toggleExpand(catId) {
    if (expanded === catId) {
      setExpanded(null)
      setDrillTxs([])
      return
    }
    setExpanded(catId)
    setDrillLoading(true)

    const { start, end } = dateRange(month)
    const { data } = await supabase
      .from('transactions')
      .select('amount, description, transaction_date, bank_accounts(name)')
      .eq('category_id', catId)
      .eq('is_transfer', false)
      .lt('amount', 0)
      .gte('transaction_date', start)
      .lt('transaction_date', end)
      .order('transaction_date', { ascending: false })
      .limit(8)

    setDrillTxs(data || [])
    setDrillLoading(false)
  }

  // ─────────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="animate-pulse text-slate-400 text-sm">Laden…</div>
      </div>
    )
  }

  if (dataA.sorted.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-brand-500 mb-2">Uitgaven per categorie</h3>
        <p className="text-sm text-slate-400">Geen uitgaven gevonden voor deze maand.</p>
      </div>
    )
  }

  // Build legend from all unique accounts in this month's data
  const legendAccounts = {}
  dataA.sorted.forEach((cat) =>
    Object.values(cat.accounts).forEach((acc) => {
      legendAccounts[acc.name] = accountColor(acc.name)
    })
  )

  const maxTotal = Math.max(...dataA.sorted.map((c) => c.total), 1)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h3 className="text-lg font-semibold text-brand-500">Uitgaven per categorie</h3>
          {compareMonth && (
            <p className="text-xs text-slate-400 mt-0.5">
              Dikke balk = {monthLabel(month)} · dunne balk = {monthLabel(compareMonth)}
            </p>
          )}
        </div>
        {/* Rekening-legenda */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(legendAccounts).map(([name, color]) => (
            <span key={name} className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              {name}
            </span>
          ))}
        </div>
      </div>

      {/* Category rows */}
      <div className="space-y-0.5">
        {dataA.sorted.map((cat) => {
          const isOpen = expanded === cat.id
          const barPct  = (cat.total / maxTotal) * 100
          const catB    = dataB?.sorted.find((c) => c.id === cat.id)
          const barPctB = catB ? (catB.total / maxTotal) * 100 : null

          // % change vs compare month
          const pct = catB ? ((cat.total - catB.total) / catB.total) * 100 : null
          const pctColor = pct === null ? '' : pct > 5 ? 'text-red-500' : pct < -5 ? 'text-emerald-600' : 'text-slate-400'

          // Segments for current month
          const segments = Object.entries(cat.accounts)
            .sort((a, b) => b[1].total - a[1].total)
            .map(([id, acc]) => ({
              id,
              name: acc.name,
              total: acc.total,
              pct: (acc.total / cat.total) * 100,
              color: accountColor(acc.name),
            }))

          return (
            <div key={cat.id} className="rounded-lg overflow-hidden">
              {/* ── Clickable category row ── */}
              <button
                onClick={() => toggleExpand(cat.id)}
                className="w-full text-left px-2 py-2 hover:bg-slate-50 transition-colors rounded-lg group"
              >
                {/* Name row */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm font-medium text-slate-700 flex-1 text-left">{cat.name}</span>
                  <span className="text-sm font-bold text-slate-800">€{fmt(cat.total)}</span>
                  {pct !== null && (
                    <span className={`text-xs font-medium w-14 text-right ${pctColor}`}>
                      {pct > 0 ? '▲' : pct < 0 ? '▼' : '→'} {Math.abs(pct).toFixed(0)}%
                    </span>
                  )}
                  <span className="text-slate-300 group-hover:text-slate-500 text-[10px] w-3">
                    {isOpen ? '▲' : '▼'}
                  </span>
                </div>

                {/* Stacked bar — current month */}
                <div className="pl-4">
                  <div
                    className="h-3 rounded-full overflow-hidden flex"
                    style={{ width: `${Math.max(barPct, 3)}%`, backgroundColor: '#f1f5f9' }}
                  >
                    {segments.map((seg) => (
                      <div
                        key={seg.id}
                        style={{ width: `${seg.pct}%`, backgroundColor: seg.color }}
                        title={`${seg.name}: €${fmt(seg.total)}`}
                      />
                    ))}
                  </div>

                  {/* Compare bar — previous month (thinner, faded) */}
                  {catB && barPctB !== null && (
                    <div
                      className="h-1.5 rounded-full overflow-hidden flex mt-0.5 opacity-50"
                      style={{ width: `${Math.max(barPctB, 2)}%`, backgroundColor: '#f1f5f9' }}
                    >
                      {Object.entries(catB.accounts)
                        .sort((a, b) => b[1].total - a[1].total)
                        .map(([id, acc]) => (
                          <div
                            key={id}
                            style={{
                              width: `${(acc.total / catB.total) * 100}%`,
                              backgroundColor: accountColor(acc.name),
                            }}
                          />
                        ))}
                    </div>
                  )}
                </div>
              </button>

              {/* ── Drill-down panel ── */}
              {isOpen && (
                <div className="mx-1 mb-2 px-4 py-3 bg-slate-50 rounded-lg border border-slate-100">
                  {drillLoading ? (
                    <div className="text-slate-400 text-xs animate-pulse">Laden…</div>
                  ) : (
                    <>
                      {/* Per-account breakdown */}
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                        Per rekening
                      </p>
                      <div className="space-y-1.5 mb-4">
                        {segments.map((seg) => {
                          const segB = catB
                            ? Object.values(catB.accounts).find((a) => a.name === seg.name)
                            : null
                          const segPct = segB
                            ? ((seg.total - segB.total) / segB.total) * 100
                            : null

                          return (
                            <div key={seg.id} className="flex items-center gap-2">
                              <span
                                className="w-2 h-2 rounded-sm shrink-0"
                                style={{ backgroundColor: seg.color }}
                              />
                              <span className="text-xs text-slate-600 flex-1">{seg.name}</span>
                              <span className="text-xs font-semibold text-slate-800">
                                €{fmt(seg.total)}
                              </span>
                              {segB && (
                                <span className="text-xs text-slate-400 w-20 text-right">
                                  vs €{fmt(segB.total)}
                                </span>
                              )}
                              {segPct !== null && (
                                <span
                                  className={`text-xs font-medium w-14 text-right ${
                                    Math.abs(segPct) < 3
                                      ? 'text-slate-400'
                                      : segPct > 0
                                      ? 'text-red-400'
                                      : 'text-emerald-500'
                                  }`}
                                >
                                  {segPct > 0 ? '+' : ''}{segPct.toFixed(0)}%
                                </span>
                              )}
                            </div>
                          )
                        })}
                      </div>

                      {/* Latest transactions */}
                      {drillTxs.length > 0 && (
                        <>
                          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
                            Laatste transacties
                          </p>
                          <div className="space-y-1.5">
                            {drillTxs.map((tx, i) => (
                              <div key={i} className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-700 truncate">{tx.description}</p>
                                  <p className="text-xs text-slate-400">
                                    {tx.transaction_date} · {tx.bank_accounts?.name}
                                  </p>
                                </div>
                                <span className="text-xs font-semibold text-slate-700 shrink-0">
                                  €{fmt(Math.abs(tx.amount))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Totals footer */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t-2 border-slate-200 px-2">
          <span className="text-sm font-semibold text-slate-700">Totaal uitgaven</span>
          <div className="text-right">
            <span className="text-sm font-bold text-slate-900">€{fmt(dataA.grandTotal)}</span>
            {dataB && (
              <span className="text-xs text-slate-400 ml-2">
                vs €{fmt(dataB.grandTotal)} {monthLabel(compareMonth)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
