import React, { useEffect, useRef, useState } from 'react'
import { previewGlImport, commitGlImport, listGlImports, deleteGlImport } from '../api'
import { useCompany } from '../context/CompanyContext'
import { useAuth } from '../context/AuthContext'
import { fmtVnd, fmtVndFull } from '../utils/format'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('vi-VN') : '—'

const REPORT_TYPE_LABEL = {
  journal: 'Sổ Nhật ký chung',
  ledger: 'Sổ Cái',
  trial_balance: 'Bảng cân đối phát sinh',
  unknown: 'Chưa xác định',
}

export default function Import() {
  const { current } = useCompany()
  const { auth } = useAuth()
  const isAdmin = auth?.role === 'admin'

  const [file, setFile] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [error, setError] = useState('')
  const [history, setHistory] = useState([])
  const inputRef = useRef(null)

  const refreshHistory = async () => {
    if (!current?.id) return
    try { setHistory(await listGlImports(current.id)) } catch {}
  }

  useEffect(() => { refreshHistory() }, [current?.id])

  const reset = () => {
    setFile(null); setPreview(null); setError('')
    if (inputRef.current) inputRef.current.value = ''
  }

  const onPickFile = async (f) => {
    if (!f) return
    setFile(f); setPreview(null); setError(''); setPreviewing(true)
    try {
      const p = await previewGlImport(current.id, f)
      setPreview(p)
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setPreviewing(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onPickFile(f)
  }

  const onCommit = async () => {
    if (!file) return
    setCommitting(true); setError('')
    try {
      await commitGlImport(current.id, file)
      reset()
      await refreshHistory()
    } catch (e) {
      setError(e.response?.data?.error || e.message)
    } finally {
      setCommitting(false)
    }
  }

  const onDeleteBatch = async (batchId) => {
    if (!confirm('Xóa batch này khỏi cơ sở dữ liệu? Các dòng GL của batch này sẽ bị xóa.')) return
    try {
      await deleteGlImport(current.id, batchId)
      await refreshHistory()
    } catch (e) {
      alert(e.response?.data?.error || e.message)
    }
  }

  if (!current) return <div className="text-gray-500">Đang tải…</div>

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">{current.name} — Nhập Sổ Cái từ MISA</h1>
        <div className="text-xs text-gray-500 mt-0.5">
          Tải lên file Excel xuất từ MISA AMIS (Sổ Nhật ký chung khuyến nghị). Hệ thống tự nhận diện cột.
        </div>
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-4 py-2">
          Chỉ tài khoản admin được nhập dữ liệu.
        </div>
      )}

      <div
        onDragOver={(e) => { e.preventDefault(); if (isAdmin) setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={isAdmin ? onDrop : undefined}
        onClick={() => isAdmin && inputRef.current?.click()}
        className={`bg-white rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        } ${!isAdmin ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xls,.xlsx"
          className="hidden"
          disabled={!isAdmin}
          onChange={e => onPickFile(e.target.files?.[0])}
        />
        <div className="text-3xl mb-2">📄</div>
        <div className="text-sm text-gray-700 font-medium">
          {file ? file.name : 'Kéo thả file Excel vào đây hoặc bấm để chọn'}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Hỗ trợ: .xlsx, .xls · Tối đa 25 MB · Cho công ty <span className="font-semibold">{current.name}</span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {previewing && (
        <div className="text-gray-500 text-sm">Đang phân tích file…</div>
      )}

      {preview && (
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-800">Xem trước: {preview.fileName}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Loại báo cáo: {REPORT_TYPE_LABEL[preview.reportType] || preview.reportType}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={reset}
                className="text-xs px-3 py-1.5 border rounded hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                disabled={!isAdmin || committing || preview.stats.kept === 0}
                onClick={onCommit}
                className="text-xs px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
              >
                {committing ? 'Đang lưu…' : `Xác nhận nhập ${preview.stats.kept.toLocaleString('vi-VN')} dòng`}
              </button>
            </div>
          </div>

          <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Dòng được nhận" value={preview.stats.kept.toLocaleString('vi-VN')} sub={`/ ${preview.stats.totalRows.toLocaleString('vi-VN')} tổng`} tone="positive" />
            <Stat label="Dòng bỏ qua" value={preview.stats.skipped.toLocaleString('vi-VN')} sub="tổng kết / trống / lỗi" tone={preview.stats.skipped > 0 ? 'warning' : 'neutral'} />
            <Stat label="Khoảng ngày" value={`${fmtDate(preview.stats.dateMin)} – ${fmtDate(preview.stats.dateMax)}`} />
            <Stat label="Tổng phát sinh" value={fmtVnd(preview.stats.totalDebit)} sub="Nợ ≡ Có" />
          </div>

          {preview.warnings?.length > 0 && (
            <div className="px-4 py-2 border-t border-gray-100 bg-amber-50 text-xs text-amber-700">
              <div className="font-semibold mb-1">Cảnh báo:</div>
              <ul className="list-disc pl-5 space-y-0.5">
                {preview.warnings.map((w, i) => <li key={i}>{w}</li>)}
              </ul>
            </div>
          )}

          <div className="border-t border-gray-200 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">Ngày HT</th>
                  <th className="px-3 py-2 text-left">Số CT</th>
                  <th className="px-3 py-2 text-left">Diễn giải</th>
                  <th className="px-3 py-2 text-left">TK Nợ</th>
                  <th className="px-3 py-2 text-left">TK Có</th>
                  <th className="px-3 py-2 text-right">Số tiền</th>
                  <th className="px-3 py-2 text-left">Đối tượng</th>
                </tr>
              </thead>
              <tbody>
                {preview.sample.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 whitespace-nowrap">{fmtDate(r.postingDate)}</td>
                    <td className="px-3 py-1.5">{r.voucherNo}</td>
                    <td className="px-3 py-1.5 max-w-md truncate" title={r.description}>{r.description}</td>
                    <td className="px-3 py-1.5 font-mono">{r.debitAccount}</td>
                    <td className="px-3 py-1.5 font-mono">{r.creditAccount}</td>
                    <td className="px-3 py-1.5 text-right font-mono">{fmtVndFull(r.amount)}</td>
                    <td className="px-3 py-1.5 text-gray-600">{r.counterpartyName || r.counterpartyCode || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.stats.kept > preview.sample.length && (
              <div className="px-4 py-2 text-xs text-gray-500 text-center border-t border-gray-100">
                … và {(preview.stats.kept - preview.sample.length).toLocaleString('vi-VN')} dòng khác
              </div>
            )}
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700">Lịch sử nhập gần đây</h3>
        </div>
        {history.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">Chưa có lịch sử nhập</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left">Thời gian</th>
                  <th className="px-3 py-2 text-left">File</th>
                  <th className="px-3 py-2 text-left">Loại</th>
                  <th className="px-3 py-2 text-right">Dòng</th>
                  <th className="px-3 py-2 text-left">Khoảng ngày</th>
                  <th className="px-3 py-2 text-right">Tổng phát sinh</th>
                  <th className="px-3 py-2 text-left">Người nhập</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h._id} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 whitespace-nowrap">{fmtDateTime(h.importedAt)}</td>
                    <td className="px-3 py-1.5 max-w-xs truncate" title={h.fileName}>{h.fileName}</td>
                    <td className="px-3 py-1.5 text-xs text-gray-500">{REPORT_TYPE_LABEL[h.reportType] || h.reportType}</td>
                    <td className="px-3 py-1.5 text-right">{(h.rowCountKept || 0).toLocaleString('vi-VN')}</td>
                    <td className="px-3 py-1.5">{fmtDate(h.dateMin)} – {fmtDate(h.dateMax)}</td>
                    <td className="px-3 py-1.5 text-right">{fmtVnd(h.totalDebit)}</td>
                    <td className="px-3 py-1.5 text-gray-600">{h.importedBy}</td>
                    <td className="px-3 py-1.5 text-right">
                      {isAdmin && (
                        <button
                          onClick={() => onDeleteBatch(h._id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Xóa
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, sub, tone = 'neutral' }) {
  const cls = {
    neutral: 'text-gray-800',
    positive: 'text-emerald-700',
    warning: 'text-amber-700',
  }[tone] || 'text-gray-800'
  return (
    <div className="bg-gray-50 rounded p-3">
      <div className="text-xs uppercase text-gray-500">{label}</div>
      <div className={`text-lg font-bold ${cls}`}>{value}</div>
      {sub && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  )
}
