import { useCallback, useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, InputNumber, Switch, Collapse, Tag, Tooltip, Popconfirm } from 'antd'
import { globalMessage as message } from '@/utils/globalMessage'
import { Plus, Pencil, Trash2, RefreshCw, Bot } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { agentApi } from '@/apis/session'
import { formatTime } from '@/utils/time'

const DEFAULT_SYSTEM_PROMPT = "You're a helpful assistant."

function AgentForm({ open, editing, onOk, onCancel }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      const data = editing?.data || {}
      form.setFieldsValue({
        name: data.name,
        system_prompt: data.system_prompt ?? DEFAULT_SYSTEM_PROMPT,
        invitable: data.chat_config?.invite_config?.invitable ?? false,
        invite_description: data.chat_config?.invite_config?.invite_description ?? '',
        max_iters: data.chat_config?.react_config?.max_iters ?? 50,
        structured_output_grace_iters: data.chat_config?.react_config?.structured_output_grace_iters ?? 5,
        stop_on_reject: data.chat_config?.react_config?.stop_on_reject ?? false,
        trigger_ratio: data.chat_config?.context_config?.trigger_ratio ?? 0.8,
        reserve_ratio: data.chat_config?.context_config?.reserve_ratio ?? 0.1,
        context_buffer_ratio: data.chat_config?.context_config?.context_buffer_ratio ?? 0.2,
        tool_result_limit: data.chat_config?.context_config?.tool_result_limit ?? 50000,
      })
    }
  }, [open, editing, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        name: values.name,
        system_prompt: values.system_prompt,
        chat_config: {
          react_config: {
            max_iters: values.max_iters,
            structured_output_grace_iters: values.structured_output_grace_iters,
            stop_on_reject: values.stop_on_reject,
          },
          context_config: {
            trigger_ratio: values.trigger_ratio,
            reserve_ratio: values.reserve_ratio,
            context_buffer_ratio: values.context_buffer_ratio,
            tool_result_limit: values.tool_result_limit,
          },
          invite_config: {
            invitable: values.invitable,
            invite_description: values.invite_description || undefined,
          },
        },
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
      title={editing ? '编辑智能体' : '创建智能体'}
      open={open}
      width={640}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={saving}
      okText={editing ? '保存' : '创建'}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入智能体名称' }]}>
          <Input placeholder="智能体显示名" />
        </Form.Item>
        <Form.Item name="system_prompt" label="系统提示词（System Prompt）">
          <Input.TextArea rows={5} placeholder={DEFAULT_SYSTEM_PROMPT} autoSize={{ minRows: 5, maxRows: 14 }} />
        </Form.Item>
        <Collapse
          ghost
          items={[
            {
              key: 'react',
              label: 'ReAct 推理配置',
              children: (
                <>
                  <Form.Item name="max_iters" label="最大迭代次数">
                    <InputNumber min={1} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="structured_output_grace_iters" label="结构化输出宽限迭代">
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="stop_on_reject" label="被拒绝时停止" valuePropName="checked">
                    <Switch size="small" />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'context',
              label: '上下文压缩配置',
              children: (
                <>
                  <Form.Item name="trigger_ratio" label="触发比例（≤0.9）">
                    <InputNumber min={0} max={0.9} step={0.05} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="reserve_ratio" label="保留比例">
                    <InputNumber min={0} max={1} step={0.05} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="context_buffer_ratio" label="上下文缓冲比例">
                    <InputNumber min={0} max={1} step={0.05} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="tool_result_limit" label="工具结果长度上限">
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </>
              ),
            },
            {
              key: 'invite',
              label: '被借调配置（团队协作）',
              children: (
                <>
                  <Form.Item name="invitable" label="允许被其他智能体借调" valuePropName="checked">
                    <Switch size="small" />
                  </Form.Item>
                  <Form.Item name="invite_description" label="借调简介（供 Leader 智能体参考）">
                    <Input.TextArea rows={3} placeholder="描述该智能体的能力，便于被团队选用" />
                  </Form.Item>
                </>
              ),
            },
          ]}
        />
      </Form>
    </Modal>
  )
}

export default function AgentsView() {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await agentApi.list()
      setAgents(data?.agents || [])
    } catch (err) {
      message.error(err.message || '加载智能体失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const handleEdit = (record) => {
    setEditing(record)
    setModalOpen(true)
  }

  const handleSubmit = async (payload) => {
    try {
      if (editing) {
        await agentApi.update(editing.id, payload)
        message.success('已保存')
      } else {
        await agentApi.create(payload)
        message.success('已创建')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      message.error(err.message || '保存失败')
    }
  }

  const handleDelete = async (record) => {
    try {
      await agentApi.remove(record.id)
      message.success('已删除')
      load()
    } catch (err) {
      message.error(err.message || '删除失败')
    }
  }

  const columns = [
    {
      title: '名称',
      dataIndex: ['data', 'name'],
      render: (name, record) => (
        <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Bot size={15} color="var(--main-color)" />
          {name || record.id}
        </span>
      ),
    },
    {
      title: '系统提示词',
      dataIndex: ['data', 'system_prompt'],
      ellipsis: true,
      render: (v) => (
        <Tooltip title={v}>
          <span style={{ color: 'var(--gray-500)', fontSize: 13 }}>{v}</span>
        </Tooltip>
      ),
    },
    { title: '来源', dataIndex: 'source', width: 90, render: (v) => <Tag>{v || 'user'}</Tag> },
    {
      title: '可编辑',
      dataIndex: 'editable',
      width: 90,
      render: (v) => (v ? <Tag color="success">可编辑</Tag> : <Tag>只读</Tag>),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 170,
      render: (v) => <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{formatTime(v)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <span style={{ display: 'inline-flex', gap: 4 }}>
          <Button size="small" type="text" icon={<Pencil size={13} />} disabled={!record.editable} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm title="确定删除该智能体吗？" onConfirm={() => handleDelete(record)} disabled={!record.editable}>
            <Button size="small" type="text" danger icon={<Trash2 size={13} />} disabled={!record.editable} />
          </Popconfirm>
        </span>
      ),
    },
  ]

  return (
    <div className="page-view">
      <PageHeader
        title="智能体"
        actions={
          <>
            <Button size="small" icon={<RefreshCw size={13} />} onClick={load}>
              刷新
            </Button>
            <Button type="primary" size="small" icon={<Plus size={13} />} onClick={handleCreate}>
              创建智能体
            </Button>
          </>
        }
      />
      <div className="page-body">
        {agents.length === 0 && !loading ? (
          <EmptyState icon={Bot} title="暂无智能体" description="点击右上角「创建智能体」开始" />
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={agents}
            loading={loading}
            pagination={false}
            size="middle"
          />
        )}
      </div>
      <AgentForm open={modalOpen} editing={editing} onOk={handleSubmit} onCancel={() => setModalOpen(false)} />
    </div>
  )
}
