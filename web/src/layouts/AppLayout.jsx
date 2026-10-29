import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Dropdown } from 'antd'
import {
  PanelLeftClose,
  PanelLeftOpen,
  MessageCirclePlus,
  Bot,
  KeyRound,
  Database,
  LibraryBig,
  CalendarClock,
  GitBranch,
  Radio,
  Settings,
  User,
  Moon,
  Sun,
  LogOut,
} from 'lucide-react'
import { useThemeStore } from '@/stores/theme'
import { useUserStore } from '@/stores/user'
import SessionNav from '@/components/chat/SessionNav'

const NAV_ITEMS = [
  { path: '/chat', label: '对话', icon: MessageCirclePlus },
  { path: '/agents', label: '智能体', icon: Bot },
  { path: '/models', label: '模型与凭证', icon: KeyRound },
  { path: '/knowledge', label: '知识库', icon: Database },
  { path: '/extensions', label: '扩展市场', icon: LibraryBig },
  { path: '/schedules', label: '定时任务', icon: CalendarClock },
  { path: '/sop', label: '流程编排', icon: GitBranch },
  { path: '/channels', label: '渠道接入', icon: Radio },
  { path: '/settings', label: '设置', icon: Settings },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { isDark, toggleTheme } = useThemeStore()
  const userId = useUserStore((s) => s.userId)
  const isChatRoute = location.pathname === '/' || location.pathname.startsWith('/chat')

  const userMenu = {
    items: [
      { key: 'settings', icon: <Settings size={14} />, label: '设置' },
      {
        key: 'theme',
        icon: isDark ? <Sun size={14} /> : <Moon size={14} />,
        label: isDark ? '切换浅色模式' : '切换暗色模式',
      },
      { type: 'divider' },
      { key: 'logout', icon: <LogOut size={14} />, label: '退出登录', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'settings') navigate('/settings')
      if (key === 'theme') toggleTheme()
      if (key === 'logout') {
        useUserStore.getState().logout()
        navigate('/login', { replace: true })
      }
    },
  }

  return (
    <div className="app-layout">
      <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-link" onClick={() => navigate('/chat')} style={{ cursor: 'pointer' }}>
            <span className="brand-name">Si-Agent</span>
          </span>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <div
              key={path}
              className={`nav-item${location.pathname.startsWith(path) ? ' active' : ''}`}
              onClick={() => navigate(path)}
              title={label}
            >
              <Icon size={16} />
              <span className="nav-label">{label}</span>
            </div>
          ))}
        </nav>

        {isChatRoute && <SessionNav collapsed={collapsed} />}

        <div className="sidebar-footer">
          <Dropdown menu={userMenu} trigger={['click']} placement="topRight">
            <div className="user-entry">
              <User size={16} style={{ flexShrink: 0 }} />
              <span className="user-name">{userId}</span>
            </div>
          </Dropdown>
        </div>
      </aside>

      <main className="content-area">
        <Outlet />
      </main>
    </div>
  )
}
