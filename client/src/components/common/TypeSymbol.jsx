/**
 * TypeSymbol — 포켓몬 공식 타입 심볼을 SVG로 단순화한 컴포넌트.
 *
 * 디자인 원칙:
 * - 실제 TCG / 게임 UI의 흰색 실루엣 + 컬러 원형 배지 스타일을 본뜸 (이모지 아님).
 * - 도감 필터에선 글자 없이 심볼만 노출 → "포켓몬 디바이스" 느낌.
 * - 24x24 viewBox 기준의 path / shape — 어떤 크기든 깔끔하게 스케일.
 *
 * 사용:
 *   <TypeSymbol type="불꽃" size={28} />
 *   <TypeSymbol type="풀" size={48} variant="badge" />   // 원형 배지 + 그림자
 */
import React from 'react'
import { TYPE_INFO } from '@/constants/pokedex'

// 각 타입별 24x24 viewBox 안의 흰색 실루엣 path/shape
// (포켓몬 공식 시리즈의 픽토그램을 단순화 — 저작권 회피 + 가독성 우선)
const SHAPES = {
  불꽃: (
    // 불꽃: 위로 솟구치는 화염 + 안쪽 작은 불씨
    <path d="M12 2c1.2 3 .2 4.6-.8 6.2-1.1 1.8-1.8 3.4-1.8 5 0 3.4 2.4 5.6 4.6 5.6 2.4 0 4.4-1.9 4.4-4.5 0-1.7-1.1-3.3-2.2-4.8.6 1.6 0 2.8-1 2.8-.9 0-1.4-.9-1-1.9.8-2.5.4-5.4-2.2-8.4Z" />
  ),
  물: (
    // 물: 단순한 물방울 (teardrop)
    <path d="M12 2.5c0 0-6.5 7-6.5 11.5C5.5 18.4 8.4 21 12 21s6.5-2.6 6.5-7c0-4.5-6.5-11.5-6.5-11.5Zm-2.8 13.7c-.5 0-1-.5-1-1.2 0-1.4 1-3.1 2-4.4.3-.4.9-.1.8.4-.3 1.4-.7 3.6-1 4.7-.1.3-.4.5-.8.5Z" />
  ),
  풀: (
    // 풀: 좌우 두 잎사귀 + 중앙 잎맥
    <path d="M12 2c-3.5 3-7 6-7 10.5 0 4.5 3 7.5 7 7.5s7-3 7-7.5C19 8 15.5 5 12 2Zm0 3.5c.4 0 .7.3.7.7v10.5c0 .4-.3.7-.7.7s-.7-.3-.7-.7V6.2c0-.4.3-.7.7-.7Z" />
  ),
  전기: (
    // 전기: 번개 볼트 (Z 모양 lightning)
    <path d="M14 2 5 13.5h5.2L9 22l9-11.5h-5.2L14 2Z" />
  ),
  에스퍼: (
    // 에스퍼: 동심원 + 중앙 점 (psyche / 사이클)
    <g>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="5.5" fill="none" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="2.2"/>
    </g>
  ),
  비행: (
    // 비행: 펼쳐진 날개 한쪽 (wing)
    <path d="M3 13c5-1 9-3 12-7 0 5-1 8-4 11-2.5 2.5-5.5 3-8 1l-1-2 1-3Zm5.5 1c1.4 0 2.5-.9 2.5-2s-1.1-2-2.5-2S6 11 6 12s1.1 2 2.5 2Z" />
  ),
  독: (
    // 독: 둥근 보라 방울 + 떨어지는 두 방울 (포커스 흐릿한 보라색)
    <g>
      <path d="M12 4c-3 4-6 6-6 9.5C6 17 9 19.5 12 19.5S18 17 18 13.5C18 10 15 8 12 4Z"/>
      <circle cx="9.5" cy="22" r="1.5"/>
      <circle cx="15" cy="21.5" r="1"/>
    </g>
  ),
  벌레: (
    // 벌레: 더듬이 + 둥근 몸통 + 마디
    <g>
      <path d="M9 4l-2-2M15 4l2-2"/>
      <path d="M12 5c-2.5 0-4.5 1.5-4.5 4v9c0 1.8 2 3 4.5 3s4.5-1.2 4.5-3V9c0-2.5-2-4-4.5-4Z"/>
      <path d="M7.5 11h9M7.5 14h9M7.5 17h9" stroke="currentColor" strokeWidth="1" fill="none"/>
    </g>
  ),
  노말: (
    // 노말: 단순 도넛 (ring) — 평범 + 균형
    <g>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3"/>
    </g>
  ),
  얼음: (
    // 얼음: 6각 눈꽃 (snowflake)
    <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none">
      <path d="M12 3v18M3.5 7.5l17 9M3.5 16.5l17-9"/>
      <path d="M12 6l-2-1.5M12 6l2-1.5M12 18l-2 1.5M12 18l2 1.5"/>
      <path d="M5.7 9.5l-2.5 0.3M5.7 14.5l-2.5-0.3M18.3 9.5l2.5 0.3M18.3 14.5l2.5-0.3"/>
    </g>
  ),
  격투: (
    // 격투: 주먹 (fist)
    <path d="M7 9V7c0-.6.4-1 1-1s1 .4 1 1v2h1V6c0-.6.4-1 1-1s1 .4 1 1v3h1V7c0-.6.4-1 1-1s1 .4 1 1v3h1V9c0-.6.4-1 1-1s1 .4 1 1v6c0 3-2 5-5 5h-2c-3 0-5-2-5-5v-3c0-.6.4-1 1-1s1 .4 1 1v-3Z" />
  ),
  바위: (
    // 바위: 쌓인 돌 3개
    <g>
      <path d="M8 13l-4 6h11l-4-6h-3Z"/>
      <path d="M15 14l-3 5h8l-3-5h-2Z"/>
      <path d="M12 4l-4 6h8l-4-6Z"/>
    </g>
  ),
  땅: (
    // 땅: 가로 지층 3개
    <g>
      <path d="M3 7h18v3H3z"/>
      <path d="M3 12h18v3H3z" opacity=".7"/>
      <path d="M3 17h18v3H3z" opacity=".5"/>
    </g>
  ),
  드래곤: (
    // 드래곤: 좌측 머리 + 위로 솟은 뿔 (단순화한 드래곤 헤드)
    <path d="M4 14c0-5 4-9 9-9 2 0 3 1 3 2l3 1-2 2 1 3-3 0c0 3-2 5-5 5-3 0-5-1-6-4Zm9-5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
  ),
  고스트: (
    // 고스트: 둥근 머리 + 물결치는 하단 + 눈
    <g>
      <path d="M12 3c-4 0-7 3-7 7v10l2-2 1.5 2 1.5-2 2 2 1.5-2 1.5 2 2-2V10c0-4-3-7-7-7Z"/>
      <circle cx="9.5" cy="10" r="1.2" fill="#1a1a1a"/>
      <circle cx="14.5" cy="10" r="1.2" fill="#1a1a1a"/>
    </g>
  ),
}

export default function TypeSymbol({ type, size = 24, variant = 'plain', className = '', ariaLabel }) {
  const info = TYPE_INFO[type]
  const shape = SHAPES[type]
  if (!shape || !info) return null

  // plain: 흰 실루엣만 (배경 없음) — 다크/컬러 배경 위에 얹을 때
  // solid: 컬러 원 안에 흰 실루엣 — 단독 노출용
  // badge: solid + 검은 테두리 + 입체 그림자 — 도감 디바이스 톤
  const isOnDark = variant !== 'plain'

  const svg = (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel || type}
      className={className}
      style={{
        color: isOnDark ? '#fff' : info.hex,
        fill: 'currentColor',
        stroke: 'none',
      }}
    >
      {shape}
    </svg>
  )

  if (variant === 'plain') return svg

  const ringSize = size + (variant === 'badge' ? 14 : 8)
  return (
    <span
      className="inline-flex items-center justify-center rounded-full"
      style={{
        width: ringSize,
        height: ringSize,
        backgroundColor: info.hex,
        border: variant === 'badge' ? '2px solid #1a1a1a' : '2px solid rgba(255,255,255,0.6)',
        boxShadow: variant === 'badge' ? '0 3px 0 #1a1a1a, inset 0 1px 0 rgba(255,255,255,0.25)' : 'inset 0 1px 0 rgba(255,255,255,0.25)',
      }}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {svg}
    </span>
  )
}
