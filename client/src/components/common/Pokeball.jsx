import { memo } from 'react'

// 클래식 포켓볼 — Pokédex 톤 (Header 등 모든 페이지 마운트, memo로 부모 재렌더 격리)
function Pokeball({ size = 32, className = '', spin = false }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 64 64"
      className={`${spin ? 'animate-spin' : ''} ${className}`}
      style={spin ? { animationDuration: '8s' } : undefined}
    >
      <circle cx="32" cy="32" r="29" fill="#f5f5f0" stroke="#1a1a1a" strokeWidth="4" />
      <path d="M 3 32 A 29 29 0 0 1 61 32 Z" fill="#dc2626" stroke="#1a1a1a" strokeWidth="4" />
      <line x1="3" y1="32" x2="61" y2="32" stroke="#1a1a1a" strokeWidth="4" />
      <circle cx="32" cy="32" r="9" fill="#f5f5f0" stroke="#1a1a1a" strokeWidth="4" />
      <circle cx="32" cy="32" r="3" fill="#f5f5f0" stroke="#1a1a1a" strokeWidth="2" />
    </svg>
  )
}

export default memo(Pokeball)
