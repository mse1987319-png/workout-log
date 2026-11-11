// The shared UI states (implementation plan §6): every screen that
// loads or saves data uses these, so they look and behave the same.

export function Loading({ children = 'Loading…' }) {
  return (
    <p className="state state-loading" role="status">
      {children}
    </p>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state state-error" role="alert">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="button" onClick={onRetry}>
          Try again
        </button>
      )}
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
