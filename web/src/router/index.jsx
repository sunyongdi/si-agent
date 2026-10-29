import { Navigate, useRoutes } from 'react-router-dom'
import { useUserStore } from '@/stores/user'
import AppLayout from '@/layouts/AppLayout'
import LoginView from '@/views/LoginView'
import ChatView from '@/views/ChatView'
import AgentsView from '@/views/AgentsView'
import ModelsView from '@/views/ModelsView'
import KnowledgeView from '@/views/KnowledgeView'
import ExtensionsView from '@/views/ExtensionsView'
import SchedulesView from '@/views/SchedulesView'
import SopView from '@/views/SopView'
import ChannelsView from '@/views/ChannelsView'
import SettingsView from '@/views/SettingsView'

function RequireAuth({ children }) {
  const isLoggedIn = useUserStore((s) => s.isLoggedIn)
  if (!isLoggedIn) return <Navigate to="/login" replace />
  return children
}

export default function AppRouter() {
  return useRoutes([
    { path: '/login', element: <LoginView /> },
    {
      path: '/',
      element: (
        <RequireAuth>
          <AppLayout />
        </RequireAuth>
      ),
      children: [
        { path: '', element: <ChatView /> },
        { path: 'chat', element: <ChatView /> },
        { path: 'chat/:sessionId', element: <ChatView /> },
        { path: 'agents', element: <AgentsView /> },
        { path: 'models', element: <ModelsView /> },
        { path: 'knowledge', element: <KnowledgeView /> },
        { path: 'extensions', element: <ExtensionsView /> },
        { path: 'schedules', element: <SchedulesView /> },
        { path: 'sop', element: <SopView /> },
        { path: 'channels', element: <ChannelsView /> },
        { path: 'settings', element: <SettingsView /> },
        { path: '*', element: <ChatView /> },
      ],
    },
  ])
}
