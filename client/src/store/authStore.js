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
      login: (user, token) => set({
        user,
        token,
        isAuthenticated: true,
        isAdmin: user?.user_type === 'admin' || user?.role === 'admin',
        verified: true,
      }),
      register: (user, token) => set({
        user, token, isAuthenticated: true, isAdmin: false, verified: false,
      }),
      verify: () => set({ verified: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false, isAdmin: false, verified: false }),
    }),
    { name: 'vault-auth' }
  )
)

export default useAuthStore
