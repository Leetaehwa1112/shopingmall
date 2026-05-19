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
    <div className={`max-w-7xl mx-auto px-6 pt-5 flex justify-end transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
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
