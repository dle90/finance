import React from 'react'

const MAP = {
  profit:      { label: 'Có lãi',           cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  thin:        { label: 'Biên LN mỏng',     cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  loss:        { label: 'Lỗ',               cls: 'bg-red-50 text-red-700 border-red-200' },
  over_budget: { label: 'Vượt định mức',    cls: 'bg-orange-50 text-orange-700 border-orange-200' },
}

export default function StatusPill({ status }) {
  const m = MAP[status] || MAP.profit
  return (
    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full border ${m.cls}`}>
      {m.label}
    </span>
  )
}
