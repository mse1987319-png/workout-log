import { useState } from 'react'
import { lastReport, previewReport, sendReport } from '../api/reports'
import { useLanguage } from '../i18n/useLanguage'
import { friendlyError } from '../lib/errors'
import { formatDateTime } from '../lib/format'
import { useLoad } from '../lib/useLoad'
import { ErrorState, Loading, SuccessMessage } from './States'

const loadCard = () => Promise.all([previewReport(), lastReport()]).then(([stats, last]) => ({ stats, last }))

// "Send report to instructor": a preview of the last 7 days, when the last
// report went out, and the button. The database builds and stores the report.
export default function ReportCard() {
  const { status, data, error, reload, setData } = useLoad(loadCard)
  const { t } = useLanguage()
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState(null)
  const [sent, setSent] = useState(false)

  async function send() {
    setSendError(null)
    setSent(false)
    setSending(true)
    try {
      const report = await sendReport()
      setData((current) => ({ ...current, last: { created_at: report.created_at, summary: report.summary } }))
      setSent(true)
    } catch (err) {
      setSendError(err)
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="card stack" aria-labelledby="report-title">
      <h2 id="report-title">{t('report.title')}</h2>

      {status === 'loading' && <Loading>{t('report.loading')}</Loading>}

      {status === 'error' && <ErrorState message={friendlyError(error)} onRetry={reload} />}

      {status === 'success' && (
        <>
          <p className="chart-summary">{data.stats.summary}</p>
          <p className="muted">
            {data.last ? t('report.lastSent', { date: formatDateTime(data.last.created_at) }) : t('report.none')}
          </p>
          {sendError && <ErrorState message={friendlyError(sendError)} onRetry={send} />}
          {sent && <SuccessMessage>{t('report.sent')}</SuccessMessage>}
          <div>
            <button type="button" className="button" disabled={sending || data.stats.workouts === 0} onClick={send}>
              {sending ? t('report.sending') : t('report.send')}
            </button>
          </div>
          {data.stats.workouts === 0 && <p className="hint">{t('report.logFirst')}</p>}
        </>
      )}
    </section>
  )
}
