// The Logify logo (public/logo.svg). Its word turns white in dark mode: the
// file carries its own prefers-color-scheme rule, which also works inside <img>.
export default function Logo({ large = false }) {
  return <img className={large ? 'brand-logo brand-logo-large' : 'brand-logo'} src="/logo.svg" alt="Logify" />
}
