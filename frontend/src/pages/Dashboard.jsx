import { useEffect, useMemo, useState } from 'react'
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

import { getChildren, getDashboard, getStoredChildId } from '../api/tracking'
import { getEmotionLabel } from '../constants/emotions'
import './Dashboard.css'

function toPercent(value) {
  if (value == null) {
    return 0
  }
  return Math.round(value * 100)
}

function sourceLabel(source) {
  if (source === 'show_me') {
    return 'Practice'
  }
  if (source === 'quiz') {
    return 'Quiz'
  }
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

function AccuracyBars({ title, rows }) {
  return (
    <section className="dashboard__panel">
      <h2 className="dashboard__heading">{title}</h2>
      <div className="dashboard__chart">
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartRows(rows)} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="emotion" tick={{ fontSize: 12 }} />
            <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
            <Tooltip
              formatter={(value, _name, item) => [
                `${value}% (${item.payload.correct}/${item.payload.total})`,
                'Accuracy',
              ]}
            />
            <Bar dataKey="accuracy" fill="#2563eb" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

export default function Dashboard() {
  const [children, setChildren] = useState([])
  const [childId, setChildId] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadChildren() {
      try {
        const list = await getChildren()
        if (cancelled) {
          return
        }
        setChildren(list)
        const stored = Number(getStoredChildId())
        const fallback = list[0]?.id ?? null
        const initial = list.some((child) => child.id === stored) ? stored : fallback
        setChildId(initial)
        setError(null)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load children.')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadChildren()
    return () => {
      cancelled = true
    }
  }, [])

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
    if (!dashboard) {
      return []
    }
    return dashboard.daily_trend.map((point) => ({
      date: point.date,
      quiz: point.quiz_accuracy == null ? null : toPercent(point.quiz_accuracy),
      practice: point.practice_accuracy == null ? null : toPercent(point.practice_accuracy),
    }))
  }, [dashboard])

  return (
    <main className="dashboard">
      <h1 className="dashboard__title">Progress dashboard</h1>

      <label className="dashboard__selector">
        <span>Child</span>
        <select
          value={childId ?? ''}
          onChange={(event) => setChildId(Number(event.target.value))}
          disabled={!children.length}
        >
          {children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.display_name} (#{child.id})
            </option>
          ))}
        </select>
      </label>

      {loading && <p className="dashboard__status">Loading dashboard…</p>}
      {error && (
        <p className="dashboard__error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && !children.length && (
        <p className="dashboard__status">No children yet. Play a quiz first.</p>
      )}

      {dashboard && (
        <>
          <div className="dashboard__grid">
            <AccuracyBars title="Quiz results" rows={dashboard.quiz.per_emotion} />
            <AccuracyBars title="Practice (Show me) results" rows={dashboard.practice.per_emotion} />
          </div>

          <section className="dashboard__panel">
            <h2 className="dashboard__heading">Progress over time</h2>
            <div className="dashboard__chart">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendRows} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <Tooltip formatter={(value) => (value == null ? '—' : `${value}%`)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="quiz"
                    name="Quiz"
                    stroke="#2563eb"
                    strokeWidth={2}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="practice"
                    name="Practice"
                    stroke="#059669"
                    strokeWidth={2}
                    connectNulls
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
              <table className="dashboard__table">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Emotion</th>
                    <th>Source</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recent_attempts.map((attempt) => (
                    <tr key={attempt.id}>
                      <td>{new Date(attempt.timestamp).toLocaleString()}</td>
                      <td>{getEmotionLabel(attempt.emotion)}</td>
                      <td>{sourceLabel(attempt.source)}</td>
                      <td>{attempt.correct ? 'Correct' : 'Incorrect'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </main>
  )
}
