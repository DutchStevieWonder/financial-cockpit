import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetMode, setResetMode] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError('Ongeldige inloggegevens. Probeer het opnieuw.')
      setLoading(false)
    } else {
      navigate('/')
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://financial-cockpit-horsch.netlify.app/reset-wachtwoord',
    })

    setLoading(false)
    if (error) {
      setError('Kan reset-email niet versturen. Controleer het e-mailadres.')
    } else {
      setResetSent(true)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-brand-500">
            Financial Cockpit
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {resetMode ? 'Wachtwoord opnieuw instellen' : 'Inloggen om verder te gaan'}
          </p>
        </div>

        {resetSent ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center space-y-4">
            <p className="text-sm text-emerald-600 font-medium">
              ✓ Reset-link verstuurd naar {email}
            </p>
            <p className="text-xs text-slate-500">
              Klik op de link in de e-mail om een nieuw wachtwoord in te stellen.
            </p>
            <button
              onClick={() => { setResetMode(false); setResetSent(false) }}
              className="text-sm text-brand-500 hover:underline"
            >
              Terug naar inloggen
            </button>
          </div>
        ) : (
          <form
            onSubmit={resetMode ? handleResetPassword : handleSubmit}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4"
          >
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                E-mailadres
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                           focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                required
              />
            </div>

            {!resetMode && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
                  Wachtwoord
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
                  required
                />
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-500 text-white rounded-lg py-2.5 text-sm font-medium
                         hover:bg-brand-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Bezig...' : resetMode ? 'Reset-link versturen' : 'Inloggen'}
            </button>

            <button
              type="button"
              onClick={() => { setResetMode(!resetMode); setError('') }}
              className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              {resetMode ? '← Terug naar inloggen' : 'Wachtwoord vergeten?'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
