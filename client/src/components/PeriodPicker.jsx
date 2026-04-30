import React from 'react'

const OPTIONS = [
  { key: 'day', label: 'Ngày' },
  { key: 'mtd', label: 'MTD' },
  { key: 'ytd', label: 'YTD' },
]

export default function PeriodPicker({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white overflow-hidden text-sm">
      {OPTIONS.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-3 py-1.5 ${value === o.key ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-50'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
