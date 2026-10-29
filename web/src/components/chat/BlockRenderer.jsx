import { useState, useMemo } from 'react'
import { Collapse, Tag } from 'antd'
import { Wrench, CircleCheck, CircleX } from 'lucide-react'
import { renderMarkdown } from '@/utils/markdown'

const CALL_STATE_COLORS = {
  pending: 'default',
  asking: 'warning',
  allowed: 'processing',
  submitted: 'processing',
  finished: 'success',
}

const RESULT_STATE_COLORS = {
  success: 'success',
  error: 'error',
  interrupted: 'warning',
  denied: 'error',
  running: 'processing',
}

function CodeBlock({ content, lang }) {
  const html = useMemo(() => renderMarkdown('```' + (lang || '') + '\n' + content + '\n```'), [content, lang])
  return <div className="md-content" dangerouslySetInnerHTML={{ __html: html }} />
}

export function TextBlockView({ block }) {
  if (typeof block?.text !== 'string') return null
  return <div className="md-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(block.text) }} />
}

export function ThinkingBlockView({ block }) {
  if (!block?.thinking) return null
  return (
    <Collapse
      ghost
      size="small"
      className="thinking-collapse"
      items={[
        {
          key: 'thinking',
          label: <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>思考过程</span>,
          children: (
            <div
              className="md-content thinking-text"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(block.thinking) }}
            />
          ),
        },
      ]}
    />
  )
}

export function DataBlockView({ block }) {
  const source = block?.source
  if (!source) return null
  if (source.type === 'url' || source.url) {
    const media = source.media_type || ''
    if (media.startsWith('image/')) {
      return <img src={source.url} alt={block?.name || 'image'} style={{ maxWidth: '100%', borderRadius: 8 }} />
    }
    if (media.startsWith('audio/')) {
      return <audio controls src={source.url} style={{ width: '100%' }} />
    }
    if (media.startsWith('video/')) {
      return <video controls src={source.url} style={{ maxWidth: '100%', borderRadius: 8 }} />
    }
    return (
      <a href={source.url} target="_blank" rel="noreferrer">
        {block?.name || source.url}
      </a>
    )
  }
  if (source.data && source.media_type?.startsWith('image/')) {
    return <img src={`data:${source.media_type};base64,${source.data}`} alt={block?.name || 'image'} style={{ maxWidth: '100%', borderRadius: 8 }} />
  }
  if (source.data && source.media_type?.startsWith('audio/')) {
    return <audio controls src={`data:${source.media_type};base64,${source.data}`} style={{ width: '100%' }} />
  }
  return null
}

export function ToolCallView({ block }) {
  const state = block?.state || 'pending'
  let inputStr = ''
  try {
    inputStr = typeof block?.input === 'string' ? block.input : JSON.stringify(block?.input, null, 2)
  } catch {
    inputStr = String(block?.input ?? '')
  }
  return (
    <div className="tool-call-card">
      <div className="tool-call-head">
        <Wrench size={13} />
        <span className="tool-call-name">{block?.name}</span>
        <Tag color={CALL_STATE_COLORS[state] || 'default'} style={{ marginInlineEnd: 0, fontSize: 11 }}>
          {state}
        </Tag>
      </div>
      {inputStr && inputStr !== '{}' && inputStr !== '""' && (
        <Collapse
          ghost
          size="small"
          items={[
            {
              key: 'input',
              label: <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>调用参数</span>,
              children: <CodeBlock content={inputStr} lang="json" />,
            },
          ]}
        />
      )}
    </div>
  )
}

export function ToolResultView({ block }) {
  const state = block?.state || 'success'
  const isError = state === 'error'
  let outputStr = ''
  const output = block?.output
  if (typeof output === 'string') {
    outputStr = output
  } else if (Array.isArray(output)) {
    outputStr = output
      .map((b) => (b?.type === 'text' ? b.text : typeof b === 'string' ? b : ''))
      .filter(Boolean)
      .join('\n')
  } else if (output != null) {
    try {
      outputStr = JSON.stringify(output, null, 2)
    } catch {
      outputStr = String(output)
    }
  }
  const preview = outputStr.length > 800 ? outputStr.slice(0, 800) : outputStr
  return (
    <div className={`tool-result-card${isError ? ' error' : ''}`}>
      <div className="tool-result-head">
        {isError ? <CircleX size={13} color="var(--error-color)" /> : <CircleCheck size={13} color="var(--success-color)" />}
        <span className="tool-call-name">{block?.name}</span>
        <Tag color={RESULT_STATE_COLORS[state] || 'default'} style={{ marginInlineEnd: 0, fontSize: 11 }}>
          {state}
        </Tag>
      </div>
      {preview && (
        <Collapse
          ghost
          size="small"
          items={[
            {
              key: 'output',
              label: <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>执行结果</span>,
              children: <CodeBlock content={outputStr} />,
            },
          ]}
        />
      )}
    </div>
  )
}

export function BlockRenderer({ blocks = [] }) {
  return blocks.map((block, index) => {
    switch (block?.type) {
      case 'text':
        return <TextBlockView key={index} block={block} />
      case 'thinking':
        return <ThinkingBlockView key={index} block={block} />
      case 'tool_call':
        return <ToolCallView key={index} block={block} />
      case 'tool_result':
        return <ToolResultView key={index} block={block} />
      case 'data':
        return <DataBlockView key={index} block={block} />
      case 'hint':
        return null
      default:
        if (typeof block === 'string') return <TextBlockView key={index} block={{ text: block }} />
        return null
    }
  })
}

export default BlockRenderer
