import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { isAdmin } from '../api/auth'
import { deleteChild, getChild, updateChild } from '../api/tracking'
import './AdminPanel.css'

export default function AdminStudentDetail() {
  const allowed = isAdmin()
  const navigate = useNavigate()
  const { studentId } = useParams()
  const id = Number(studentId)

  const [student, setStudent] = useState(null)
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    if (!allowed || !id) {
      setLoading(false)
      return undefined
    }

    let cancelled = false

    async function load() {
      try {
        const data = await getChild(id)
        if (!cancelled) {
          setStudent(data)
          setDisplayName(data.display_name)
          setPassword(data.password || '')
          setIsActive(Boolean(data.is_active))
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load student.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [allowed, id])

  if (!allowed) {
    return <Navigate to="/login" replace />
  }

  async function onSave(event) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setNotice(null)
    try {
      const payload = {
        display_name: displayName.trim(),
        is_active: isActive,
      }
      if (password.trim()) {
        payload.password = password.trim()
      }
      const updated = await updateChild(id, payload)
      setStudent(updated)
      setDisplayName(updated.display_name)
      setPassword(updated.password || password.trim())
      setIsActive(Boolean(updated.is_active))
      setNotice('Student updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save student.')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!student) return
    const ok = window.confirm(
      `Delete ${student.display_name}? This permanently removes their login, sessions, and attempts.`,
    )
    if (!ok) return

    setSaving(true)
    setError(null)
    try {
      await deleteChild(id)
      navigate('/admin', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete student.')
      setSaving(false)
    }
  }

  return (
    <main className="admin-panel">
      <header className="admin-panel__header">
        <div>
          <p className="admin-panel__eyebrow">Student profile</p>
          <h1>{student?.display_name || 'Student'}</h1>
          <p>View login details, edit the student, or delete the account.</p>
        </div>
        <Link to="/admin" className="admin-btn admin-btn--ghost">
          ← Back to students
        </Link>
      </header>

      {loading && <p className="admin-panel__muted">Loading student…</p>}

      {!loading && error && !student && (
        <section className="admin-panel__empty">
          <h2>Student not found</h2>
          <p>{error}</p>
          <Link to="/admin" className="admin-btn admin-btn--primary">
            Back to students
          </Link>
        </section>
      )}

      {student && (
        <section className="admin-panel__card">
          <div className="admin-panel__meta-row">
            <div>
              <p className="admin-panel__username">@{student.username || '—'}</p>
              <p>
                {student.session_count} sessions · {student.attempt_count} attempts
              </p>
            </div>
            <p className={isActive ? 'status-ok' : 'status-bad'}>
              {isActive ? 'Active' : 'Archived'}
            </p>
          </div>

          <form className="admin-panel__form" onSubmit={onSave}>
            <div className="admin-panel__form-grid">
              <label>
                Display name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  required
                />
              </label>

              <label>
                Username
                <input value={student.username || ''} readOnly />
              </label>

              <label className="admin-panel__span-2">
                Password
                <input
                  type="text"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={
                    student.password
                      ? undefined
                      : 'Not saved yet — enter a password and save'
                  }
                  minLength={4}
                  required
                />
              </label>
            </div>

            <label className="admin-panel__check admin-panel__check--block">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
              />
              Account active (uncheck to archive)
            </label>

            {!student.password && (
              <p className="admin-panel__hint">
                Older students may not have a saved password yet. Enter one here and
                save to store it for admin view.
              </p>
            )}

            {notice && <p className="admin-panel__ok">{notice}</p>}
            {error && (
              <p className="admin-panel__error" role="alert">
                {error}
              </p>
            )}

            <div className="admin-panel__actions">
              <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              <Link className="admin-btn admin-btn--ghost" to={`/dashboard?child=${student.id}`}>
                View progress
              </Link>
              <button
                type="button"
                className="admin-btn admin-btn--danger"
                onClick={onDelete}
                disabled={saving}
              >
                Delete student
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  )
}
