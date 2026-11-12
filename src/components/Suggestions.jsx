import { Link } from 'react-router-dom'
import { useLanguage } from '../i18n/useLanguage'
import { getRules } from '../lib/recommendations'

// Rule-based suggestions (lib/recommendations.js), each with its reason, and
// every rule spelled out below them, so nothing is a black box.
// readOnly (the instructor's view of an athlete): no action links.
export default function Suggestions({ items, title, readOnly = false }) {
  const { t } = useLanguage()
  return (
    <section className="card stack" aria-labelledby="suggestions-title">
      <h2 id="suggestions-title">{title ?? t('suggestions.title')}</h2>

      {items.length === 0 ? (
        <p className="muted">{t('suggestions.none')}</p>
      ) : (
        <ul className="suggestion-list" aria-labelledby="suggestions-title">
          {items.map((item) => (
            <li key={item.key} className="suggestion">
              <p className="suggestion-title">{item.title}</p>
              <p className="muted">{item.because}</p>
              {item.link && !readOnly && (
                <Link className="button button-small" to={item.link}>
                  {t('common.logWorkout')}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      <details className="table-view">
        <summary>{t('suggestions.how')}</summary>
        <ul className="rules" aria-label={t('suggestions.how')}>
          {getRules().map((rule) => (
            <li key={rule.kind}>{rule.text}</li>
          ))}
        </ul>
      </details>
    </section>
  )
}
