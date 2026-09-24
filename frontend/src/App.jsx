import { useState } from 'react'
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'

import Dashboard from './pages/Dashboard.jsx'
import Landing from './pages/Landing.jsx'
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
  const isLanding = location.pathname === '/'

  function toggleRole() {
    const next = isTherapist ? 'child' : 'therapist'
    localStorage.setItem(ROLE_KEY, next)
    setRole(next)
    if (next === 'child' && location.pathname.startsWith('/dashboard')) {
      navigate('/quiz', { replace: true })
    }
  }

  return (
    <>
      {!isLanding && (
        <nav className="app-nav" aria-label="App navigation">
          <NavLink to="/" className="app-nav__brand">
            ASD Emotion
          </NavLink>
          <div className="app-nav__links">
            <NavLink to="/quiz" className="app-nav__link">
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
          </div>
        </nav>
      )}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/quiz" element={<QuizSession />} />
        <Route path="/practice" element={<PracticeSession />} />
        <Route
          path="/dashboard"
          element={isTherapist ? <Dashboard /> : <Navigate to="/quiz" replace />}
        />
      </Routes>
    </>
  )
}

export default App
