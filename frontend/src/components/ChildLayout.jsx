import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearSession, getSession, logout } from '../api/auth'
import './ChildLayout.css'

export default function ChildLayout() {
  const navigate = useNavigate()
  const session = getSession()
  const firstName = (session?.display_name || 'friend').split(' ')[0]

  async function onLogout() {
    await logout()
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="child-shell">
      <aside className="child-sidebar" aria-label="Child navigation">
        <div className="child-sidebar__brand">
          <span className="child-sidebar__mark">AE</span>
          <div>
            <strong>ASD Emotion</strong>
            <small>Practice space</small>
          </div>
        </div>

        <p className="child-sidebar__hello">Hi, {firstName}</p>

        <nav className="child-sidebar__nav">
          <NavLink to="/child" end className="child-sidebar__link">
            <span className="child-sidebar__icon" aria-hidden="true">
              ▣
            </span>
            My dashboard
          </NavLink>
          <NavLink to="/quiz" className="child-sidebar__link">
            <span className="child-sidebar__icon" aria-hidden="true">
              ?
            </span>
            Emotion Quiz
          </NavLink>
          <NavLink to="/practice" className="child-sidebar__link">
            <span className="child-sidebar__icon" aria-hidden="true">
              ◉
            </span>
            Therapy Session
          </NavLink>
        </nav>

        <button type="button" className="child-sidebar__logout" onClick={onLogout}>
          Log out
        </button>
      </aside>

      <div className="child-shell__main">
        <Outlet />
      </div>
    </div>
  )
}
