import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import useWishlistStore from './wishlistStore'

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
        // 위시리스트 서버 동기화
        try { useWishlistStore.getState().syncFromServer?.() } catch { /* noop */ }
      },
      register: (user, token) => set({
        user, token, isAuthenticated: true, isAdmin: false, verified: false,
      }),
      verify: () => set({ verified: true }),
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false, isAdmin: false, verified: false })
        try { useWishlistStore.getState().clear?.() } catch { /* noop */ }
      },
    }),
    { name: 'vault-auth' }
  )
)

export default useAuthStore
