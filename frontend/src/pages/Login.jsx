import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import heroImage from '../assets/landing-hero.jpg'
import './Login.css'

const ROLE_COPY = {
  child: {
    title: 'Child login',
    hint: 'Use the username and password your admin created for you.',
    cta: 'Sign in as child',
    placeholder: 'child username',
  },
  admin: {
    title: 'Admin login',
    hint: 'Default admin: admin / admin123',
    cta: 'Sign in as admin',
    placeholder: 'admin',
  },
}

export default function Login() {
  const navigate = useNavigate()
  const [roleTab, setRoleTab] = useState('child')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const copy = ROLE_COPY[roleTab]

  async function onSubmit(event) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const session = await login(username.trim(), password)
      if (session.role === 'admin') {
        navigate('/admin', { replace: true })
      } else {
        navigate('/child', { replace: true })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <Link to="/" className="login-close" aria-label="Close and go to landing page">
          ×
        </Link>

        <aside className="login-aside" aria-label="ASD Emotion">
          <img
            className="login-aside__image"
            src={heroImage}
            alt=""
            role="presentation"
          />
          <div className="login-aside__shade" aria-hidden="true" />
          <div className="login-aside__logo">
            <span className="login-aside__mark">AE</span>
            <strong>ASD Emotion</strong>
          </div>
        </aside>

        <div className="login-card">
          <div className="login-card__head">
            <h1>{copy.title}</h1>
            <p>Choose Child or Admin, then enter your details.</p>
          </div>

          <div className="login-tabs" role="tablist" aria-label="Login type">
            <button
              type="button"
              role="tab"
              aria-selected={roleTab === 'child'}
              className={roleTab === 'child' ? 'is-active' : undefined}
              onClick={() => {
                setRoleTab('child')
                if (username === 'admin') setUsername('')
              }}
            >
              Child
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={roleTab === 'admin'}
              className={roleTab === 'admin' ? 'is-active' : undefined}
              onClick={() => {
                setRoleTab('admin')
                setUsername('admin')
              }}
            >
              Admin
            </button>
          </div>

          <form className="login-form" onSubmit={onSubmit}>
            <label>
              Username
              <input
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                placeholder={copy.placeholder}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                required
              />
            </label>
            {error && (
              <p className="login-form__error" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Signing in…' : copy.cta}
            </button>
          </form>

          <p className="login-card__hint">{copy.hint}</p>
        </div>
      </div>
    </div>
  )
}
