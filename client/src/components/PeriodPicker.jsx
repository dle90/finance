import React, { useState, useRef, useEffect } from 'react'

// ── helpers ───────────────────────────────────────────────────────────────────

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function parseYmd(s) {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function sameDay(a, b) {
  return a && b && a.toDateString() === b.toDateString()
}

function fmtShort(d) {
  if (!d) return ''
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ── CalendarMonth ─────────────────────────────────────────────────────────────

const DOW = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
const MONTHS_VI = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
]

function CalendarMonth({ year, month, start, end, hover, onDayClick, onDayHover }) {
  const firstDow = new Date(year, month, 1).getDay()
  const pad = (firstDow + 6) % 7 // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const days = []
  for (let i = 0; i < pad; i++) days.push(null)
  for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d))

  const effectiveEnd = end || hover

  const inRange = (d) => {
    if (!d || !start || !effectiveEnd) return false
    const lo = start <= effectiveEnd ? start : effectiveEnd
    const hi = start <= effectiveEnd ? effectiveEnd : start
    return d > lo && d < hi
  }

  const isStartEdge = (d) => {
    if (!d || !start) return false
    const lo = effectiveEnd ? (start <= effectiveEnd ? start : effectiveEnd) : start
    return sameDay(d, lo)
  }

  const isEndEdge = (d) => {
    if (!d || !effectiveEnd) return false
    const hi = start <= effectiveEnd ? effectiveEnd : start
    return sameDay(d, hi)
  }

  return (
    <div className="w-56">
      <div className="text-center text-sm font-semibold text-gray-700 mb-2">
        {MONTHS_VI[month]} {year}
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-xs text-gray-400 py-1 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((d, i) => {
          if (!d) return <div key={i} />
          const inR = inRange(d)
          const isS = isStartEdge(d)
          const isE = isEndEdge(d)
          return (
            <button
              key={i}
              type="button"
              onClick={() => onDayClick(d)}
              onMouseEnter={() => onDayHover(d)}
              className={[
                'text-xs h-7 w-full text-center leading-7 select-none transition-colors',
                isS || isE
                  ? 'bg-blue-600 text-white font-semibold rounded'
                  : inR
                  ? 'bg-blue-100 text-blue-800'
                  : 'text-gray-700 hover:bg-gray-100 rounded',
              ].join(' ')}
            >
              {d.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── DateRangePopup ────────────────────────────────────────────────────────────

const TODAY_REF = new Date()

const PRESETS_LIST = [
  {
    label: 'Tháng này',
    from: () => new Date(TODAY_REF.getFullYear(), TODAY_REF.getMonth(), 1),
    to:   () => new Date(TODAY_REF.getFullYear(), TODAY_REF.getMonth() + 1, 0),
  },
  {
    label: 'Tháng trước',
    from: () => new Date(TODAY_REF.getFullYear(), TODAY_REF.getMonth() - 1, 1),
    to:   () => new Date(TODAY_REF.getFullYear(), TODAY_REF.getMonth(), 0),
  },
  {
    label: 'Quý này',
    from: () => { const q = Math.floor(TODAY_REF.getMonth() / 3); return new Date(TODAY_REF.getFullYear(), q * 3, 1) },
    to:   () => { const q = Math.floor(TODAY_REF.getMonth() / 3); return new Date(TODAY_REF.getFullYear(), q * 3 + 3, 0) },
  },
  {
    label: 'Năm nay',
    from: () => new Date(TODAY_REF.getFullYear(), 0, 1),
    to:   () => new Date(TODAY_REF.getFullYear(), 11, 31),
  },
]

function DateRangePopup({ initialFrom, initialTo, onApply, onClose }) {
  const initStart = initialFrom ? parseYmd(initialFrom) : null
  const [viewYear, setViewYear]   = useState(initStart ? initStart.getFullYear() : TODAY_REF.getFullYear())
  const [viewMonth, setViewMonth] = useState(initStart ? initStart.getMonth() : Math.max(0, TODAY_REF.getMonth() - 1))
  const [start, setStart] = useState(initStart)
  const [end,   setEnd]   = useState(initialTo ? parseYmd(initialTo) : null)
  const [hover, setHover] = useState(null)

  const month2 = viewMonth === 11 ? 0  : viewMonth + 1
  const year2  = viewMonth === 11 ? viewYear + 1 : viewYear

  const prevMonths = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  const nextMonths = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const handleDayClick = (d) => {
    if (!start || (start && end)) {
      setStart(d); setEnd(null); setHover(null)
    } else {
      if (sameDay(d, start)) { setStart(null); return }
      setEnd(d)
    }
  }

  const rangeLabel = () => {
    if (!start) return 'Chọn ngày bắt đầu'
    if (!end && !hover) return `Từ ${fmtShort(start)} — chọn ngày kết thúc`
    const e = end || hover
    const lo = start <= e ? start : e
    const hi = start <= e ? e : start
    return `${fmtShort(lo)} – ${fmtShort(hi)}`
  }

  const canApply = start && end

  const applyPreset = (p) => {
    setStart(p.from())
    setEnd(p.to())
  }

  return (
    <div
      className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4"
      onMouseLeave={() => !end && setHover(null)}
    >
      <div className="flex gap-5">
        {/* Preset shortcuts */}
        <div className="flex flex-col gap-0.5 border-r border-gray-100 pr-4 pt-6 min-w-[96px]">
          {PRESETS_LIST.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPreset(p)}
              className="text-left text-sm px-2 py-1.5 rounded hover:bg-blue-50 text-gray-700 whitespace-nowrap"
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Calendars */}
        <div>
          <div className="text-xs text-center text-gray-500 mb-3 min-h-[16px]">
            {rangeLabel()}
          </div>

          <div className="flex gap-5 items-start">
            {/* Left month */}
            <div>
              <button
                type="button"
                onClick={prevMonths}
                className="text-xs text-gray-400 hover:text-gray-700 mb-1 px-1 block"
              >
                ‹ Trước
              </button>
              <CalendarMonth
                year={viewYear} month={viewMonth}
                start={start} end={end} hover={hover}
                onDayClick={handleDayClick} onDayHover={setHover}
              />
            </div>

            {/* Right month */}
            <div>
              <button
                type="button"
                onClick={nextMonths}
                className="text-xs text-gray-400 hover:text-gray-700 mb-1 px-1 block ml-auto"
              >
                Sau ›
              </button>
              <CalendarMonth
                year={year2} month={month2}
                start={start} end={end} hover={hover}
                onDayClick={handleDayClick} onDayHover={setHover}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-gray-500 hover:text-gray-700 px-2"
            >
              Huỷ
            </button>
            <button
              type="button"
              disabled={!canApply}
              onClick={() => {
                if (!canApply) return
                const lo = start <= end ? start : end
                const hi = start <= end ? end   : start
                onApply(ymd(lo), ymd(hi))
              }}
              className="text-sm px-4 py-1.5 rounded-lg bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700 transition-colors"
            >
              Áp dụng
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── PeriodPicker ──────────────────────────────────────────────────────────────

const PRESETS = [
  { key: 'day', label: 'Ngày' },
  { key: 'mtd', label: 'MTD' },
  { key: 'ytd', label: 'YTD' },
]

export default function PeriodPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const isRange    = value && typeof value === 'object'
  const activePreset = isRange ? null : value

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const rangeLabel = isRange
    ? `${value.from.slice(8)}/${value.from.slice(5, 7)} – ${value.to.slice(8)}/${value.to.slice(5, 7)}`
    : 'Khoảng'

  return (
    <div className="relative" ref={ref}>
      <div className="inline-flex rounded-lg border border-gray-200 bg-white overflow-visible text-sm">
        {PRESETS.map(o => (
          <button
            key={o.key}
            type="button"
            onClick={() => { onChange(o.key); setOpen(false) }}
            className={`px-3 py-1.5 ${activePreset === o.key ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
          >
            {o.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className={[
            'px-3 py-1.5 border-l border-gray-200',
            isRange ? 'bg-blue-600 text-white' : open ? 'bg-gray-50 text-gray-700' : 'text-gray-700 hover:bg-gray-50',
          ].join(' ')}
        >
          {rangeLabel}
        </button>
      </div>

      {open && (
        <DateRangePopup
          initialFrom={isRange ? value.from : null}
          initialTo={isRange ? value.to : null}
          onApply={(from, to) => { onChange({ from, to }); setOpen(false) }}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  )
}
