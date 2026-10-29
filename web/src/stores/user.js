import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { createJwt, isJwtExpired } from '@/utils/jwt'

export const useUserStore = create(
  persist(
    (set, get) => ({
      token: '',
      userId: 'local-user',
      isLoggedIn: false,
      setUserId: (userId) => set({ userId: userId || 'local-user' }),
      login: async (userId) => {
        const next = userId || 'local-user'
        const token = await createJwt({ sub: next })
        set({ token, userId: next, isLoggedIn: true })
        return token
      },
      logout: () => set({ token: '', isLoggedIn: false }),
      getAuthHeaders: () => {
        const { token, userId } = get()
        const headers = {}
        if (userId) headers['x-user-id'] = userId
        if (token) headers.Authorization = `Bearer ${token}`
        return headers
      },
    }),
    {
      name: 'si_agent_user',
      onRehydrateStorage: () => (state) => {
        if (state?.token && isJwtExpired(state.token)) {
          useUserStore.setState({ token: '', isLoggedIn: false })
        }
      },
    }
  )
)
