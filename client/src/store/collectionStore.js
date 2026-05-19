import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 도감 소장 체크 — Pokédex ID 기준
const useCollectionStore = create(
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
    { name: 'vault-collection' }
  )
)

export default useCollectionStore
