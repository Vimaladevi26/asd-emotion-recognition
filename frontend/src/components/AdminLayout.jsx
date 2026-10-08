import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { clearSession, getSession, logout } from '../api/auth'
import './AdminLayout.css'

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const session = getSession()
  const studentsActive =
    location.pathname === '/admin' || location.pathname.startsWith('/admin/students')

  async function onLogout() {
    await logout()
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar" aria-label="Admin navigation">
        <div className="admin-sidebar__brand">
          <span className="admin-sidebar__mark">AE</span>
          <div>
            <strong>ASD Emotion</strong>
            <small>Admin console</small>
          </div>
        </div>

        <p className="admin-sidebar__hello">{session?.display_name || 'Admin'}</p>

        <nav className="admin-sidebar__nav">
          <NavLink
            to="/admin"
            end
            className={() => `admin-sidebar__link${studentsActive ? ' active' : ''}`}
          >
            Students
          </NavLink>
          <NavLink to="/dashboard" className="admin-sidebar__link">
            Progress
          </NavLink>
        </nav>

        <button type="button" className="admin-sidebar__logout" onClick={onLogout}>
          Log out
        </button>
      </aside>

      <div className="admin-shell__main">
        <Outlet />
      </div>
    </div>
  )
}
