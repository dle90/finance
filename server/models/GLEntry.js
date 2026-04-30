const mongoose = require('mongoose')

// One row from an imported MISA Sổ Nhật Ký Chung. Each row is a single Nợ/Có
// pair posted on the same voucher. We keep the raw account codes; bucket
// classification happens at query time via the COA prefix map so changing the
// map doesn't require re-importing.
const glEntrySchema = new mongoose.Schema({
  companyId:        { type: String, required: true, index: true },
  importBatchId:    { type: String, required: true, index: true },
  postingDate:      { type: Date, required: true, index: true },
  voucherDate:      { type: Date },
  voucherNo:        { type: String },
  description:      { type: String },
  debitAccount:     { type: String, index: true },
  creditAccount:    { type: String, index: true },
  amount:           { type: Number, required: true }, // VND, always positive
  counterpartyCode: { type: String, index: true },
  counterpartyName: { type: String },
  costItem:         { type: String }, // Khoản mục CP (optional analytical tag)
  rowIndex:         { type: Number }, // original Excel row, for traceability
}, { timestamps: true })

glEntrySchema.index({ companyId: 1, postingDate: 1 })

module.exports = mongoose.model('GLEntry', glEntrySchema)
