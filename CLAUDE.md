# Project notes

Notes that should travel with the repo. Add new entries at the top.

## Open questions / revisit-later

### Management ↔ Tax reconciliation views

When the Adjustments layer is built, every management-report aggregate must be reconcilable line-by-line back to the corresponding MISA accounting/tax figure.

**Why:** dashboards overlay management adjustments (reclassifications, allocations, accruals, what-ifs) on top of immutable MISA `GLEntry` rows. Decision-makers need to trust the numbers, defend them in audit, and point at "this is what MISA officially says, this is what we adjusted, this is the management figure." Without that tie-back, the management view becomes parallel-truth and loses credibility — and any "Suggest fix in MISA" memo to the accountants needs to cite the exact MISA numbers being challenged.

**How to apply:** revisit once a real GL Excel has been imported. Build a "Đối chiếu MISA ↔ Quản trị" page that for any period shows MISA actual / Adjustments / Management as three side-by-side columns at every P&L line, with drill-down to the contributing adjustments and source GL entries. Every report aggregator (group, P&L, cost structure) should be written to expose those three numbers — never collapse them into a single "management" figure without preserving the breakdown. Tax-report line numbers (B02-DN mã số 01, 02, 10, 11, …) are a candidate axis for the reconciliation — map our P&L lines to them so the page can be cross-checked against the company's filed return.
