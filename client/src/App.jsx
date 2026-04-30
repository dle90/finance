import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CompanyProvider } from './context/CompanyContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import GroupDashboard from './pages/GroupDashboard'
import CompanyDashboard from './pages/CompanyDashboard'
import CostStructure from './pages/CostStructure'
import Pnl from './pages/Pnl'
import Thresholds from './pages/Thresholds'
import Alerts from './pages/Alerts'
import Import from './pages/Import'

function AuthenticatedRoutes() {
  const { auth } = useAuth()
  if (!auth) return <Login />

  return (
    <CompanyProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/group" replace />} />
          <Route path="/group" element={<GroupDashboard />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/company" element={<CompanyDashboard />} />
          <Route path="/company/pnl" element={<Pnl />} />
          <Route path="/company/costs" element={<CostStructure />} />
          <Route path="/company/import" element={<Import />} />
          <Route path="/company/thresholds" element={<Thresholds />} />
          <Route path="*" element={<Navigate to="/group" replace />} />
        </Routes>
      </Layout>
    </CompanyProvider>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedRoutes />
    </AuthProvider>
  )
}
