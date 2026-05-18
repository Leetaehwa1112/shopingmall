import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/api/axios'

const isLoggedIn = () => {
  try {
    const { state } = JSON.parse(localStorage.getItem('vault-auth') || '{}')
    return !!state?.token
  } catch { return false }
}

const normalizeServerItems = (items) =>
  items.map((item) => ({
    ...item.product,
    id: item.product._id,
    qty: item.qty,
    shippingOption: item.shippingOption,
    priceSnapshot: item.priceSnapshot,
  }))

const mergeLocal = (prev, productId, qty, card) => {
  const existing = prev.find((i) => (i.id || i._id) === productId)
  if (existing) {
    return prev.map((i) =>
      (i.id || i._id) === productId ? { ...i, qty: (i.qty || 1) + qty } : i
    )
  }
  return [...prev, { ...card, id: productId, qty }]
}

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      loading: false,

      fetchCart: async () => {
        if (!isLoggedIn()) return
        set({ loading: true })
        try {
          const { data } = await api.get('/cart')
          // 서버에 아이템이 있을 때만 덮어씀 — 빈 서버 카트로 로컬 아이템 날리지 않음
          if (data.data.items.length > 0) {
            set({ items: normalizeServerItems(data.data.items), loading: false })
          } else {
            set({ loading: false })
          }
        } catch {
          set({ loading: false })
        }
      },

      add: async (card) => {
        const productId = card._id || card.id
        const qty = card.qty || 1

        // 1. 먼저 로컬 상태 업데이트 (옵티미스틱)
        set({ items: mergeLocal(get().items, productId, qty, card) })

        // 2. 로그인 상태면 서버에도 동기화
        if (isLoggedIn()) {
          try {
            const { data } = await api.post('/cart', {
              productId,
              qty,
              shippingOption: card.shippingOption || 'standard',
            })
            // 서버 응답으로 최종 동기화
            set({ items: normalizeServerItems(data.data.items) })
          } catch (err) {
            // API 실패해도 옵티미스틱 상태 유지 (아이템 사라지지 않음)
            console.error('장바구니 서버 동기화 실패:', err)
          }
        }
      },

      updateQty: (productId, qty) => {
        set({
          items: get().items.map((i) =>
            (i.id || i._id) === productId ? { ...i, qty } : i
          ),
        })
        if (isLoggedIn()) {
          api.put(`/cart/${productId}`, { qty }).catch(() => {})
        }
      },

      remove: (productId) => {
        set({ items: get().items.filter((i) => (i.id || i._id) !== productId) })
        if (isLoggedIn()) {
          api.delete(`/cart/${productId}`).catch(() => {})
        }
      },

      clear: () => {
        set({ items: [] })
        if (isLoggedIn()) {
          api.delete('/cart').catch(() => {})
        }
      },

      total: () =>
        get().items.reduce((sum, i) => {
          const price = i.priceSnapshot || i.price || i.currentBid || 0
          const shipping = i.shippingOption === 'quick' ? 50000 : 0
          return sum + price * (i.qty || 1) + shipping
        }, 0),
    }),
    { name: 'vault-cart' }
  )
)

export default useCartStore
