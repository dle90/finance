// Mock data for the finance dashboard. Replaced once MISA GL ingestion lands.
// All amounts are in VND, stored as plain numbers (not millions).

const COMPANIES = [
  { id: 'COM-A', name: 'Công ty A', taxCode: '0312345678', currency: 'VND', fiscalYear: 2026 },
  { id: 'COM-B', name: 'Công ty B', taxCode: '0312345679', currency: 'VND', fiscalYear: 2026 },
  { id: 'COM-C', name: 'Công ty C', taxCode: '0312345680', currency: 'VND', fiscalYear: 2026 },
  { id: 'COM-D', name: 'Công ty D', taxCode: '0312345681', currency: 'VND', fiscalYear: 2026 },
]

// Standardized cost buckets (per the spec): HR, Marketing, Rent, Operations,
// Depreciation, Interest, Other. Revenue/COGS sit outside this list.
const COST_BUCKETS = [
  { key: 'hr',           label: 'Nhân sự',        color: '#3b82f6' },
  { key: 'marketing',    label: 'Marketing',      color: '#f59e0b' },
  { key: 'rent',         label: 'Thuê mặt bằng',  color: '#10b981' },
  { key: 'operations',   label: 'Vận hành',       color: '#8b5cf6' },
  { key: 'depreciation', label: 'Khấu hao',       color: '#ef4444' },
  { key: 'interest',     label: 'Lãi vay',        color: '#0ea5e9' },
  { key: 'other',        label: 'Khác',           color: '#64748b' },
]

// TT200 account-prefix → bucket mapping. Used by the future GL importer; surfaced
// here so the front-end Thresholds page can show what prefix maps where.
const COA_MAPPING_TT200 = [
  { prefix: '511', bucket: 'revenue',      label: 'Doanh thu BH & CCDV' },
  { prefix: '512', bucket: 'revenue',      label: 'Doanh thu nội bộ' },
  { prefix: '521', bucket: 'revenue_neg',  label: 'Các khoản giảm trừ doanh thu' },
  { prefix: '515', bucket: 'other_income', label: 'Doanh thu tài chính' },
  { prefix: '711', bucket: 'other_income', label: 'Thu nhập khác' },
  { prefix: '632', bucket: 'cogs',         label: 'Giá vốn hàng bán' },
  { prefix: '621', bucket: 'cogs',         label: 'Chi phí NVL trực tiếp' },
  { prefix: '622', bucket: 'cogs',         label: 'Chi phí nhân công trực tiếp' },
  { prefix: '627', bucket: 'cogs',         label: 'Chi phí sản xuất chung' },
  { prefix: '641', bucket: 'marketing',    label: 'Chi phí bán hàng' },
  { prefix: '642', bucket: 'operations',   label: 'Chi phí quản lý DN' },
  { prefix: '334', bucket: 'hr',           label: 'Phải trả người lao động' },
  { prefix: '338', bucket: 'hr',           label: 'BHXH, BHYT, BHTN' },
  { prefix: '214', bucket: 'depreciation', label: 'Hao mòn TSCĐ' },
  { prefix: '635', bucket: 'interest',     label: 'Chi phí tài chính' },
  { prefix: '811', bucket: 'other',        label: 'Chi phí khác' },
  { prefix: '821', bucket: 'tax',          label: 'Chi phí thuế TNDN' },
]

// Deterministic pseudo-random for reproducible mock numbers.
function seeded(seed) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 4294967296
  }
}

// Build 12 months of monthly figures for one company. `profile` shapes the
// company's character: profitable, loss-making, thin margin, over-budget.
function buildMonthly(companyId, profile) {
  const rng = seeded(companyId.charCodeAt(4) * 17 + 1)
  const months = []
  const baseRev = profile.baseRev
  const growth = profile.growth        // monthly growth rate
  const grossMargin = profile.grossMargin

  for (let i = 0; i < 12; i++) {
    const seasonality = 1 + 0.15 * Math.sin((i / 12) * 2 * Math.PI)
    const noise = 0.9 + rng() * 0.2
    const revenue = Math.round(baseRev * Math.pow(1 + growth, i) * seasonality * noise)
    const cogs = Math.round(revenue * (1 - grossMargin))
    const grossProfit = revenue - cogs

    // Cost buckets — driven by % of revenue with profile-specific weights
    const buckets = {}
    for (const b of COST_BUCKETS) {
      const pct = profile.costPct[b.key] * (0.9 + rng() * 0.25)
      buckets[b.key] = Math.round(revenue * pct)
    }
    const totalOpex = Object.values(buckets).reduce((a, b) => a + b, 0)
    const operatingProfit = grossProfit - totalOpex
    const taxRate = 0.20
    const tax = operatingProfit > 0 ? Math.round(operatingProfit * taxRate) : 0
    const netProfit = operatingProfit - tax

    // Cashflow rough estimate: net profit + depreciation - working-capital change
    const wcChange = Math.round(revenue * 0.05 * (rng() - 0.5))
    const cashflow = netProfit + buckets.depreciation - wcChange

    months.push({
      month: i + 1,
      revenue, cogs, grossProfit,
      buckets,
      totalOpex,
      operatingProfit,
      tax, netProfit,
      cashflow,
    })
  }
  return months
}

const PROFILES = {
  'COM-A': { // healthy — solidly profitable
    baseRev: 1_800_000_000, growth: 0.04, grossMargin: 0.45,
    costPct: { hr: 0.16, marketing: 0.06, rent: 0.05, operations: 0.04, depreciation: 0.02, interest: 0.01, other: 0.01 },
  },
  'COM-B': { // clearly loss-making
    baseRev: 900_000_000, growth: -0.01, grossMargin: 0.28,
    costPct: { hr: 0.22, marketing: 0.12, rent: 0.10, operations: 0.06, depreciation: 0.03, interest: 0.02, other: 0.02 },
  },
  'COM-C': { // thin margin
    baseRev: 1_200_000_000, growth: 0.015, grossMargin: 0.36,
    costPct: { hr: 0.18, marketing: 0.07, rent: 0.06, operations: 0.04, depreciation: 0.02, interest: 0.01, other: 0.01 },
  },
  'COM-D': { // profitable but over-budget on HR & Marketing
    baseRev: 1_500_000_000, growth: 0.025, grossMargin: 0.55,
    costPct: { hr: 0.22, marketing: 0.11, rent: 0.06, operations: 0.04, depreciation: 0.02, interest: 0.015, other: 0.01 },
  },
}

const MONTHLY = Object.fromEntries(COMPANIES.map(c => [c.id, buildMonthly(c.id, PROFILES[c.id])]))

// AR/AP — synthesized as % of trailing 60-day revenue
function arApFor(companyId) {
  const months = MONTHLY[companyId]
  const last2 = months.slice(-2).reduce((a, m) => a + m.revenue, 0)
  return {
    receivables: Math.round(last2 * 0.45),
    payables:    Math.round(last2 * 0.30),
    cashOnHand:  Math.round(last2 * 0.18),
  }
}

// Default thresholds per the spec (HR ≤ 20%, Marketing ≤ 10%, Rent ≤ 15%).
const DEFAULT_THRESHOLDS = {
  hr:           { maxPctOfRevenue: 20 },
  marketing:    { maxPctOfRevenue: 10 },
  rent:         { maxPctOfRevenue: 15 },
  operations:   { maxPctOfRevenue: 10 },
  depreciation: { maxPctOfRevenue: 5  },
  interest:     { maxPctOfRevenue: 3  },
  other:        { maxPctOfRevenue: 3  },
}

// Per-company threshold overrides — kept in memory; survives one server life.
const THRESHOLDS = Object.fromEntries(COMPANIES.map(c => [c.id, structuredClone(DEFAULT_THRESHOLDS)]))

module.exports = {
  COMPANIES, COST_BUCKETS, COA_MAPPING_TT200,
  MONTHLY, arApFor,
  DEFAULT_THRESHOLDS, THRESHOLDS,
}
