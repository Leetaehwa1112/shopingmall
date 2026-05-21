// Locale store — Zustand, localStorage 영속화.
// 헤더 EN/KR 클릭으로 toggle. 기본 'ko'.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useLocaleStore = create(
  persist(
    (set) => ({
      locale: 'ko',
      setLocale: (locale) => set({ locale }),
      toggle: () => set((s) => ({ locale: s.locale === 'ko' ? 'en' : 'ko' })),
    }),
    {
      name: 'pokevault:locale',
      // 변경 즉시 <html lang>도 업데이트해 SEO/접근성에 반영
      onRehydrateStorage: () => (state) => {
        if (state?.locale && typeof document !== 'undefined') {
          document.documentElement.lang = state.locale
        }
      },
    },
  ),
)

export default useLocaleStore
