import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use(config => {
  try {
    const stored = localStorage.getItem('finance_auth')
    if (stored) {
      const { token } = JSON.parse(stored)
      config.headers['Authorization'] = `Bearer ${token}`
    }
  } catch {}
  return config
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('finance_auth')
      window.location.reload()
    }
    return Promise.reject(err)
  }
)

export const loginUser  = (username, password) => api.post('/auth/login', { username, password }).then(r => r.data)
export const logoutUser = () => api.post('/auth/logout').then(r => r.data)

// period can be 'day'|'mtd'|'ytd' or { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }
function periodParams(period) {
  if (period && typeof period === 'object') return { dateFrom: period.from, dateTo: period.to }
  return { period }
}

// Finance ────────────────────────────────────────────────
export const getCompanies   = () => api.get('/finance/companies').then(r => r.data)
export const getBuckets     = () => api.get('/finance/buckets').then(r => r.data)
export const getCoaMapping  = () => api.get('/finance/coa-mapping').then(r => r.data)

export const getGroupSummary    = (period) => api.get('/finance/reports/group/summary', { params: periodParams(period) }).then(r => r.data)
export const getCompanySummary  = (id, period) => api.get(`/finance/reports/company/${id}/summary`, { params: periodParams(period) }).then(r => r.data)
export const getCostStructure   = (id, period) => api.get(`/finance/reports/company/${id}/cost-structure`, { params: periodParams(period) }).then(r => r.data)
export const getPnl             = (id, period) => api.get(`/finance/reports/company/${id}/pnl`, { params: periodParams(period) }).then(r => r.data)

export const getThresholds      = (id) => api.get(`/finance/companies/${id}/thresholds`).then(r => r.data)
export const updateThresholds   = (id, thresholds) => api.put(`/finance/companies/${id}/thresholds`, { thresholds }).then(r => r.data)

export const getAlerts          = (period) => api.get('/finance/alerts', { params: periodParams(period) }).then(r => r.data)
export const triggerSync        = () => api.post('/finance/sync').then(r => r.data)

// GL import ──────────────────────────────────────────────
export const previewGlImport = (companyId, file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post(`/finance/companies/${companyId}/gl-import/preview`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}
export const commitGlImport = (companyId, file) => {
  const fd = new FormData()
  fd.append('file', file)
  return api.post(`/finance/companies/${companyId}/gl-import`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data)
}
export const listGlImports  = (companyId) => api.get(`/finance/companies/${companyId}/gl-imports`).then(r => r.data)
export const deleteGlImport = (companyId, batchId) => api.delete(`/finance/companies/${companyId}/gl-imports/${batchId}`).then(r => r.data)
export const getGlEntries   = (companyId, params) => api.get(`/finance/companies/${companyId}/gl-entries`, { params }).then(r => r.data)

export default api
