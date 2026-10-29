import { useState } from 'react'
import { Button, Collapse, Tag } from 'antd'
import { globalMessage as message } from '@/utils/globalMessage'
import { ShieldQuestion, CircleCheck, CircleX } from 'lucide-react'
import { chatApi } from '@/apis/session'
import BlockRenderer from './BlockRenderer'

export default function ConfirmCard({ sessionId, agentId, replyId, toolCalls = [], onDone }) {
  const [submitting, setSubmitting] = useState(false)

  const submit = async (results) => {
    setSubmitting(true)
    try {
      await chatApi.trigger({
        agent_id: agentId,
        session_id: sessionId,
        input: {
          type: 'USER_CONFIRM_RESULT',
          reply_id: replyId,
          confirm_results: results,
        },
      })
      message.success('已提交确认结果')
      onDone?.()
    } catch (err) {
      message.error(err.message || '提交失败')
    } finally {
      setSubmitting(false)
    }
  }

  if (!toolCalls.length) return null

  const handleConfirmAll = () => {
    submit(toolCalls.map((tc) => ({ confirmed: true, tool_call: tc })))
  }

  const handleDenyAll = () => {
    submit(toolCalls.map((tc) => ({ confirmed: false, tool_call: tc })))
  }

  return (
    <div className="confirm-card">
      <div className="confirm-card-head">
        <ShieldQuestion size={15} color="var(--warning-color)" />
        <span style={{ fontWeight: 600 }}>工具调用需要确认</span>
      </div>
      {toolCalls.map((tc, index) => {
        let inputStr = ''
        try {
          inputStr = typeof tc?.input === 'string' ? tc.input : JSON.stringify(tc?.input, null, 2)
        } catch {
          inputStr = String(tc?.input ?? '')
        }
        return (
          <div key={tc?.id || index} className="confirm-tool-item">
            <div className="confirm-tool-head">
              <span className="tool-call-name">{tc?.name}</span>
              {(tc?.suggested_rules || []).map((rule, i) => (
                <Tag key={i} style={{ fontSize: 11 }}>
                  {rule?.rule_content || JSON.stringify(rule)}
                </Tag>
              ))}
            </div>
            {inputStr && inputStr !== '{}' && (
              <Collapse
                ghost
                size="small"
                items={[
                  {
                    key: 'input',
                    label: <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>参数</span>,
                    children: <BlockRenderer blocks={[{ type: 'text', text: '```\n' + inputStr + '\n```' }]} />,
                  },
                ]}
              />
            )}
          </div>
        )
      })}
      <div className="confirm-card-actions">
        <Button
          size="small"
          type="primary"
          icon={<CircleCheck size={13} />}
          loading={submitting}
          onClick={handleConfirmAll}
        >
          全部允许
        </Button>
        <Button size="small" danger icon={<CircleX size={13} />} disabled={submitting} onClick={handleDenyAll}>
          全部拒绝
        </Button>
      </div>
    </div>
  )
}
