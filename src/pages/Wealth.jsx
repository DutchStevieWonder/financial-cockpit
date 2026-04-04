import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import NetWorthOverview from '../components/NetWorthOverview'
import GoalProgress from '../components/GoalProgress'
import { supabase } from '../lib/supabase'

export default function Wealth() {
  const { isAdmin } = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    type: 'investment',
    account: '',
    date: new Date().toISOString().split('T')[0],
    value: '',
  })
  const [accounts, setAccounts] = useState({ investments: [], savings: [] })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  async function loadAccounts() {
    const { data: inv } = await supabase
      .from('investment_accounts')
      .select('id, name, platform, domain')

    const { data: sav } = await supabase
      .from('savings_accounts')
      .select('id, name, bank, domain')

    setAccounts({ investments: inv || [], savings: sav || [] })
  }

  async function handleSnapshot(e) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const table =
      formData.type === 'investment'
        ? 'investment_snapshots'
        : 'savings_snapshots'

    // Look up the domain from the selected account
    const selectedAccount = currentAccounts.find((a) => a.id === formData.account)
    const accountDomain = selectedAccount?.domain || 'steven'

    const record =
      formData.type === 'investment'
        ? {
            investment_account_id: formData.account,
            snapshot_date: formData.date,
            total_value: parseFloat(formData.value),
            domain: accountDomain,
          }
        : {
            savings_account_id: formData.account,
            snapshot_date: formData.date,
            balance: parseFloat(formData.value),
            domain: accountDomain,
          }

    const { error } = await supabase.from(table).upsert(record, {
      onConflict:
        formData.type === 'investment'
          ? 'investment_account_id,snapshot_date'
          : 'savings_account_id,snapshot_date',
    })

    if (error) {
      console.error('Snapshot error:', error)
      setSaveError(error.message || 'Opslaan mislukt. Probeer opnieuw.')
    } else {
      setSaveSuccess(true)
      setFormData({ ...formData, value: '' })
      setTimeout(() => {
        setShowForm(false)
        setSaveSuccess(false)
      }, 1200)
    }
    setSaving(false)
  }

  const currentAccounts =
    formData.type === 'investment' ? accounts.investments : accounts.savings

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Vermogen</h2>
        {isAdmin && (
          <button
            onClick={() => {
              loadAccounts()
              setShowForm(!showForm)
            }}
            className="text-sm bg-brand-500 text-white px-4 py-2 rounded-lg
                       hover:bg-brand-600 transition-colors"
          >
            + Snapshot invoeren
          </button>
        )}
      </div>

      {/* Manual snapshot form */}
      {showForm && isAdmin && (
        <form
          onSubmit={handleSnapshot}
          className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value, account: '' })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="investment">Belegging</option>
                <option value="savings">Spaarrekening</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Rekening
              </label>
              <select
                value={formData.account}
                onChange={(e) =>
                  setFormData({ ...formData, account: e.target.value })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                required
              >
                <option value="">Selecteer...</option>
                {currentAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.platform || acc.bank})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Datum
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Waarde (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) =>
                  setFormData({ ...formData, value: e.target.value })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm
                         hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
            {saveError && (
              <span className="text-sm text-red-600">{saveError}</span>
            )}
            {saveSuccess && (
              <span className="text-sm text-green-600">✓ Opgeslagen</span>
            )}
          </div>
        </form>
      )}

      <NetWorthOverview />
      <GoalProgress />
    </div>
  )
}
