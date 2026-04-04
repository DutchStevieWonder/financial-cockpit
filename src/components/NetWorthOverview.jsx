import { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'

export default function NetWorthOverview() {
  const [investments, setInvestments] = useState([])
  const [savings, setSavings] = useState([])
  const [totalWealth, setTotalWealth] = useState(0)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)

    // Fetch latest investment snapshots
    const { data: invAccounts } = await supabase
      .from('investment_accounts')
      .select('id, name, platform, domain')

    const { data: invSnapshots } = await supabase
      .from('investment_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })

    // Get latest snapshot per account
    const latestInv = []
    const seenAccounts = new Set()
    invSnapshots?.forEach((snap) => {
      if (!seenAccounts.has(snap.investment_account_id)) {
        seenAccounts.add(snap.investment_account_id)
        const account = invAccounts?.find((a) => a.id === snap.investment_account_id)
        latestInv.push({
          name: account?.name || 'Onbekend',
          platform: account?.platform || '',
          value: Number(snap.total_value),
          domain: snap.domain,
        })
      }
    })

    // Fetch latest savings snapshots
    const { data: savAccounts } = await supabase
      .from('savings_accounts')
      .select('id, name, bank, domain')

    const { data: savSnapshots } = await supabase
      .from('savings_snapshots')
      .select('*')
      .order('snapshot_date', { ascending: false })

    const latestSav = []
    const seenSavings = new Set()
    savSnapshots?.forEach((snap) => {
      if (!seenSavings.has(snap.savings_account_id)) {
        seenSavings.add(snap.savings_account_id)
        const account = savAccounts?.find((a) => a.id === snap.savings_account_id)
        latestSav.push({
          name: account?.name || 'Onbekend',
          bank: account?.bank || '',
          value: Number(snap.balance),
          domain: snap.domain,
        })
      }
    })

    // Build history for chart (combine all snapshots by month)
    const historyMap = {}
    invSnapshots?.forEach((snap) => {
      const month = snap.snapshot_date.substring(0, 7)
      if (!historyMap[month]) historyMap[month] = 0
      historyMap[month] += Number(snap.total_value)
    })
    savSnapshots?.forEach((snap) => {
      const month = snap.snapshot_date.substring(0, 7)
      if (!historyMap[month]) historyMap[month] = 0
      historyMap[month] += Number(snap.balance)
    })

    const historyArr = Object.entries(historyMap)
      .map(([month, value]) => ({ month, value }))
      .sort((a, b) => a.month.localeCompare(b.month))

    const total =
      latestInv.reduce((sum, i) => sum + i.value, 0) +
      latestSav.reduce((sum, s) => sum + s.value, 0)

    setInvestments(latestInv)
    setSavings(latestSav)
    setTotalWealth(total)
    setHistory(historyArr)
    setLoading(false)
  }

  if (loading) {
    return <div className="animate-pulse text-slate-400 p-4">Laden...</div>
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-sm font-medium text-slate-500 mb-1">
        Totaal vermogen
      </h3>
      <p className="text-3xl font-bold text-brand-500 mb-6">
        €{totalWealth.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
      </p>

      {/* Growth chart */}
      {history.length > 1 && (
        <div className="h-40 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1a5676" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1a5676" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value) =>
                  `€${value.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}`
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#1a5676"
                strokeWidth={2}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Breakdown */}
      <div className="space-y-2">
        {investments.map((inv) => (
          <div
            key={inv.name}
            className="flex justify-between items-center py-2 border-b border-slate-100"
          >
            <div>
              <span className="text-sm text-slate-700">{inv.name}</span>
              <span className="text-xs text-slate-400 ml-2">{inv.platform}</span>
            </div>
            <span className="text-sm font-medium text-slate-800">
              €{inv.value.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
            </span>
          </div>
        ))}
        {savings.map((sav) => (
          <div
            key={sav.name}
            className="flex justify-between items-center py-2 border-b border-slate-100"
          >
            <div>
              <span className="text-sm text-slate-700">{sav.name}</span>
              <span className="text-xs text-slate-400 ml-2">{sav.bank}</span>
            </div>
            <span className="text-sm font-medium text-slate-800">
              €{sav.value.toLocaleString('nl-NL', { minimumFractionDigits: 0 })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
