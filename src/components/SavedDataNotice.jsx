import { useLanguage } from '../i18n/useLanguage'
import { formatDateTime } from '../lib/format'

// Over a screen showing saved data instead of fresh (useLoad's savedAt):
// "Offline: showing data saved on 16 Nov, 18:42." with Try again.
export default function SavedDataNotice({ savedAt, onRetry }) {
  const { t } = useLanguage()
  return (
    <p className="state state-saved" role="status">
      {t('offline.savedData', { time: formatDateTime(savedAt) })}{' '}
      <button type="button" className="link-button" onClick={onRetry}>
        {t('common.tryAgain')}
      </button>
    </p>
  )
}
