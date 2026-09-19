import { NavLink, Route, Routes } from 'react-router-dom'

import PracticeSession from './pages/PracticeSession.jsx'
import QuizSession from './pages/QuizSession.jsx'
import Dashboard from './pages/Dashboard.jsx'
import './App.css'

function App() {
  return (
    <>
      <nav className="app-nav" aria-label="Practice modes">
        <NavLink to="/" className="app-nav__link" end>
          Quiz
        </NavLink>
        <NavLink to="/practice" className="app-nav__link">
          Practice
        </NavLink>
        <NavLink to="/dashboard" className="app-nav__link">
          Dashboard
        </NavLink>
      </nav>
      <Routes>
        <Route path="/" element={<QuizSession />} />
        <Route path="/practice" element={<PracticeSession />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </>
  )
}

export default App
