const express = require('express')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const {
  COMPANIES, COST_BUCKETS, COA_MAPPING_TT200,
  MONTHLY, arApFor,
  DEFAULT_THRESHOLDS, THRESHOLDS,
} = require('../data/fixtures')

const router = express.Router()
router.use(requireAuth)

// As of "today" — locked to the latest month with data so the demo always shows
// something. In real use this is `new Date()`.
const TODAY = new Date('2026-04-30T00:00:00+07:00')
const todayMonthIdx = () => TODAY.getMonth()                // 0-based
const todayDayOfMonth = () => TODAY.getDate()

// Aggregate a company's months into period totals.
function summarizeCompany(companyId, period) {
  const months = MONTHLY[companyId]
  if (!months) return null
  const m = todayMonthIdx()
  const dom = todayDayOfMonth()

  let slice
  if (period === 'day') {
    // Day = current month's daily slice (revenue/cost/profit pro-rated by day)
    const cur = months[m]
    const daysInMonth = new Date(TODAY.getFullYear(), m + 1, 0).getDate()
    const factor = 1 / daysInMonth
    slice = [{ ...cur,
      revenue: Math.round(cur.revenue * factor),
      cogs: Math.round(cur.cogs * factor),
      grossProfit: Math.round(cur.grossProfit * factor),
      totalOpex: Math.round(cur.totalOpex * factor),
      operatingProfit: Math.round(cur.operatingProfit * factor),
      netProfit: Math.round(cur.netProfit * factor),
      cashflow: Math.round(cur.cashflow * factor),
      buckets: Object.fromEntries(Object.entries(cur.buckets).map(([k, v]) => [k, Math.round(v * factor)])),
    }]
  } else if (period === 'mtd') {
    const cur = months[m]
    const daysInMonth = new Date(TODAY.getFullYear(), m + 1, 0).getDate()
    const factor = dom / daysInMonth
    slice = [{ ...cur,
      revenue: Math.round(cur.revenue * factor),
      cogs: Math.round(cur.cogs * factor),
      grossProfit: Math.round(cur.grossProfit * factor),
      totalOpex: Math.round(cur.totalOpex * factor),
      operatingProfit: Math.round(cur.operatingProfit * factor),
      netProfit: Math.round(cur.netProfit * factor),
      cashflow: Math.round(cur.cashflow * factor),
      buckets: Object.fromEntries(Object.entries(cur.buckets).map(([k, v]) => [k, Math.round(v * factor)])),
    }]
  } else {
    // ytd
    slice = months.slice(0, m + 1)
  }

  const sum = (k) => slice.reduce((a, x) => a + (x[k] || 0), 0)
  const sumBucket = (b) => slice.reduce((a, x) => a + (x.buckets[b] || 0), 0)

  const revenue = sum('revenue')
  const cogs = sum('cogs')
  const grossProfit = revenue - cogs
  const buckets = Object.fromEntries(COST_BUCKETS.map(b => [b.key, sumBucket(b.key)]))
  const totalOpex = Object.values(buckets).reduce((a, b) => a + b, 0)
  const operatingProfit = grossProfit - totalOpex
  const tax = operatingProfit > 0 ? Math.round(operatingProfit * 0.20) : 0
  const netProfit = operatingProfit - tax
  const grossMargin = revenue ? grossProfit / revenue : 0
  const opMargin    = revenue ? operatingProfit / revenue : 0
  const netMargin   = revenue ? netProfit / revenue : 0
  const cashflow = sum('cashflow')

  return {
    companyId,
    revenue, cogs, grossProfit,
    buckets, totalOpex,
    operatingProfit, tax, netProfit,
    grossMargin, opMargin, netMargin,
    cashflow,
  }
}

// Compute alerts: bucket exceeds threshold, OP margin < 0, OP margin worse than prior period.
function alertsFor(companyId, summary) {
  const t = THRESHOLDS[companyId] || DEFAULT_THRESHOLDS
  const alerts = []
  for (const b of COST_BUCKETS) {
    const pct = summary.revenue ? (summary.buckets[b.key] / summary.revenue) * 100 : 0
    const max = t[b.key]?.maxPctOfRevenue
    if (max != null && pct > max) {
      alerts.push({
        type: 'cost_over_threshold',
        severity: pct > max * 1.2 ? 'high' : 'medium',
        bucket: b.key,
        bucketLabel: b.label,
        actualPct: +pct.toFixed(1),
        thresholdPct: max,
        message: `${b.label} chiếm ${pct.toFixed(1)}% doanh thu, vượt định mức ${max}%`,
      })
    }
  }
  if (summary.operatingProfit < 0) {
    alerts.push({
      type: 'operating_loss',
      severity: 'high',
      message: `Lỗ vận hành ${(-summary.operatingProfit / 1e6).toFixed(0)} tr VND`,
    })
  } else if (summary.opMargin < 0.05) {
    alerts.push({
      type: 'thin_margin',
      severity: 'medium',
      message: `Biên LN vận hành chỉ ${(summary.opMargin * 100).toFixed(1)}%`,
    })
  }
  return alerts
}

// ── Routes ─────────────────────────────────────────────────────────────────

router.get('/companies', (req, res) => {
  res.json(COMPANIES)
})

router.get('/buckets', (req, res) => {
  res.json(COST_BUCKETS)
})

router.get('/coa-mapping', (req, res) => {
  res.json(COA_MAPPING_TT200)
})

// Group dashboard (A): per-company summaries + group totals.
router.get('/reports/group/summary', (req, res) => {
  const period = (req.query.period || 'mtd').toString()
  const companies = COMPANIES.map(c => {
    const s = summarizeCompany(c.id, period)
    const alerts = alertsFor(c.id, s)
    let status = 'profit'
    if (s.operatingProfit < 0) status = 'loss'
    else if (alerts.some(a => a.type === 'cost_over_threshold')) status = 'over_budget'
    else if (s.opMargin < 0.05) status = 'thin'
    return { ...c, summary: s, alertCount: alerts.length, status }
  })
  const group = companies.reduce((acc, c) => ({
    revenue:         acc.revenue         + c.summary.revenue,
    cogs:            acc.cogs            + c.summary.cogs,
    grossProfit:     acc.grossProfit     + c.summary.grossProfit,
    totalOpex:       acc.totalOpex       + c.summary.totalOpex,
    operatingProfit: acc.operatingProfit + c.summary.operatingProfit,
    netProfit:       acc.netProfit       + c.summary.netProfit,
    cashflow:        acc.cashflow        + c.summary.cashflow,
    receivables:     acc.receivables     + arApFor(c.id).receivables,
    payables:        acc.payables        + arApFor(c.id).payables,
  }), {
    revenue: 0, cogs: 0, grossProfit: 0, totalOpex: 0,
    operatingProfit: 0, netProfit: 0, cashflow: 0,
    receivables: 0, payables: 0,
  })
  res.json({ period, asOf: TODAY.toISOString(), group, companies })
})

// Per-company dashboard (B)
router.get('/reports/company/:id/summary', (req, res) => {
  const c = COMPANIES.find(x => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'Không tìm thấy công ty' })
  const period = (req.query.period || 'mtd').toString()
  const summary = summarizeCompany(c.id, period)
  const arap = arApFor(c.id)
  const alerts = alertsFor(c.id, summary)

  // Monthly trend for charts (full year)
  const trend = MONTHLY[c.id].map((m, i) => ({
    month: i + 1,
    revenue: m.revenue,
    cogs: m.cogs,
    operatingProfit: m.operatingProfit,
    netProfit: m.netProfit,
    cashflow: m.cashflow,
  }))

  res.json({ company: c, period, asOf: TODAY.toISOString(), summary, arap, alerts, trend })
})

// Cost structure (C)
router.get('/reports/company/:id/cost-structure', (req, res) => {
  const c = COMPANIES.find(x => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'Không tìm thấy công ty' })
  const period = (req.query.period || 'mtd').toString()
  const current = summarizeCompany(c.id, period)

  // Prior comparison: previous period of the same kind
  const m = todayMonthIdx()
  let prior
  if (period === 'mtd' || period === 'day') {
    // Prior month, full month
    if (m > 0) {
      const pm = MONTHLY[c.id][m - 1]
      const buckets = { ...pm.buckets }
      const totalOpex = Object.values(buckets).reduce((a, b) => a + b, 0)
      prior = {
        revenue: pm.revenue, totalOpex, buckets,
        opMargin: pm.revenue ? pm.operatingProfit / pm.revenue : 0,
      }
    }
  } else { // ytd → same months last year (we don't have last-year data, fake -8%)
    prior = {
      revenue: Math.round(current.revenue * 0.92),
      totalOpex: Math.round(current.totalOpex * 0.95),
      buckets: Object.fromEntries(Object.entries(current.buckets).map(([k, v]) => [k, Math.round(v * 0.94)])),
      opMargin: current.opMargin - 0.02,
    }
  }

  // Trailing 6-month trend per bucket
  const months = MONTHLY[c.id].slice(Math.max(0, m - 5), m + 1)
  const trend = months.map((mm, i) => ({
    month: m - months.length + 1 + i + 1,
    ...mm.buckets,
  }))

  res.json({
    company: c,
    period,
    asOf: TODAY.toISOString(),
    buckets: COST_BUCKETS,
    current,
    prior,
    trend,
    thresholds: THRESHOLDS[c.id] || DEFAULT_THRESHOLDS,
  })
})

// P&L (D) — standardized statement, current period + prior + variance
router.get('/reports/company/:id/pnl', (req, res) => {
  const c = COMPANIES.find(x => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'Không tìm thấy công ty' })
  const period = (req.query.period || 'ytd').toString()
  const current = summarizeCompany(c.id, period)

  const m = todayMonthIdx()
  let prior
  if (period === 'ytd') {
    prior = {
      revenue: Math.round(current.revenue * 0.92),
      cogs:    Math.round(current.cogs * 0.94),
      grossProfit: 0, totalOpex: 0, operatingProfit: 0, tax: 0, netProfit: 0,
      buckets: Object.fromEntries(Object.entries(current.buckets).map(([k, v]) => [k, Math.round(v * 0.94)])),
    }
    prior.grossProfit = prior.revenue - prior.cogs
    prior.totalOpex = Object.values(prior.buckets).reduce((a, b) => a + b, 0)
    prior.operatingProfit = prior.grossProfit - prior.totalOpex
    prior.tax = prior.operatingProfit > 0 ? Math.round(prior.operatingProfit * 0.20) : 0
    prior.netProfit = prior.operatingProfit - prior.tax
  } else {
    if (m > 0) {
      const pm = MONTHLY[c.id][m - 1]
      prior = {
        revenue: pm.revenue, cogs: pm.cogs, grossProfit: pm.grossProfit,
        buckets: { ...pm.buckets },
        totalOpex: pm.totalOpex,
        operatingProfit: pm.operatingProfit,
        tax: pm.operatingProfit > 0 ? Math.round(pm.operatingProfit * 0.20) : 0,
        netProfit: pm.netProfit,
      }
    }
  }

  // Selling vs G&A split: marketing = selling, hr+rent+operations+other = G&A,
  // depreciation+interest stay as their own lines below operating.
  const sellingExpense = current.buckets.marketing
  const gaExpense = current.buckets.hr + current.buckets.rent + current.buckets.operations + current.buckets.other
  const depreciation = current.buckets.depreciation
  const interest = current.buckets.interest

  const sellingExpensePrior = prior ? prior.buckets.marketing : null
  const gaExpensePrior = prior ? (prior.buckets.hr + prior.buckets.rent + prior.buckets.operations + prior.buckets.other) : null
  const depPrior = prior ? prior.buckets.depreciation : null
  const intPrior = prior ? prior.buckets.interest : null

  const lines = [
    { id: 'revenue',         label: 'Doanh thu thuần',                 current: current.revenue,         prior: prior?.revenue,         indent: 0, bold: true },
    { id: 'cogs',            label: 'Giá vốn hàng bán',                current: current.cogs,            prior: prior?.cogs,            indent: 0, neg: true },
    { id: 'gross_profit',    label: 'Lợi nhuận gộp',                   current: current.grossProfit,     prior: prior?.grossProfit,     indent: 0, bold: true, subtotal: true },
    { id: 'selling',         label: 'Chi phí bán hàng',                current: sellingExpense,          prior: sellingExpensePrior,    indent: 1, neg: true },
    { id: 'ga',              label: 'Chi phí quản lý DN',              current: gaExpense,               prior: gaExpensePrior,         indent: 1, neg: true },
    { id: 'op_profit_pre',   label: 'Lợi nhuận từ hoạt động kinh doanh', current: current.grossProfit - sellingExpense - gaExpense, prior: prior ? prior.grossProfit - sellingExpensePrior - gaExpensePrior : null, indent: 0, bold: true, subtotal: true },
    { id: 'depreciation',    label: 'Khấu hao',                        current: depreciation,            prior: depPrior,               indent: 1, neg: true },
    { id: 'interest',        label: 'Chi phí lãi vay',                 current: interest,                prior: intPrior,               indent: 1, neg: true },
    { id: 'op_profit',       label: 'Lợi nhuận vận hành',              current: current.operatingProfit, prior: prior?.operatingProfit, indent: 0, bold: true, subtotal: true },
    { id: 'pbt',             label: 'Lợi nhuận trước thuế',            current: current.operatingProfit, prior: prior?.operatingProfit, indent: 0 },
    { id: 'tax',             label: 'Chi phí thuế TNDN',               current: current.tax,             prior: prior?.tax,             indent: 1, neg: true },
    { id: 'net_profit',      label: 'Lợi nhuận sau thuế',              current: current.netProfit,       prior: prior?.netProfit,       indent: 0, bold: true, total: true },
  ]

  res.json({ company: c, period, asOf: TODAY.toISOString(), lines, current, prior })
})

// Thresholds — read & update
router.get('/companies/:id/thresholds', (req, res) => {
  const c = COMPANIES.find(x => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'Không tìm thấy công ty' })
  res.json({ companyId: c.id, thresholds: THRESHOLDS[c.id] || DEFAULT_THRESHOLDS })
})

router.put('/companies/:id/thresholds', requireAdmin, (req, res) => {
  const c = COMPANIES.find(x => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'Không tìm thấy công ty' })
  const incoming = req.body?.thresholds || {}
  const cur = THRESHOLDS[c.id] || structuredClone(DEFAULT_THRESHOLDS)
  for (const b of Object.keys(cur)) {
    const pct = Number(incoming[b]?.maxPctOfRevenue)
    if (Number.isFinite(pct) && pct >= 0 && pct <= 100) {
      cur[b].maxPctOfRevenue = pct
    }
  }
  THRESHOLDS[c.id] = cur
  res.json({ companyId: c.id, thresholds: cur })
})

// Aggregate alerts across all companies for the alerts page.
router.get('/alerts', (req, res) => {
  const period = (req.query.period || 'mtd').toString()
  const out = []
  for (const c of COMPANIES) {
    const s = summarizeCompany(c.id, period)
    const alerts = alertsFor(c.id, s)
    for (const a of alerts) {
      out.push({ ...a, companyId: c.id, companyName: c.name })
    }
  }
  // Severity sort: high first
  out.sort((a, b) => (a.severity === 'high' ? 0 : 1) - (b.severity === 'high' ? 0 : 1))
  res.json({ period, asOf: TODAY.toISOString(), alerts: out })
})

// Manual refresh — placeholder for "pull from MISA now" trigger.
router.post('/sync', requireAdmin, (req, res) => {
  // In future: enqueue MISA sync job here.
  res.json({ ok: true, queued: true, asOf: TODAY.toISOString() })
})

module.exports = router
