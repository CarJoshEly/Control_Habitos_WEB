import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import AIAssistant from './pages/AIAssistant'
import HabitProgress from './pages/HabitProgress'
import HabitHistory from './pages/HabitHistory'

function ProtectedRoute({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/" />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/ai" element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
        <Route path="/habits/:id/progress" element={<ProtectedRoute><HabitProgress /></ProtectedRoute>} />
        <Route path="/habits/:id/history" element={<ProtectedRoute><HabitHistory /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App