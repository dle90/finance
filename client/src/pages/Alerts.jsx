import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAlerts } from '../api'
import { useCompany } from '../context/CompanyContext'
import PeriodPicker from '../components/PeriodPicker'
import { periodLabel } from '../utils/format'

const SEV_CLASS = {
  high:   'bg-red-50 border-red-200 text-red-800',
  medium: 'bg-amber-50 border-amber-200 text-amber-800',
  low:    'bg-blue-50 border-blue-200 text-blue-800',
}

const SEV_LABEL = {
  high: 'Cao',
  medium: 'Trung bình',
  low: 'Thấp',
}

export default function Alerts() {
  const [period, setPeriod] = useState('mtd')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { switchCompany } = useCompany()

  const periodKey = typeof period === 'string' ? period : `${period?.from}~${period?.to}`
  useEffect(() => {
    setLoading(true)
    getAlerts(period)
      .then(setData)
      .finally(() => setLoading(false))
  }, [periodKey])

  if (loading || !data) return <div className="text-gray-500">Đang tải cảnh báo…</div>

  const grouped = data.alerts.reduce((acc, a) => {
    acc[a.companyId] = acc[a.companyId] || { name: a.companyName, items: [] }
    acc[a.companyId].items.push(a)
    return acc
  }, {})

  const goCompany = (id) => {
    switchCompany(id)
    navigate('/company')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Cảnh báo</h1>
          <div className="text-xs text-gray-500 mt-0.5">
            {periodLabel(period)} · {data.alerts.length} cảnh báo
          </div>
        </div>
        <PeriodPicker value={period} onChange={setPeriod} />
      </div>

      {data.alerts.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-8 text-center text-emerald-700">
          ✓ Không có cảnh báo nào trong kỳ này
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([id, g]) => (
            <div key={id} className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <div className="font-semibold text-gray-800">
                  {g.name} <span className="text-xs text-gray-400">{id}</span>
                </div>
                <button
                  onClick={() => goCompany(id)}
                  className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
                >
                  Xem chi tiết →
                </button>
              </div>
              <div className="divide-y divide-gray-100">
                {g.items.map((a, i) => (
                  <div key={i} className={`px-4 py-3 flex items-start gap-3`}>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded border ${SEV_CLASS[a.severity] || SEV_CLASS.low}`}>
                      {SEV_LABEL[a.severity] || a.severity}
                    </span>
                    <div className="flex-1 text-sm text-gray-800">{a.message}</div>
                    <div className="text-xs text-gray-400">{a.type.replace(/_/g, ' ')}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
