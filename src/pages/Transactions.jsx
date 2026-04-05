import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useMonth } from '../context/MonthContext'

export default function Transactions() {
  const [transactions, setTransactions] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | uncategorized
  const { month, setMonth } = useMonth()
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchData()
  }, [month, filter])

  async function fetchData() {
    setLoading(true)

    const startDate = `${month}-01`
    const endDate = new Date(month + '-01')
    endDate.setMonth(endDate.getMonth() + 1)
    const endStr = endDate.toISOString().split('T')[0]

    let query = supabase
      .from('transactions')
      .select('*, categories(id, name, color)')
      .gte('transaction_date', startDate)
      .lt('transaction_date', endStr)
      .order('transaction_date', { ascending: false })

    if (filter === 'uncategorized') {
      query = query.eq('is_categorized', false)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching transactions:', error)
    } else {
      setTransactions(data || [])
    }

    // Fetch categories for the dropdown
    const { data: cats } = await supabase
      .from('categories')
      .select('id, name')
      .order('name')

    setCategories(cats || [])
    setLoading(false)
  }

  async function updateCategory(transactionId, categoryId) {
    const { error } = await supabase
      .from('transactions')
      .update({
        category_id: categoryId,
        is_categorized: true,
      })
      .eq('id', transactionId)

    if (!error) {
      setTransactions((prev) =>
        prev.map((tx) =>
          tx.id === transactionId
            ? {
                ...tx,
                category_id: categoryId,
                is_categorized: true,
                categories: categories.find((c) => c.id === categoryId),
              }
            : tx
        )
      )
    }
  }

  async function createRule(transaction, categoryId) {
    if (!transaction.counterparty_name) return

    await supabase.from('category_rules').insert({
      pattern: transaction.counterparty_name,
      match_field: 'counterparty_name',
      category_id: categoryId,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-slate-800">Transacties</h2>

        <div className="flex gap-2">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">Alle</option>
            <option value="uncategorized">Niet gecategoriseerd</option>
          </select>
        </div>
      </div>

      {/* Search box */}
      <div className="relative">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Zoek op naam of omschrijving..."
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm pl-8"
        />
        <span className="absolute left-2.5 top-2.5 text-slate-400 text-xs">🔍</span>
      </div>

      {loading ? (
        <div className="animate-pulse text-slate-400">Laden...</div>
      ) : transactions.length === 0 ? (
        <div className="text-slate-400 text-sm bg-white rounded-xl border border-slate-200 p-8 text-center">
          Geen transacties gevonden voor deze periode.
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 divide-y divide-slate-100">
          {transactions.filter((tx) => {
            if (!search) return true
            const q = search.toLowerCase()
            return (
              tx.counterparty_name?.toLowerCase().includes(q) ||
              tx.description?.toLowerCase().includes(q)
            )
          }).map((tx) => (
            <div key={tx.id} className="p-4 flex items-center gap-4">
              {/* Category dot */}
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{
                  backgroundColor: tx.categories?.color || '#BDC3C7',
                }}
              />

              {/* Transaction details */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {tx.counterparty_name || tx.description || 'Onbekend'}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {tx.description && tx.counterparty_name
                    ? tx.description
                    : ''}
                  {tx.asn_category ? ` · ${tx.asn_category}` : ''}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(tx.transaction_date).toLocaleDateString('nl-NL', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>

              {/* Category selector */}
              <select
                value={tx.category_id || ''}
                onChange={(e) => {
                  const catId = e.target.value
                  updateCategory(tx.id, catId)
                  createRule(tx, catId)
                }}
                className="text-xs border border-slate-200 rounded px-2 py-1 max-w-[120px]"
              >
                <option value="">—</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {/* Amount */}
              <span
                className={`text-sm font-semibold whitespace-nowrap ${
                  tx.amount >= 0 ? 'text-emerald-600' : 'text-slate-800'
                }`}
              >
                {tx.amount >= 0 ? '+' : ''}€
                {Math.abs(tx.amount).toLocaleString('nl-NL', {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
