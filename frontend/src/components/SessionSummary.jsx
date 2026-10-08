import { Link } from 'react-router-dom'
import { getEmotionLabel } from '../constants/emotions'
import './SessionSummary.css'

function toPercent(value) {
  if (value == null) return '—'
  return `${Math.round(value * 100)}%`
}

export default function SessionSummary({ summary, modeLabel, onContinue, onHome }) {
  if (!summary) return null

  return (
    <section className="session-summary" role="status" aria-live="polite">
      <p className="session-summary__eyebrow">Session complete</p>
      <h2>{modeLabel} summary</h2>
      <p className="session-summary__lead">
        Nice work. Here is how this practice went.
      </p>

      <div className="session-summary__stats">
        <article>
          <strong>{summary.correct}/{summary.total}</strong>
          <span>Correct</span>
        </article>
        <article>
          <strong>{toPercent(summary.accuracy)}</strong>
          <span>Accuracy</span>
        </article>
        <article>
          <strong>
            {summary.hardest_emotion ? getEmotionLabel(summary.hardest_emotion) : '—'}
          </strong>
          <span>Needs practice</span>
        </article>
      </div>

      {summary.by_emotion?.length > 0 && (
        <ul className="session-summary__emotions">
          {summary.by_emotion.map((row) => (
            <li key={row.emotion}>
              <span>{getEmotionLabel(row.emotion)}</span>
              <span>
                {row.correct}/{row.total}
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="session-summary__actions">
        <button type="button" className="session-summary__btn session-summary__btn--primary" onClick={onContinue}>
          Practice again
        </button>
        <Link to="/child" className="session-summary__btn" onClick={onHome}>
          Back to dashboard
        </Link>
      </div>
    </section>
  )
}
