import { useState } from 'react'
import { useLanguage } from '../i18n/useLanguage'
import { isDbOlder, useDbVersion } from '../offline/dbVersion'
import { useOnline } from '../offline/network'
import { useOutbox } from '../offline/outbox'
import { syncOutbox } from '../offline/sync'
import { useUpdateReady } from '../pwa/serviceWorker'

const HIDDEN_KEY = 'logify.oldDbWarning.hidden'

function isHidden() {
  try {
    return sessionStorage.getItem(HIDDEN_KEY) === '1'
  } catch {
    return false
  }
}

// The line under the header (spec §4, §7): a new version, no connection,
// workouts waiting or failing, and an older database. Nothing when all is
// well. The lines are announced politely, so they don't interrupt.
export default function StatusBar() {
  const { t } = useLanguage()
  const online = useOnline()
  const items = useOutbox()
  useDbVersion() // re-renders when the version is learned
  const { updateReady, update } = useUpdateReady()
  const [hidden, setHidden] = useState(isHidden)

  const sending = items.some((item) => item.status === 'sending')
  const waiting = items.filter((item) => item.status === 'waiting').length
  const failed = items.filter((item) => item.status === 'failed').length
  const showOldDb = isDbOlder() && !hidden
  // Update reloads the page, which would cut off a workout on its way (on an
  // older database that can mean a second copy): it is offered once none is.
  const offerUpdate = updateReady && !sending

  function hide() {
    try {
      sessionStorage.setItem(HIDDEN_KEY, '1')
    } catch {
      // Storage is blocked: hiding it until the page reloads is enough.
    }
    setHidden(true)
  }

  if (!offerUpdate && online && !sending && !waiting && !failed && !showOldDb) return null

  return (
    <div className="status-bar" role="status">
      {offerUpdate && (
        <p>
          <span>{t('status.update')}</span>
          <button type="button" className="link-button" onClick={update}>
            {t('status.updateNow')}
          </button>
        </p>
      )}
      {!online && <p>{t('status.offline')}</p>}
      {sending && <p>{t('status.sending')}</p>}
      {waiting > 0 && (
        <p>
          <span>{t('status.waiting', { count: waiting })}</span>
          {online && (
            <button type="button" className="link-button" onClick={() => syncOutbox()}>
              {t('status.sendNow')}
            </button>
          )}
        </p>
      )}
      {failed > 0 && <p>{t('status.failed', { count: failed })}</p>}
      {showOldDb && (
        <p>
          <span>{t('status.oldDb')}</span>
          <button type="button" className="link-button" onClick={hide}>
            {t('status.hide')}
          </button>
        </p>
      )}
    </div>
  )
}
