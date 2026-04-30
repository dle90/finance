// Navigation tree for the management-finance dashboard. Two top-level zones:
// Group (across companies) and Company (single-company drill-down). Plus admin
// utilities for thresholds & alerts.

export const NAV = [
  {
    label: 'Tổng quan tập đoàn',
    items: [
      { path: '/group',   label: 'Dashboard tập đoàn', icon: '🏢' },
      { path: '/alerts',  label: 'Cảnh báo',           icon: '🚨' },
    ],
  },
  {
    label: 'Theo công ty',
    items: [
      { path: '/company',         label: 'Tổng quan',     icon: '📊' },
      { path: '/company/pnl',     label: 'Kết quả KD',     icon: '📈' },
      { path: '/company/costs',   label: 'Cơ cấu chi phí', icon: '💸' },
      { path: '/company/import',  label: 'Nhập Sổ Cái',    icon: '📥' },
      { path: '/company/thresholds', label: 'Định mức',    icon: '🎯' },
    ],
  },
]
