import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { isAdmin } from '../api/auth'
import { postChild } from '../api/tracking'
import './AdminPanel.css'

export default function AdminStudentCreate() {
  const allowed = isAdmin()
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  if (!allowed) {
    return <Navigate to="/login" replace />
  }

  async function onSubmit(event) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      const created = await postChild(displayName.trim(), username.trim(), password)
      navigate(`/admin/students/${created.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create student.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="admin-panel">
      <header className="admin-panel__header">
        <div>
          <p className="admin-panel__eyebrow">New student</p>
          <h1>Add student</h1>
          <p>Create a login the child can use for quiz and therapy practice.</p>
        </div>
        <Link to="/admin" className="admin-btn admin-btn--ghost">
          ← Back to students
        </Link>
      </header>

      <section className="admin-panel__card">
        <form className="admin-panel__form" onSubmit={onSubmit}>
          <div className="admin-panel__form-grid">
            <label>
              Display name
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="e.g. Asha"
                required
              />
            </label>
            <label>
              Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="e.g. asha01"
                required
                minLength={3}
              />
            </label>
            <label className="admin-panel__span-2">
              Password
              <input
                type="text"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Visible to admin after create"
                required
                minLength={4}
              />
            </label>
          </div>

          {error && (
            <p className="admin-panel__error" role="alert">
              {error}
            </p>
          )}

          <div className="admin-panel__actions">
            <button type="submit" className="admin-btn admin-btn--primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create student'}
            </button>
            <Link to="/admin" className="admin-btn admin-btn--ghost">
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </main>
  )
}
