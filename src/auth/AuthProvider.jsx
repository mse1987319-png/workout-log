import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContext'

async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

// Resolves { needsConfirmation: true } when the Supabase project has
// "Confirm email" turned on (sign-up then returns no session).
async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // The confirmation link must come back to this deployment
    // (localhost in development, the Vercel URL in production).
    options: { emailRedirectTo: window.location.origin },
  })
  if (error) throw error
  return { needsConfirmation: !data.session }
}

async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export default function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ status: 'loading', session: null })

  useEffect(() => {
    // Supabase reports the restored session first (INITIAL_SESSION),
    // then every sign-in, sign-out and token refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuth({ status: 'ready', session })
    })
    return () => data.subscription.unsubscribe()
  }, [])

  const value = useMemo(
    () => ({
      status: auth.status,
      session: auth.session,
      user: auth.session?.user ?? null,
      signIn,
      signUp,
      signOut,
    }),
    [auth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
