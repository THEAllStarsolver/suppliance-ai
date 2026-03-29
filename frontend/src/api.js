import axios from 'axios'

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080' })

// Attach user_id header if available
export const setUserId = (uid) => {
  if (uid) api.defaults.headers.common['x-user-id'] = uid
  else delete api.defaults.headers.common['x-user-id']
}

// Existing
export const analyzeShipment = (data) => api.post('/api/analyze', data).then(r => r.data)
export const getSampleShipments = () => api.get('/api/shipments/sample').then(r => r.data)
export const getAudit = (id) => api.get(`/api/audit/${id}`).then(r => r.data)
export const listAudits = () => api.get('/api/audits').then(r => r.data)

// Suppliers & Dealers
export const addSupplier = (data) => api.post('/api/suppliers', data).then(r => r.data)
export const getSuppliers = () => api.get('/api/suppliers').then(r => r.data)
export const addDealer = (data) => api.post('/api/dealers', data).then(r => r.data)
export const getDealers = () => api.get('/api/dealers').then(r => r.data)

// Approval
export const approveDecision = (auditId) => api.post(`/api/approve/${auditId}`).then(r => r.data)
export const rejectDecision = (auditId) => api.post(`/api/reject/${auditId}`).then(r => r.data)

// Insights
export const getInsights = () => api.get('/api/insights').then(r => r.data)

// Business types
export const getBusinessTypes = () => api.get('/api/business-types').then(r => r.data)

// Geocode
export const geocodeCity = (city) => api.get('/api/geocode', { params: { city } }).then(r => r.data)
