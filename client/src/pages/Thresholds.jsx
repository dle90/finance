import React, { useEffect, useState } from 'react'
import { getBuckets, getThresholds, updateThresholds, getCoaMapping } from '../api'
import { useCompany } from '../context/CompanyContext'
import { useAuth } from '../context/AuthContext'

export default function Thresholds() {
  const { current } = useCompany()
  const { auth } = useAuth()
  const isAdmin = auth?.role === 'admin'
  const [buckets, setBuckets] = useState([])
  const [thresholds, setThresholds] = useState({})
  const [coa, setCoa] = useState([])
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([getBuckets(), getCoaMapping()])
      .then(([b, m]) => { setBuckets(b); setCoa(m) })
  }, [])

  useEffect(() => {
    if (!current?.id) return
    setError('')
    getThresholds(current.id)
      .then(r => setThresholds(r.thresholds))
      .catch(e => setError(e.response?.data?.error || e.message))
  }, [current?.id])

  if (!current) return <div className="text-gray-500">Đang tải…</div>

  const updatePct = (key, pct) => {
    setThresholds(t => ({ ...t, [key]: { ...(t[key] || {}), maxPctOfRevenue: pct } }))
  }

  const onSave = async () => {
    setSaving(true)
    setError('')
    try {
      const r = await updateThresholds(current.id, thresholds)
      setThresholds(r.thresholds)
      setSavedAt(new Date())
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">{current.name} — Định mức chi phí & KPI</h1>
        <div className="text-xs text-gray-500 mt-0.5">
          Cấu hình ngưỡng % doanh thu cho từng nhóm chi phí. Hệ thống sẽ cảnh báo khi thực tế vượt ngưỡng.
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 max-w-2xl">
        <div className="space-y-3">
          {buckets.map(b => {
            const pct = thresholds[b.key]?.maxPctOfRevenue ?? ''
            return (
              <div key={b.key} className="flex items-center gap-3">
                <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                <div className="flex-1 text-sm">{b.label}</div>
                <div className="text-xs text-gray-500">≤</div>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  disabled={!isAdmin}
                  value={pct}
                  onChange={e => updatePct(b.key, e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-20 border border-gray-200 rounded px-2 py-1 text-sm text-right disabled:bg-gray-50"
                />
                <div className="text-xs text-gray-500">% doanh thu</div>
              </div>
            )
          })}
        </div>

        {error && <div className="mt-3 text-sm text-red-600">{error}</div>}

        <div className="mt-5 pt-4 border-t border-gray-100 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {savedAt ? `Đã lưu lúc ${savedAt.toLocaleTimeString('vi-VN')}` : 'Thay đổi áp dụng cho công ty này'}
          </div>
          <button
            disabled={!isAdmin || saving}
            onClick={onSave}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50"
          >
            {saving ? 'Đang lưu…' : 'Lưu định mức'}
          </button>
        </div>
        {!isAdmin && (
          <div className="mt-2 text-xs text-amber-700">Chỉ tài khoản admin được chỉnh sửa định mức.</div>
        )}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Bảng đối chiếu Hệ thống tài khoản (TT200) → Nhóm chi phí</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Đầu TK</th>
                <th className="px-3 py-2 text-left">Tên TK (TT200)</th>
                <th className="px-3 py-2 text-left">Nhóm</th>
              </tr>
            </thead>
            <tbody>
              {coa.map(r => (
                <tr key={r.prefix} className="border-t border-gray-100">
                  <td className="px-3 py-1.5 font-mono">{r.prefix}</td>
                  <td className="px-3 py-1.5">{r.label}</td>
                  <td className="px-3 py-1.5 text-gray-600">{r.bucket}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Khi nhập file Sổ Cái MISA, các bút toán có TK bắt đầu bằng đầu mã trên sẽ được phân loại vào nhóm tương ứng.
        </div>
      </div>
    </div>
  )
}
