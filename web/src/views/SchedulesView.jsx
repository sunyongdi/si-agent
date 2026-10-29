import { useCallback, useEffect, useState } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Tag,
  Popconfirm,
  Drawer,
} from 'antd'
import { globalMessage as message } from '@/utils/globalMessage'
import { Plus, RefreshCw, Trash2, CalendarClock, Pencil } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { scheduleApi } from '@/apis/schedule'
import { agentApi } from '@/apis/session'
import { formatTime } from '@/utils/time'

const PERMISSION_MODES = ['default', 'accept_edits', 'explore', 'bypass', 'dont_ask']

const COMMON_TIMEZONES = [
  'Asia/Shanghai',
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Singapore',
]

function ScheduleForm({ open, editing, agents, onOk, onCancel }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    const data = editing?.data || {}
    form.setFieldsValue({
      name: data.name,
      description: data.description ?? '',
      cron_expression: data.cron_expression ?? '0 9 * * 1-5',
      timezone: data.timezone ?? 'Asia/Shanghai',
      enabled: data.enabled ?? true,
      stateful: data.stateful ?? false,
      permission_mode: data.permission_mode ?? 'dont_ask',
      agent_id: editing?.agent_id,
    })
  }, [open, editing, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        name: values.name,
        description: values.description || '',
        cron_expression: values.cron_expression,
        timezone: values.timezone,
        enabled: values.enabled,
        stateful: values.stateful,
        permission_mode: values.permission_mode,
        agent_id: values.agent_id,
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
      title={editing ? '编辑定时任务' : '创建定时任务'}
      open={open}
      width={560}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={saving}
      okText={editing ? '保存' : '创建'}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="name" label="任务名称" rules={[{ required: true, message: '请输入任务名称' }]}>
          <Input placeholder="例如：每日早报生成" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={2} placeholder="任务描述" />
        </Form.Item>
        <Form.Item
          name="cron_expression"
          label="Cron 表达式（标准 5 字段）"
          rules={[{ required: true, message: '请输入 Cron 表达式' }]}
        >
          <Input placeholder="0 9 * * 1-5（工作日每天 9 点）" />
        </Form.Item>
        <Form.Item name="timezone" label="时区">
          <Select showSearch options={COMMON_TIMEZONES.map((t) => ({ value: t, label: t }))} />
        </Form.Item>
        <Form.Item name="agent_id" label="执行智能体" rules={[{ required: true, message: '请选择智能体' }]}>
          <Select
            placeholder="选择智能体"
            options={agents.map((a) => ({ value: a.id, label: a.data?.name || a.id }))}
          />
        </Form.Item>
        <Form.Item name="permission_mode" label="权限模式" tooltip="无人值守任务默认 dont_ask，把一切询问转为拒绝">
          <Select options={PERMISSION_MODES.map((m) => ({ value: m, label: m }))} />
        </Form.Item>
        <Form.Item name="stateful" label="连续执行共享会话上下文" valuePropName="checked">
          <Switch size="small" />
        </Form.Item>
        <Form.Item name="enabled" label="启用" valuePropName="checked">
          <Switch size="small" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

export default function SchedulesView() {
  const [schedules, setSchedules] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [historySchedule, setHistorySchedule] = useState(null)
  const [historySessions, setHistorySessions] = useState([])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await scheduleApi.list()
      setSchedules(data?.schedules || [])
    } catch (err) {
      message.error(err.message || '加载定时任务失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    agentApi
      .list()
      .then((data) => setAgents(data?.items || []))
      .catch(() => setAgents([]))
  }, [load])

  const handleSubmit = async (payload) => {
    try {
      if (editing) {
        await scheduleApi.update(editing.id, payload)
        message.success('已保存')
      } else {
        await scheduleApi.create(payload)
        message.success('已创建')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      message.error(err.message || '保存失败')
    }
  }

  const toggleEnabled = async (record) => {
    try {
      await scheduleApi.update(record.id, { enabled: !record.data?.enabled })
      load()
    } catch (err) {
      message.error(err.message || '操作失败')
    }
  }

  const viewHistory = async (record) => {
    setHistorySchedule(record)
    try {
      const data = await scheduleApi.sessions(record.id)
      setHistorySessions(data?.sessions || [])
    } catch (err) {
      message.error(err.message || '加载执行记录失败')
    }
  }

  const agentName = (agentId) => agents.find((a) => a.id === agentId)?.data?.name || agentId

  const columns = [
    {
      title: '名称',
      dataIndex: ['data', 'name'],
      render: (name, r) => (
        <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <CalendarClock size={15} color="var(--main-color)" />
          {name || r.id}
        </span>
      ),
    },
    {
      title: 'Cron',
      dataIndex: ['data', 'cron_expression'],
      width: 140,
      render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span>,
    },
    { title: '时区', dataIndex: ['data', 'timezone'], width: 140, render: (v) => <span style={{ fontSize: 13 }}>{v}</span> },
    {
      title: '智能体',
      dataIndex: 'agent_id',
      width: 160,
      ellipsis: true,
      render: (v) => <span style={{ fontSize: 13 }}>{agentName(v)}</span>,
    },
    {
      title: '权限模式',
      dataIndex: ['data', 'permission_mode'],
      width: 110,
      render: (v) => <Tag color={v === 'dont_ask' ? 'default' : 'processing'}>{v}</Tag>,
    },
    {
      title: '启用',
      key: 'enabled',
      width: 80,
      render: (_, r) => (
        <Switch size="small" checked={!!r.data?.enabled} onChange={() => toggleEnabled(r)} />
      ),
    },
    {
      title: '最近执行',
      dataIndex: ['data', 'started_at'],
      width: 170,
      render: (v) => <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{formatTime(v)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 190,
      render: (_, r) => (
        <span style={{ display: 'inline-flex', gap: 4 }}>
          <Button size="small" type="text" icon={<Pencil size={13} />} onClick={() => { setEditing(r); setModalOpen(true) }}>
            编辑
          </Button>
          <Button size="small" type="text" onClick={() => viewHistory(r)}>
            执行记录
          </Button>
          <Popconfirm title="确定删除该定时任务吗？" onConfirm={async () => {
            try {
              await scheduleApi.remove(r.id)
              message.success('已删除')
              load()
            } catch (err) {
              message.error(err.message || '删除失败')
            }
          }}>
            <Button size="small" type="text" danger icon={<Trash2 size={13} />} />
          </Popconfirm>
        </span>
      ),
    },
  ]

  return (
    <div className="page-view">
      <PageHeader
        title="定时任务"
        actions={
          <>
            <Button size="small" icon={<RefreshCw size={13} />} onClick={load}>
              刷新
            </Button>
            <Button type="primary" size="small" icon={<Plus size={13} />} onClick={() => { setEditing(null); setModalOpen(true) }}>
              创建任务
            </Button>
          </>
        }
      />
      <div className="page-body">
        {schedules.length === 0 && !loading ? (
          <EmptyState icon={CalendarClock} title="暂无定时任务" description="点击右上角「创建任务」开始" />
        ) : (
          <Table rowKey="id" columns={columns} dataSource={schedules} loading={loading} pagination={false} size="middle" />
        )}
      </div>
      <ScheduleForm open={modalOpen} editing={editing} agents={agents} onOk={handleSubmit} onCancel={() => setModalOpen(false)} />
      <Drawer
        title={`执行记录：${historySchedule?.data?.name || ''}`}
        open={!!historySchedule}
        onClose={() => setHistorySchedule(null)}
        width={680}
        destroyOnHidden
      >
        <Table
          rowKey="id"
          size="middle"
          pagination={false}
          dataSource={historySessions}
          columns={[
            { title: '会话 ID', dataIndex: 'id', ellipsis: true, render: (v) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span> },
            { title: '创建时间', dataIndex: 'created_at', width: 180, render: (v) => formatTime(v) },
          ]}
        />
      </Drawer>
    </div>
  )
}
