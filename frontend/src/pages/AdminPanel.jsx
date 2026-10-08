import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { getSession, isAdmin } from '../api/auth'
import { getChildren } from '../api/tracking'
import './AdminPanel.css'

export default function AdminPanel() {
  const session = getSession()
  const allowed = isAdmin()
  const [children, setChildren] = useState([])
  const [showInactive, setShowInactive] = useState(false)
  const [query, setQuery] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!allowed) {
      setLoading(false)
      return undefined
    }

    let cancelled = false

    async function load() {
      try {
        const list = await getChildren(showInactive)
        if (!cancelled) {
          setChildren(list)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load students.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [allowed, showInactive])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return children
    return children.filter((child) => {
      const hay = `${child.display_name} ${child.username || ''}`.toLowerCase()
      return hay.includes(needle)
    })
  }, [children, query])

  if (!allowed) {
    return <Navigate to="/login" replace />
  }

  return (
    <main className="admin-panel">
      <header className="admin-panel__header">
        <div>
          <p className="admin-panel__eyebrow">Student management</p>
          <h1>Students</h1>
          <p>Open a student card to view, edit, or delete their account.</p>
        </div>
        <div className="admin-panel__header-actions">
          <p className="admin-panel__signed">Signed in as {session?.display_name || 'Admin'}</p>
          <Link to="/admin/students/new" className="admin-btn admin-btn--primary">
            + Add student
          </Link>
        </div>
      </header>

      <div className="admin-panel__toolbar">
        <input
          className="admin-panel__search"
          type="search"
          placeholder="Search by name or username"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <label className="admin-panel__check">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) => setShowInactive(event.target.checked)}
          />
          Show archived
        </label>
      </div>

      {error && (
        <p className="admin-panel__error" role="alert">
          {error}
        </p>
      )}

      {loading && <p className="admin-panel__muted">Loading students…</p>}

      {!loading && filtered.length === 0 && (
        <section className="admin-panel__empty">
          <h2>No students yet</h2>
          <p>Create a student login to get started.</p>
          <Link to="/admin/students/new" className="admin-btn admin-btn--primary">
            + Add student
          </Link>
        </section>
      )}

      <div className="student-list">
        {filtered.map((child) => {
          const initial = (child.display_name || '?').trim().charAt(0).toUpperCase()
          return (
            <Link
              key={child.id}
              to={`/admin/students/${child.id}`}
              className={`student-row${child.is_active ? '' : ' student-row--archived'}`}
            >
              <div className="student-row__avatar" aria-hidden="true">
                {initial}
              </div>
              <div className="student-row__main">
                <h2>{child.display_name}</h2>
                <p>@{child.username || '—'}</p>
              </div>
              <div className="student-row__meta">
                <span>{child.session_count} sessions</span>
                <span>{child.attempt_count} attempts</span>
                <span className={child.is_active ? 'ok' : 'bad'}>
                  {child.is_active ? 'Active' : 'Archived'}
                </span>
              </div>
              <span className="student-row__cta">View →</span>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
