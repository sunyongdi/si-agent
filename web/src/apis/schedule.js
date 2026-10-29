import { apiGet, apiPost, apiPatch, apiDelete } from './base'

export const scheduleApi = {
  list: () => apiGet('/schedule/'),
  create: (data) => apiPost('/schedule/', data),
  update: (id, data) => apiPatch(`/schedule/${encodeURIComponent(id)}`, data),
  remove: (id) => apiDelete(`/schedule/${encodeURIComponent(id)}`),
  sessions: (id) => apiGet(`/schedule/${encodeURIComponent(id)}/sessions`),
}
