import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addToWishlist, removeFromWishlist, getMe } from '@/api/userApi'
import useAuthStore from '@/store/authStore'

/**
 * 위시리스트 스토어
 * - 비로그인: localStorage(persist)만 사용
 * - 로그인:   서버 sync (낙관적 업데이트 + 실패 시 롤백)
 */
const useWishlistStore = create(
  persist(
    (set, get) => ({
      ids: [],

      /** 토글 — 로그인 시 서버에도 반영 */
      toggle: async (id) => {
        if (!id) return
        const ids = get().ids
        const { user, isAuthenticated } = useAuthStore.getState()
        const has = ids.includes(id)
        const next = has ? ids.filter((x) => x !== id) : [...ids, id]
        // 낙관적 업데이트
        set({ ids: next })

        if (isAuthenticated && user?._id) {
          try {
            if (has) await removeFromWishlist(user._id, id)
            else await addToWishlist(user._id, id)
          } catch (e) {
            // 실패 시 롤백
            set({ ids })
            throw e
          }
        }
      },

      has: (id) => get().ids.includes(id),

      /** 서버 위시리스트로 동기화 (로그인 직후 호출) */
      syncFromServer: async () => {
        try {
          const { isAuthenticated } = useAuthStore.getState()
          if (!isAuthenticated) return
          const res = await getMe()
          const list = res?.data?.data?.wishlist || []
          set({ ids: list.map(String) })
        } catch {
          /* 무시 */
        }
      },

      clear: () => set({ ids: [] }),
    }),
    { name: 'vault-wishlist' }
  )
)

export default useWishlistStore
