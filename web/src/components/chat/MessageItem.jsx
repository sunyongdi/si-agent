import { Avatar, Tag, Tooltip } from 'antd'
import { Bot, User, AlertTriangle } from 'lucide-react'
import BlockRenderer from './BlockRenderer'
import { formatTime } from '@/utils/time'

const ERROR_TYPE_LABELS = {
  authentication: '认证失败',
  permission: '权限不足',
  rate_limit: '请求限流',
  invalid_request: '无效请求',
  upstream: '上游服务错误',
  connection: '连接错误',
  internal: '内部错误',
  setup: '配置错误',
  unknown: '未知错误',
}

function formatUsage(usage) {
  if (!usage) return ''
  const parts = []
  if (usage.input_tokens != null) parts.push(`输入 ${usage.input_tokens}`)
  if (usage.output_tokens != null) parts.push(`输出 ${usage.output_tokens}`)
  if (usage.cache_input_tokens) parts.push(`缓存读 ${usage.cache_input_tokens}`)
  if (usage.cache_creation_input_tokens) parts.push(`缓存写 ${usage.cache_creation_input_tokens}`)
  return parts.join(' · ')
}

export default function MessageItem({ message }) {
  const role = message?.role
  const blocks = Array.isArray(message?.content) ? message.content : []
  const usageText = formatUsage(message?.usage)
  const error = message?.error

  if (role === 'user') {
    return (
      <div className="msg-row user">
        <div className="msg-bubble user">
          <BlockRenderer blocks={blocks} />
        </div>
      </div>
    )
  }

  return (
    <div className="msg-row assistant">
      <div className="msg-avatar">
        <Avatar size={28} style={{ background: 'color-mix(in srgb, var(--main-color) 15%, var(--gray-0))', color: 'var(--main-color)' }} icon={<Bot size={16} />} />
      </div>
      <div className="msg-body">
        <div className="msg-meta">
          <span className="msg-name">{message?.name || 'Assistant'}</span>
          {message?.created_at && (
            <Tooltip title={formatTime(message.created_at)}>
              <span className="msg-time">{formatTime(message.created_at).slice(11)}</span>
            </Tooltip>
          )}
          {usageText && <span className="msg-usage">{usageText}</span>}
          {message?.finished_reason && message.finished_reason !== 'completed' && (
            <Tag color={message.finished_reason === 'error' ? 'error' : 'warning'} style={{ fontSize: 11 }}>
              {message.finished_reason}
            </Tag>
          )}
        </div>
        <div className="msg-content-wrap">
          <BlockRenderer blocks={blocks} />
        </div>
        {error && (
          <div className="msg-error">
            <AlertTriangle size={13} />
            <span>
              {ERROR_TYPE_LABELS[error.type] || error.type}
              {error.message ? `：${error.message}` : ''}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
