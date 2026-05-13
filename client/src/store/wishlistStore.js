import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useWishlistStore = create(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) => {
        const ids = get().ids
        if (ids.includes(id)) set({ ids: ids.filter((x) => x !== id) })
        else set({ ids: [...ids, id] })
      },
      has: (id) => get().ids.includes(id),
    }),
    { name: 'vault-wishlist' }
  )
)

export default useWishlistStore
