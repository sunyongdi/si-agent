import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useChatStore = create(
  persist(
    (set, get) => ({
      currentAgentId: '',
      setCurrentAgentId: (agentId) => set({ currentAgentId: agentId }),
      currentSessionId: '',
      setCurrentSessionId: (sessionId) => set({ currentSessionId: sessionId }),
    }),
    { name: 'si_agent_chat' }
  )
)
