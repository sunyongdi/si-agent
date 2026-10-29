import { apiGet, apiPost, apiPatch, apiDelete, encodeParams } from './base'

export const knowledgeApi = {
  list: (params = {}) =>
    apiGet(`/knowledge_bases/${encodeParams({ page: 1, page_size: 50, ...params })}`),
  create: (data) => apiPost('/knowledge_bases/', data),
  update: (id, data) => apiPatch(`/knowledge_bases/${encodeURIComponent(id)}`, data),
  remove: (id) => apiDelete(`/knowledge_bases/${encodeURIComponent(id)}`),
  embeddingModels: () => apiGet('/knowledge_bases/embedding_models'),
  chunkers: () => apiGet('/knowledge_bases/chunkers'),
  supportedContentTypes: () => apiGet('/knowledge_bases/supported_content_types'),
  middlewareSchema: () => apiGet('/knowledge_bases/middleware/parameters_schema'),

  listDocuments: (kbId, params = {}) =>
    apiGet(
      `/knowledge_bases/${encodeURIComponent(kbId)}/documents${encodeParams({ page: 1, page_size: 50, ...params })}`
    ),
  uploadDocument: (kbId, file, contentType) => {
    const form = new FormData()
    form.append('file', file)
    if (contentType) form.append('content_type', contentType)
    return apiPost(`/knowledge_bases/${encodeURIComponent(kbId)}/documents`, form)
  },
  documentStatus: (kbId, ids) =>
    apiGet(`/knowledge_bases/${encodeURIComponent(kbId)}/documents/status${encodeParams({ ids })}`),
  removeDocument: (kbId, docId) =>
    apiDelete(`/knowledge_bases/${encodeURIComponent(kbId)}/documents/${encodeURIComponent(docId)}`),
  downloadToken: (kbId, docId) =>
    apiPost(
      `/knowledge_bases/${encodeURIComponent(kbId)}/documents/${encodeURIComponent(docId)}/download_token`
    ),
  documentChunks: (kbId, docId, params = {}) =>
    apiGet(
      `/knowledge_bases/${encodeURIComponent(kbId)}/documents/${encodeURIComponent(docId)}/chunks${encodeParams({ page: 1, page_size: 20, ...params })}`
    ),
  search: (kbId, query, topK = 5) =>
    apiPost(`/knowledge_bases/${encodeURIComponent(kbId)}/search`, { query, top_k: topK }),
}
