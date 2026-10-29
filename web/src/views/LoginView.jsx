import { useEffect, useState } from 'react'
import { Button, Input } from 'antd'
import { Moon, Sun, ArrowRight } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useUserStore } from '@/stores/user'
import { useThemeStore } from '@/stores/theme'
import { agentApi } from '@/apis/session'
import { globalMessage as message } from '@/utils/globalMessage'

export default function LoginView() {
  const navigate = useNavigate()
  const { isLoggedIn, userId, setUserId, login } = useUserStore()
  const { isDark, toggleTheme } = useThemeStore()
  const [inputValue, setInputValue] = useState(userId)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setInputValue(useUserStore.getState().userId)
  }, [])

  if (isLoggedIn) return <Navigate to="/chat" replace />

  const handleLogin = async () => {
    const value = inputValue.trim()
    if (!value) {
      message.warning('请输入用户 ID')
      return
    }
    setLoading(true)
    // 先写入 store 使验证请求携带该 x-user-id，验证通过即签发 JWT 完成登录
    setUserId(value)
    try {
      await agentApi.list()
      await login(value)
      message.success(`欢迎，${value}`)
      navigate('/chat', { replace: true })
    } catch (err) {
      message.error(err?.response?.status === 401 || err?.response?.status === 403
        ? '该用户 ID 无访问权限'
        : err?.message || '无法连接平台服务，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin()
  }

  return (
    <div className="login-view">
      <button type="button" className="login-theme-toggle" onClick={toggleTheme} title="切换主题">
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
      <div className="login-card">
        <div className="login-brand">
          <span className="login-brand-bar" />
          <span className="login-brand-name">Si-Agent</span>
        </div>
        <h1 className="login-title">登录</h1>
        <p className="login-desc">输入用户 ID 登录 Si-Agent 平台，登录后签发 7 天有效期的 JWT 凭证，所有请求通过 <code>Authorization: Bearer</code> 携带。</p>
        <div className="login-form">
          <Input
            size="large"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="用户 ID，例如 local-user"
            autoFocus
          />
          <Button
            type="primary"
            size="large"
            icon={<ArrowRight size={15} />}
            iconPosition="end"
            loading={loading}
            onClick={handleLogin}
          >
            登录
          </Button>
        </div>
      </div>
    </div>
  )
}
