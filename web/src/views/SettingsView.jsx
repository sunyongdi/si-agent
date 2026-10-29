import { useEffect, useState } from 'react'
import { Card, Form, Input, Button, Switch, Tag, Descriptions } from 'antd'
import { globalMessage as message } from '@/utils/globalMessage'
import { RefreshCw, Moon } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { apiGet } from '@/apis/base'

export default function SettingsView() {
  const { userId, setUserId } = useUserStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [inputValue, setInputValue] = useState(userId)
  const [health, setHealth] = useState(null)
  const [checking, setChecking] = useState(false)

  const checkHealth = async () => {
    setChecking(true)
    try {
      const data = await apiGet('/health')
      setHealth(data)
    } catch (err) {
      setHealth({ status: 'unreachable', message: err.message })
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  const handleSave = () => {
    setUserId(inputValue.trim() || 'local-user')
    message.success('用户 ID 已保存，重新登录后生效')
  }

  const handleRelogin = () => {
    useUserStore.getState().logout()
    window.location.assign('/login')
  }

  return (
    <div className="page-view">
      <PageHeader title="设置" />
      <div className="page-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 760 }}>
        <Card
          title="用户身份"
          size="small"
          extra={
            <Button size="small" danger onClick={handleRelogin}>
              重新登录
            </Button>
          }
        >
          <p style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 0 }}>
            登录后签发 JWT 凭证（7 天有效期），请求通过 <code>Authorization: Bearer</code> 携带；同时兼容当前后端的 <code>x-user-id</code> 请求头。修改用户 ID 并保存后重新登录生效。
          </p>
          <Form layout="vertical">
            <Form.Item label="用户 ID" style={{ marginBottom: 12 }}>
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="local-user"
                style={{ maxWidth: 360 }}
              />
            </Form.Item>
            <Button type="primary" size="small" onClick={handleSave}>
              保存
            </Button>
          </Form>
        </Card>

        <Card title="外观" size="small">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Moon size={16} />
            <span style={{ flex: 1 }}>暗色模式</span>
            <Switch checked={isDark} onChange={toggleTheme} />
          </div>
        </Card>

        <Card
          title="服务健康"
          size="small"
          extra={
            <Button size="small" icon={<RefreshCw size={13} />} onClick={checkHealth} loading={checking}>
              检查
            </Button>
          }
        >
          {health ? (
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="整体状态">
                <Tag color={health.status === 'ok' ? 'success' : 'warning'}>{health.status}</Tag>
              </Descriptions.Item>
              {health.version && <Descriptions.Item label="版本">{health.version}</Descriptions.Item>}
              {health.components && (
                <Descriptions.Item label="组件">
                  <span style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                    {Object.entries(health.components).map(([name, state]) => (
                      <Tag
                        key={name}
                        color={state === 'ok' ? 'success' : state === 'not_ready' ? 'error' : 'default'}
                        style={{ fontSize: 11 }}
                      >
                        {name}: {state}
                      </Tag>
                    ))}
                  </span>
                </Descriptions.Item>
              )}
            </Descriptions>
          ) : (
            <p style={{ color: 'var(--gray-400)', fontSize: 13 }}>尚未检查</p>
          )}
        </Card>
      </div>
    </div>
  )
}
