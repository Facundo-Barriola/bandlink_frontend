import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@/types/auth'

type AuthState = {
  accessToken: string | null
  refreshToken: string | null
  sessionId: string | null
  user: AuthUser | null
  rememberMe: boolean

  setTokens: (accessToken: string, refreshToken: string, sessionId: string) => void
  setUser: (user: AuthUser) => void
  setRememberMe: (value: boolean) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      sessionId: null,
      user: null,
      rememberMe: true,

      setTokens: (accessToken, refreshToken, sessionId) =>
        set({ accessToken, refreshToken, sessionId }),

      setUser: (user) => set({ user }),

      setRememberMe: (value) => set({ rememberMe: value }),

      clear: () =>
        set({ accessToken: null, refreshToken: null, sessionId: null, user: null }),
    }),
    {
      name: 'bandlink-auth',
      partialize: (state) =>
        state.rememberMe
          ? {
              accessToken: state.accessToken,
              refreshToken: state.refreshToken,
              sessionId: state.sessionId,
              rememberMe: true,
            }
          : { rememberMe: false }, // solo persiste la preferencia, no los tokens
    },
  ),
)