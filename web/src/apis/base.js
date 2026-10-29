import { useUserStore } from '@/stores/user'
import { globalMessage } from '@/utils/globalMessage'

export const API_PREFIX = import.meta.env.VITE_API_PREFIX || '/api'

function parseDetail(detail) {
  if (!detail) return ''
  if (typeof detail === 'string') return detail
  if (typeof detail === 'object') {
    if (detail.error || detail.message) return detail.error || detail.message
    try {
      return JSON.stringify(detail)
    } catch {
      return String(detail)
    }
  }
  return String(detail)
}

export async function apiRequest(url, options = {}, responseType = 'json') {
  const { headers = {}, body, ...rest } = options
  const finalHeaders = { ...headers, ...useUserStore.getState().getAuthHeaders() }
  if (body && !(body instanceof FormData) && !finalHeaders['Content-Type']) {
    finalHeaders['Content-Type'] = 'application/json'
  }

  const response = await fetch(API_PREFIX + url, {
    ...rest,
    headers: finalHeaders,
    body: body instanceof FormData || typeof body === 'string' ? body : body != null ? JSON.stringify(body) : undefined,
  })

  if (!response.ok) {
    let message = ''
    try {
      const data = await response.json()
      message = parseDetail(data.detail ?? data)
    } catch {
      message = response.statusText
    }
    if (response.status === 401) {
      useUserStore.getState().logout()
      message = '登录已失效，请重新登录'
      if (window.location.pathname !== '/login') {
        globalMessage.error(message)
        setTimeout(() => window.location.assign('/login'), 1200)
      }
    } else {
      if (response.status === 404) message = message || '资源不存在'
      if (response.status === 403) message = message || '没有权限执行此操作'
      if (response.status === 422) message = message || '请求参数校验失败'
      if (response.status >= 500) message = message || '服务器内部错误，请查看后端日志'
    }
    const error = new Error(message)
    error.response = { status: response.status, statusText: response.statusText }
    throw error
  }

  if (responseType === 'blob') return response
  if (responseType === 'text') return response.text()
  const contentType = response.headers.get('Content-Type') || ''
  if (contentType.includes('application/json')) return response.json()
  return response.text()
}

export const apiGet = (url, options) => apiRequest(url, { method: 'GET', ...options })
export const apiPost = (url, body, options) => apiRequest(url, { method: 'POST', body, ...options })
export const apiPatch = (url, body, options) => apiRequest(url, { method: 'PATCH', body, ...options })
export const apiDelete = (url, options) => apiRequest(url, { method: 'DELETE', ...options })

export function authHeaders() {
  return useUserStore.getState().getAuthHeaders()
}

export function encodeParams(params = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.append(key, value)
  })
  const str = search.toString()
  return str ? `?${str}` : ''
}
