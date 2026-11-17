import { useEffect, useMemo, useState } from 'react'
import { isNetworkError } from '../lib/errors'
import { supabase } from '../lib/supabase'
import { getCurrentUser, setCurrentUser } from '../offline/currentUser'
import { clearDraft } from '../offline/draft'
import { isOnline } from '../offline/network'
import { clearSavedData } from '../offline/savedData'
import { AuthContext } from './AuthContext'
import { readStoredSession } from './storedSession'

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

// Online it logs out everywhere, as before; a server that refuses keeps the
// user signed in, and the error is thrown for the screen to show. When the
// server can't be reached it logs out on this phone only, and the server's
// session simply expires (spec §4).
async function endSession() {
  if (isOnline()) {
    const { error } = await supabase.auth.signOut()
    if (!error) return
    if (!isNetworkError(error)) throw error
  }
  // supabase-js forgets the session on this phone before it tries to tell the
  // server, so the error it returns when the server can't be reached leaves
  // nobody signed in here. Only a throw means this phone is still signed in.
  await supabase.auth.signOut({ scope: 'local' })
}

async function signOut() {
  const userId = getCurrentUser()
  await endSession()
  // The user's saved data and draft leave the phone with them. Workouts
  // waiting to send stay, and go out when they log in here again.
  if (userId) {
    clearSavedData(userId)
    clearDraft(userId)
  }
}

// How long a start with a connection waits for Supabase to report the session
// before it uses the one stored on the phone.
const STORED_SESSION_AFTER_MS = 3000

export default function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ status: 'loading', session: null })

  useEffect(() => {
    let timer
    // Supabase reports the restored session first (INITIAL_SESSION),
    // then every sign-in, sign-out and token refresh.
    const { data } = supabase.auth.onAuthStateChange((event, reported) => {
      // What Supabase reports decides from now on.
      clearTimeout(timer)
      // Offline with an expired access token, supabase-js reports no session
      // although it is still stored: the user stays signed in on this phone.
      // supabase-js deletes it, and signs out, if the server rejects it later.
      const session =
        reported ?? (event === 'INITIAL_SESSION' ? readStoredSession(supabase.auth.storageKey) : null)
      // Set here, before the screens render, not in an effect: a screen's
      // first load (its own effect, which runs before this component's) must
      // know whose saved data, outbox and draft to use.
      setCurrentUser(session?.user?.id ?? null)
      setAuth({ status: 'ready', session })
    })

    // With an expired access token, supabase-js reports INITIAL_SESSION only
    // once its refresh retries give up: about 25 s with no signal. Meanwhile
    // the session stored on the phone is used, at once when the phone is
    // offline and after STORED_SESSION_AFTER_MS on a slow connection, so the
    // app doesn't sit on "Checking your session…". Screens render only once
    // the status is 'ready', so they still learn the user first. With nothing
    // stored there is no one to be signed in as: that waits for Supabase.
    function signInWithStoredSession() {
      const stored = readStoredSession(supabase.auth.storageKey)
      if (!stored) return
      setCurrentUser(stored.user.id)
      setAuth({ status: 'ready', session: stored })
    }
    if (readStoredSession(supabase.auth.storageKey)) {
      if (isOnline()) timer = setTimeout(signInWithStoredSession, STORED_SESSION_AFTER_MS)
      else signInWithStoredSession()
    }

    return () => {
      clearTimeout(timer)
      data.subscription.unsubscribe()
    }
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
