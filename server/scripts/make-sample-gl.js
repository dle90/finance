// Generate a synthetic MISA-style Sổ Nhật Ký Chung Excel for smoke-testing the
// importer. Mirrors the layout we expect from a real export: 4 title rows,
// 2-row merged header (parent "Số phát sinh" over children "Nợ"/"Có"), then
// data, with a "Cộng phát sinh" summary row at the end (which the parser must
// drop).
const path = require('path')
const XLSX = require('xlsx')

const out = path.join(__dirname, '..', '..', 'sample-gl.xlsx')

const titleRows = [
  ['CÔNG TY TNHH ABC', '', '', '', '', '', '', '', '', ''],
  ['Địa chỉ: 123 Đường XYZ, Q.1, TP.HCM', '', '', '', '', '', '', '', '', ''],
  ['SỔ NHẬT KÝ CHUNG', '', '', '', '', '', '', '', '', ''],
  ['Từ ngày 01/01/2026 đến ngày 31/01/2026', '', '', '', '', '', '', '', '', ''],
  [],
]

// Two-row merged header: parent "Số phát sinh" over "Nợ"/"Có" subcells.
const headerTop = [
  'Ngày tháng ghi sổ', 'Số chứng từ', 'Ngày chứng từ',
  'Diễn giải', 'Tài khoản Nợ', 'Tài khoản Có',
  'Số phát sinh', '',
  'Mã đối tượng', 'Tên đối tượng',
]
const headerSub = ['', '', '', '', '', '', 'Nợ', 'Có', '', '']

const data = [
  ['05/01/2026', 'BH001', '05/01/2026', 'Bán hàng cho KH-001 - hóa đơn 0000123', '131', '5111', '110.000.000', '', 'KH001', 'Công ty CP MN'],
  ['05/01/2026', 'BH001', '05/01/2026', 'Thuế GTGT đầu ra 10%', '131', '33311', '11.000.000', '', 'KH001', 'Công ty CP MN'],
  ['05/01/2026', 'BH001', '05/01/2026', 'Giá vốn hàng bán BH001', '632', '156', '70.000.000', '', '', ''],
  ['10/01/2026', 'PT005', '10/01/2026', 'Khách hàng KH-001 thanh toán', '1121', '131', '121.000.000', '', 'KH001', 'Công ty CP MN'],
  ['12/01/2026', 'PC012', '12/01/2026', 'Chi tiền lương tháng 12/2025', '334', '1111', '450.000.000', '', '', ''],
  ['12/01/2026', 'PC012', '12/01/2026', 'Trích BHXH/BHYT/BHTN', '6422', '338', '85.500.000', '', '', ''],
  ['15/01/2026', 'PC015', '15/01/2026', 'Thanh toán tiền thuê văn phòng tháng 1', '6422', '1121', '60.000.000', '', 'NCC003', 'Cao ốc DEF'],
  ['15/01/2026', 'PC015', '15/01/2026', 'Chi phí marketing - Facebook ads', '6421', '1121', '45.000.000', '', 'NCC008', 'Meta Platforms'],
  ['18/01/2026', 'BH002', '18/01/2026', 'Bán hàng cho KH-002', '131', '5111', '85.000.000', '', 'KH002', 'Công ty TNHH XYZ'],
  ['18/01/2026', 'BH002', '18/01/2026', 'Thuế GTGT đầu ra 10%', '131', '33311', '8.500.000', '', 'KH002', 'Công ty TNHH XYZ'],
  ['18/01/2026', 'BH002', '18/01/2026', 'Giá vốn BH002', '632', '156', '52.000.000', '', '', ''],
  ['20/01/2026', 'PC020', '20/01/2026', 'Lãi vay ngân hàng tháng 1', '635', '1121', '15.000.000', '', 'NCC001', 'Vietcombank'],
  ['25/01/2026', 'PC025', '25/01/2026', 'Khấu hao TSCĐ tháng 1', '6422', '214', '12.000.000', '', '', ''],
  ['28/01/2026', 'PC028', '28/01/2026', 'Chi phí vận hành khác', '6422', '1111', '8.500.000', '', '', ''],
  // Some rows the parser should DROP:
  [],                                                                                                              // empty row
  ['', '', '', 'Cộng phát sinh trong kỳ', '', '', '1.053.500.000', '1.053.500.000', '', ''],                       // summary
  ['', '', '', 'Lũy kế từ đầu năm', '', '', '1.053.500.000', '1.053.500.000', '', ''],                             // summary
]

const sheet = [...titleRows, headerTop, headerSub, ...data]
const ws = XLSX.utils.aoa_to_sheet(sheet)

// Merge "Số phát sinh" across the two amount columns to mimic real exports.
ws['!merges'] = ws['!merges'] || []
ws['!merges'].push({ s: { r: 5, c: 6 }, e: { r: 5, c: 7 } }) // header row index 5 (0-based), cols G:H

const wb = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(wb, ws, 'Nhat ky chung')
XLSX.writeFile(wb, out)
console.log('Wrote', out)
