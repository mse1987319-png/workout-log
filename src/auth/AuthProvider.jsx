import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContext'

async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

// Resolves { needsConfirmation: true } when the Supabase project has
// "Confirm email" turned on (sign-up then returns no session).
// role ('athlete' | 'instructor') goes into the user's metadata; a database
// trigger copies it into their profile (supabase/schema.sql).
async function signUp(email, password, role = 'athlete') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // The confirmation link must come back to this deployment
      // (localhost in development, the Vercel URL in production).
      emailRedirectTo: window.location.origin,
      data: { role },
    },
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
      // Decides the menu only; what anyone may read is decided by the database.
      role: auth.session?.user?.user_metadata?.role === 'instructor' ? 'instructor' : 'athlete',
      signIn,
      signUp,
      signOut,
    }),
    [auth],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
