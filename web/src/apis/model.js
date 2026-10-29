import { apiGet, apiPost, apiPatch, apiDelete, encodeParams } from './base'

export const credentialApi = {
  list: () => apiGet('/credential/'),
  create: (data) => apiPost('/credential/', data),
  update: (id, data) => apiPatch(`/credential/${encodeURIComponent(id)}`, data),
  remove: (id) => apiDelete(`/credential/${encodeURIComponent(id)}`),
  schemas: () => apiGet('/credential/schemas'),
}

export const modelApi = {
  listChatModels: (provider) => apiGet(`/model/${encodeParams({ provider })}`),
  listTtsModels: (provider) => apiGet(`/tts-model/${encodeParams({ provider })}`),
  listEmbeddingModels: (provider) => apiGet(`/embedding-model/${encodeParams({ provider })}`),
  listRealtimeModels: (provider) => apiGet(`/realtime/models${encodeParams({ provider })}`),
}
