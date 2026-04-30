import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { getGroupSummary } from '../api'
import { fmtVnd, fmtPct, PERIOD_LABELS } from '../utils/format'
import { Kpi, MoneyKpi } from '../components/Kpi'
import StatusPill from '../components/StatusPill'
import PeriodPicker from '../components/PeriodPicker'
import { useCompany } from '../context/CompanyContext'

export default function GroupDashboard() {
  const [period, setPeriod] = useState('mtd')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { switchCompany } = useCompany()

  useEffect(() => {
    setLoading(true)
    getGroupSummary(period)
      .then(setData)
      .finally(() => setLoading(false))
  }, [period])

  if (loading) return <div className="text-gray-500">Đang tải dữ liệu tập đoàn…</div>
  if (!data) return <div className="text-red-500">Không tải được dữ liệu</div>

  const { group, companies } = data
  const opMargin = group.revenue ? group.operatingProfit / group.revenue : 0
  const netMargin = group.revenue ? group.netProfit / group.revenue : 0

  // Bar chart data: revenue + net profit per company
  const chartData = companies.map(c => ({
    name: c.id,
    revenue: c.summary.revenue,
    netProfit: c.summary.netProfit,
  }))

  const goCompany = (id) => {
    switchCompany(id)
    navigate('/company')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Dashboard tập đoàn</h1>
          <div className="text-xs text-gray-500 mt-0.5">
            {PERIOD_LABELS[period]} · cập nhật {new Date(data.asOf).toLocaleDateString('vi-VN')}
          </div>
        </div>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MoneyKpi label="Doanh thu" value={group.revenue} tone="info" icon="💰" />
        <MoneyKpi label="Tổng chi phí" value={group.cogs + group.totalOpex} tone="warning" icon="💸" />
        <MoneyKpi
          label="Lợi nhuận vận hành"
          value={group.operatingProfit}
          tone={group.operatingProfit >= 0 ? 'positive' : 'negative'}
          sub={`Biên ${fmtPct(opMargin)}`}
          icon="📈"
        />
        <MoneyKpi
          label="Lợi nhuận sau thuế"
          value={group.netProfit}
          tone={group.netProfit >= 0 ? 'positive' : 'negative'}
          sub={`Biên ${fmtPct(netMargin)}`}
          icon="🏦"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MoneyKpi label="Lợi nhuận gộp" value={group.grossProfit} sub={`Biên ${fmtPct(group.revenue ? group.grossProfit / group.revenue : 0)}`} />
        <MoneyKpi label="Dòng tiền" value={group.cashflow} tone={group.cashflow >= 0 ? 'positive' : 'negative'} icon="💵" />
        <MoneyKpi label="Phải thu" value={group.receivables} icon="📥" />
        <MoneyKpi label="Phải trả" value={group.payables} icon="📤" />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Doanh thu & Lợi nhuận sau thuế theo công ty</h3>
        <div style={{ width: '100%', height: 240 }}>
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
              <YAxis stroke="#9ca3af" fontSize={11} tickFormatter={fmtVnd} />
              <Tooltip formatter={(v) => fmtVnd(v)} />
              <Bar dataKey="revenue" name="Doanh thu" fill="#3b82f6" />
              <Bar dataKey="netProfit" name="LNST">
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.netProfit >= 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-700">Tình trạng theo công ty</h3>
          <div className="text-xs text-gray-500">Bấm để xem chi tiết</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2 text-left">Công ty</th>
                <th className="px-4 py-2 text-right">Doanh thu</th>
                <th className="px-4 py-2 text-right">LN gộp</th>
                <th className="px-4 py-2 text-right">LN vận hành</th>
                <th className="px-4 py-2 text-right">Biên VH</th>
                <th className="px-4 py-2 text-right">Dòng tiền</th>
                <th className="px-4 py-2 text-center">Tình trạng</th>
                <th className="px-4 py-2 text-center">Cảnh báo</th>
              </tr>
            </thead>
            <tbody>
              {companies.map(c => (
                <tr
                  key={c.id}
                  onClick={() => goCompany(c.id)}
                  className="border-t border-gray-100 hover:bg-blue-50 cursor-pointer"
                >
                  <td className="px-4 py-2 font-medium text-gray-800">
                    {c.name} <span className="text-xs text-gray-400">{c.id}</span>
                  </td>
                  <td className="px-4 py-2 text-right">{fmtVnd(c.summary.revenue)}</td>
                  <td className="px-4 py-2 text-right">{fmtVnd(c.summary.grossProfit)}</td>
                  <td className={`px-4 py-2 text-right ${c.summary.operatingProfit < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {fmtVnd(c.summary.operatingProfit)}
                  </td>
                  <td className="px-4 py-2 text-right">{fmtPct(c.summary.opMargin)}</td>
                  <td className={`px-4 py-2 text-right ${c.summary.cashflow < 0 ? 'text-red-600' : ''}`}>
                    {fmtVnd(c.summary.cashflow)}
                  </td>
                  <td className="px-4 py-2 text-center"><StatusPill status={c.status} /></td>
                  <td className="px-4 py-2 text-center">
                    {c.alertCount > 0
                      ? <span className="inline-block min-w-6 px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-700 rounded-full">{c.alertCount}</span>
                      : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
