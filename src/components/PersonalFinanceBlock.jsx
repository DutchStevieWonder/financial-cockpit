import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function PersonalFinanceBlock({ month }) {
  const { domain, profile } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!domain || domain === 'shared') return
    fetchData()
  }, [month, domain])

  async function fetchData() {
    setLoading(true)

    const startDate = `${month}-01`
    const endDate = new Date(month + '-01')
    endDate.setMonth(endDate.getMonth() + 1)
    const endStr = endDate.toISOString().split('T')[0]

    const { data: txs } = await supabase
      .from('transactions')
      .select('amount, is_transfer, categories(name)')
      .eq('domain', domain)
      .gte('transaction_date', startDate)
      .lt('transaction_date', endStr)

    if (!txs) { setLoading(false); return }

    let inkomen = 0
    let priveUitgaven = 0

    txs.forEach((tx) => {
      if (tx.is_transfer) return
      if (tx.amount > 0) {
        inkomen += tx.amount
      } else {
        priveUitgaven += Math.abs(tx.amount)
      }
    })

    const overschot = inkomen - priveUitgaven
    setData({ inkomen, priveUitgaven, overschot })
    setLoading(false)
  }

  if (!domain || domain === 'shared') return null

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full">
          Alleen voor jou zichtbaar
        </span>
        <h3 className="text-lg font-semibold text-brand-500">
          Jouw persoonlijke overzicht
        </h3>
      </div>

      {loading ? (
        <div className="animate-pulse text-slate-400 text-sm">Laden...</div>
      ) : !data ? (
        <p className="text-sm text-slate-400">Geen data beschikbaar.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-emerald-50 rounded-lg p-4">
            <p className="text-xs text-emerald-600 font-medium mb-1">Salaris ontvangen</p>
            <p className="text-xl font-bold text-emerald-700">
              €{data.inkomen.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-emerald-500 mt-1">Inkomen-transacties</p>
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-xs text-slate-500 font-medium mb-1">Eigen privé-uitgaven</p>
            <p className="text-xl font-bold text-slate-700">
              €{data.priveUitgaven.toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-slate-400 mt-1">Excl. overboekingen</p>
          </div>

          <div className={`rounded-lg p-4 ${data.overschot >= 0 ? 'bg-blue-50' : 'bg-amber-50'}`}>
            <p className={`text-xs font-medium mb-1 ${data.overschot >= 0 ? 'text-blue-600' : 'text-amber-600'}`}>
              Eigen overschot
            </p>
            <p className={`text-xl font-bold ${data.overschot >= 0 ? 'text-blue-700' : 'text-amber-700'}`}>
              {data.overschot < 0 ? '-' : ''}€{Math.abs(data.overschot).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </p>
            <p className={`text-xs mt-1 ${data.overschot >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
              Salaris min uitgaven
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
