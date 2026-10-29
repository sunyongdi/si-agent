import { useCallback, useEffect, useState } from 'react'
import { Tabs, Button, Modal, Form, Input, Tag, Popconfirm, Empty, Spin, Tooltip } from 'antd'
import { globalMessage as message } from '@/utils/globalMessage'
import { Plus, RefreshCw, Trash2, Puzzle, Blocks, Search, Download, Package } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/common/EmptyState'
import SchemaForm, { schemaValuesToJson } from '@/components/common/SchemaForm'
import { mcpApi, skillApi } from '@/apis/mcp'
import { fromNow } from '@/utils/time'

function CardGrid({ cards, onDetail, onInstall, installingId }) {
  if (!cards.length) return <Empty description="无可用卡片" image={Empty.PRESENTED_IMAGE_SIMPLE} />
  return (
    <div className="hub-grid">
      {cards.map((card) => (
        <div key={`${card.hub_id}:${card.id}`} className="hub-card" onClick={() => onDetail(card)}>
          <div className="hub-card-head">
            <Package size={18} color="var(--main-color)" style={{ flexShrink: 0 }} />
            <span className="hub-card-title">{card.display_name || card.name}</span>
            {card.auth === 'inputs' && <Tag color="warning" style={{ fontSize: 10 }}>需配置</Tag>}
          </div>
          <div className="hub-card-desc">{card.description || '暂无描述'}</div>
          <div className="hub-card-foot">
            <span className="hub-card-meta">
              {card.version ? `v${card.version}` : ''} {card.updated_at ? `· ${fromNow(card.updated_at)}` : ''}
            </span>
            <Button
              size="small"
              type="primary"
              ghost
              icon={<Download size={12} />}
              loading={installingId === `${card.hub_id}:${card.id}`}
              onClick={(e) => {
                e.stopPropagation()
                onInstall(card)
              }}
            >
              安装
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function InstallModal({ open, card, schema, onOk, onCancel }) {
  const [form] = Form.useForm()
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) form.resetFields()
  }, [open, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const valuesObj = schema ? schemaValuesToJson(schema, values) : values
      setSaving(true)
      await onOk(valuesObj)
    } catch {
      // 校验失败
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`安装：${card?.display_name || card?.name || ''}`}
      open={open}
      width={560}
      onOk={handleSubmit}
      onCancel={onCancel}
      confirmLoading={saving}
      okText="安装"
      destroyOnHidden
    >
      <Form form={form} layout="vertical" preserve={false}>
        <Form.Item name="name" label="实例名称（可选）">
          <Input placeholder="默认使用卡片名" />
        </Form.Item>
        {schema?.properties && Object.entries(schema.properties).length > 0 && (
          <>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', margin: '8px 0' }}>安装配置：</div>
            <SchemaForm schema={schema} form={form} />
          </>
        )}
      </Form>
    </Modal>
  )
}

function HubTab({ type }) {
  const [hubs, setHubs] = useState([])
  const [activeHub, setActiveHub] = useState('')
  const [cards, setCards] = useState([])
  const [keyword, setKeyword] = useState('')
  const [cursor, setCursor] = useState(null)
  const [loading, setLoading] = useState(false)
  const [detailCard, setDetailCard] = useState(null)
  const [installCard, setInstallCard] = useState(null)
  const [installSchema, setInstallSchema] = useState(null)
  const [installingId, setInstallingId] = useState(null)
  const [installed, setInstalled] = useState([])

  const api = type === 'mcp' ? mcpApi : skillApi

  const loadHubs = useCallback(async () => {
    try {
      const data = await api.listHubs()
      const list = data || []
      setHubs(list)
      if (list.length > 0) setActiveHub((prev) => prev || list[0].hub_id)
    } catch (err) {
      message.error(err.message || '加载 Hub 失败')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadCards = useCallback(
    async (reset = false, nextCursor = null, q = '') => {
      if (!activeHub) return
      setLoading(true)
      try {
        const data = await api.listCards(activeHub, {
          cursor: nextCursor || undefined,
          q: q || undefined,
        })
        const list = data?.cards || []
        setCards((prev) => (reset ? list : [...prev, ...list]))
        setCursor(data?.next_cursor ?? null)
      } catch (err) {
        message.error(err.message || '加载卡片失败')
      } finally {
        setLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeHub]
  )

  const loadInstalled = useCallback(async () => {
    try {
      const data = type === 'mcp' ? await mcpApi.listInstalled() : await skillApi.listInstalled()
      setInstalled(data || [])
    } catch {
      setInstalled([])
    }
  }, [type])

  useEffect(() => {
    loadHubs()
    loadInstalled()
  }, [loadHubs, loadInstalled])

  useEffect(() => {
    if (activeHub) {
      setCards([])
      setCursor(null)
      loadCards(true, null, keyword)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHub])

  const handleSearch = () => {
    setCards([])
    setCursor(null)
    loadCards(true, null, keyword)
  }

  const handleDetail = async (card) => {
    setDetailCard(card)
    try {
      const detail = await api.getCard(card.hub_id, card.id)
      setDetailCard(detail)
    } catch {
      // 详情加载失败时用列表数据
    }
  }

  const handleInstallClick = (card) => {
    setInstallCard(card)
    const schema = card?.inputs_schema || null
    setInstallSchema(schema)
  }

  const handleInstall = async (valuesObj) => {
    if (!installCard) return
    setInstallingId(`${installCard.hub_id}:${installCard.id}`)
    try {
      if (type === 'mcp') {
        await mcpApi.install(installCard.hub_id, installCard.id, valuesObj)
      } else {
        await skillApi.install(installCard.hub_id, installCard.id, valuesObj?.name)
      }
      message.success('安装成功')
      setInstallCard(null)
      loadInstalled()
    } catch (err) {
      message.error(err.message || '安装失败')
    } finally {
      setInstallingId(null)
    }
  }

  const handleUninstall = async (item) => {
    try {
      if (type === 'mcp') await mcpApi.remove(item.id)
      else await skillApi.remove(item.id)
      message.success('已卸载')
      loadInstalled()
    } catch (err) {
      message.error(err.message || '卸载失败')
    }
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {hubs.map((h) => (
            <Button
              key={h.hub_id}
              size="small"
              type={activeHub === h.hub_id ? 'primary' : 'default'}
              onClick={() => setActiveHub(h.hub_id)}
            >
              {h.display_name || h.hub_id}
            </Button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Input
            size="small"
            style={{ width: 220 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            placeholder="搜索扩展…"
            prefix={<Search size={13} />}
            allowClear
          />
          <Button size="small" icon={<RefreshCw size={13} />} onClick={() => loadCards(true, null, keyword)}>
            刷新
          </Button>
        </div>
      </div>

      <CardGrid cards={cards} onDetail={handleDetail} onInstall={handleInstallClick} installingId={installingId} />
      {cursor && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button size="small" loading={loading} onClick={() => loadCards(false, cursor, keyword)}>
            加载更多
          </Button>
        </div>
      )}
      {loading && cards.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 10 }}>已安装（{installed.length}）</div>
        {installed.length === 0 ? (
          <Empty description="尚未安装任何扩展" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {installed.map((item) => (
              <div key={item.id} className="installed-item">
                {type === 'mcp' ? <Puzzle size={15} color="var(--main-color)" /> : <Blocks size={15} color="var(--main-color)" />}
                <span className="installed-name">{item.display_name || item.name}</span>
                {item.version && <Tag style={{ fontSize: 11 }}>v{item.version}</Tag>}
                <span className="installed-desc">{item.description || ''}</span>
                <Popconfirm title="确定卸载该扩展吗？" onConfirm={() => handleUninstall(item)}>
                  <Button size="small" type="text" danger icon={<Trash2 size={13} />} />
                </Popconfirm>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        title={detailCard?.display_name || detailCard?.name || '详情'}
        open={!!detailCard}
        onCancel={() => setDetailCard(null)}
        footer={[
          <Button
            key="install"
            type="primary"
            onClick={() => {
              const card = detailCard
              setDetailCard(null)
              handleInstallClick(card)
            }}
          >
            安装
          </Button>,
        ]}
        width={640}
        destroyOnHidden
      >
        {detailCard && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {(detailCard.tags || []).map((t) => (
                <Tag key={t}>{t}</Tag>
              ))}
              {detailCard.author && <Tag color="blue">{detailCard.author}</Tag>}
              {detailCard.version && <Tag color="cyan">v{detailCard.version}</Tag>}
            </div>
            <p style={{ color: 'var(--gray-600)' }}>{detailCard.description}</p>
            {detailCard.readme && (
              <pre className="hub-readme">{detailCard.readme}</pre>
            )}
          </div>
        )}
      </Modal>

      <InstallModal open={!!installCard} card={installCard} schema={installSchema} onOk={handleInstall} onCancel={() => setInstallCard(null)} />
    </>
  )
}

export default function ExtensionsView() {
  return (
    <div className="page-view">
      <PageHeader title="扩展市场" />
      <div className="page-body">
        <Tabs
          items={[
            { key: 'mcp', label: 'MCP 服务', children: <HubTab type="mcp" /> },
            { key: 'skill', label: 'Skill 技能', children: <HubTab type="skill" /> },
          ]}
        />
      </div>
    </div>
  )
}
