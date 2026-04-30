import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import DashboardFinance from './pages/DashboardFinance'

function AuthenticatedRoutes() {
  const { auth } = useAuth()
  if (!auth) return <Login />

  return (
    <Routes>
      <Route path="*" element={
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardFinance />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Layout>
      } />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedRoutes />
    </AuthProvider>
  )
}
