import { ConfigProvider, App as AntApp, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import { BrowserRouter } from 'react-router-dom'
import { useEffect } from 'react'
import { useThemeStore } from '@/stores/theme'
import { globalMessage } from '@/utils/globalMessage'
import AppRouter from './router'

function MessageBridge() {
  const { message } = AntApp.useApp()
  useEffect(() => {
    globalMessage.success = message.success
    globalMessage.error = message.error
    globalMessage.warning = message.warning
    globalMessage.info = message.info
  }, [message])
  return null
}

export default function App() {
  const isDark = useThemeStore((s) => s.isDark)
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#04cbd8',
          borderRadius: 6,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans SC', sans-serif",
        },
      }}
    >
      <AntApp>
        <MessageBridge />
        <BrowserRouter>
          <AppRouter />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  )
}
