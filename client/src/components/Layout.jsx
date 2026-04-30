import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { logoutUser } from '../api'
import { REPORT_GROUPS } from '../config/reportGroups'

const TOP_NAV = [
  { path: '/dashboard', label: 'Tổng quan', icon: '📊' },
]

export default function Layout({ children }) {
  const { auth, setAuth } = useAuth()

  const handleLogout = async () => {
    try { await logoutUser() } catch {}
    setAuth(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-4 py-4 border-b border-gray-200">
          <div className="text-lg font-bold text-blue-600">Finance</div>
          <div className="text-xs text-gray-500 mt-0.5">Misa dashboard</div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 text-sm">
          {TOP_NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2 rounded-lg ${
                  isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

          {REPORT_GROUPS.map(group => (
            <div key={group.key} className="mt-4">
              <div className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {group.label}
              </div>
              <div className="mt-1">
                {group.items.map(item => (
                  <NavLink
                    key={item.key}
                    to={`/reports/${item.key}`}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg ${
                        isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-gray-200 px-4 py-3 text-sm">
          <div className="text-gray-700 font-medium">{auth?.fullName || auth?.username}</div>
          <div className="text-xs text-gray-500">{auth?.role}</div>
          <button
            onClick={handleLogout}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
