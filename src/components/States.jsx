// The shared UI states (implementation plan §6): every screen that
// loads or saves data uses these, so they look and behave the same.
import { useLanguage } from '../i18n/useLanguage'

export function Loading({ children }) {
  const { t } = useLanguage()
  return (
    <p className="state state-loading" role="status">
      {children ?? t('common.loading')}
    </p>
  )
}

export function ErrorState({ message, onRetry }) {
  const { t } = useLanguage()
  return (
    <div className="state state-error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="button" onClick={onRetry}>
          {t('common.tryAgain')}
        </button>
      )}
    </div>
  )
}

export function EmptyState({ children, action }) {
  return (
    <div className="state state-empty">
      <svg className="state-icon" viewBox="0 0 72 32" aria-hidden="true" focusable="false">
        <rect x="14" y="14" width="44" height="4" rx="2" />
        <rect x="4" y="9" width="6" height="14" rx="2" />
        <rect x="10" y="4" width="6" height="24" rx="2" />
        <rect x="56" y="4" width="6" height="24" rx="2" />
        <rect x="62" y="9" width="6" height="14" rx="2" />
      </svg>
      <p>{children}</p>
      {action}
    </div>
  )
}

export function SuccessMessage({ children }) {
  return (
    <p className="state state-success" role="status">
      {children}
    </p>
  )
}
