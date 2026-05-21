import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

const savedPositions = {}

// 목표 위치에 도달할 때까지 100ms 간격으로 최대 30회(3초) 재시도
function restoreScroll(y) {
  if (y === 0) return
  let attempts = 0
  let timerId

  const attempt = () => {
    window.scrollTo(0, y)
    attempts++
    // 도달했거나 30회 초과면 중단
    if (Math.abs(window.scrollY - y) > 10 && attempts < 30) {
      timerId = setTimeout(attempt, 100)
    }
  }

  timerId = setTimeout(attempt, 50)
  return () => clearTimeout(timerId)
}

export default function ScrollToTop() {
  const { pathname, key } = useLocation()
  const navType = useNavigationType()
  const cleanupRef = useRef(null)

  useEffect(() => {
    // 이전 복원 시도 취소
    cleanupRef.current?.()
    cleanupRef.current = null

    if (navType === 'POP') {
      const y = savedPositions[key] ?? 0
      cleanupRef.current = restoreScroll(y)
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, key, navType])

  useEffect(() => {
    const save = () => { savedPositions[key] = window.scrollY }
    window.addEventListener('scroll', save, { passive: true })
    return () => window.removeEventListener('scroll', save)
  }, [key])

  return null
}
