// The shared UI states (implementation plan §6): every screen that
// loads or saves data uses these, so they look and behave the same.

export function Loading({ children = 'Loading…' }) {
  return (
    <p className="state state-loading" role="status">
      {children}
    </p>
  )
}
