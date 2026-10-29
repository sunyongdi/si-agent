import { apiGet, apiPost, apiPatch, apiDelete, encodeParams } from './base'

export const sopApi = {
  schema: () => apiGet('/sop/schema'),
  list: () => apiGet('/sop/'),
  create: (data) => apiPost('/sop/', data),
  get: (id) => apiGet(`/sop/${encodeURIComponent(id)}`),
  update: (id, data) => apiPatch(`/sop/${encodeURIComponent(id)}`, data),
  remove: (id) => apiDelete(`/sop/${encodeURIComponent(id)}`),
  startRun: (id, inputs = []) => apiPost(`/sop/${encodeURIComponent(id)}/runs`, { inputs }),
  listRuns: (params = {}) => apiGet(`/sop/runs${encodeParams(params)}`),
  getRun: (runId) => apiGet(`/sop/runs/${encodeURIComponent(runId)}`),
  removeRun: (runId) => apiDelete(`/sop/runs/${encodeURIComponent(runId)}`),
  submitVerdict: (runId, data) => apiPost(`/sop/runs/${encodeURIComponent(runId)}/verdict`, data),
}
