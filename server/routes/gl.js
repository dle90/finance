const express = require('express')
const multer = require('multer')
const crypto = require('crypto')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { parseWorkbook } = require('../lib/glParser')
const { COMPANIES } = require('../data/fixtures')
const GLEntry = require('../models/GLEntry')
const GLImport = require('../models/GLImport')

const router = express.Router()
router.use(requireAuth)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB cap
})

const requireCompany = (req, res, next) => {
  const c = COMPANIES.find(x => x.id === req.params.id)
  if (!c) return res.status(404).json({ error: 'Không tìm thấy công ty' })
  req.company = c
  next()
}

// Preview an upload without persisting. Used by the drag-drop UI to render
// summary stats and a sample of parsed rows before the user commits.
router.post('/companies/:id/gl-import/preview',
  requireAdmin, requireCompany, upload.single('file'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Thiếu file' })
    try {
      const result = parseWorkbook(req.file.buffer)
      res.json({
        fileName: req.file.originalname,
        fileSize: req.file.size,
        reportType: result.reportType,
        stats: result.stats,
        warnings: result.warnings,
        sample: result.entries.slice(0, 25),
      })
    } catch (e) {
      res.status(400).json({ error: 'Đọc file thất bại: ' + e.message })
    }
  }
)

// Commit an upload — parse + write GLEntry rows + a GLImport audit row.
router.post('/companies/:id/gl-import',
  requireAdmin, requireCompany, upload.single('file'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Thiếu file' })
    try {
      const result = parseWorkbook(req.file.buffer)
      if (!result.entries.length) {
        return res.status(400).json({
          error: 'Không tìm thấy dòng dữ liệu hợp lệ trong file',
          warnings: result.warnings,
        })
      }

      const batchId = crypto.randomUUID()
      const docs = result.entries.map(e => ({ ...e, companyId: req.company.id, importBatchId: batchId }))
      await GLEntry.insertMany(docs, { ordered: false })

      const audit = await GLImport.create({
        _id: batchId,
        companyId: req.company.id,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        importedBy: req.user.username,
        reportType: result.reportType,
        rowCountTotal: result.stats.totalRows,
        rowCountKept: result.stats.kept,
        rowCountSkipped: result.stats.skipped,
        dateMin: result.stats.dateMin,
        dateMax: result.stats.dateMax,
        totalDebit: result.stats.totalDebit,
        totalCredit: result.stats.totalCredit,
        warnings: result.warnings,
      })

      res.json({ ok: true, batchId, import: audit, stats: result.stats })
    } catch (e) {
      res.status(500).json({ error: 'Lưu dữ liệu thất bại: ' + e.message })
    }
  }
)

// List past imports for a company (for the Import page sidebar)
router.get('/companies/:id/gl-imports', requireCompany, async (req, res) => {
  const items = await GLImport.find({ companyId: req.company.id })
    .sort({ importedAt: -1 })
    .limit(50)
    .lean()
  res.json(items)
})

// Roll back a batch — deletes the GLEntry rows and the audit row.
router.delete('/companies/:id/gl-imports/:batchId', requireAdmin, requireCompany, async (req, res) => {
  const { batchId } = req.params
  const audit = await GLImport.findOne({ _id: batchId, companyId: req.company.id })
  if (!audit) return res.status(404).json({ error: 'Không tìm thấy batch' })
  const del = await GLEntry.deleteMany({ companyId: req.company.id, importBatchId: batchId })
  await GLImport.deleteOne({ _id: batchId })
  res.json({ ok: true, removedEntries: del.deletedCount })
})

// Query entries — paginated, optional date range and account-prefix filter.
// Used by future report rebuild + by an "inspect raw GL" page.
router.get('/companies/:id/gl-entries', requireCompany, async (req, res) => {
  const q = { companyId: req.company.id }
  const { from, to, account, limit = '200', skip = '0' } = req.query
  if (from || to) {
    q.postingDate = {}
    if (from) q.postingDate.$gte = new Date(from)
    if (to)   q.postingDate.$lte = new Date(to)
  }
  if (account) {
    const rx = new RegExp('^' + String(account))
    q.$or = [{ debitAccount: rx }, { creditAccount: rx }]
  }
  const lim = Math.min(Math.max(Number(limit) || 200, 1), 1000)
  const sk  = Math.max(Number(skip) || 0, 0)
  const [items, total] = await Promise.all([
    GLEntry.find(q).sort({ postingDate: -1, _id: -1 }).skip(sk).limit(lim).lean(),
    GLEntry.countDocuments(q),
  ])
  res.json({ items, total, skip: sk, limit: lim })
})

module.exports = router
