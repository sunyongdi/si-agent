import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Tag,
  Tooltip,
  Popconfirm,
  Drawer,
  Upload,
  Tabs,
  Empty,
  Progress,
} from 'antd'
import { globalMessage as message } from '@/utils/globalMessage'
import { Plus, RefreshCw, Trash2, Database, Upload as UploadIcon, Search, FileText } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import { knowledgeApi } from '@/apis/knowledge'
import { formatTime, formatBytes } from '@/utils/time'

const STATUS_TAG_COLORS = {
  pending: 'default',
  parsing: 'processing',
  chunking: 'processing',
  indexing: 'processing',
  ready: 'success',
  error: 'error',
}

const PROCESSING = ['pending', 'parsing', 'chunking', 'indexing']

function CreateKbModal({ open, onOk, onCancel }) {
  const [form] = Form.useForm()
  const [providers, setProviders] = useState([])
  const [chunkers, setChunkers] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    form.resetFields()
    knowledgeApi
      .embeddingModels()
      .then((data) => setProviders(data?.providers || []))
      .catch(() => setProviders([]))
    knowledgeApi
      .chunkers()
      .then((data) => setChunkers(data?.chunkers || []))
      .catch(() => setChunkers([]))
  }, [open, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const payload = {
        name: values.name,
        description: values.description || '',
        embedding_model_config: {
          type: values.emb_type,
          credential_id: values.credential_id,
          model: values.model,
          dimensions: values.dimensions ?? null,
        },
      }
      if (values.chunker_type) {
        payload.chunker_config = { type: values.chunker_type, parameters: {} }
      }
      setSaving(true)
      await onOk(payload)
    } catch {
      // 校验失败
    } finally {
      setSaving(false)
    }
  }

  const credOptions = []
  providers.forEach((p) => {
    (p.models || []).forEach((m) => {
      credOptions.push({
        key: `${p.credential.id}:${m.name}`,
        credential: p.credential,
        model: m,
      })
    })
  })

  return (
    <Modal
      title="创建知识库"
      open={open}
      width={560}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={saving}
      okText="创建"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入知识库名称' }]}>
          <Input placeholder="知识库名称" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <Input.TextArea rows={2} placeholder="知识库描述" />
        </Form.Item>
        <Form.Item
          name="emb_type"
          label="Embedding 类型"
          rules={[{ required: true, message: '请选择 Embedding 类型' }]}
        >
          <Select
            placeholder="选择 Embedding 模型（创建后不可修改）"
            options={[...new Set(credOptions.map((o) => o.credential.data?.type || 'unknown'))].map((t) => ({ value: t, label: t }))}
          />
        </Form.Item>
        <Form.Item
          name="credential_id"
          label="凭证"
          rules={[{ required: true, message: '请选择凭证' }]}
        >
          <Select
            placeholder="选择凭证"
            options={providers.map((p) => ({ value: p.credential.id, label: p.credential.data?.name || p.credential.id }))}
          />
        </Form.Item>
        <Form.Item
          name="model"
          label="Embedding 模型"
          rules={[{ required: true, message: '请选择模型' }]}
        >
          <Select
            placeholder="选择模型"
            options={credOptions.map((o) => ({
              value: o.model.name,
              label: `${o.model.label || o.model.name}${o.model.dimensions ? ` (${o.model.dimensions} 维)` : ''}`,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="dimensions"
          label="维度（留空为模型默认；部分模型支持自定义）"
        >
          <InputNumber style={{ width: '100%' }} min={1} placeholder="模型默认维度" />
        </Form.Item>
        <Form.Item name="chunker_type" label="分块器（创建后固定）">
          <Select
            placeholder="默认分块器"
            allowClear
            options={chunkers.map((c) => ({ value: c.type, label: c.type }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}

function KbDetailDrawer({ kb, open, onClose }) {
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const [chunks, setChunks] = useState([])
  const [chunkDoc, setChunkDoc] = useState(null)
  const pollRef = useRef(null)

  const loadDocs = useCallback(async () => {
    if (!kb?.id) return
    setLoading(true)
    try {
      const data = await knowledgeApi.listDocuments(kb.id)
      setDocs(data?.documents || [])
    } catch (err) {
      message.error(err.message || '加载文档失败')
    } finally {
      setLoading(false)
    }
  }, [kb])

  useEffect(() => {
    if (open && kb?.id) loadDocs()
    return () => clearInterval(pollRef.current)
  }, [open, kb, loadDocs])

  const startPolling = useCallback(() => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      if (!kb?.id) return
      const processingIds = docs
        .filter((d) => PROCESSING.includes(d.status))
        .map((d) => d.id)
      if (processingIds.length === 0) {
        clearInterval(pollRef.current)
        return
      }
      try {
        const data = await knowledgeApi.documentStatus(kb.id, processingIds.join(','))
        const statusMap = {}
        ;(data?.items || []).forEach((s) => {
          statusMap[s.document_id] = s.status
        })
        setDocs((prev) =>
          prev.map((d) => (statusMap[d.id] ? { ...d, status: statusMap[d.id] } : d))
        )
      } catch {
        // ignore
      }
    }, 3000)
  }, [kb, docs])

  useEffect(() => {
    const processing = docs.some((d) => PROCESSING.includes(d.status))
    if (processing) startPolling()
    else clearInterval(pollRef.current)
  }, [docs, startPolling])

  const handleUpload = async (file) => {
    if (!kb?.id) return
    try {
      await knowledgeApi.uploadDocument(kb.id, file)
      message.success('上传成功，等待索引…')
      loadDocs()
    } catch (err) {
      message.error(err.message || '上传失败')
    }
    return false
  }

  const handleSearch = async () => {
    if (!searchText.trim()) return
    setSearching(true)
    setSearchResults(null)
    try {
      const data = await knowledgeApi.search(kb.id, searchText.trim(), 10)
      setSearchResults(data?.results || [])
    } catch (err) {
      message.error(err.message || '检索失败')
    } finally {
      setSearching(false)
    }
  }

  const viewChunks = async (doc) => {
    try {
      const data = await knowledgeApi.documentChunks(kb.id, doc.id)
      setChunks(data?.chunks || [])
      setChunkDoc(doc)
    } catch (err) {
      message.error(err.message || '加载分块失败')
    }
  }

  const docColumns = [
    {
      title: '文件名',
      dataIndex: 'filename',
      render: (v, r) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 500 }}>
          <FileText size={14} color="var(--gray-400)" />
          {v}
        </span>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      width: 100,
      render: (v) => <span style={{ fontSize: 13 }}>{formatBytes(v)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (v, r) => (
        <Tooltip title={v === 'error' ? r?.error : ''}>
          <Tag color={STATUS_TAG_COLORS[v] || 'default'}>{v}</Tag>
        </Tooltip>
      ),
    },
    {
      title: '分块数',
      dataIndex: 'chunk_count',
      width: 90,
      render: (v, r) =>
        r.status === 'ready' ? (
          <Button size="small" type="link" onClick={() => viewChunks(r)}>
            {v}
          </Button>
        ) : (
          <span>{v}</span>
        ),
    },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      width: 170,
      render: (v) => <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>{formatTime(v)}</span>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 70,
      render: (_, record) => (
        <Popconfirm
          title="确定删除该文档吗？"
          onConfirm={async () => {
            try {
              await knowledgeApi.removeDocument(kb.id, record.id)
              message.success('已删除')
              loadDocs()
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
    <Drawer title={`知识库：${kb?.name || ''}`} open={open} onClose={onClose} width={820} destroyOnClose>
      <Tabs
        items={[
          {
            key: 'docs',
            label: '文档',
            children: (
              <>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 12 }}>
                  <Upload beforeUpload={handleUpload} showUploadList={false}>
                    <Button type="primary" size="small" icon={<UploadIcon size={13} />}>
                      上传文档
                    </Button>
                  </Upload>
                  <Button size="small" icon={<RefreshCw size={13} />} onClick={loadDocs}>
                    刷新
                  </Button>
                </div>
                <Table
                  rowKey="id"
                  columns={docColumns}
                  dataSource={docs}
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                  size="middle"
                  locale={{ emptyText: <Empty description="暂无文档" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                />
              </>
            ),
          },
          {
            key: 'search',
            label: '检索测试',
            children: (
              <>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <Input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onPressEnter={handleSearch}
                    placeholder="输入自然语言查询，测试知识库检索"
                    prefix={<Search size={14} />}
                    allowClear
                  />
                  <Button type="primary" loading={searching} onClick={handleSearch}>
                    检索
                  </Button>
                </div>
                {searchResults === null ? (
                  <Empty description="输入查询后开始检索" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : searchResults.length === 0 ? (
                  <Empty description="无检索结果" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {searchResults.map((r, i) => (
                      <div key={i} className="search-result-card">
                        <div className="search-result-head">
                          <Tag color="processing">score {typeof r.score === 'number' ? r.score.toFixed(4) : r.score}</Tag>
                          {r.chunk?.metadata?.filename && <span style={{ fontSize: 13, fontWeight: 500 }}>{r.chunk.metadata.filename}</span>}
                          {r.chunk?.chunk_index != null && (
                            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                              chunk {r.chunk.chunk_index}/{r.chunk.total_chunks}
                            </span>
                          )}
                        </div>
                        <div className="md-content" style={{ marginTop: 6, fontSize: 13, color: 'var(--gray-600)' }}>
                          {r.chunk?.content?.text || JSON.stringify(r.chunk?.content)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ),
          },
        ]}
      />
    </Drawer>
  )
}

export default function KnowledgeView() {
  const [kbs, setKbs] = useState([])
  const [loading, setLoading] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailKb, setDetailKb] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await knowledgeApi.list()
      setKbs(data?.knowledge_bases || [])
    } catch (err) {
      message.error(err.message || '加载知识库失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleCreate = async (payload) => {
    try {
      await knowledgeApi.create(payload)
      message.success('已创建')
      setCreateOpen(false)
      load()
    } catch (err) {
      message.error(err.message || '创建失败')
    }
  }

  const statusSummary = (kb) => {
    const counts = kb?.status_counts || {}
    const entries = Object.entries(counts).filter(([, v]) => v > 0)
    return entries.map(([k, v]) => (
      <Tag key={k} color={STATUS_TAG_COLORS[k] || 'default'} style={{ fontSize: 11 }}>
        {k} {v}
      </Tag>
    ))
  }

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      render: (name, record) => (
        <Button size="small" type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => setDetailKb(record)}>
          {name || record.id}
        </Button>
      ),
    },
    { title: '描述', dataIndex: 'description', ellipsis: true, render: (v) => <span style={{ color: 'var(--gray-500)', fontSize: 13 }}>{v}</span> },
    {
      title: '文档 / 分块',
      width: 120,
      render: (_, r) => (
        <span style={{ fontSize: 13 }}>
          {r.document_count ?? 0} / {r.chunk_count ?? 0}
        </span>
      ),
    },
    {
      title: '索引状态',
      key: 'status',
      render: (_, r) => <span>{statusSummary(r).length ? statusSummary(r) : <Tag color="success">ready</Tag>}</span>,
    },
    {
      title: 'Embedding',
      key: 'emb',
      width: 200,
      ellipsis: true,
      render: (_, r) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--gray-500)' }}>
          {r.embedding_model_config?.model || '—'}
        </span>
      ),
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
      width: 70,
      render: (_, record) => (
        <Popconfirm
          title="确定删除该知识库吗？"
          onConfirm={async () => {
            try {
              await knowledgeApi.remove(record.id)
              message.success('已删除')
              load()
            } catch (err) {
              message.error(err.message || '删除失败')
            }
          }}
          disabled={!record.editable}
        >
          <Button size="small" type="text" danger icon={<Trash2 size={13} />} disabled={!record.editable} />
        </Popconfirm>
      ),
    },
  ]

  return (
    <div className="page-view">
      <PageHeader
        title="知识库"
        actions={
          <>
            <Button size="small" icon={<RefreshCw size={13} />} onClick={load}>
              刷新
            </Button>
            <Button type="primary" size="small" icon={<Plus size={13} />} onClick={() => setCreateOpen(true)}>
              创建知识库
            </Button>
          </>
        }
      />
      <div className="page-body">
        {kbs.length === 0 && !loading ? (
          <EmptyState icon={Database} title="暂无知识库" description="点击右上角「创建知识库」开始" />
        ) : (
          <Table rowKey="id" columns={columns} dataSource={kbs} loading={loading} pagination={false} size="middle" />
        )}
      </div>
      <CreateKbModal open={createOpen} onOk={handleCreate} onCancel={() => setCreateOpen(false)} />
      <KbDetailDrawer kb={detailKb} open={!!detailKb} onClose={() => setDetailKb(null)} />
    </div>
  )
}
