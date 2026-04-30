import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logoutUser, triggerSync } from '../api'
import { NAV } from '../config/reportGroups'
import CompanyPicker from './CompanyPicker'

export default function Layout({ children }) {
  const { auth, logout } = useAuth()
  const [syncing, setSyncing] = React.useState(false)
  const [lastSync, setLastSync] = React.useState(null)

  const handleLogout = async () => {
    try { await logoutUser() } catch {}
    logout()
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const r = await triggerSync()
      setLastSync(new Date(r.asOf || Date.now()))
      // Trigger a soft refresh of any visible page by reloading.
      window.location.reload()
    } catch (e) {
      alert('Đồng bộ thất bại: ' + (e.response?.data?.error || e.message))
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-60 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="text-lg font-bold text-blue-700">Trung tâm Tài chính</div>
          <div className="text-xs text-gray-500 mt-0.5">Báo cáo quản trị · MISA</div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 text-sm">
          {NAV.map(group => (
            <div key={group.label} className="mt-2">
              <div className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                {group.label}
              </div>
              {group.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/group' || item.path === '/company'}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg ${
                      isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <span className="w-5">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-200 px-4 py-3 text-sm">
          <div className="text-gray-700 font-medium truncate">{auth?.displayName || auth?.username}</div>
          <div className="text-xs text-gray-500">{auth?.role}</div>
          <button onClick={handleLogout} className="mt-2 text-xs text-blue-600 hover:underline">
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto flex flex-col">
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Công ty:</span>
            <CompanyPicker />
          </div>
          <div className="flex items-center gap-2">
            {lastSync && <span className="text-xs text-gray-500">Đồng bộ: {lastSync.toLocaleTimeString('vi-VN')}</span>}
            <button
              onClick={handleSync}
              disabled={syncing || auth?.role !== 'admin'}
              title={auth?.role !== 'admin' ? 'Chỉ admin mới có quyền đồng bộ' : 'Đồng bộ dữ liệu MISA'}
              className="text-xs px-3 py-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              {syncing ? 'Đang đồng bộ…' : '↻ Đồng bộ MISA'}
            </button>
          </div>
        </header>
        <div className="flex-1 px-6 py-5">
          {children}
        </div>
      </main>
    </div>
  )
}
