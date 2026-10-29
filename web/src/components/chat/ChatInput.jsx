import { useState } from 'react'
import { Button, Tooltip } from 'antd'
import { SendHorizonal, Square } from 'lucide-react'

export default function ChatInput({ onSend, onInterrupt, sessionStatus, disabled }) {
  const [value, setValue] = useState('')
  const busy = sessionStatus === 'running'

  const handleSend = () => {
    const text = value.trim()
    if (!text || disabled) return
    onSend(text)
    setValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="chat-input-area">
      <div className="chat-input-box">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? '请先选择智能体并创建会话' : busy ? '智能体正在执行，可点击右侧按钮中断…' : '输入消息，Enter 发送，Shift+Enter 换行'}
          rows={3}
          disabled={disabled}
        />
        <div className="chat-input-actions">
          <span className="chat-input-hint">{busy ? '运行中' : ''}</span>
          {busy && onInterrupt && (
            <Tooltip title="中断当前运行">
              <Button size="small" danger onClick={onInterrupt} icon={<Square size={13} />}>
                中断
              </Button>
            </Tooltip>
          )}
          <Button
            type="primary"
            size="small"
            onClick={handleSend}
            disabled={!value.trim() || disabled}
            icon={<SendHorizonal size={13} />}
          >
            发送
          </Button>
        </div>
      </div>
    </div>
  )
}
