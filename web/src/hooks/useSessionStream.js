import { useEffect, useRef, useCallback } from 'react'
import { sessionApi } from '@/apis/session'

function parseSseChunk(buffer, onEvent) {
  const frames = buffer.split('\n\n')
  const remaining = frames.pop()
  let parsed = ''
  for (const frame of frames) {
    const lines = frame.split('\n')
    let data = ''
    for (const line of lines) {
      if (line.startsWith(':')) continue
      if (line.startsWith('data:')) {
        data += (data ? '\n' : '') + line.slice(5).trim()
      }
    }
    if (!data) continue
    try {
      parsed = JSON.parse(data)
      onEvent(parsed)
    } catch {
      onEvent({ raw: data })
    }
  }
  return remaining
}

export function useSessionStream({ sessionId, agentId, onEvent, enabled = true }) {
  const abortRef = useRef(null)
  const eventRef = useRef(onEvent)
  eventRef.current = onEvent

  const connect = useCallback(async () => {
    abortRef.current?.abort()
    if (!sessionId || !agentId) return
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const response = await fetch(
        sessionApi.streamUrl(sessionId, agentId, null),
        {
          method: 'GET',
          headers: { ...sessionApi.authHeaders(), Accept: 'text/event-stream' },
          signal: controller.signal,
        }
      )
      if (!response.ok || !response.body) throw new Error(`SSE ${response.status}`)
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        buffer = parseSseChunk(buffer, (event) => eventRef.current?.(event))
      }
    } catch (err) {
      if (err?.name !== 'AbortError') {
        // 断线后静默结束；调用方可在 status 轮询中恢复
      }
    }
  }, [sessionId, agentId])

  useEffect(() => {
    if (!enabled || !sessionId || !agentId) return undefined
    connect()
    return () => {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [enabled, connect])

  return { reconnect: connect, abort: () => abortRef.current?.abort() }
}
