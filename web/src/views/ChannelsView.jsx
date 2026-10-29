import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Tag,
  Popconfirm,
  Tooltip,
  Empty,
  Alert,
} from 'antd'
import { globalMessage as message } from '@/utils/globalMessage'
import { Plus, RefreshCw, Trash2, Radio, Pencil, Link2 } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import SchemaForm, { schemaValuesToJson } from '@/components/common/SchemaForm'
import { channelApi } from '@/apis/channel'
import { agentApi } from '@/apis/session'
import { credentialApi } from '@/apis/model'
import { formatTime } from '@/utils/time'

const STATE_COLORS = {
  connected: 'success',
  connecting: 'processing',
  retrying: 'warning',
  stopped: 'default',
  failed: 'error',
}

function ChannelForm({ open, types, agents, credentials, onOk, onCancel }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [typeIndex, setTypeIndex] = useState(0)
  const [binding, setBinding] = useState(null)
  const pollRef = useRef(null)

  const typeSchema = types[typeIndex]

  useEffect(() => {
    if (!open) {
      clearInterval(pollRef.current)
      setBinding(null)
    }
  }, [open])

  useEffect(() => {
    if (!binding || binding.state !== 'pending') return
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const data = await channelApi.bindingStatus(binding.binding_id)
        setBinding(data)
        if (data?.state !== 'pending') clearInterval(pollRef.current)
      } catch {
        // ignore
      }
    }, (binding.retry_after_secs || 5) * 1000)
    return () => clearInterval(pollRef.current)
  }, [binding])

  const handleBinding = async () => {
    if (!typeSchema) return
    try {
      const data = await channelApi.startBinding(typeSchema.channel_type)
      setBinding(data)
    } catch (err) {
      message.error(err.message || '发起绑定失败')
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      let credentials = undefined
      if (typeSchema?.credentials_schema) {
        const credValues = schemaValuesToJson(typeSchema.credentials_schema, values)
        delete credValues._routing
        credentials = credValues
      } else if (values.api_key) {
        credentials = { api_key: values.api_key }
      }
      const payload = {
        channel_type: typeSchema?.channel_type || values.channel_type,
        name: values.name || undefined,
        routing: (values.routing || []).map((r) => ({
          match_key: r.match_key || 'chat_id',
          match_value: r.match_value || '*',
          agent_id: r.agent_id,
          session_scope: r.session_scope || 'per_chat',
        })),
        session: {
          chat_model_config: {
            type: values.model_type || 'chat_model',
            credential_id: values.credential_id,
            model: values.model,
            parameters: {},
          },
          permission_mode: values.permission_mode || 'default',
        },
        credentials: binding && binding.state === 'authorized' ? undefined : credentials,
        credential_binding_id: binding && binding.state === 'authorized' ? binding.binding_id : undefined,
        enabled: values.enabled ?? true,
      }
      setSaving(true)
      await onOk(payload)
    } catch {
      // 校验失败
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="接入渠道"
      open={open}
      width={640}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={saving}
      okText="创建"
      destroyOnHidden
    >
      {types.length === 0 ? (
        <Alert type="info" message="暂无可用渠道类型" />
      ) : (
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item label="渠道类型">
            <Select
              value={typeIndex}
              onChange={setTypeIndex}
              options={types.map((t, i) => ({ value: i, label: t.display_name || t.channel_type }))}
            />
          </Form.Item>
          {typeSchema?.description && (
            <Alert type="info" showIcon message={typeSchema.description} style={{ marginBottom: 12 }} />
          )}
          <Form.Item name="name" label="渠道名称（可选）">
            <Input placeholder="例如：飞书客服机器人" />
          </Form.Item>

          {typeSchema?.credentials_schema && (
            <>
              <div style={{ fontSize: 13, color: 'var(--gray-500)', margin: '4px 0 8px' }}>渠道凭证：</div>
              <SchemaForm schema={typeSchema.credentials_schema} form={form} />
            </>
          )}

          {typeSchema?.supports_credential_binding && (
            <div style={{ marginBottom: 12 }}>
              <Button icon={<Link2 size={13} />} onClick={handleBinding} disabled={binding && binding.state === 'authorized'}>
                发起凭证绑定
              </Button>
              {binding && (
                <Alert
                  style={{ marginTop: 8 }}
                  type={binding.state === 'authorized' ? 'success' : binding.state === 'failed' ? 'error' : 'info'}
                  message={
                    binding.state === 'pending'
                      ? binding.verification_url
                        ? `请在打开的页面完成授权：${binding.verification_url}`
                        : '等待授权确认…'
                      : binding.state === 'authorized'
                        ? '授权成功'
                        : binding.error || binding.state
                  }
                />
              )}
            </div>
          )}

          <Form.Item
            name={['credential_id']}
            label="会话模型凭证"
            rules={[{ required: true, message: '请选择凭证' }]}
          >
            <Select
              placeholder="选择凭证（用于会话 LLM 调用）"
              options={(credentials || []).map((c) => ({
                value: c.id,
                label: c.data?.name || c.data?.type || c.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="model"
            label="会话模型"
            rules={[{ required: true, message: '请输入模型名' }]}
          >
            <Input placeholder="例如 gpt-4o-mini" />
          </Form.Item>

          <Form.Item name="permission_mode" label="权限模式" initialValue="default">
            <Select options={['default', 'accept_edits', 'explore', 'bypass', 'dont_ask'].map((m) => ({ value: m, label: m }))} />
          </Form.Item>

          <Form.Item name="routing" label="路由规则（按顺序匹配，最后一条为兜底）" initialValue={[{ match_key: 'chat_id', match_value: '*', agent_id: undefined, session_scope: 'per_chat' }]}>
            <RoutingList agents={agents} />
          </Form.Item>

          <Form.Item name="enabled" label="启用" valuePropName="checked" initialValue={true}>
            <Switch size="small" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}

function RoutingList({ agents, value, onChange }) {
  const routes = value || []
  const update = (index, key, val) => {
    const next = [...routes]
    next[index] = { ...next[index], [key]: val }
    onChange(next)
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {routes.map((route, index) => (
        <div key={index} style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 120px', gap: 8 }}>
          <Input size="small" value={route.match_key} onChange={(e) => update(index, 'match_key', e.target.value)} placeholder="match_key" />
          <Input size="small" value={route.match_value} onChange={(e) => update(index, 'match_value', e.target.value)} placeholder="* 兜底" />
          <Select
            size="small"
            value={route.agent_id}
            onChange={(v) => update(index, 'agent_id', v)}
            placeholder="选择智能体"
            options={agents.map((a) => ({ value: a.id, label: a.data?.name || a.id }))}
          />
          <Select
            size="small"
            value={route.session_scope}
            onChange={(v) => update(index, 'session_scope', v)}
            options={[
              { value: 'per_chat', label: 'per_chat' },
              { value: 'per_chat_user', label: 'per_chat_user' },
            ]}
          />
        </div>
      ))}
      <Button
        size="small"
        type="dashed"
        icon={<Plus size={12} />}
        style={{ alignSelf: 'flex-start' }}
        onClick={() => {
          const next = [...routes, { match_key: 'chat_id', match_value: '', agent_id: undefined, session_scope: 'per_chat' }]
          onChange(next)
        }}
      >
        添加规则
      </Button>
    </div>
  )
}

export default function ChannelsView() {
  const [channels, setChannels] = useState([])
  const [types, setTypes] = useState([])
  const [agents, setAgents] = useState([])
  const [credentials, setCredentials] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const statuses = {}

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [listData, typeData] = await Promise.all([channelApi.list(), channelApi.types()])
      setChannels(listData || [])
      setTypes(typeData || [])
      const results = await Promise.all(
        (listData || []).map((c) =>
          channelApi
            .status(c.id)
            .then((s) => [c.id, s])
            .catch(() => [c.id, null])
        )
      )
      results.forEach(([id, s]) => {
        statuses[id] = s
      })
      setChannels((prev) =>
        prev.map((c) => (statuses[c.id] ? { ...c, _live_status: statuses[c.id] } : c))
      )
    } catch (err) {
      message.error(err.message || '加载渠道失败')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    load()
    agentApi
      .list()
      .then((data) => setAgents(data?.items || []))
      .catch(() => setAgents([]))
    credentialApi
      .list()
      .then((data) => setCredentials(data?.credentials || []))
      .catch(() => setCredentials([]))
  }, [load])

  const handleCreate = async (payload) => {
    try {
      await channelApi.create(payload)
      message.success('已创建')
      setCreateOpen(false)
      load()
    } catch (err) {
      message.error(err.message || '创建失败')
    }
  }

  const toggleEnabled = async (record, next) => {
    try {
      if (next) await channelApi.enable(record.id)
      else await channelApi.disable(record.id)
      load()
    } catch (err) {
      message.error(err.message || '操作失败')
    }
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      render: (name, r) => (
        <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Radio size={15} color="var(--main-color)" />
          {name || r.channel_type}
        </span>
      ),
    },
    { title: '类型', dataIndex: 'channel_type', width: 110, render: (v) => <Tag>{v}</Tag> },
    {
      title: '平台机器人',
      dataIndex: 'platform_bot_id',
      width: 150,
      ellipsis: true,
      render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--gray-500)' }}>{v || '—'}</span>,
    },
    {
      title: '连接状态',
      key: 'live',
      width: 120,
      render: (_, r) => {
        const state = r._live_status?.state || '—'
        return (
          <Tooltip title={r._live_status?.last_error || ''}>
            <Tag color={STATE_COLORS[state] || 'default'}>{state}</Tag>
          </Tooltip>
        )
      },
    },
    {
      title: '启用',
      dataIndex: 'enabled',
      width: 80,
      render: (v, r) => <Switch size="small" checked={!!v} onChange={(next) => toggleEnabled(r, next)} />,
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v) => <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{formatTime(v)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 70,
      render: (_, r) => (
        <Popconfirm
          title="确定删除该渠道吗？"
          onConfirm={async () => {
            try {
              await channelApi.remove(r.id)
              message.success('已删除')
              load()
            } catch (err) {
              message.error(err.message || '删除失败')
            }
          }}
        >
          <Button size="small" type="text" danger icon={<Trash2 size={13} />} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div className="page-view">
      <PageHeader
        title="渠道接入"
        actions={
          <>
            <Button size="small" icon={<RefreshCw size={13} />} onClick={load}>
              刷新
            </Button>
            <Button type="primary" size="small" icon={<Plus size={13} />} onClick={() => setCreateOpen(true)}>
              接入渠道
            </Button>
          </>
        }
      />
      <div className="page-body">
        {channels.length === 0 && !loading ? (
          <EmptyState icon={Radio} title="暂无渠道" description="点击右上角「接入渠道」添加飞书等 IM 机器人" />
        ) : (
          <Table rowKey="id" columns={columns} dataSource={channels} loading={loading} pagination={false} size="middle" />
        )}
      </div>
      <ChannelForm open={createOpen} types={types} agents={agents} credentials={credentials} onOk={handleCreate} onCancel={() => setCreateOpen(false)} />
    </div>
  )
}
