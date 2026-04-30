// Report tree for the Finance dashboard. Mirrors LinkRad's Tài Chính subtree
// but is the only group here — clinical / vận hành removed.

export const REPORT_GROUPS = [
  {
    key: 'tai-chinh',
    label: 'Tài Chính',
    items: [
      { key: 'tai-chinh-overview', label: 'Tổng quan', icon: '💼' },
      { key: 'doanh-thu',          label: 'Doanh thu', icon: '💰' },
    ],
  },
]

export const TOP_LEVEL = { key: 'tong-quan', label: 'Tổng Quan', icon: '📊' }

export const REPORT_TO_GROUP = Object.fromEntries(
  REPORT_GROUPS.flatMap(g => g.items.map(i => [i.key, { group: g, item: i }]))
)

export const DEFAULT_REPORT_KEY = TOP_LEVEL.key

// Doanh thu sub-dimensions — these will eventually map to Misa-backed
// queries. The dimension list itself is UI-driven, separate from the
// data source.
export const DOANH_THU_DIMENSIONS = [
  { key: 'revenue-detail',    label: 'Chi tiết' },
  { key: 'clinic-revenue',    label: 'Chi nhánh' },
  { key: 'customer-detail',   label: 'Khách hàng' },
  { key: 'referral-revenue',  label: 'Đối tác GT' },
  { key: 'promotion-detail',  label: 'Khuyến mãi' },
  { key: 'refund-exchange',   label: 'Hoàn trả / đổi' },
  { key: 'e-invoice',         label: 'Hóa đơn điện tử' },
]
