import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import CsvUpload from '../components/CsvUpload'
import { supabase } from '../lib/supabase'

export default function Upload() {
  const { isAdmin } = useAuth()
  const [bankAccounts, setBankAccounts] = useState([])
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [newAccount, setNewAccount] = useState({ account_number: '', name: '', domain: 'steven' })

  useEffect(() => { fetchAccounts() }, [])

  async function fetchAccounts() {
    const { data } = await supabase.from('bank_accounts').select('*').order('domain')
    setBankAccounts(data || [])
  }

  async function addAccount(e) {
    e.preventDefault()
    const { error } = await supabase.from('bank_accounts').insert(newAccount)
    if (error) { console.error('Error adding account:', error) } else {
      setNewAccount({ account_number: '', name: '', domain: 'steven' })
      setShowAccountForm(false)
      fetchAccounts()
    }
  }

  if (!isAdmin) {
    return <div className="text-center text-slate-400 py-12">Je hebt geen toegang tot deze pagina.</div>
  }

  const domainLabels = { steven: 'Steven (privé)', partner: 'Partner (privé)', shared: 'Gezamenlijk' }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-slate-800">Data Upload</h2>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-brand-500">Geregistreerde rekeningen</h3>
          <button onClick={() => { setShowAccountForm((prev) => !prev); setTimeout(() => { document.getElementById('account-form')?.scrollIntoView({ behavior: 'smooth' }) }, 100) }} className="text-sm bg-brand-500 text-white px-3 py-1.5 rounded-lg hover:bg-brand-600 transition-colors">
            {showAccountForm ? '✕ Sluiten' : '+ Rekening toevoegen'}
          </button>
        </div>
        {bankAccounts.length === 0 ? (
          <p className="text-sm text-slate-400">Nog geen rekeningen geregistreerd. Voeg eerst je ASN-rekeningen toe voordat je CSV's uploadt.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {bankAccounts.map((acc) => (
              <div key={acc.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="text-sm font-medium text-slate-700">{acc.name}</p>
                  <p className="text-xs text-slate-400">{acc.account_number}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${acc.domain === 'steven' ? 'bg-blue-50 text-blue-600' : acc.domain === 'partner' ? 'bg-purple-50 text-purple-600' : 'bg-green-50 text-green-600'}`}>
                  {domainLabels[acc.domain]}
                </span>
              </div>
            ))}
          </div>
        )}
        {showAccountForm && (
          <form id="account-form" onSubmit={addAccount} className="mt-4 pt-4 border-t border-slate-200 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="text" placeholder="Rekeningnummer (NL...)" value={newAccount.account_number} onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
              <input type="text" placeholder="Naam (bijv. Steven privé)" value={newAccount.name} onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm" required />
              <select value={newAccount.domain} onChange={(e) => setNewAccount({ ...newAccount, domain: e.target.value })} className="border border-slate-300 rounded-lg px-3 py-2 text-sm">
                <option value="steven">Steven (privé)</option>
                <option value="partner">Partner (privé)</option>
                <option value="shared">Gezamenlijk</option>
              </select>
            </div>
            <button type="submit" className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-600 transition-colors">Toevoegen</button>
          </form>
        )}
      </div>
      {bankAccounts.length > 0 ? (
        <CsvUpload onComplete={fetchAccounts} />
      ) : (
        <div className="bg-slate-50 rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-400">
          Registreer eerst je bankrekeningen hierboven. Dan kun je CSV-bestanden uploaden.
        </div>
      )}
    </div>
  )
}
