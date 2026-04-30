const XLSX = require('xlsx')

// Strip Vietnamese diacritics + lowercase, for resilient header matching.
function norm(s) {
  if (s == null) return ''
  return String(s)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase().trim().replace(/\s+/g, ' ')
}

// Parse a number from MISA Excel cell. Handles:
//  - empty / dash / "-" → 0
//  - negative in parentheses: "(1.234,56)"
//  - vi-VN format ("1.234.567,89") and en-US ("1,234,567.89")
//  - already a Number
function parseAmount(v) {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return v
  let s = String(v).trim()
  if (!s || s === '-' || s === '–' || s === '—') return 0
  let neg = false
  if (s.startsWith('(') && s.endsWith(')')) { neg = true; s = s.slice(1, -1) }
  if (s.endsWith('-')) { neg = true; s = s.slice(0, -1) }
  // Decide locale by which separator appears last — that's the decimal mark.
  // Special case: only dots and they form a clean thousands pattern (\d{1,3}(\.\d{3})+)
  // → vi-VN integer like "110.000.000". Else only-dot is en-US decimal "1.5".
  const lastDot = s.lastIndexOf('.')
  const lastComma = s.lastIndexOf(',')
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.')   // vi-VN: 1.234,56
    } else {
      s = s.replace(/,/g, '')                      // en-US: 1,234.56
    }
  } else if (lastComma > -1) {
    // Only commas. If pattern is \d{1,3}(,\d{3})+ → en-US thousands "1,234".
    // Otherwise treat comma as vi-VN decimal "1,5".
    if (/^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '')
    else s = s.replace(',', '.')
  } else if (lastDot > -1) {
    // Only dots. If pattern is \d{1,3}(\.\d{3})+ → vi-VN thousands "1.234.567".
    // Otherwise treat dot as en-US decimal "1.5".
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '')
    // else leave as-is (Number() will handle "1.5")
  }
  const n = Number(s)
  if (!Number.isFinite(n)) return 0
  return neg ? -n : n
}

// Parse a date from MISA Excel. Accepts:
//  - JS Date (already parsed by xlsx with cellDates)
//  - Excel serial number
//  - "dd/MM/yyyy" or "dd-MM-yyyy" or "yyyy-MM-dd" strings
function parseDate(v) {
  if (v == null || v === '') return null
  if (v instanceof Date && !isNaN(v)) return v
  if (typeof v === 'number') {
    const epoch = new Date(Math.round((v - 25569) * 86400 * 1000))
    return isNaN(epoch) ? null : epoch
  }
  const s = String(v).trim()
  // dd/MM/yyyy or dd-MM-yyyy
  let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/)
  if (m) {
    let [_, d, mo, y] = m
    if (y.length === 2) y = '20' + y
    const dt = new Date(Number(y), Number(mo) - 1, Number(d))
    return isNaN(dt) ? null : dt
  }
  // yyyy-MM-dd or yyyy/MM/dd
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (m) {
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    return isNaN(dt) ? null : dt
  }
  return null
}

// Find the header row(s). MISA exports have a 4–6 row title block, then
// either a single header row OR two merged rows where parent "Số phát sinh"
// spans children "Nợ" / "Có". We look for a row where ≥3 cells match known
// header keywords; if the row directly below also has matching subhead text,
// we treat them as merged.
const HEADER_KEYWORDS = [
  'ngay', 'so chung tu', 'so ct', 'so hieu', 'dien giai', 'tai khoan',
  'phat sinh', 'so tien', 'no', 'co', 'tk no', 'tk co', 'tk doi ung',
  'doi tuong', 'so du', 'khoan muc', 'ma',
]

function findHeader(rows) {
  for (let i = 0; i < Math.min(rows.length, 25); i++) {
    const cells = (rows[i] || []).map(norm)
    const hits = cells.filter(c => HEADER_KEYWORDS.some(kw => c.includes(kw))).length
    if (hits >= 3) {
      // Look for a sub-header row right below (merged 2-row header)
      const next = (rows[i + 1] || []).map(norm)
      const nextHits = next.filter(c => /\b(no|co)\b/.test(c) || c.includes('phat sinh') || c.includes('thanh tien')).length
      const merged = nextHits >= 2 && next.filter(c => c).length <= cells.filter(c => c).length + 4
      return { row: i, mergedRow: merged ? i + 1 : null }
    }
  }
  return null
}

// Build a column map by joining parent + child header cells where present.
function buildColumnMap(rows, header) {
  const top = (rows[header.row] || []).map(norm)
  const sub = header.mergedRow != null ? (rows[header.mergedRow] || []).map(norm) : []
  const cols = []
  let lastTop = ''
  for (let i = 0; i < Math.max(top.length, sub.length); i++) {
    const t = top[i] || ''
    const s = sub[i] || ''
    if (t) lastTop = t // forward-fill merged parent header
    const joined = [t || lastTop, s].filter(Boolean).join(' ').trim()
    cols.push(joined)
  }

  // Map each column index to a canonical field by keyword regex.
  const fieldOf = (header) => {
    const h = header
    if (!h) return null
    if (/(ngay).*(ghi so|hach toan|ht)/.test(h) || /\bngay ht\b/.test(h)) return 'postingDate'
    if (/(ngay).*(chung tu|ct)\b/.test(h) || /\bngay ct\b/.test(h)) return 'voucherDate'
    if (/(so).*(chung tu|ct|hieu)\b/.test(h) || /\bso ct\b/.test(h)) return 'voucherNo'
    if (/dien giai/.test(h)) return 'description'
    if (/(tai khoan|tk).*(no)\b/.test(h) || /^tk no\b/.test(h)) return 'debitAccount'
    if (/(tai khoan|tk).*(co)\b/.test(h) || /^tk co\b/.test(h)) return 'creditAccount'
    if (/(tk|tai khoan).*(doi ung|d\/u)/.test(h)) return 'contraAccount'
    if (/(phat sinh|so tien).*\bno\b/.test(h)) return 'debitAmount'
    if (/(phat sinh|so tien).*\bco\b/.test(h)) return 'creditAmount'
    if (/^so tien\b/.test(h) || /^thanh tien\b/.test(h)) return 'amount'
    if (/ma.*(doi tuong|kh|ncc)/.test(h)) return 'counterpartyCode'
    if (/(ten|name).*(doi tuong|kh|ncc)/.test(h) || /^doi tuong\b/.test(h)) return 'counterpartyName'
    if (/khoan muc/.test(h)) return 'costItem'
    return null
  }

  const map = {}
  cols.forEach((h, i) => {
    const f = fieldOf(h)
    if (f && map[f] == null) map[f] = i // first match wins
  })
  return { cols, map }
}

const SUMMARY_RX = /^(so du dau|so du cuoi|cong phat sinh|cong|luy ke|tong cong|tong)\b/

function isSummaryRow(rec) {
  const d = norm(rec.description)
  if (d && SUMMARY_RX.test(d)) return true
  return false
}

// Parse one workbook → { entries, warnings, stats, reportType }.
function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, cellNF: false })
  const warnings = []
  const allEntries = []
  let reportType = 'journal'
  let dateMin = null, dateMax = null
  let totalDebit = 0, totalCredit = 0
  let totalRows = 0, skipped = 0

  for (const sheetName of wb.SheetNames) {
    const sheet = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false })
    if (!rows.length) continue

    const header = findHeader(rows)
    if (!header) {
      warnings.push(`Sheet "${sheetName}": không tìm thấy hàng tiêu đề (bỏ qua).`)
      continue
    }
    const { map } = buildColumnMap(rows, header)

    // Detect report type by which fields the header exposes
    if (map.debitAccount != null && map.creditAccount != null && map.amount != null) {
      reportType = 'journal' // Sổ Nhật Ký Chung
    } else if (map.contraAccount != null && (map.debitAmount != null || map.creditAmount != null)) {
      reportType = 'ledger' // Sổ Cái — needs current account context
    } else if (map.debitAmount != null && map.creditAmount != null) {
      reportType = 'journal'
    } else {
      warnings.push(`Sheet "${sheetName}": không nhận diện được loại báo cáo (cần TK Nợ/Có hoặc Phát sinh Nợ/Có).`)
      continue
    }

    const dataStart = (header.mergedRow ?? header.row) + 1
    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i] || []
      if (row.every(c => c === '' || c == null)) continue
      totalRows++

      const get = (k) => map[k] != null ? row[map[k]] : undefined

      const rec = {
        postingDate: parseDate(get('postingDate')) || parseDate(get('voucherDate')),
        voucherDate: parseDate(get('voucherDate')),
        voucherNo: get('voucherNo') ? String(get('voucherNo')).trim() : '',
        description: get('description') ? String(get('description')).trim() : '',
        debitAccount: get('debitAccount') ? String(get('debitAccount')).trim() : '',
        creditAccount: get('creditAccount') ? String(get('creditAccount')).trim() : '',
        counterpartyCode: get('counterpartyCode') ? String(get('counterpartyCode')).trim() : '',
        counterpartyName: get('counterpartyName') ? String(get('counterpartyName')).trim() : '',
        costItem: get('costItem') ? String(get('costItem')).trim() : '',
        rowIndex: i + 1, // 1-based, matches Excel row numbers
      }

      // Resolve amount: explicit `amount` column OR debit/credit pair
      let amount = parseAmount(get('amount'))
      if (!amount) {
        const debit = parseAmount(get('debitAmount'))
        const credit = parseAmount(get('creditAmount'))
        amount = debit || credit
      }

      if (isSummaryRow(rec)) { skipped++; continue }
      if (!rec.postingDate) { skipped++; continue }
      if (!amount) { skipped++; continue }
      if (!rec.debitAccount && !rec.creditAccount) { skipped++; continue }

      rec.amount = Math.abs(amount)
      totalDebit += rec.amount
      totalCredit += rec.amount
      if (!dateMin || rec.postingDate < dateMin) dateMin = rec.postingDate
      if (!dateMax || rec.postingDate > dateMax) dateMax = rec.postingDate
      allEntries.push(rec)
    }
  }

  return {
    entries: allEntries,
    warnings,
    reportType,
    stats: {
      totalRows,
      kept: allEntries.length,
      skipped,
      dateMin, dateMax,
      totalDebit, totalCredit,
      sheetCount: wb.SheetNames.length,
    },
  }
}

module.exports = { parseWorkbook, parseAmount, parseDate, norm }
