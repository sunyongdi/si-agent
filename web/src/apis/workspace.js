import { apiGet, apiPost, apiDelete, encodeParams, API_PREFIX } from './base'

export const workspaceApi = {
  directories: (agentId, sessionId, path) =>
    apiGet(
      `/workspace/directories${encodeParams({ agent_id: agentId, session_id: sessionId, path })}`
    ),
  status: (agentId, sessionId) =>
    apiGet(`/workspace/status${encodeParams({ agent_id: agentId, session_id: sessionId })}`),
  fileDownloadToken: (agentId, sessionId, path) =>
    apiPost(`/workspace/files/download-token${encodeParams({ agent_id: agentId, session_id: sessionId, path })}`),
}

export async function openWorkspaceFile(agentId, sessionId, path) {
  const token = await workspaceApi.fileDownloadToken(agentId, sessionId, path)
  const url =
    API_PREFIX +
    `/workspace/files${encodeParams({ agent_id: agentId, session_id: sessionId, path, token: token.token })}`
  window.open(url, '_blank')
}
