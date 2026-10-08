import { Navigate, Route, Routes } from 'react-router-dom'

import { getSession } from './api/auth'
import AdminLayout from './components/AdminLayout.jsx'
import ChildLayout from './components/ChildLayout.jsx'
import AdminPanel from './pages/AdminPanel.jsx'
import AdminStudentCreate from './pages/AdminStudentCreate.jsx'
import AdminStudentDetail from './pages/AdminStudentDetail.jsx'
import ChildHome from './pages/ChildHome.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import Marketing from './pages/Marketing.jsx'
import PracticeSession from './pages/PracticeSession.jsx'
import QuizSession from './pages/QuizSession.jsx'
import './App.css'

function RequireAuth({ role, children }) {
  const session = getSession()
  if (!session) {
    return <Navigate to="/login" replace />
  }
  if (role && session.role !== role) {
    return <Navigate to={session.role === 'admin' ? '/admin' : '/child'} replace />
  }
  return children
}

function App() {
  return (
    <Routes>
      <Route element={<Marketing />}>
        <Route path="/" />
        <Route path="/features" />
        <Route path="/product" />
        <Route path="/how-it-works" />
      </Route>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth role="admin">
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/admin/students/new" element={<AdminStudentCreate />} />
        <Route path="/admin/students/:studentId" element={<AdminStudentDetail />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
      <Route
        element={
          <RequireAuth role="child">
            <ChildLayout />
          </RequireAuth>
        }
      >
        <Route path="/child" element={<ChildHome />} />
        <Route path="/quiz" element={<QuizSession />} />
        <Route path="/practice" element={<PracticeSession />} />
      </Route>
    </Routes>
  )
}

export default App
