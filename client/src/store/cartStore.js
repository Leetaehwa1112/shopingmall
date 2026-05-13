import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      add: (card) => {
        if (get().items.find((i) => i.id === card.id)) return
        set({ items: [...get().items, card] })
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      clear: () => set({ items: [] }),
      total: () => get().items.reduce((sum, i) => sum + (i.price || i.currentBid || 0), 0),
    }),
    { name: 'vault-cart' }
  )
)

export default useCartStore
