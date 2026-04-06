import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const ACCOUNTS = [
  { name: 'Gezamenlijk spaarrekening', owner: 'shared',  type: 'savings',    label: 'Gezamenlijk spaar' },
  { name: 'Steven spaarrekening',      owner: 'steven',  type: 'savings',    label: 'Spaar Steven' },
  { name: 'Jacomine spaarrekening',    owner: 'partner', type: 'savings',    label: 'Spaar Jacomine' },
  { name: 'DeGiro Steven',             owner: 'steven',  type: 'investment', label: 'DeGiro (Steven)' },
  { name: 'DeGiro Jacomine',           owner: 'partner', type: 'investment', label: 'DeGiro (Jacomine)' },
  { name: 'DeGiro Kind 1',             owner: 'kind1',   type: 'investment', label: 'DeGiro Kind 1' },
  { name: 'DeGiro Kind 2',             owner: 'kind2',   type: 'investment', label: 'DeGiro Kind 2' },
  { name: 'Lendahand',                 owner: 'steven',  type: 'lendahand',  label: 'Lendahand (Steven)' },
]

const SECTIONS = [
  { key: 'savings',    label: 'Spaarrekeningen', color: '#10b981' },
  { key: 'investment', label: 'Beleggingen',     color: '#6366f1' },
  { key: 'lendahand',  label: 'Overig',          color: '#f59e0b' },
]

function fmt(n) {
  return n.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function pctChange(curr, prev) {
  if (!prev || prev === 0) return null
  return ((curr - prev) / Math.abs(prev)) * 100
}

export default function SavingsDashboard({ month }) {
  const { isAdmin } = useAuth()
  const [entries, setEntries]         = useState({})
  const [prevEntries, setPrevEntries] = useState({})
  const [editing, setEditing]         = useState(null)
  const [editBal, setEditBal]         = useState('')
  const [editInleg, setEditInleg]     = useState('')
  const [saving, setSaving]           = useState(false)
  const [loading, setLoading]         = useState(true)

  const prevMonth = (() => {
    const d = new Date(month + '-01')
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().substring(0, 7)
  })()

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: curr }, { data: prev }] = await Promise.all([
      supabase.from('savings_entries').select('account_name, balance, inleg').eq('month', month),
      supabase.from('savings_entries').select('account_name, balance').eq('month', prevMonth),
    ])
    const map = {}
    curr?.forEach(e => { map[e.account_name] = { balance: e.balance, inleg: e.inleg } })
    const prevMap = {}
    prev?.forEach(e => { prevMap[e.account_name] = { balance: e.balance } })
    setEntries(map)
    setPrevEntries(prevMap)
    setLoading(false)
  }, [month, prevMonth])

  useEffect(() => { load() }, [load])

  async function save(account) {
    const balance = parseFloat(String(editBal).replace(',', '.'))
    const inleg   = parseFloat(String(editInleg).replace(',', '.') || '0')
    if (isNaN(balance)) { setEditing(null); return }
    setSaving(true)
    await supabase.from('savings_entries').upsert(
      { account_name: account.name, owner: account.owner, account_type: account.type, month, balance, inleg: isNaN(inleg) ? 0 : inleg, updated_at: new Date().toISOString() },
      { onConflict: 'account_name,month' }
    )
    setSaving(false)
    setEditing(null)
    await load()
  }

  function startEdit(account) {
    if (!isAdmin) return
    const e = entries[account.name]
    setEditBal(e ? String(e.balance) : '')
    setEditInleg(e ? String(e.inleg) : '')
    setEditing(account.name)
  }

  if (loading) return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="animate-pulse text-slate-400 text-sm">Laden\u2026</div>
    </div>
  )

  const sectionTotals = {}
  SECTIONS.forEach(({ key }) => {
    sectionTotals[key] = ACCOUNTS.filter(a => a.type === key).reduce((s, a) => s + (entries[a.name]?.balance || 0), 0)
  })
  const grandTotal = Object.values(sectionTotals).reduce((a, b) => a + b, 0)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-brand-500">Sparen &amp; Beleggen</h3>
          {isAdmin && <p className="text-xs text-slate-400 mt-0.5">Klik op een rekening om het saldo bij te werken</p>}
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Totaal vermogen</p>
          <p className="text-xl font-bold text-slate-800">\u20ac{fmt(grandTotal)}</p>
        </div>
      </div>

      <div className="space-y-6">
        {SECTIONS.map(section => {
          const accounts = ACCOUNTS.filter(a => a.type === section.key)
          const total    = sectionTotals[section.key]
          return (
            <div key={section.key}>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: section.color }} />
                <span className="text-sm font-semibold text-slate-600">{section.label}</span>
                <span className="text-xs text-slate-400 ml-auto">\u20ac{fmt(total)}</span>
              </div>
              <div className="space-y-1 pl-5">
                {accounts.map(account => {
                  const e    = entries[account.name]
                  const prev = prevEntries[account.name]
                  const bal  = e?.balance || 0
                  const inleg= e?.inleg   || 0
                  const pct  = pctChange(bal, prev?.balance || 0)
                  const isEditing = editing === account.name

                  return (
                    <div key={account.name}>
                      {isEditing ? (
                        <div className="flex flex-wrap items-center gap-2 py-1.5">
                          <span className="text-xs text-slate-600 w-32 shrink-0">{account.label}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400">Saldo \u20ac</span>
                            <input type="number" value={editBal} onChange={e => setEditBal(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') save(account); if (e.key === 'Escape') setEditing(null) }}
                              className="w-24 border border-brand-400 rounded px-2 py-0.5 text-sm text-right focus:outline-none" autoFocus min={0} step={100} />
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400">Inleg \u20ac</span>
                            <input type="number" value={editInleg} onChange={e => setEditInleg(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') save(account); if (e.key === 'Escape') setEditing(null) }}
                              className="w-20 border border-slate-300 rounded px-2 py-0.5 text-sm text-right focus:outline-none" min={0} step={50} />
                          </div>
                          <button onClick={() => save(account)} disabled={saving}
                            className="text-xs bg-brand-500 text-white px-2 py-0.5 rounded hover:bg-brand-600">
                            {saving ? '\u2026' : '\u2713'}
                          </button>
                          <button onClick={() => setEditing(null)} className="text-xs text-slate-400 hover:text-slate-600 px-1">\u2715</button>
                        </div>
                      ) : (
                        <button onClick={() => startEdit(account)}
                          className={`w-full flex items-center gap-2 py-1.5 text-left rounded px-1 ${isAdmin ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-default'}`}>
                          <span className="text-xs text-slate-600 flex-1">{account.label}</span>
                          {inleg > 0 && <span className="text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">+\u20ac{fmt(inleg)} inleg</span>}
                          <span className="text-sm font-semibold text-slate-800 w-20 text-right">
                            {e ? `\u20ac${fmt(bal)}` : <span className="text-slate-300 font-normal text-xs">\u2014 invoeren</span>}
                          </span>
                          {pct !== null && prev?.balance > 0 && (
                            <span className={`text-xs font-medium w-14 text-right ${pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                              {pct > 0 ? '\u25b2' : pct < 0 ? '\u25bc' : '\u2192'} {Math.abs(pct).toFixed(0)}%
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
