import { Navigate, useLocation } from 'react-router-dom'
import { Loading } from '../components/States'
import { useAuth } from './AuthContext'

// Wraps pages that need a signed-in user. Visitors go to /login, which
// sends them back here after they log in.
export default function RequireAuth({ children }) {
  const { status, session } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Loading>Checking your session…</Loading>
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}
