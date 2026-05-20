// ─── 가격 포맷 ─────────────────────────────────────────────
/** 압축 표기 — ₩1.23억 / ₩1만 / ₩1,234. 정수 떨어지면 소수점 생략 */
const trimZero = (s) => s.replace(/\.?0+$/, '')
export const formatKRW = (n) => {
  if (n == null || isNaN(n)) return '₩0'
  if (n >= 1e12) return `₩${trimZero((n / 1e12).toFixed(2))}조`
  if (n >= 1e8)  return `₩${trimZero((n / 1e8).toFixed(2))}억`
  if (n >= 1e4)  return `₩${trimZero((n / 1e4).toFixed(0))}만`
  return `₩${n.toLocaleString()}`
}

/** 풀 표기 — ₩1,234,567 */
export const formatKRWFull = (n) => {
  if (n == null || isNaN(n)) return '₩0'
  return `₩${Number(n).toLocaleString()}`
}

// ─── 날짜 / 시간 ────────────────────────────────────────────
export const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export const formatDateShort = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
}

export const formatTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

export const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('ko-KR')
}

// ─── 카운트다운 ─────────────────────────────────────────────
export const timeUntil = (ts) => {
  const diff = ts - Date.now()
  if (diff <= 0) return { ended: true, d: 0, h: 0, m: 0, s: 0, totalMs: 0 }
  const d = Math.floor(diff / (1000 * 60 * 60 * 24))
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const m = Math.floor((diff / (1000 * 60)) % 60)
  const s = Math.floor((diff / 1000) % 60)
  return { ended: false, d, h, m, s, totalMs: diff }
}

// ─── 주소 ────────────────────────────────────────────────
export const formatAddress = (addr) => {
  if (!addr) return '-'
  const zip = addr.zipcode ? `[${addr.zipcode}] ` : ''
  return `${zip}${addr.street || ''} ${addr.detail || ''}`.trim()
}
