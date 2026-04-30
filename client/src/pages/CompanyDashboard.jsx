import React, { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getCompanySummary } from '../api'
import { useCompany } from '../context/CompanyContext'
import { fmtVnd, fmtPct, PERIOD_LABELS } from '../utils/format'
import { MoneyKpi, Kpi } from '../components/Kpi'
import PeriodPicker from '../components/PeriodPicker'

const MONTH_LABEL = (m) => 'T' + m

export default function CompanyDashboard() {
  const { current } = useCompany()
  const [period, setPeriod] = useState('mtd')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!current?.id) return
    setLoading(true)
    getCompanySummary(current.id, period)
      .then(setData)
      .finally(() => setLoading(false))
  }, [current?.id, period])

  if (!current) return <div className="text-gray-500">Đang tải danh sách công ty…</div>
  if (loading || !data) return <div className="text-gray-500">Đang tải {current.name}…</div>

  const { summary, arap, alerts, trend } = data
  const trendData = trend.map(t => ({ ...t, monthLabel: MONTH_LABEL(t.month) }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{current.name}</h1>
          <div className="text-xs text-gray-500 mt-0.5">
            {PERIOD_LABELS[period]} · MST {current.taxCode}
          </div>
        </div>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      {alerts.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <div className="text-sm font-semibold text-red-700 mb-1">Cảnh báo ({alerts.length})</div>
          <ul className="text-sm text-red-700 space-y-0.5">
            {alerts.slice(0, 5).map((a, i) => (
              <li key={i}>• {a.message}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MoneyKpi label="Doanh thu" value={summary.revenue} tone="info" icon="💰" />
        <MoneyKpi
          label="Lợi nhuận gộp"
          value={summary.grossProfit}
          sub={`Biên ${fmtPct(summary.grossMargin)}`}
          tone={summary.grossProfit >= 0 ? 'positive' : 'negative'}
        />
        <MoneyKpi
          label="LN vận hành"
          value={summary.operatingProfit}
          sub={`Biên ${fmtPct(summary.opMargin)}`}
          tone={summary.operatingProfit >= 0 ? 'positive' : 'negative'}
          icon="📈"
        />
        <MoneyKpi
          label="LN sau thuế"
          value={summary.netProfit}
          sub={`Biên ${fmtPct(summary.netMargin)}`}
          tone={summary.netProfit >= 0 ? 'positive' : 'negative'}
          icon="🏦"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MoneyKpi label="Tổng chi phí" value={summary.cogs + summary.totalOpex} tone="warning" />
        <MoneyKpi label="Phải thu" value={arap.receivables} icon="📥" />
        <MoneyKpi label="Phải trả" value={arap.payables} icon="📤" />
        <MoneyKpi label="Dòng tiền" value={summary.cashflow} tone={summary.cashflow >= 0 ? 'positive' : 'negative'} icon="💵" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Doanh thu & Lợi nhuận theo tháng</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <LineChart data={trendData}>
                <XAxis dataKey="monthLabel" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={fmtVnd} />
                <Tooltip formatter={(v) => fmtVnd(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Doanh thu" dot={{ r: 2 }} />
                <Line type="monotone" dataKey="operatingProfit" stroke="#10b981" strokeWidth={2} name="LN vận hành" dot={{ r: 2 }} />
                <Line type="monotone" dataKey="netProfit" stroke="#8b5cf6" strokeWidth={2} name="LN sau thuế" dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Dòng tiền theo tháng</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
              <BarChart data={trendData}>
                <XAxis dataKey="monthLabel" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={fmtVnd} />
                <Tooltip formatter={(v) => fmtVnd(v)} />
                <Bar dataKey="cashflow" name="Dòng tiền" fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
