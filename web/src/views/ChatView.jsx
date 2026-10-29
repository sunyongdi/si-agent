import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Empty, Tooltip, Switch } from 'antd'
import { globalMessage as message } from '@/utils/globalMessage'
import { Bot, PanelRightOpen, PanelRightClose, MessageCirclePlus } from 'lucide-react'
import { agentApi, chatApi, sessionApi } from '@/apis/session'
import { useChatStore } from '@/stores/chat'
import { useSessionStream } from '@/hooks/useSessionStream'
import MessageItem from '@/components/chat/MessageItem'
import ChatInput from '@/components/chat/ChatInput'
import ConfirmCard from '@/components/chat/ConfirmCard'
import WorkspacePanel from '@/components/chat/WorkspacePanel'
import { fromNow } from '@/utils/time'

const STATUS_LABELS = {
  running: { label: '运行中', cls: 'running' },
  awaiting_permission: { label: '等待确认', cls: 'awaiting' },
  awaiting_external_result: { label: '等待外部结果', cls: 'awaiting' },
  idle: { label: '空闲', cls: '' },
}

function isMsgLike(obj) {
  return obj && typeof obj === 'object' && (obj.role === 'user' || obj.role === 'assistant' || obj.role === 'system') && Array.isArray(obj.content)
}

function extractPendingToolCalls(messages) {
  const result = []
  let replyId = null
  for (let i = messages.length - 1; i >= 0 && result.length === 0; i--) {
    const msg = messages[i]
    const blocks = Array.isArray(msg?.content) ? msg.content : []
    for (const block of blocks) {
      if (block?.type === 'tool_call' && (block.state === 'asking' || block.state === 'pending')) {
        result.push(block)
        replyId = msg?.id || null
      }
    }
  }
  return { toolCalls: result, replyId }
}

export default function ChatView() {
  const navigate = useNavigate()
  const { sessionId: routeSessionId } = useParams()
  const { currentAgentId, currentSessionId } = useChatStore()
  const sessionId = routeSessionId || currentSessionId || ''
  const [agents, setAgents] = useState([])
  const [agentName, setAgentName] = useState('')
  const [messages, setMessages] = useState([])
  const [hasMore, setHasMore] = useState(false)
  const [status, setStatus] = useState('idle')
  const [sessionMeta, setSessionMeta] = useState(null)
  const [showWorkspace, setShowWorkspace] = useState(false)
  const messagesRef = useRef(null)
  const prevStatusRef = useRef('idle')

  useEffect(() => {
    agentApi
      .list()
      .then((data) => setAgents(data?.agents || []))
      .catch(() => setAgents([]))
  }, [])

  useEffect(() => {
    if (!currentAgentId && agents.length > 0) {
      useChatStore.getState().setCurrentAgentId(agents[0].id)
      setAgentName(agents[0].data?.name || agents[0].id)
    } else if (currentAgentId) {
      const found = agents.find((a) => a.id === currentAgentId)
      if (found) setAgentName(found.data?.name || found.id)
    }
  }, [agents, currentAgentId])

  const scrollBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const el = messagesRef.current
      if (el) el.scrollTop = el.scrollHeight
    })
  }, [])

  const refreshMessages = useCallback(
    async (silent = true) => {
      if (!sessionId || !currentAgentId) return
      try {
        const data = await sessionApi.messages(sessionId, currentAgentId)
        const list = data?.messages || []
        setMessages(list)
        setHasMore(!!data?.has_more)
        setStatus(data?.is_running ? 'running' : status)
        scrollBottom()
      } catch (err) {
        if (!silent) message.error(err.message || '加载消息失败')
      }
    },
    [sessionId, currentAgentId, scrollBottom]
  )

  const loadSessionMeta = useCallback(async () => {
    if (!sessionId || !currentAgentId) return
    try {
      const data = await sessionApi.list(currentAgentId)
      const found = (data?.sessions || []).find((s) => s.id === sessionId)
      if (found) setSessionMeta(found)
    } catch {
      // ignore
    }
  }, [sessionId, currentAgentId])

  const loadStatus = useCallback(async () => {
    if (!sessionId || !currentAgentId) return
    try {
      const data = await sessionApi.status(sessionId, currentAgentId)
      const next = data?.status || 'idle'
      setStatus(next)
      if (prevStatusRef.current === 'running' && next !== 'running') {
        refreshMessages(true)
        loadSessionMeta()
      }
      prevStatusRef.current = next
    } catch {
      // ignore
    }
  }, [sessionId, currentAgentId, refreshMessages, loadSessionMeta])

  useEffect(() => {
    setMessages([])
    setSessionMeta(null)
    prevStatusRef.current = 'idle'
    if (sessionId && currentAgentId) {
      refreshMessages(false)
      loadStatus()
      loadSessionMeta()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, currentAgentId])

  useEffect(() => {
    if (!sessionId || !currentAgentId) return undefined
    const timer = setInterval(loadStatus, 4000)
    return () => clearInterval(timer)
  }, [sessionId, currentAgentId, loadStatus])

  const handleSseEvent = useCallback(
    (event) => {
      const payload = event?.msg || event?.message || event
      if (isMsgLike(payload) && payload.id) {
        setMessages((prev) => {
          const filtered =
            payload.role === 'user' ? prev.filter((m) => !m.id?.startsWith('local-')) : prev
          const index = filtered.findIndex((m) => m.id === payload.id)
          if (index >= 0) {
            const next = [...filtered]
            next[index] = { ...next[index], ...payload }
            return next
          }
          return [...filtered, payload]
        })
        scrollBottom()
      } else {
        // 未知事件类型：防抖刷新消息列表兜底
        refreshDebounced()
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scrollBottom]
  )

  const refreshTimerRef = useRef(null)
  const refreshDebounced = useCallback(() => {
    clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(() => refreshMessages(true), 600)
  }, [refreshMessages])

  useSessionStream({
    sessionId,
    agentId: currentAgentId,
    onEvent: handleSseEvent,
    enabled: !!sessionId && !!currentAgentId,
  })

  const { toolCalls, replyId } = useMemo(
    () => extractPendingToolCalls(messages),
    [messages]
  )
  const showConfirm = status === 'awaiting_permission' && toolCalls.length > 0

  const ensureSession = useCallback(async () => {
    if (sessionId) return sessionId
    const data = await sessionApi.create({ agent_id: currentAgentId })
    const newId = data?.session_id
    if (!newId) throw new Error('创建会话失败')
    useChatStore.getState().setCurrentSessionId(newId)
    navigate(`/chat/${newId}`, { replace: true })
    return newId
  }, [sessionId, currentAgentId, navigate])

  const handleSend = async (text) => {
    try {
      const sid = await ensureSession()
      await chatApi.trigger({
        agent_id: currentAgentId,
        session_id: sid,
        input: {
          role: 'user',
          name: 'user',
          content: [{ type: 'text', text }],
        },
      })
      setMessages((prev) => [
        ...prev,
        {
          id: `local-${Date.now()}`,
          role: 'user',
          name: 'user',
          content: [{ type: 'text', text }],
          created_at: new Date().toISOString(),
        },
      ])
      setStatus('running')
      prevStatusRef.current = 'running'
      scrollBottom()
    } catch (err) {
      message.error(err.message || '发送失败')
    }
  }

  const handleInterrupt = async () => {
    try {
      await sessionApi.interrupt(sessionId, currentAgentId)
      message.success('已发送中断请求')
    } catch (err) {
      message.error(err.message || '中断失败')
    }
  }

  const loadOlder = async () => {
    if (!messages.length) return
    try {
      const data = await sessionApi.messages(sessionId, currentAgentId, { before: messages[0].id })
      setMessages((prev) => [...(data?.messages || []), ...prev])
      setHasMore(!!data?.has_more)
    } catch (err) {
      message.error(err.message || '加载历史消息失败')
    }
  }

  const noAgent = agents.length === 0
  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.idle

  return (
    <div className="chat-view">
      <div className="chat-header">
        <div className="chat-title">
          {sessionId ? sessionMeta?.session?.config?.name || '会话' : '新对话'}
          {sessionId && sessionMeta?.session?.updated_at && (
            <span style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 400, marginLeft: 10 }}>
              {fromNow(sessionMeta.session.updated_at)}
            </span>
          )}
        </div>
        <div className="chat-header-right">
          {sessionId && (
            <span className={`status-badge ${statusInfo.cls}`}>
              <span className="dot" />
              {statusInfo.label}
            </span>
          )}
          <Tooltip title={showWorkspace ? '收起工作区' : '打开工作区'}>
            <Button
              size="small"
              type={showWorkspace ? 'primary' : 'default'}
              ghost={showWorkspace}
              icon={showWorkspace ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
              onClick={() => setShowWorkspace((v) => !v)}
            />
          </Tooltip>
        </div>
      </div>

      <div className="chat-body">
        <div className="chat-main">
          <div className="chat-messages" ref={messagesRef}>
            {noAgent && (
              <div className="chat-welcome">
                <Bot size={40} strokeWidth={1.2} />
                <div className="welcome-title">还没有智能体</div>
                <div style={{ fontSize: 13 }}>先到「智能体」页面创建一个智能体，再开始对话</div>
                <Button type="primary" size="small" onClick={() => navigate('/agents')} style={{ marginTop: 8 }}>
                  去创建智能体
                </Button>
              </div>
            )}
            {!noAgent && !sessionId && (
              <div className="chat-welcome">
                <MessageCirclePlus size={40} strokeWidth={1.2} />
                <div className="welcome-title">开始新对话</div>
                <div style={{ fontSize: 13 }}>选择一个智能体，输入消息即可开始</div>
              </div>
            )}
            {!noAgent && sessionId && (
              <>
                {hasMore && (
                  <div style={{ textAlign: 'center' }}>
                    <Button size="small" type="text" onClick={loadOlder}>
                      加载更早的消息
                    </Button>
                  </div>
                )}
                {messages.map((msg) => (
                  <MessageItem key={msg.id} message={msg} />
                ))}
                {status === 'running' && messages.length > 0 && (
                  <div style={{ fontSize: 12, color: 'var(--gray-400)', paddingLeft: 38 }}>
                    正在生成…
                  </div>
                )}
                {showConfirm && (
                  <ConfirmCard
                    sessionId={sessionId}
                    agentId={currentAgentId}
                    replyId={replyId}
                    toolCalls={toolCalls}
                    onDone={() => {
                      setStatus('running')
                      refreshMessages(true)
                    }}
                  />
                )}
              </>
            )}
          </div>

          {!noAgent && (
            <ChatInput
              onSend={handleSend}
              onInterrupt={sessionId ? handleInterrupt : null}
              sessionStatus={sessionId ? status : 'idle'}
              disabled={!currentAgentId}
            />
          )}
        </div>

        {showWorkspace && (
          <WorkspacePanel agentId={currentAgentId} sessionId={sessionId} />
        )}
      </div>
    </div>
  )
}
