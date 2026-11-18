// The icons of the tab bar (phones): 24×24, drawn with the text color.
function NavIcon({ children }) {
  return (
    <svg
      className="nav-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

// A clipboard.
export function PlansIcon() {
  return (
    <NavIcon>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
    </NavIcon>
  )
}

// A plus in a circle.
export function LogIcon() {
  return (
    <NavIcon>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </NavIcon>
  )
}

// A trend line.
export function ProgressIcon() {
  return (
    <NavIcon>
      <path d="M3 17l6-6 4 4 8-9" />
      <path d="M15 6h6v6" />
    </NavIcon>
  )
}

// Share nodes.
export function SharingIcon() {
  return (
    <NavIcon>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </NavIcon>
  )
}

// Two people.
export function AthletesIcon() {
  return (
    <NavIcon>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <path d="M16 4.7a3.5 3.5 0 010 6.6M18 14.4c2 .8 3.5 2.6 3.5 5.6" />
    </NavIcon>
  )
}
