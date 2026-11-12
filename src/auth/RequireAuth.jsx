import { Navigate, useLocation } from 'react-router-dom'
import { Loading } from '../components/States'
import { useLanguage } from '../i18n/useLanguage'
import { useAuth } from './AuthContext'

// Wraps pages that need a signed-in user. Visitors go to /login, which
// sends them back here after they log in.
export default function RequireAuth({ children }) {
  const { status, session } = useAuth()
  const location = useLocation()
  const { t } = useLanguage()

  if (status === 'loading') return <Loading>{t('common.checkingSession')}</Loading>
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />
  return children
}
