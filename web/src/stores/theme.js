import { create } from 'zustand'
import { persist } from 'zustand/middleware'

function applyTheme(isDark) {
  const root = document.documentElement
  if (isDark) root.classList.add('dark')
  else root.classList.remove('dark')
}

export const useThemeStore = create(
  persist(
    (set, get) => ({
      isDark: false,
      toggleTheme: () => {
        const next = !get().isDark
        applyTheme(next)
        set({ isDark: next })
      },
    }),
    {
      name: 'si_agent_theme',
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.isDark)
      },
    }
  )
)

applyTheme(useThemeStore.getState().isDark)
