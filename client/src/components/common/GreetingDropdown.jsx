import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { getMe } from '@/api/userApi'

export default function GreetingDropdown() {
  const { token, logout } = useAuthStore()
  const navigate = useNavigate()
  const [name, setName] = useState(null)
  const [visible, setVisible] = useState(false)
  const [open, setOpen] = useState(false)
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

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('click', close)
    return () => window.removeEventListener('click', close)
  }, [open])

  const handleLogout = () => {
    logout()
    setName(null)
    navigate('/')
  }

  if (!name) return null

  return (
    <div className={`max-w-7xl mx-auto px-6 pt-5 flex justify-end transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
      <div className="relative">
        <button
          onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
          className="inline-flex items-center gap-2 px-4 py-2 surface-soft elev-1 rounded-full hover:border-ink transition-colors cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-ink text-paper flex items-center justify-center text-[11px] font-bold">
            {name[0].toUpperCase()}
          </div>
          <span className="text-sm font-bold text-ink">
            {name}<span className="text-dex">님</span> 반갑습니다 👋
          </span>
          <svg
            className={`w-3 h-3 text-mute transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-36 bg-paper border border-line rounded-xl elev-2 overflow-hidden z-50">
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 text-sm font-bold text-left text-dex hover:bg-bone-2 transition-colors"
            >
              로그아웃
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
