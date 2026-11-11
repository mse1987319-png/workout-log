import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

/** Current session and auth actions; see AuthProvider. */
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth() must be used inside <AuthProvider>')
  return value
}
