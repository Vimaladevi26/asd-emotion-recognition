import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { downloadDashboardCsv, getChildren, getDashboard, getStoredChildId } from '../api/tracking'
import { getEmotionLabel } from '../constants/emotions'
import './Dashboard.css'

function toPercent(value) {
  if (value == null) return 0
  return Math.round(value * 100)
}

function averageAccuracy(rows) {
  const scored = rows.filter((row) => row.total > 0 && row.accuracy != null)
  if (!scored.length) return null
  return scored.reduce((sum, row) => sum + row.accuracy, 0) / scored.length
}

function sourceLabel(source) {
  if (source === 'show_me') return 'Therapy'
  if (source === 'quiz') return 'Quiz'
  return source
}

function chartRows(perEmotion) {
  return perEmotion.map((row) => ({
    emotion: getEmotionLabel(row.emotion),
    accuracy: toPercent(row.accuracy),
    total: row.total,
    correct: row.correct,
  }))
}

function AccuracyBars({ title, rows, color }) {
  return (
    <section className="dashboard__panel">
      <h2 className="dashboard__heading">{title}</h2>
      <div className="dashboard__chart">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartRows(rows)} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="emotion" tick={{ fontSize: 12, fill: '#475569' }} />
            <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: '#475569' }} />
            <Tooltip
              formatter={(value, _name, item) => [
                `${value}% (${item.payload.correct}/${item.payload.total})`,
                'Accuracy',
              ]}
            />
            <Bar dataKey="accuracy" fill={color} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default function Dashboard() {
  const [searchParams] = useSearchParams()
  const [children, setChildren] = useState([])
  const [childId, setChildId] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadChildren() {
      try {
        const list = await getChildren()
        if (cancelled) return
        setChildren(list)
        const fromQuery = Number(searchParams.get('child'))
        const stored = Number(getStoredChildId())
        const fallback = list[0]?.id ?? null
        const preferred = list.some((child) => child.id === fromQuery)
          ? fromQuery
          : list.some((child) => child.id === stored)
            ? stored
            : fallback
        setChildId(preferred)
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load children.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadChildren()
    return () => {
      cancelled = true
    }
  }, [searchParams])

  useEffect(() => {
    if (!childId) {
      setDashboard(null)
      return
    }

    let cancelled = false

    async function loadDashboard() {
      try {
        const payload = await getDashboard(childId)
        if (!cancelled) {
          setDashboard(payload)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load dashboard.')
          setDashboard(null)
        }
      }
    }

    loadDashboard()
    return () => {
      cancelled = true
    }
  }, [childId])

  const trendRows = useMemo(() => {
    if (!dashboard) return []
    return dashboard.daily_trend.map((point) => ({
      date: point.date,
      quiz: point.quiz_accuracy == null ? null : toPercent(point.quiz_accuracy),
      practice: point.practice_accuracy == null ? null : toPercent(point.practice_accuracy),
    }))
  }, [dashboard])

  const selected = children.find((child) => child.id === childId)
  const quizAvg = dashboard ? averageAccuracy(dashboard.quiz.per_emotion) : null
  const practiceAvg = dashboard ? averageAccuracy(dashboard.practice.per_emotion) : null

  async function onExport() {
    if (!childId) return
    setExporting(true)
    setError(null)
    try {
      await downloadDashboardCsv(childId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not export CSV.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <main className="dashboard">
      <header className="dashboard__header">
        <div>
          <p className="dashboard__eyebrow">Admin progress view</p>
          <h1 className="dashboard__title">Student progress</h1>
          <p className="dashboard__lead">
            Review quiz and therapy accuracy for each student.
          </p>
        </div>
        <div className="dashboard__header-actions">
          {childId && (
            <Link to={`/admin/students/${childId}`} className="dashboard__back">
              Edit student
            </Link>
          )}
          <Link to="/admin" className="dashboard__back">
            ← All students
          </Link>
        </div>
      </header>

      <div className="dashboard__toolbar">
        <label className="dashboard__selector">
          <span>Student</span>
          <select
            value={childId ?? ''}
            onChange={(event) => setChildId(Number(event.target.value))}
            disabled={!children.length}
          >
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.display_name}
                {child.username ? ` (@${child.username})` : ''}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <p className="dashboard__selected">
            Viewing <strong>{selected.display_name}</strong>
          </p>
        )}
        <button
          type="button"
          className="dashboard__export"
          onClick={onExport}
          disabled={!childId || exporting}
        >
          {exporting ? 'Exporting…' : 'Export CSV'}
        </button>
      </div>

      {loading && <p className="dashboard__status">Loading dashboard…</p>}
      {error && (
        <p className="dashboard__error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && !children.length && (
        <div className="dashboard__empty">
          <p>No children yet.</p>
          <Link to="/admin">Create a child login</Link>
        </div>
      )}

      {dashboard && (
        <>
          <div className="dashboard__summary">
            <article>
              <strong>{quizAvg == null ? '—' : `${toPercent(quizAvg)}%`}</strong>
              <span>Quiz accuracy</span>
            </article>
            <article>
              <strong>{practiceAvg == null ? '—' : `${toPercent(practiceAvg)}%`}</strong>
              <span>Therapy accuracy</span>
            </article>
            <article>
              <strong>{dashboard.recent_attempts.length}</strong>
              <span>Recent attempts</span>
            </article>
            <article>
              <strong>{dashboard.session_trend.length}</strong>
              <span>Tracked sessions</span>
            </article>
          </div>

          <div className="dashboard__grid">
            <AccuracyBars title="Quiz by emotion" rows={dashboard.quiz.per_emotion} color="#1d6fd8" />
            <AccuracyBars
              title="Therapy by emotion"
              rows={dashboard.practice.per_emotion}
              color="#0ea5a4"
            />
          </div>

          <section className="dashboard__panel">
            <h2 className="dashboard__heading">Progress over time</h2>
            <div className="dashboard__chart">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendRows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#475569' }} />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(value) => `${value}%`}
                    tick={{ fill: '#475569' }}
                  />
                  <Tooltip formatter={(value) => (value == null ? '—' : `${value}%`)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="quiz"
                    name="Quiz"
                    stroke="#1d6fd8"
                    strokeWidth={2.5}
                    connectNulls
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="practice"
                    name="Therapy"
                    stroke="#0ea5a4"
                    strokeWidth={2.5}
                    connectNulls
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="dashboard__panel">
            <h2 className="dashboard__heading">Recent attempts</h2>
            {dashboard.recent_attempts.length === 0 ? (
              <p className="dashboard__status">No scored attempts yet.</p>
            ) : (
              <div className="dashboard__table-wrap">
                <table className="dashboard__table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Emotion</th>
                      <th>Activity</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.recent_attempts.map((attempt) => (
                      <tr key={attempt.id}>
                        <td>{new Date(attempt.timestamp).toLocaleString()}</td>
                        <td>{getEmotionLabel(attempt.emotion)}</td>
                        <td>{sourceLabel(attempt.source)}</td>
                        <td>
                          <span className={attempt.correct ? 'pill pill--ok' : 'pill pill--bad'}>
                            {attempt.correct ? 'Correct' : 'Incorrect'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
