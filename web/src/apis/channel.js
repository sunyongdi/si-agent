import { apiGet, apiPost, apiPatch, apiDelete } from './base'

export const channelApi = {
  types: () => apiGet('/channels/types'),
  list: () => apiGet('/channels/'),
  create: (data) => apiPost('/channels/', data),
  get: (id) => apiGet(`/channels/${encodeURIComponent(id)}`),
  update: (id, data) => apiPatch(`/channels/${encodeURIComponent(id)}`, data),
  remove: (id) => apiDelete(`/channels/${encodeURIComponent(id)}`),
  enable: (id) => apiPost(`/channels/${encodeURIComponent(id)}/enable`),
  disable: (id) => apiPost(`/channels/${encodeURIComponent(id)}/disable`),
  status: (id) => apiGet(`/channels/${encodeURIComponent(id)}/status`),
  sessions: (id) => apiGet(`/channels/${encodeURIComponent(id)}/sessions`),
  chatIds: (id) => apiGet(`/channels/${encodeURIComponent(id)}/chat_ids`),
  startBinding: (channelType) => apiPost('/channels/bindings', { channel_type: channelType }),
  bindingStatus: (bindingId) => apiGet(`/channels/bindings/${encodeURIComponent(bindingId)}`),
  cancelBinding: (bindingId) => apiPost(`/channels/bindings/${encodeURIComponent(bindingId)}/cancel`),
}
