import { apiGet, apiPost, apiPatch, apiDelete, encodeParams } from './base'

export const mcpApi = {
  listInstalled: () => apiGet('/mcp'),
  update: (id, data) => apiPatch(`/mcp/${encodeURIComponent(id)}`, data),
  remove: (id) => apiDelete(`/mcp/${encodeURIComponent(id)}`),
  listHubs: () => apiGet('/hub/mcp'),
  listCards: (hubId, params = {}) =>
    apiGet(`/hub/mcp/${encodeURIComponent(hubId)}/cards${encodeParams({ limit: 40, ...params })}`),
  getCard: (hubId, cardId) =>
    apiGet(`/hub/mcp/${encodeURIComponent(hubId)}/cards/${encodeURIComponent(cardId)}`),
  install: (hubId, cardId, data = {}) =>
    apiPost(`/hub/mcp/${encodeURIComponent(hubId)}/cards/${encodeURIComponent(cardId)}/install`, data),
}

export const skillApi = {
  listInstalled: () => apiGet('/skill'),
  get: (id) => apiGet(`/skill/${encodeURIComponent(id)}`),
  remove: (id) => apiDelete(`/skill/${encodeURIComponent(id)}`),
  listHubs: () => apiGet('/hub/skill'),
  listCards: (hubId, params = {}) =>
    apiGet(`/hub/skill/${encodeURIComponent(hubId)}/cards${encodeParams({ limit: 40, ...params })}`),
  getCard: (hubId, cardId) =>
    apiGet(`/hub/skill/${encodeURIComponent(hubId)}/cards/${encodeURIComponent(cardId)}`),
  install: (hubId, cardId, name) =>
    apiPost(
      `/hub/skill/${encodeURIComponent(hubId)}/cards/${encodeURIComponent(cardId)}/install${encodeParams({ name })}`
    ),
}

export const workspaceMcpApi = {
  list: (agentId, sessionId) =>
    apiGet(`/workspace/mcp${encodeParams({ agent_id: agentId, session_id: sessionId })}`),
  add: (agentId, sessionId, data) =>
    apiPost(`/workspace/mcp${encodeParams({ agent_id: agentId, session_id: sessionId })}`, data),
  addFromLibrary: (agentId, sessionId, mcpIds) =>
    apiPost(`/workspace/mcp/from-library${encodeParams({ agent_id: agentId, session_id: sessionId })}`, {
      mcp_ids: mcpIds,
    }),
  remove: (agentId, sessionId, name) =>
    apiDelete(
      `/workspace/mcp/${encodeURIComponent(name)}${encodeParams({ agent_id: agentId, session_id: sessionId })}`
    ),
}

export const workspaceSkillApi = {
  list: (agentId, sessionId) =>
    apiGet(`/workspace/skill${encodeParams({ agent_id: agentId, session_id: sessionId })}`),
  addFromLibrary: (agentId, sessionId, skillIds) =>
    apiPost(`/workspace/skill/from-library${encodeParams({ agent_id: agentId, session_id: sessionId })}`, {
      skill_ids: skillIds,
    }),
  remove: (agentId, sessionId, name) =>
    apiDelete(
      `/workspace/skill/${encodeURIComponent(name)}${encodeParams({ agent_id: agentId, session_id: sessionId })}`
    ),
}
