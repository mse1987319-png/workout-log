import { useState } from 'react'
import { useLanguage } from '../i18n/useLanguage'
import { isIos, isStandalone, useInstallPrompt } from '../pwa/installPrompt'

const DISMISSED_KEY = 'logify.installCard.dismissed'

function isDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

// On My plans: offers to put Logify on the home screen. Chrome and Android get
// an Install button; iPhone gets the Share > Add to Home Screen steps. Gone
// once installed, and for good after "Not now" / "Got it".
export default function InstallCard() {
  const { t } = useLanguage()
  const { canInstall, install } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(isDismissed)

  if (dismissed || isStandalone()) return null
  if (!canInstall && !isIos()) return null

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // Storage is blocked or full: hiding it for this visit is enough.
    }
    setDismissed(true)
  }

  return (
    <section className="install-card" aria-labelledby="install-title">
      <h2 id="install-title">{t('install.title')}</h2>
      <p>{canInstall ? t('install.text') : t('install.ios')}</p>
      <div className="install-card-actions">
        {canInstall && (
          <button type="button" className="button" onClick={install}>
            {t('install.button')}
          </button>
        )}
        <button type="button" className="button button-secondary" onClick={dismiss}>
          {canInstall ? t('install.notNow') : t('install.gotIt')}
        </button>
      </div>
    </section>
  )
}
