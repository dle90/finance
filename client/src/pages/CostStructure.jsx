import React, { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getCostStructure } from '../api'
import { useCompany } from '../context/CompanyContext'
import { fmtVnd, fmtPct, fmtPctRaw, periodLabel, variance } from '../utils/format'
import PeriodPicker from '../components/PeriodPicker'

export default function CostStructure() {
  const { current } = useCompany()
  const [period, setPeriod] = useState('mtd')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const periodKey = typeof period === 'string' ? period : `${period?.from}~${period?.to}`
  useEffect(() => {
    if (!current?.id) return
    setLoading(true)
    getCostStructure(current.id, period)
      .then(setData)
      .finally(() => setLoading(false))
  }, [current?.id, periodKey])

  if (!current) return <div className="text-gray-500">Đang tải…</div>
  if (loading || !data) return <div className="text-gray-500">Đang tải cơ cấu chi phí…</div>

  const { buckets, current: cur, prior, trend, thresholds } = data
  const totalCost = cur.totalOpex || 1

  const rows = buckets.map(b => {
    const value = cur.buckets[b.key] || 0
    const sharePct = (value / totalCost) * 100
    const pctOfRev = cur.revenue ? (value / cur.revenue) * 100 : 0
    const priorValue = prior?.buckets?.[b.key] ?? null
    const v = variance(value, priorValue)
    const limit = thresholds?.[b.key]?.maxPctOfRevenue ?? null
    const overLimit = limit != null && pctOfRev > limit
    return { ...b, value, sharePct, pctOfRev, priorValue, variance: v, limit, overLimit }
  })

  const pieData = rows.map(r => ({ name: r.label, value: r.value, color: r.color }))

  const trendData = trend.map(t => ({
    monthLabel: 'T' + t.month,
    ...Object.fromEntries(buckets.map(b => [b.key, t[b.key] || 0])),
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{current.name} — Cơ cấu chi phí</h1>
          <div className="text-xs text-gray-500 mt-0.5">
            {periodLabel(period)} · Tổng chi phí {fmtVnd(cur.totalOpex)} · Doanh thu {fmtVnd(cur.revenue)}
          </div>
        </div>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Tỷ trọng chi phí</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label={(e) => `${e.name} ${(e.percent * 100).toFixed(0)}%`}>
                  {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtVnd(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">% Doanh thu vs Định mức</h3>
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={rows} layout="vertical" margin={{ left: 80 }}>
                <XAxis type="number" stroke="#9ca3af" fontSize={11} tickFormatter={(v) => v + '%'} />
                <YAxis type="category" dataKey="label" stroke="#9ca3af" fontSize={11} width={110} />
                <Tooltip formatter={(v, n) => [fmtPctRaw(v), n]} />
                <Bar dataKey="pctOfRev" name="% Doanh thu">
                  {rows.map((r, i) => <Cell key={i} fill={r.overLimit ? '#ef4444' : r.color} />)}
                </Bar>
                <Bar dataKey="limit" name="Định mức" fill="#cbd5e1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Chi tiết theo nhóm</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Nhóm chi phí</th>
                <th className="px-4 py-2 text-right">Giá trị</th>
                <th className="px-4 py-2 text-right">% Tổng CP</th>
                <th className="px-4 py-2 text-right">% Doanh thu</th>
                <th className="px-4 py-2 text-right">Định mức</th>
                <th className="px-4 py-2 text-right">vs Kỳ trước</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.key} className="border-t border-gray-100">
                  <td className="px-4 py-2">
                    <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: r.color }} />
                    {r.label}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">{fmtVnd(r.value)}</td>
                  <td className="px-4 py-2 text-right">{fmtPctRaw(r.sharePct)}</td>
                  <td className={`px-4 py-2 text-right ${r.overLimit ? 'text-red-600 font-semibold' : ''}`}>
                    {fmtPctRaw(r.pctOfRev)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {r.limit != null ? `≤ ${r.limit}%` : '—'}
                  </td>
                  <td className={`px-4 py-2 text-right ${r.variance.dir === 'up' ? 'text-red-600' : r.variance.dir === 'down' ? 'text-emerald-600' : 'text-gray-500'}`}>
                    {r.variance.pct != null ? `${r.variance.dir === 'up' ? '▲' : r.variance.dir === 'down' ? '▼' : ''} ${fmtPct(Math.abs(r.variance.pct))}` : '—'}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-gray-200 bg-gray-50 font-semibold">
                <td className="px-4 py-2">Tổng</td>
                <td className="px-4 py-2 text-right">{fmtVnd(cur.totalOpex)}</td>
                <td className="px-4 py-2 text-right">100%</td>
                <td className="px-4 py-2 text-right">
                  {fmtPctRaw(cur.revenue ? (cur.totalOpex / cur.revenue) * 100 : 0)}
                </td>
                <td className="px-4 py-2 text-right">—</td>
                <td className="px-4 py-2 text-right">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Xu hướng 6 tháng gần nhất</h3>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <LineChart data={trendData}>
              <XAxis dataKey="monthLabel" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={fmtVnd} />
              <Tooltip formatter={(v) => fmtVnd(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {buckets.map(b => (
                <Line key={b.key} type="monotone" dataKey={b.key} name={b.label} stroke={b.color} strokeWidth={1.8} dot={{ r: 2 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
