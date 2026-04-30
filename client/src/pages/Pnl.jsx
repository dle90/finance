import React, { useEffect, useState } from 'react'
import { getPnl } from '../api'
import { useCompany } from '../context/CompanyContext'
import { fmtVnd, fmtPct, fmtPctRaw, PERIOD_LABELS, variance } from '../utils/format'
import PeriodPicker from '../components/PeriodPicker'

export default function Pnl() {
  const { current } = useCompany()
  const [period, setPeriod] = useState('ytd')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!current?.id) return
    setLoading(true)
    getPnl(current.id, period)
      .then(setData)
      .finally(() => setLoading(false))
  }, [current?.id, period])

  if (!current) return <div className="text-gray-500">Đang tải…</div>
  if (loading || !data) return <div className="text-gray-500">Đang tải KQKD…</div>

  const { lines, current: cur, prior } = data
  const baseRev = cur.revenue || 1

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{current.name} — Kết quả kinh doanh</h1>
          <div className="text-xs text-gray-500 mt-0.5">{PERIOD_LABELS[period]}</div>
        </div>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">Chỉ tiêu</th>
              <th className="px-4 py-2 text-right">Kỳ này</th>
              <th className="px-4 py-2 text-right">% DT</th>
              <th className="px-4 py-2 text-right">Kỳ trước</th>
              <th className="px-4 py-2 text-right">Chênh lệch</th>
              <th className="px-4 py-2 text-right">% thay đổi</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(l => {
              const v = variance(l.current, l.prior)
              const pctRev = l.current != null ? (l.current / baseRev) : null
              const rowCls = l.total
                ? 'bg-blue-50 font-bold border-t-2 border-blue-200'
                : l.subtotal
                  ? 'bg-gray-50 font-semibold'
                  : l.bold
                    ? 'font-semibold'
                    : ''
              const valCls = l.neg ? 'text-red-600' : ''
              return (
                <tr key={l.id} className={`border-t border-gray-100 ${rowCls}`}>
                  <td className="px-4 py-2" style={{ paddingLeft: 16 + (l.indent || 0) * 24 }}>{l.label}</td>
                  <td className={`px-4 py-2 text-right ${valCls}`}>
                    {l.neg && l.current ? '(' + fmtVnd(l.current) + ')' : fmtVnd(l.current)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-500">
                    {pctRev != null ? fmtPct(pctRev) : '—'}
                  </td>
                  <td className={`px-4 py-2 text-right text-gray-500 ${valCls}`}>
                    {l.prior == null ? '—' : (l.neg && l.prior ? '(' + fmtVnd(l.prior) + ')' : fmtVnd(l.prior))}
                  </td>
                  <td className={`px-4 py-2 text-right ${v.dir === 'up' ? 'text-emerald-600' : v.dir === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                    {v.delta == null ? '—' : fmtVnd(v.delta)}
                  </td>
                  <td className={`px-4 py-2 text-right ${v.dir === 'up' ? 'text-emerald-600' : v.dir === 'down' ? 'text-red-600' : 'text-gray-500'}`}>
                    {v.pct == null ? '—' : `${v.dir === 'up' ? '▲' : v.dir === 'down' ? '▼' : ''} ${fmtPct(Math.abs(v.pct))}`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Biên LN gộp</div>
          <div className="text-2xl font-bold mt-1">{fmtPct(cur.grossMargin)}</div>
          <div className="text-xs text-gray-500 mt-1">{fmtVnd(cur.grossProfit)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Biên LN vận hành</div>
          <div className={`text-2xl font-bold mt-1 ${cur.opMargin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtPct(cur.opMargin)}</div>
          <div className="text-xs text-gray-500 mt-1">{fmtVnd(cur.operatingProfit)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Biên LN sau thuế</div>
          <div className={`text-2xl font-bold mt-1 ${cur.netMargin >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtPct(cur.netMargin)}</div>
          <div className="text-xs text-gray-500 mt-1">{fmtVnd(cur.netProfit)}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs uppercase tracking-wide text-gray-500">Tổng chi phí / DT</div>
          <div className="text-2xl font-bold mt-1">{fmtPctRaw(cur.revenue ? ((cur.cogs + cur.totalOpex) / cur.revenue) * 100 : 0)}</div>
          <div className="text-xs text-gray-500 mt-1">{fmtVnd(cur.cogs + cur.totalOpex)}</div>
        </div>
      </div>
    </div>
  )
}
