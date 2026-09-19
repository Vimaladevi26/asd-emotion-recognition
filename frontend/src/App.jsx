import { useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import Dashboard from './pages/Dashboard.jsx'
import PracticeSession from './pages/PracticeSession.jsx'
import QuizSession from './pages/QuizSession.jsx'
import './App.css'

const ROLE_KEY = 'role'

function readRole() {
  return localStorage.getItem(ROLE_KEY) === 'therapist' ? 'therapist' : 'child'
}

function App() {
  const [role, setRole] = useState(readRole)
  const navigate = useNavigate()
  const location = useLocation()
  const isTherapist = role === 'therapist'

  function toggleRole() {
    const next = isTherapist ? 'child' : 'therapist'
    localStorage.setItem(ROLE_KEY, next)
    setRole(next)
    if (next === 'child' && location.pathname.startsWith('/dashboard')) {
      navigate('/', { replace: true })
    }
  }

  return (
    <>
      <nav className="app-nav" aria-label="Practice modes">
        <NavLink to="/" className="app-nav__link" end>
          Quiz
        </NavLink>
        <NavLink to="/practice" className="app-nav__link">
          Practice
        </NavLink>
        {isTherapist && (
          <NavLink to="/dashboard" className="app-nav__link">
            Dashboard
          </NavLink>
        )}
        <button
          type="button"
          className={`app-nav__role${isTherapist ? ' app-nav__role--on' : ''}`}
          onClick={toggleRole}
          aria-pressed={isTherapist}
        >
          Therapist Mode
        </button>
      </nav>
      <Routes>
        <Route path="/" element={<QuizSession />} />
        <Route path="/practice" element={<PracticeSession />} />
        <Route
          path="/dashboard"
          element={isTherapist ? <Dashboard /> : <Navigate to="/" replace />}
        />
      </Routes>
    </>
  )
}

export default App
