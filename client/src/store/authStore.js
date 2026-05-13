import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isAdmin: false,
      verified: false,
      login: (user) => set({
        user,
        isAuthenticated: true,
        isAdmin: user?.role === 'admin',
        verified: true,
      }),
      register: (user) => set({
        user, isAuthenticated: true, isAdmin: false, verified: false,
      }),
      verify: () => set({ verified: true }),
      logout: () => set({ user: null, isAuthenticated: false, isAdmin: false, verified: false }),
    }),
    { name: 'vault-auth' }
  )
)

export default useAuthStore
