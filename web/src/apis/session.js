import { apiGet, apiPost, apiPatch, apiDelete, encodeParams, API_PREFIX, authHeaders } from './base'

export const agentApi = {
  list: () => apiGet('/agent/'),
  get: (agentId) => apiGet(`/agent/${encodeURIComponent(agentId)}`),
  create: (data) => apiPost('/agent/', data),
  update: (agentId, data) => apiPatch(`/agent/${encodeURIComponent(agentId)}`, data),
  remove: (agentId) => apiDelete(`/agent/${encodeURIComponent(agentId)}`),
  schemaV2: () => apiGet('/agent/schema/v2'),
}

export const chatApi = {
  trigger: (data) => apiPost('/chat/', data),
}

export const sessionApi = {
  list: (agentId) => apiGet(`/sessions/${encodeParams({ agent_id: agentId })}`),
  create: (data) => apiPost('/sessions/', data),
  update: (sessionId, agentId, data) =>
    apiPatch(`/sessions/${encodeURIComponent(sessionId)}${encodeParams({ agent_id: agentId })}`, data),
  remove: (sessionId, agentId) =>
    apiDelete(`/sessions/${encodeURIComponent(sessionId)}${encodeParams({ agent_id: agentId })}`),
  messages: (sessionId, agentId, params = {}) =>
    apiGet(
      `/sessions/${encodeURIComponent(sessionId)}/messages${encodeParams({ agent_id: agentId, ...params })}`
    ),
  status: (sessionId, agentId) =>
    apiGet(`/sessions/${encodeURIComponent(sessionId)}/status${encodeParams({ agent_id: agentId })}`),
  interrupt: (sessionId, agentId) =>
    apiPost(`/sessions/${encodeURIComponent(sessionId)}/interrupt${encodeParams({ agent_id: agentId })}`),
  streamUrl: (sessionId, agentId, after) =>
    API_PREFIX +
    `/sessions/${encodeURIComponent(sessionId)}/stream${encodeParams({ agent_id: agentId, after })}`,
  authHeaders,
}
