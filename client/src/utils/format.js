// Compact number formatting in VND. Default unit is "tỷ" (billions) for headline
// figures, "tr" (millions) for sub-figures.

const abs = (n) => Math.abs(Number(n) || 0)

export const fmtVnd = (v) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  const a = abs(n)
  if (a >= 1e9)  return (n / 1e9).toLocaleString('vi-VN', { maximumFractionDigits: 2 }) + ' tỷ'
  if (a >= 1e6)  return (n / 1e6).toLocaleString('vi-VN', { maximumFractionDigits: 1 }) + ' tr'
  if (a >= 1e3)  return (n / 1e3).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' k'
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 0 })
}

// Full VND with thousand separators (no unit collapse).
export const fmtVndFull = (v) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString('vi-VN', { maximumFractionDigits: 0 })
}

export const fmtPct = (v, digits = 1) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return (n * 100).toFixed(digits) + '%'
}

export const fmtPctRaw = (v, digits = 1) => {
  const n = Number(v)
  if (!Number.isFinite(n)) return '—'
  return n.toFixed(digits) + '%'
}

// Variance vs prior — returns { delta, pct, dir }
export const variance = (current, prior) => {
  if (prior == null || prior === 0) return { delta: null, pct: null, dir: null }
  const delta = current - prior
  const pct = delta / Math.abs(prior)
  const dir = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat'
  return { delta, pct, dir }
}

export const PERIOD_LABELS = {
  day: 'Hôm nay',
  mtd: 'Tháng hiện tại',
  ytd: 'Lũy kế năm',
}

// period can be 'day'|'mtd'|'ytd' or { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
export const periodLabel = (p) => {
  if (!p || typeof p === 'string') return PERIOD_LABELS[p] || p || ''
  const fmt = (s) => `${s.slice(8)}/${s.slice(5, 7)}/${s.slice(0, 4)}`
  return `${fmt(p.from)} – ${fmt(p.to)}`
}
