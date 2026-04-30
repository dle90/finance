import React from 'react'
import { fmtVnd, fmtPct } from '../utils/format'

export function Kpi({ label, value, sub, tone = 'neutral', icon, trend }) {
  const toneClass = {
    neutral:  'text-gray-800',
    positive: 'text-emerald-700',
    negative: 'text-red-700',
    warning:  'text-amber-700',
    info:     'text-blue-700',
  }[tone] || 'text-gray-800'

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
          <div className={`text-2xl font-bold mt-1 ${toneClass} truncate`}>{value}</div>
          {sub && <div className="text-xs text-gray-500 mt-1 truncate">{sub}</div>}
          {trend && (
            <div className={`text-xs mt-1 ${trend.dir === 'up' ? 'text-emerald-600' : trend.dir === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
              {trend.dir === 'up' ? '▲' : trend.dir === 'down' ? '▼' : '·'} {fmtPct(trend.pct ?? 0)} so với kỳ trước
            </div>
          )}
        </div>
        {icon && <div className="text-2xl opacity-50">{icon}</div>}
      </div>
    </div>
  )
}

export function MoneyKpi({ label, value, sub, tone, icon, trend }) {
  return <Kpi label={label} value={fmtVnd(value)} sub={sub} tone={tone} icon={icon} trend={trend} />
}
