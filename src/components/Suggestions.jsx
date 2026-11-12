import { Link } from 'react-router-dom'
import { RULES } from '../lib/recommendations'

// Rule-based suggestions (lib/recommendations.js), each with its reason, and
// every rule spelled out below them, so nothing is a black box.
export default function Suggestions({ items }) {
  return (
    <section className="card stack" aria-labelledby="suggestions-title">
      <h2 id="suggestions-title">Suggestions</h2>

      {items.length === 0 ? (
        <p className="muted">Nothing to suggest right now: suggestions appear when one of the rules below applies.</p>
      ) : (
        <ul className="suggestion-list" aria-labelledby="suggestions-title">
          {items.map((item) => (
            <li key={item.key} className="suggestion">
              <p className="suggestion-title">{item.title}</p>
              <p className="muted">{item.because}</p>
              {item.link && (
                <Link className="button button-small" to={item.link}>
                  Log a workout
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}

      <details className="table-view">
        <summary>How suggestions work</summary>
        <ul className="rules" aria-label="How suggestions work">
          {RULES.map((rule) => (
            <li key={rule.kind}>{rule.text}</li>
          ))}
        </ul>
      </details>
    </section>
  )
}
