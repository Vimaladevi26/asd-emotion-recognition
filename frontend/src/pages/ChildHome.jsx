import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getSession, isChild } from '../api/auth'
import { getChild, getChildSessions, getDashboard, getNextExercise } from '../api/tracking'
import { getEmotionLabel } from '../constants/emotions'
import './ChildHome.css'

function toPercentNumber(value) {
  if (value == null || Number.isNaN(value)) return 0
  return Math.round(value * 100)
}

function toPercentLabel(value) {
  if (value == null || Number.isNaN(value)) return '—'
  return `${Math.round(value * 100)}%`
}

function averageAccuracy(rows) {
  const scored = rows.filter((row) => row.total > 0 && row.accuracy != null)
  if (!scored.length) return null
  return scored.reduce((sum, row) => sum + row.accuracy, 0) / scored.length
}

function countAttempts(rows) {
  return rows.reduce((sum, row) => sum + (row.total || 0), 0)
}

function ProgressBar({ label, value, tries, tone }) {
  const pct = toPercentNumber(value)
  const hasData = value != null

  return (
    <div className={`progress-bar progress-bar--${tone}`}>
      <div className="progress-bar__head">
        <span>{label}</span>
        <strong>{hasData ? `${pct}%` : 'Not started'}</strong>
      </div>
      <div className="progress-bar__track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="progress-bar__fill" style={{ width: `${hasData ? pct : 0}%` }} />
      </div>
      <small>{tries} tries</small>
    </div>
  )
}

function greetingForHour(hour) {
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export default function ChildHome() {
  const session = getSession()
  const allowed = isChild() && Boolean(session?.child_id)
  const childId = session?.child_id
  const [dashboard, setDashboard] = useState(null)
  const [sessions, setSessions] = useState([])
  const [profile, setProfile] = useState(null)
  const [nextFocus, setNextFocus] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!allowed || !childId) {
      setLoading(false)
      return undefined
    }

    let cancelled = false

    async function load() {
      try {
        const [dash, sessionList, childProfile] = await Promise.all([
          getDashboard(childId),
          getChildSessions(childId),
          getChild(childId),
        ])
        let next = null
        try {
          next = await getNextExercise(childId)
        } catch {
          next = null
        }
        if (!cancelled) {
          setDashboard(dash)
          setSessions(sessionList)
          setProfile(childProfile)
          setNextFocus(next)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load progress.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [allowed, childId])

  if (!allowed) {
    return <Navigate to="/login" replace />
  }

  const quizAvg = dashboard ? averageAccuracy(dashboard.quiz.per_emotion) : null
  const practiceAvg = dashboard ? averageAccuracy(dashboard.practice.per_emotion) : null
  const quizTries = dashboard ? countAttempts(dashboard.quiz.per_emotion) : 0
  const practiceTries = dashboard ? countAttempts(dashboard.practice.per_emotion) : 0
  const scoredAvgs = [quizAvg, practiceAvg].filter((value) => value != null)
  const overall =
    scoredAvgs.length === 0
      ? null
      : scoredAvgs.reduce((sum, value) => sum + value, 0) / scoredAvgs.length
  const overallPct = toPercentNumber(overall)
  const firstName = (session.display_name || 'friend').split(' ')[0]
  const greeting = greetingForHour(new Date().getHours())

  return (
    <main className="child-home">
      <header className="child-home__welcome">
        <div className="child-home__welcome-copy">
          <p className="child-home__eyebrow">Welcome back</p>
          <h1>
            {greeting}, {firstName}
          </h1>
          <p>
            This is your practice dashboard. Use the sidebar to open Emotion Quiz or
            Therapy Session, then watch your progress grow here.
          </p>
        </div>
        <div className="child-home__welcome-meter">
          <span>Overall progress</span>
          <strong>{overall == null ? 'Start practicing' : `${overallPct}%`}</strong>
          <div
            className="progress-bar__track progress-bar__track--lg"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={overallPct}
          >
            <div className="progress-bar__fill progress-bar__fill--overall" style={{ width: `${overallPct}%` }} />
          </div>
          <small>{sessions.length} sessions saved</small>
        </div>
      </header>

      {(profile?.focus_emotions?.length > 0 || nextFocus?.emotion) && (
        <section className="child-home__focus">
          <div>
            <h2>Today&apos;s focus</h2>
            <p>
              {profile?.focus_emotions?.length
                ? 'Your admin set these emotions for practice.'
                : 'Suggested next emotion based on your recent scores.'}
            </p>
          </div>
          <div className="child-home__focus-chips">
            {(profile?.focus_emotions?.length
              ? profile.focus_emotions
              : [nextFocus.emotion]
            ).map((emotion) => (
              <span key={emotion}>{getEmotionLabel(emotion)}</span>
            ))}
          </div>
          {nextFocus?.emotion && (
            <p className="child-home__focus-next">
              Next up: <strong>{getEmotionLabel(nextFocus.emotion)}</strong>
            </p>
          )}
        </section>
      )}

      <section className="child-home__start">
        <Link to="/quiz" className="start-card start-card--quiz">
          <span className="start-card__tag">Activity 1</span>
          <h2>Emotion Quiz</h2>
          <p>Look at a face photo and pick the right emotion.</p>
          <span className="start-card__cta">Start quiz →</span>
        </Link>
        <Link to="/practice" className="start-card start-card--therapy">
          <span className="start-card__tag">Activity 2</span>
          <h2>Therapy Session</h2>
          <p>Show an expression on camera. The app checks if it matches.</p>
          <span className="start-card__cta">Start therapy →</span>
        </Link>
      </section>

      {loading && <p className="child-home__status">Loading your progress…</p>}
      {error && (
        <p className="child-home__error" role="alert">
          {error}
        </p>
      )}

      {dashboard && (
        <section className="child-home__panel">
          <div className="child-home__panel-head">
            <h2>Your progress</h2>
            <p>Scores from quiz and therapy practice.</p>
          </div>

          <div className="child-home__bars">
            <ProgressBar label="Quiz score" value={quizAvg} tries={quizTries} tone="quiz" />
            <ProgressBar
              label="Therapy score"
              value={practiceAvg}
              tries={practiceTries}
              tone="therapy"
            />
          </div>

          <div className="child-home__stats">
            <article>
              <strong>{toPercentLabel(quizAvg)}</strong>
              <span>Quiz score</span>
              <small>{quizTries} tries</small>
            </article>
            <article>
              <strong>{toPercentLabel(practiceAvg)}</strong>
              <span>Therapy score</span>
              <small>{practiceTries} tries</small>
            </article>
            <article>
              <strong>{sessions.length}</strong>
              <span>Sessions</span>
              <small>quiz + therapy</small>
            </article>
          </div>

          <h3>Recent activity</h3>
          {dashboard.recent_attempts.length === 0 ? (
            <p className="child-home__empty">No practice yet. Start a quiz or therapy session above.</p>
          ) : (
            <ul className="child-home__attempts">
              {dashboard.recent_attempts.slice(0, 6).map((attempt) => (
                <li key={attempt.id}>
                  <span className="emotion">{getEmotionLabel(attempt.emotion)}</span>
                  <span className="source">
                    {attempt.source === 'quiz' ? 'Quiz' : 'Therapy'}
                  </span>
                  <span className={attempt.correct ? 'ok' : 'bad'}>
                    {attempt.correct ? 'Correct' : 'Try again'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="child-home__panel">
        <div className="child-home__panel-head">
          <h2>Session history</h2>
          <p>Each time you open quiz or therapy, it is saved here.</p>
        </div>
        {sessions.length === 0 ? (
          <p className="child-home__empty">No sessions yet.</p>
        ) : (
          <ul className="child-home__sessions">
            {sessions.slice(0, 8).map((item) => (
              <li key={item.id}>
                <strong>{item.mode === 'quiz' ? 'Emotion Quiz' : 'Therapy Session'}</strong>
                <span>{new Date(item.started_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
