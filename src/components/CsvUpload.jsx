import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { parseAsnCsv, autoCategorize, matchCustomRules } from '../lib/csvParser'

export default function CsvUpload({ onComplete }) {
  const [status, setStatus] = useState('idle') // idle | parsing | uploading | done | error
  const [message, setMessage] = useState('')
  const [stats, setStats] = useState(null)
  const fileInputRef = useState(null)

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so the same file can be re-uploaded after fixing issues
    e.target.value = ''

    setStatus('parsing')
    setMessage('CSV wordt verwerkt...')

    try {
      // Read file
      const text = await file.text()
      const transactions = parseAsnCsv(text)

      if (transactions.length === 0) {
        setStatus('error')
        setMessage('Geen transacties gevonden in het CSV-bestand.')
        return
      }

      // Get bank accounts to map account numbers to domains
      const { data: bankAccounts } = await supabase
        .from('bank_accounts')
        .select('id, account_number, domain')

      // Get categories for matching
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')

      const categoryMap = {}
      categories?.forEach((c) => {
        categoryMap[c.name] = c.id
      })

      // Get custom rules
      const { data: customRules } = await supabase
        .from('category_rules')
        .select('*')
        .order('priority', { ascending: false })

      setStatus('uploading')
      setMessage('Transacties worden opgeslagen...')

      let inserted = 0
      let skipped = 0
      let unknownAccounts = new Set()

      // Build records array, skip unknown accounts
      const records = []
      for (const tx of transactions) {
        const bankAccount = bankAccounts?.find(
          (ba) => ba.account_number === tx.account_number
        )
        if (!bankAccount) {
          unknownAccounts.add(tx.account_number)
          skipped++
          continue
        }

        // Auto-categorize: custom rules first, then built-in patterns
        let categoryId = null
        let isCategorized = false
        if (customRules?.length > 0) {
          categoryId = matchCustomRules(tx, customRules)
        }
        if (!categoryId) {
          const categoryName = autoCategorize(tx)
          if (categoryName && categoryMap[categoryName]) {
            categoryId = categoryMap[categoryName]
          }
        }
        if (categoryId) {
          isCategorized = true
        } else {
          categoryId = categoryMap['Niet-toegewezen'] || null
        }

        records.push({
          bank_account_id: bankAccount.id,
          domain: bankAccount.domain,
          transaction_date: tx.transaction_date,
          counterparty_account: tx.counterparty_account,
          counterparty_name: tx.counterparty_name,
          address: tx.address,
          postcode: tx.postcode,
          city: tx.city,
          currency: tx.currency,
          balance_before: tx.balance_before,
          amount: tx.amount,
          processing_date: tx.processing_date,
          value_date: tx.value_date,
          code: tx.code,
          transaction_type: tx.transaction_type,
          sequence_number: tx.sequence_number,
          payment_reference: tx.payment_reference,
          description: tx.description,
          statement_number: tx.statement_number,
          asn_category: tx.asn_category,
          category_id: categoryId,
          is_categorized: isCategorized,
        })
      }

      // Batch upsert in chunks of 50 for performance
      const CHUNK_SIZE = 50
      for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE)
        setMessage(`Opslaan... ${Math.min(i + CHUNK_SIZE, records.length)}/${records.length}`)
        const { error, data } = await supabase.from('transactions').upsert(chunk, {
          onConflict: 'bank_account_id,transaction_date,amount,sequence_number,description',
        })
        if (error) {
          console.warn('Batch insert error:', error.message)
          skipped += chunk.length
        } else {
          inserted += chunk.length
        }
      }

      setStats({ inserted, skipped, unknownAccounts: [...unknownAccounts] })
      setStatus('done')
      setMessage(
        `Klaar! ${inserted} transacties opgeslagen, ${skipped} overgeslagen.`
      )

      if (unknownAccounts.size > 0) {
        setMessage(
          (prev) =>
            prev +
            ` Onbekende rekening(en): ${[...unknownAccounts].join(', ')}. Registreer deze eerst bij Instellingen.`
        )
      }

      onComplete?.()
    } catch (err) {
      console.error('Upload error:', err)
      setStatus('error')
      setMessage(`Fout: ${err.message}`)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-semibold text-brand-500 mb-4">
        CSV Upload
      </h2>

      <p className="text-sm text-slate-500 mb-4">
        Upload een CSV-export van ASN Bank. Kies bij het downloaden voor
        kommagescheiden data, met categorie-omschrijving en kolomtitels.
      </p>

      <label
        className={`
          block w-full border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
          transition-colors
          ${status === 'idle' ? 'border-slate-300 hover:border-brand-400 hover:bg-brand-50' : ''}
          ${status === 'parsing' || status === 'uploading' ? 'border-amber-300 bg-amber-50' : ''}
          ${status === 'done' ? 'border-green-300 bg-green-50' : ''}
          ${status === 'error' ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileUpload}
          className="hidden"
          disabled={status === 'parsing' || status === 'uploading'}
        />

        {status === 'idle' && (
          <>
            <span className="text-3xl mb-2 block">↑</span>
            <span className="text-slate-600">
              Klik om een CSV-bestand te selecteren
            </span>
          </>
        )}

        {(status === 'parsing' || status === 'uploading') && (
          <span className="text-amber-700 animate-pulse">{message}</span>
        )}

        {status === 'done' && (
          <div>
            <span className="text-green-700 block mb-2">{message}</span>
            <span className="text-sm text-green-600">
              Klik om nog een bestand te uploaden
            </span>
          </div>
        )}

        {status === 'error' && (
          <div>
            <span className="text-red-700 block mb-2">{message}</span>
            <span className="text-sm text-red-600">
              Klik om het opnieuw te proberen
            </span>
          </div>
        )}
      </label>

      {stats && (
        <div className="mt-4 text-sm text-slate-500">
          <p>
            Verwerkt: {stats.inserted} opgeslagen, {stats.skipped} overgeslagen
          </p>
          {stats.unknownAccounts.length > 0 && (
            <p className="text-amber-600 mt-1">
              Onbekende rekeningen: {stats.unknownAccounts.join(', ')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
