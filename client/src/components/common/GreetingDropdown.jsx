import { useEffect, useRef, useState } from 'react'
import useAuthStore from '@/store/authStore'
import { getMe } from '@/api/userApi'

export default function GreetingDropdown() {
  const { token } = useAuthStore()
  const [name, setName] = useState(null)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!token) return
    getMe()
      .then(({ data }) => {
        const n = data.data?.name
        if (!n) return
        setName(n)
        setVisible(true)
        timerRef.current = setTimeout(() => setVisible(false), 3000)
      })
      .catch(() => {})

    return () => clearTimeout(timerRef.current)
  }, [token])

  if (!name) return null

  return (
    // fixed overlay — 레이아웃 흐름 밖에 두어 페이지가 밀려나지 않게 함.
    // 우측 상단 고정, pointer-events-none이면 아래 요소 클릭도 막지 않음.
    <div
      aria-live="polite"
      className={`fixed top-4 right-4 z-40 transition-all duration-500 pointer-events-none ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
      }`}
    >
      <div className="inline-flex items-center gap-2 px-4 py-2 surface-soft elev-1 rounded-full">
        <div className="w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center text-[11px] font-bold">
          {name[0].toUpperCase()}
        </div>
        <span className="text-sm font-bold text-ink">
          {name}<span className="text-dex">님</span> 반갑습니다 👋
        </span>
      </div>
    </div>
  )
}
