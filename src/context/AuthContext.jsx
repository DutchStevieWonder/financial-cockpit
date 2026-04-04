import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Effect 1: get the initial session immediately, then subscribe to changes.
  // onAuthStateChange callback is kept SYNCHRONOUS to avoid blocking the
  // Supabase auth state machine with async/await.
  useEffect(() => {
    let mounted = true

    // Immediately resolve the current session (no network call needed for
    // non-expired tokens — reads directly from localStorage)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setUser(session?.user ?? null)
      // If no user, stop loading right away
      if (!session?.user) setLoading(false)
    })

    // Subscribe to future auth changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return
        setUser(session?.user ?? null)
        if (!session?.user) {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Effect 2: fetch the user profile whenever `user` changes.
  // Completely separate from the auth subscription to avoid async callbacks
  // inside onAuthStateChange.
  useEffect(() => {
    if (user === null) return  // wait until user is resolved
    if (user === undefined) return

    let mounted = true
    setLoading(true)

    supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!mounted) return
        if (error) console.error('[AuthContext] fetchProfile error:', error)
        setProfile(data ?? null)
        setLoading(false)
      })
      .catch((err) => {
        if (!mounted) return
        console.error('[AuthContext] fetchProfile exception:', err)
        setProfile(null)
        setLoading(false)
      })

    return () => { mounted = false }
  }, [user])

  async function signIn(email, password) {
    return supabase.auth.signInWithPassword({ email, password })
  }

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signIn,
      signOut,
      isAdmin: profile?.is_admin ?? false,
      domain: profile?.domain ?? null,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
