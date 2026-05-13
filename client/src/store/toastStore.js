import { create } from 'zustand'

const useToastStore = create((set, get) => ({
  toasts: [],
  push: (toast) => {
    const id = Date.now() + Math.random()
    set({ toasts: [...get().toasts, { ...toast, id }] })
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) })
    }, toast.duration || 3500)
  },
}))

export default useToastStore
