import { useCallback, useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Select, Tabs, Tag, Tooltip, Popconfirm, Empty } from 'antd'
import { globalMessage as message } from '@/utils/globalMessage'
import { Plus, Pencil, Trash2, RefreshCw, KeyRound, Cpu } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import SchemaForm, { schemaValuesToJson } from '@/components/common/SchemaForm'
import { credentialApi, modelApi } from '@/apis/model'
import { formatTime } from '@/utils/time'

function CredentialModal({ open, editing, schemas, onOk, onCancel }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)
  const [schemaIndex, setSchemaIndex] = useState(0)

  useEffect(() => {
    if (open) {
      const idx = schemas.findIndex((s) => editing && s?.title === editing.data?.type)
      setSchemaIndex(idx >= 0 ? idx : 0)
      form.setFieldsValue(editing ? { ...editing.data, _type: editing.data?.type } : {})
    }
  }, [open, editing, schemas, form])

  const schema = schemas[schemaIndex]

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const { _type, ...rest } = values
      let data = rest
      if (schema) {
        data = schemaValuesToJson(schema, rest)
        if (schema.title && !data.type) data.type = schema.title
      }
      setSaving(true)
      await onOk(data)
    } catch {
      // 校验失败
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={editing ? '编辑凭证' : '创建凭证'}
      open={open}
      width={560}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={saving}
      okText={editing ? '保存' : '创建'}
      destroyOnHidden
    >
      {!editing && schemas.length > 0 && (
        <Form.Item label="凭证类型" layout="vertical" style={{ marginBottom: 8 }}>
          <Select value={schemaIndex} onChange={setSchemaIndex} style={{ width: '100%' }}>
            {schemas.map((s, i) => (
              <Select.Option key={i} value={i}>
                {s?.title || `凭证类型 ${i + 1}`}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      )}
      {schema ? (
        <SchemaForm schema={schema} form={form} />
      ) : (
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item name="type" label="类型" rules={[{ required: true }]}>
            <Input placeholder="凭证类型，如 openai" />
          </Form.Item>
          <Form.Item name="name" label="名称">
            <Input placeholder="凭证名称" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  )
}

function CredentialPanel() {
  const [credentials, setCredentials] = useState([])
  const [schemas, setSchemas] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [credData, schemaData] = await Promise.all([credentialApi.list(), credentialApi.schemas().catch(() => ({}))])
      setCredentials(credData?.credentials || [])
      setSchemas(schemaData?.schemas || [])
    } catch (err) {
      message.error(err.message || '加载凭证失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (data) => {
    try {
      if (editing) {
        await credentialApi.update(editing.id, { data })
        message.success('已保存')
      } else {
        await credentialApi.create({ data })
        message.success('已创建')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      message.error(err.message || '保存失败')
    }
  }

  const columns = [
    {
      title: '名称',
      key: 'name',
      render: (_, record) => record.data?.name || record.data?.type || record.id,
    },
    { title: '类型', key: 'type', render: (_, record) => <Tag>{record.data?.type || '—'}</Tag> },
    {
      title: '共享（掩码）',
      dataIndex: 'editable',
      width: 100,
      render: (v) => (v ? <Tag>私有</Tag> : <Tag color="warning">共享掩码</Tag>),
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
      width: 120,
      render: (_, record) => (
        <span style={{ display: 'inline-flex', gap: 4 }}>
          <Button size="small" type="text" icon={<Pencil size={13} />} disabled={!record.editable} onClick={() => { setEditing(record); setModalOpen(true) }}>
            编辑
          </Button>
          <Popconfirm title="确定删除该凭证吗？" onConfirm={async () => {
            try {
              await credentialApi.remove(record.id)
              message.success('已删除')
              load()
            } catch (err) {
              message.error(err.message || '删除失败')
            }
          }} disabled={!record.editable}>
            <Button size="small" type="text" danger icon={<Trash2 size={13} />} disabled={!record.editable} />
          </Popconfirm>
        </span>
      ),
    },
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
        <Button size="small" icon={<RefreshCw size={13} />} onClick={load}>
          刷新
        </Button>
        <Button
          type="primary"
          size="small"
          icon={<Plus size={13} />}
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
        >
          创建凭证
        </Button>
      </div>
      <Table rowKey="id" columns={columns} dataSource={credentials} loading={loading} pagination={false} size="middle" />
      <CredentialModal open={modalOpen} editing={editing} schemas={schemas} onOk={handleSubmit} onCancel={() => setModalOpen(false)} />
    </>
  )
}

function ModelCatalogPanel() {
  const [credentials, setCredentials] = useState([])
  const [activeCred, setActiveCred] = useState('')
  const [models, setModels] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    credentialApi
      .list()
      .then((data) => {
        const list = data?.credentials || []
        setCredentials(list)
        if (list.length > 0) setActiveCred((prev) => prev || list[0].data?.type || list[0].id)
      })
      .catch((err) => message.error(err.message || '加载凭证失败'))
  }, [])

  useEffect(() => {
    if (!activeCred) return
    setLoading(true)
    modelApi
      .listChatModels(activeCred)
      .then((data) => setModels(data?.models || []))
      .catch((err) => message.error(err.message || '加载模型失败'))
      .finally(() => setLoading(false))
  }, [activeCred])

  const columns = [
    { title: '模型', dataIndex: 'name', render: (v, r) => (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <Cpu size={14} color="var(--main-color)" />
        <span style={{ fontWeight: 600 }}>{r.label || v}</span>
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--gray-400)' }}>{v}</span>
      </span>
    ) },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (v) => <Tag color={v === 'active' ? 'success' : v === 'deprecated' ? 'warning' : 'error'}>{v}</Tag>,
    },
    {
      title: '上下文',
      dataIndex: 'context_size',
      width: 110,
      render: (v) => (v != null ? v.toLocaleString() : '—'),
    },
    {
      title: '输入类型',
      dataIndex: 'input_types',
      width: 180,
      ellipsis: true,
      render: (v) => (Array.isArray(v) ? v.join(', ') : '—'),
    },
    {
      title: '输出类型',
      dataIndex: 'output_types',
      width: 180,
      ellipsis: true,
      render: (v) => (Array.isArray(v) ? v.join(', ') : '—'),
    },
  ]

  return (
    <>
      {credentials.length === 0 ? (
        <EmptyState icon={KeyRound} title="暂无凭证" description="先创建凭证后可浏览模型目录" />
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <Select value={activeCred} onChange={setActiveCred} style={{ width: 280 }} placeholder="选择凭证类型">
              {credentials.map((c, i) => (
                <Select.Option key={i} value={c.data?.type || c.id}>
                  {c.data?.name || c.data?.type || c.id}
                </Select.Option>
              ))}
            </Select>
          </div>
          <Table rowKey="name" columns={columns} dataSource={models} loading={loading} pagination={false} size="middle" />
        </>
      )}
    </>
  )
}

export default function ModelsView() {
  return (
    <div className="page-view">
      <PageHeader title="模型与凭证" />
      <div className="page-body">
        <Tabs
          items={[
            { key: 'credentials', label: '凭证管理', children: <CredentialPanel /> },
            { key: 'models', label: '模型目录', children: <ModelCatalogPanel /> },
          ]}
        />
      </div>
    </div>
  )
}
