import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      verified: false,
      login: (user, token) => {
        set({
          user,
          token,
          isAuthenticated: true,
          isAdmin: user?.user_type === 'admin' || user?.role === 'admin',
          verified: true,
        })
        // 위시리스트 서버 동기화 (lazy import로 순환참조 방지)
        import('./wishlistStore').then((m) => {
          m.default.getState().syncFromServer?.()
        }).catch(() => {})
      },
      register: (user, token) => set({
        user, token, isAuthenticated: true, isAdmin: false, verified: false,
      }),
      verify: () => set({ verified: true }),
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, isAdmin: false, verified: false })
        import('./wishlistStore').then((m) => {
          m.default.getState().clear?.()
        }).catch(() => {})
      },
    }),
    { name: 'vault-auth' }
  )
)

export default useAuthStore
