const mongoose = require('mongoose')

// Audit row for each Excel upload. One per file, regardless of how many GLEntry
// rows it produced. Lets the UI show "last imported X by Y" and supports
// rolling back a bad batch without losing earlier ones.
const glImportSchema = new mongoose.Schema({
  _id:           { type: String }, // batch id (uuid)
  companyId:     { type: String, required: true, index: true },
  fileName:      { type: String },
  fileSize:      { type: Number },
  importedBy:    { type: String },
  importedAt:    { type: Date, default: Date.now },
  reportType:    { type: String, enum: ['journal', 'ledger', 'trial_balance', 'unknown'], default: 'journal' },
  rowCountTotal: { type: Number, default: 0 },
  rowCountKept:  { type: Number, default: 0 },
  rowCountSkipped: { type: Number, default: 0 },
  dateMin:       { type: Date },
  dateMax:       { type: Date },
  totalDebit:    { type: Number, default: 0 },
  totalCredit:   { type: Number, default: 0 },
  warnings:      [String],
}, { _id: false })

module.exports = mongoose.model('GLImport', glImportSchema)
