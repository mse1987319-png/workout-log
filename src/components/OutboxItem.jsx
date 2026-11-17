import { useState } from 'react'
import { t } from '../i18n/i18n'
import { useLanguage } from '../i18n/useLanguage'
import { friendlyError } from '../lib/errors'
import { formatDateTime, typeLabel } from '../lib/format'
import { deleteItem, retryItem } from '../offline/sync'

// A workout logged on this phone that the server hasn't taken yet. It is not a
// link (it has no page until it is saved). One the server refused says why and
// offers Try again and Delete; Delete asks first, as it can't be undone.
export default function OutboxItem({ item }) {
  const [confirming, setConfirming] = useState(false)
  useLanguage() // re-render when the language changes
  const { workout } = item
  const failed = item.status === 'failed'

  return (
    <li className="workout workout-waiting">
      <div className="workout-head">
        <span className="workout-title">{workout.title}</span>
        {failed && !confirming && (
          <div className="rename-actions">
            <button type="button" className="button button-small" onClick={() => retryItem(item.id)}>
              {t('common.tryAgain')}
            </button>
            <button
              type="button"
              className="button button-secondary button-small button-danger"
              onClick={() => setConfirming(true)}
            >
              {t('common.delete')}
            </button>
          </div>
        )}
      </div>
      <p className="workout-meta">
        <span className={`badge badge-${workout.type}`}>{typeLabel(workout.type)}</span>
        <span>{t('unit.min', { count: workout.durationMin })}</span>
        <span>{formatDateTime(item.loggedAt)}</span>
        <span className={`badge ${failed ? 'badge-failed' : 'badge-waiting'}`}>
          {failed ? t('outbox.badgeFailed') : t('outbox.waiting')}
        </span>
      </p>
      {failed && <p className="form-error">{t('outbox.failed', { reason: friendlyError(item.error) })}</p>}
      {failed && confirming && (
        <div className="confirm-delete" role="group">
          <p>{t('outbox.confirmDelete', { title: workout.title })}</p>
          <div className="form-actions">
            <button type="button" className="button button-danger-solid" onClick={() => deleteItem(item.id)}>
              {t('common.delete')}
            </button>
            <button type="button" className="button button-secondary" onClick={() => setConfirming(false)}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
