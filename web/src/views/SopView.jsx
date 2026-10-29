import { useCallback, useEffect, useState } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Popconfirm,
  Tabs,
  Empty,
  Collapse,
} from 'antd'
import { globalMessage as message } from '@/utils/globalMessage'
import { Plus, RefreshCw, Trash2, GitBranch, PlayCircle, CheckCircle2, XCircle } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { sopApi } from '@/apis/sop'
import { agentApi } from '@/apis/session'
import { formatTime } from '@/utils/time'

const PHASE_TAG_COLORS = {
  pending: 'default',
  running: 'processing',
  awaiting: 'warning',
  completed: 'success',
  failed: 'error',
}

function SopForm({ open, agents, onOk, onCancel }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    form.resetFields()
    form.setFieldsValue({ steps: [{ subject: '', description: '', agent_id: agents[0]?.id, session_key: 'main', max_attempts: 3 }] })
  }, [open, form, agents])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const data = {
        name: values.name,
        description: values.description || '',
        workspace_grain: 'run',
        steps: (values.steps || []).map((s) => ({
          version: 'v1',
          subject: s.subject,
          description: s.description,
          executor: { agent_id: s.agent_id, session_key: s.session_key || 'main' },
          verifier: s.verify_by_agent
            ? { agent: { agent_id: s.verifier_agent_id, session_key: s.verifier_session_key || 'main' }, criteria: s.criteria || undefined }
            : s.need_verifier
              ? { human: { question: s.question || undefined } }
              : null,
          max_attempts: s.max_attempts ?? 3,
        })),
      }
      setSaving(true)
      await onOk(data)
    } catch {
      // 校验失败
    } finally {
      setSaving(false)
    }
  }

  const stepsValue = Form.useWatch('steps', form) || []

  return (
    <Modal
      title="创建流程"
      open={open}
      width={720}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={saving}
      okText="创建"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="name" label="流程名称" rules={[{ required: true, message: '请输入流程名称' }]}>
          <Input placeholder="例如：需求分析流水线" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={2} placeholder="流程描述" />
        </Form.Item>
        <Form.List name="steps">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => {
                const step = stepsValue[field.name] || {}
                return (
                  <Collapse
                    key={field.key}
                    ghost
                    style={{ marginBottom: 8 }}
                    items={[
                      {
                        key: 'step',
                        label: <span style={{ fontWeight: 600 }}>步骤 {field.name + 1}：{step.subject || '（未命名）'}</span>,
                        extra: (
                          <Popconfirm title="删除该步骤？" onConfirm={(e) => { e.stopPropagation(); remove(field.name) }}>
                            <Button size="small" type="text" danger icon={<Trash2 size={12} />} />
                          </Popconfirm>
                        ),
                        children: (
                          <>
                            <Form.Item name={[field.name, 'subject']} label="步骤名" rules={[{ required: true, message: '请输入步骤名' }]}>
                              <Input placeholder="简短可执行的步骤名" />
                            </Form.Item>
                            <Form.Item name={[field.name, 'description']} label="要达成什么" rules={[{ required: true, message: '请输入步骤描述' }]}>
                              <Input.TextArea rows={3} placeholder="描述该步骤需要证明/达成的内容" />
                            </Form.Item>
                            <Form.Item name={[field.name, 'agent_id']} label="执行智能体" rules={[{ required: true, message: '请选择执行智能体' }]}>
                              <Select placeholder="选择智能体" options={agents.map((a) => ({ value: a.id, label: a.data?.name || a.id }))} />
                            </Form.Item>
                            <Form.Item name={[field.name, 'session_key']} label="会话 Key" initialValue="main">
                              <Input placeholder="main" />
                            </Form.Item>
                            <Form.Item name={[field.name, 'max_attempts']} label="最大尝试次数" initialValue={3}>
                              <InputNumber min={1} style={{ width: '100%' }} />
                            </Form.Item>
                            <Form.Item name={[field.name, 'need_verifier']} label="需要人工裁决" valuePropName="checked">
                              <Select
                                placeholder="无需裁决（来什么收什么）"
                                allowClear
                                options={[
                                  { value: false, label: '无需裁决' },
                                  { value: true, label: '人工裁决' },
                                ]}
                                onChange={() => form.setFieldsValue({ [field.name]: { ...step } })}
                              />
                            </Form.Item>
                            <Form.Item
                              noStyle
                              shouldUpdate={(prev, cur) => prev.steps?.[field.name]?.need_verifier !== cur.steps?.[field.name]?.need_verifier}
                            >
                              {() =>
                                form.getFieldValue(['steps', field.name, 'need_verifier']) ? (
                                  <>
                                    <Form.Item name={[field.name, 'question']} label="裁决问题">
                                      <Input.TextArea rows={2} placeholder="Does this meet what the step had to prove?" />
                                    </Form.Item>
                                  </>
                                ) : null
                              }
                            </Form.Item>
                          </>
                        ),
                      },
                    ]}
                  />
                )
              })}
              <Button type="dashed" block icon={<Plus size={13} />} onClick={() => add({ subject: '', description: '', agent_id: agents[0]?.id, session_key: 'main', max_attempts: 3 })}>
                添加步骤
              </Button>
            </>
          )}
        </Form.List>
      </Form>
    </Modal>
  )
}

function RunDetailModal({ run, open, onClose, onSubmitVerdict }) {
  if (!run) return null
  const steps = run.state?.steps || []

  const stepCard = (step, index) => {
    const submissions = step?.submission || []
    const verifications = step?.verifications || []
    const needHuman =
      run.definition?.steps?.[index]?.verifier?.human != null && step?.phase === 'awaiting'
    return {
      key: index,
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <Tag color={PHASE_TAG_COLORS[step?.phase] || 'default'} style={{ fontSize: 11 }}>
            {step?.phase}
          </Tag>
          <span style={{ fontWeight: 600 }}>{run.definition?.steps?.[index]?.subject || `步骤 ${index + 1}`}</span>
        </span>
      ),
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {submissions.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>提交内容：</div>
              <pre className="hub-readme">
                {submissions.map((b) => (b?.type === 'text' ? b.text : JSON.stringify(b))).join('\n')}
              </pre>
            </div>
          )}
          {verifications.map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              {v.passed ? <CheckCircle2 size={14} color="var(--success-color)" /> : <XCircle size={14} color="var(--error-color)" />}
              <span>{v.message || (v.passed ? '通过' : '未通过')}</span>
              <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>{formatTime(v.created_at)}</span>
            </div>
          ))}
          {needHuman && (
            <VerdictForm
              onSubmit={(passed, msg) => onSubmitVerdict(run.id, index, passed, msg)}
            />
          )}
        </div>
      ),
    }
  }

  return (
    <Modal title={`运行详情：${run.definition?.name || run.id}`} open={open} onCancel={onClose} footer={null} width={720} destroyOnClose>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <Tag color={PHASE_TAG_COLORS[run.state?.phase] || 'default'}>{run.state?.phase}</Tag>
        <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>{formatTime(run.state?.created_at || run.created_at)}</span>
      </div>
      <Collapse ghost defaultActiveKey={[0]} items={steps.map((s, i) => stepCard(s, i))} />
    </Modal>
  )
}

function VerdictForm({ onSubmit }) {
  const [messageText, setMessageText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (passed) => {
    setSubmitting(true)
    try {
      await onSubmit(passed, messageText)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="confirm-card" style={{ marginTop: 8 }}>
      <div className="confirm-card-head">
        <CheckCircle2 size={14} color="var(--warning-color)" />
        <span style={{ fontWeight: 600, fontSize: 13 }}>等待人工裁决</span>
      </div>
      <Input.TextArea rows={2} value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="裁决意见（可选）" />
      <div className="confirm-card-actions">
        <Button size="small" type="primary" loading={submitting} onClick={() => submit(true)}>
          通过
        </Button>
        <Button size="small" danger loading={submitting} onClick={() => submit(false)}>
          不通过
        </Button>
      </div>
    </div>
  )
}

export default function SopView() {
  const [sops, setSops] = useState([])
  const [runs, setRuns] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailRun, setDetailRun] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sopData, runData] = await Promise.all([sopApi.list(), sopApi.listRuns().catch(() => ({}))])
      setSops(sopData?.sops || [])
      setRuns(runData?.runs || [])
    } catch (err) {
      message.error(err.message || '加载流程失败')
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

  const handleCreate = async (data) => {
    try {
      await sopApi.create({ data })
      message.success('已创建')
      setCreateOpen(false)
      load()
    } catch (err) {
      message.error(err.message || '创建失败')
    }
  }

  const startRun = async (sop) => {
    try {
      await sopApi.startRun(sop.id)
      message.success('已启动运行')
      load()
    } catch (err) {
      message.error(err.message || '启动失败')
    }
  }

  const submitVerdict = async (runId, stepIndex, passed, msg) => {
    try {
      const updated = await sopApi.submitVerdict(runId, { step_index: stepIndex, passed, message: msg || '' })
      setDetailRun(updated)
      load()
    } catch (err) {
      message.error(err.message || '提交裁决失败')
    }
  }

  const viewRun = async (run) => {
    try {
      const detail = await sopApi.getRun(run.id)
      setDetailRun(detail)
    } catch {
      setDetailRun(run)
    }
  }

  const sopColumns = [
    {
      title: '名称',
      key: 'name',
      render: (_, r) => (
        <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <GitBranch size={15} color="var(--main-color)" />
          {r.data?.name || r.id}
        </span>
      ),
    },
    { title: '描述', key: 'desc', ellipsis: true, render: (_, r) => <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{r.data?.description}</span> },
    { title: '步骤数', key: 'steps', width: 90, render: (_, r) => <span>{r.data?.steps?.length ?? 0}</span> },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, r) => (
        <span style={{ display: 'inline-flex', gap: 4 }}>
          <Button size="small" type="primary" ghost icon={<PlayCircle size={13} />} onClick={() => startRun(r)}>
            启动
          </Button>
          <Popconfirm title="删除该流程及其运行记录？" onConfirm={async () => {
            try {
              await sopApi.remove(r.id)
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

  const runColumns = [
    {
      title: '流程',
      key: 'sop',
      render: (_, r) => <span style={{ fontWeight: 500 }}>{r.definition?.name || r.sop_id}</span>,
    },
    {
      title: '阶段',
      key: 'phase',
      width: 100,
      render: (_, r) => <Tag color={PHASE_TAG_COLORS[r.state?.phase] || 'default'}>{r.state?.phase}</Tag>,
    },
    {
      title: '步骤进度',
      key: 'progress',
      width: 120,
      render: (_, r) => {
        const steps = r.state?.steps || []
        const completed = steps.filter((s) => s.phase === 'completed').length
        return <span style={{ fontSize: 13 }}>{completed}/{steps.length}</span>
      },
    },
    { title: '创建时间', dataIndex: 'created_at', width: 170, render: (v) => <span style={{ fontSize: 13 }}>{formatTime(v)}</span> },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_, r) => (
        <span style={{ display: 'inline-flex', gap: 4 }}>
          <Button size="small" type="text" onClick={() => viewRun(r)}>
            详情
          </Button>
          <Popconfirm title="删除该运行记录？" onConfirm={async () => {
            try {
              await sopApi.removeRun(r.id)
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
        title="流程编排（SOP）"
        actions={
          <>
            <Button size="small" icon={<RefreshCw size={13} />} onClick={load}>
              刷新
            </Button>
            <Button type="primary" size="small" icon={<Plus size={13} />} onClick={() => setCreateOpen(true)}>
              创建流程
            </Button>
          </>
        }
      />
      <div className="page-body">
        <Tabs
          items={[
            {
              key: 'sops',
              label: '流程定义',
              children:
                sops.length === 0 && !loading ? (
                  <EmptyState icon={GitBranch} title="暂无流程" description="点击右上角「创建流程」开始" />
                ) : (
                  <Table rowKey="id" columns={sopColumns} dataSource={sops} loading={loading} pagination={false} size="middle" />
                ),
            },
            {
              key: 'runs',
              label: '运行记录',
              children:
                runs.length === 0 ? (
                  <Empty description="暂无运行记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <Table rowKey="id" columns={runColumns} dataSource={runs} pagination={false} size="middle" />
                ),
            },
          ]}
        />
      </div>
      <SopForm open={createOpen} agents={agents} onOk={handleCreate} onCancel={() => setCreateOpen(false)} />
      <RunDetailModal run={detailRun} open={!!detailRun} onClose={() => setDetailRun(null)} onSubmitVerdict={submitVerdict} />
    </div>
  )
}
