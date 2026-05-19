import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/api/axios'

const isLoggedIn = () => {
  try {
    const { state } = JSON.parse(localStorage.getItem('vault-auth') || '{}')
    return !!state?.token
  } catch { return false }
}

// 팩/박스 판별 (Pack 모델은 setShort/type 등 고유 필드)
const isPack = (item) =>
  item?.itemType === 'pack' ||
  item?.type === 'pack' || item?.type === 'box' ||
  !!item?.setShort || !!item?.heroArt

const normalizeServerItems = (items) =>
  items.map((it) => {
    const entity = it.product || it.pack || {}
    return {
      ...entity,
      id: entity._id,
      itemType: it.itemType || (it.pack ? 'pack' : 'product'),
      qty: it.qty,
      shippingOption: it.shippingOption,
      priceSnapshot: it.priceSnapshot,
    }
  })

const mergeLocal = (prev, productId, qty, card) => {
  const existing = prev.find((i) => (i.id || i._id) === productId)
  if (existing) {
    return prev.map((i) =>
      (i.id || i._id) === productId ? { ...i, qty: (i.qty || 1) + qty } : i
    )
  }
  return [...prev, { ...card, id: productId, itemType: isPack(card) ? 'pack' : 'product', qty }]
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
        const id = card._id || card.id
        const qty = card.qty || 1
        const itemType = isPack(card) ? 'pack' : 'product'

        // 1. 옵티미스틱 로컬 업데이트
        set({ items: mergeLocal(get().items, id, qty, { ...card, itemType }) })

        // 2. 로그인 상태면 서버 동기화
        if (isLoggedIn()) {
          try {
            const body = {
              itemType,
              qty,
              shippingOption: card.shippingOption || 'standard',
            }
            if (itemType === 'pack') body.packId = id
            else body.productId = id

            const { data } = await api.post('/cart', body)
            set({ items: normalizeServerItems(data.data.items) })
          } catch (err) {
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
          const it = get().items.find((i) => (i.id || i._id) === productId)
          api.put(`/cart/${productId}`, { qty, itemType: it?.itemType }).catch(() => {})
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

      // 상품가 합계만 (배송비는 주문 단계에서 한 번만 계산)
      total: () =>
        get().items.reduce((sum, i) => {
          const price = i.priceSnapshot || i.price || i.currentBid || 0
          return sum + price * (i.qty || 1)
        }, 0),
    }),
    {
      name: 'vault-cart',
      // items만 persist (함수/loading은 제외) + 항상 배열 보장
      partialize: (state) => ({ items: Array.isArray(state.items) ? state.items : [] }),
      onRehydrateStorage: () => (state) => {
        if (state && !Array.isArray(state.items)) state.items = []
      },
    }
  )
)

export default useCartStore
