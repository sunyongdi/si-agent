import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Dropdown, Modal, Input, Tooltip } from 'antd'
import { MoreVertical, Plus } from 'lucide-react'
import { agentApi, sessionApi } from '@/apis/session'
import { useChatStore } from '@/stores/chat'
import { fromNow } from '@/utils/time'
import { globalMessage as message } from '@/utils/globalMessage'

const STATUS_COLORS = {
  running: 'var(--main-color)',
  awaiting_permission: 'var(--warning-color)',
  awaiting_external_result: 'var(--warning-color)',
  idle: 'var(--gray-300)',
}

export default function SessionNav({ collapsed }) {
  const navigate = useNavigate()
  const { sessionId: routeSessionId } = useParams()
  const { currentAgentId, setCurrentAgentId } = useChatStore()
  const [agents, setAgents] = useState([])
  const [sessions, setSessions] = useState([])
  const [currentAgentName, setCurrentAgentName] = useState('')

  const loadAgents = useCallback(async () => {
    try {
      const data = await agentApi.list()
      const list = data?.agents || []
      setAgents(list)
      if (!currentAgentId && list.length > 0) {
        setCurrentAgentId(list[0].id)
        setCurrentAgentName(list[0].data?.name || list[0].id)
      } else if (currentAgentId) {
        const found = list.find((a) => a.id === currentAgentId)
        if (found) setCurrentAgentName(found.data?.name || found.id)
      }
    } catch (err) {
      message.error(err.message || '加载智能体列表失败')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAgentId])

  const loadSessions = useCallback(async () => {
    if (!currentAgentId) {
      setSessions([])
      return
    }
    try {
      const data = await sessionApi.list(currentAgentId)
      setSessions((data?.sessions || []).slice(0, 30))
    } catch {
      setSessions([])
    }
  }, [currentAgentId])

  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  useEffect(() => {
    loadSessions()
    const timer = setInterval(loadSessions, 5000)
    return () => clearInterval(timer)
  }, [loadSessions])

  const activeSessionId = routeSessionId || useChatStore.getState().currentSessionId

  const handleNewSession = () => {
    useChatStore.getState().setCurrentSessionId('')
    navigate('/chat')
  }

  const handleRename = (session) => {
    const sessionId = session?.session?.id
    let value = session?.session?.config?.name || ''
    Modal.confirm({
      title: '重命名会话',
      content: (
        <Input
          defaultValue={value}
          onChange={(e) => {
            value = e.target.value
          }}
          placeholder="输入新的会话名称"
        />
      ),
      onOk: async () => {
        try {
          await sessionApi.update(sessionId, currentAgentId, { name: value })
          message.success('已重命名')
          loadSessions()
        } catch (err) {
          message.error(err.message || '重命名失败')
        }
      },
    })
  }

  const handleDelete = (session) => {
    const sessionId = session?.session?.id
    Modal.confirm({
      title: '删除会话',
      content: `确定删除会话「${session?.session?.config?.name || sessionId}」吗？该操作不可恢复。`,
      okType: 'danger',
      onOk: async () => {
        try {
          await sessionApi.remove(sessionId, currentAgentId)
          message.success('已删除')
          if (activeSessionId === sessionId) {
            useChatStore.getState().setCurrentSessionId('')
            navigate('/chat')
          }
          loadSessions()
        } catch (err) {
          message.error(err.message || '删除失败')
        }
      },
    })
  }

  const agentMenu = {
    items: agents.map((a) => ({ key: a.id, label: a.data?.name || a.id })),
    onClick: ({ key }) => {
      setCurrentAgentId(key)
      useChatStore.getState().setCurrentSessionId('')
      navigate('/chat')
      const found = agents.find((a) => a.id === key)
      setCurrentAgentName(found?.data?.name || key)
    },
  }

  if (collapsed) {
    return (
      <div className="session-section">
        <Tooltip title="新建会话" placement="right">
          <button type="button" className="sidebar-toggle" onClick={handleNewSession} style={{ marginBottom: 12 }}>
            <Plus size={16} />
          </button>
        </Tooltip>
      </div>
    )
  }

  return (
    <div className="session-section">
      <div className="session-section-title">
        <Dropdown menu={agentMenu} trigger={['click']} placement="topLeft">
          <span style={{ cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {currentAgentName || (agents.length === 0 ? '暂无智能体' : '选择智能体')}
          </span>
        </Dropdown>
        <Tooltip title="新建会话">
          <button type="button" className="sidebar-toggle" onClick={handleNewSession}>
            <Plus size={15} />
          </button>
        </Tooltip>
      </div>
      <div className="session-list">
        {sessions.length === 0 && (
          <div key="empty" style={{ padding: '12px 10px', fontSize: 13, color: 'var(--gray-400)' }}>
            暂无会话，点击 + 新建
          </div>
        )}
        {sessions.map((s) => {
          const sid = s?.session?.id
          const name = s?.session?.config?.name || s?.name || sid
          const status = s?.status || 'idle'
          return (
            <div
              key={sid}
              className={`session-item${activeSessionId === sid ? ' active' : ''}`}
              onClick={() => {
                useChatStore.getState().setCurrentSessionId(sid)
                navigate(`/chat/${sid}`)
              }}
            >
              <span
                className="session-status-dot"
                style={{ background: STATUS_COLORS[status] || 'var(--gray-300)' }}
                title={status}
              />
              <span className="session-name" title={`${name} · ${fromNow(s?.session?.updated_at)}`}>
                {name}
              </span>
              <Dropdown
                menu={{
                  items: [
                    { key: 'rename', label: '重命名' },
                    { key: 'delete', label: '删除', danger: true },
                  ],
                  onClick: ({ key, domEvent }) => {
                    domEvent.stopPropagation()
                    if (key === 'rename') handleRename(s)
                    if (key === 'delete') handleDelete(s)
                  },
                }}
                trigger={['click']}
              >
                <button
                  type="button"
                  className="sidebar-toggle"
                  style={{ opacity: 0.5 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical size={14} />
                </button>
              </Dropdown>
            </div>
          )
        })}
      </div>
    </div>
  )
}
