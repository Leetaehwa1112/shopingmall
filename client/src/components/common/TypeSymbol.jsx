/**
 * TypeSymbol — 실제 포켓몬 타입 심볼 이미지 사용 (이모지/직접 그린 SVG 아님).
 *
 * 출처: duiker101/pokemon-type-svg-icons (MIT, GitHub).
 *   512x512 SVG, 흰색 실루엣 path. jsDelivr CDN으로 직접 호스트.
 *
 * 한글 타입명을 영어 슬러그로 매핑해서 CDN URL 조립.
 *
 * variant:
 *   - plain : 흰 실루엣만 (배경 없음)
 *   - solid : 컬러 원 안에 흰 실루엣
 *   - badge : solid + 검정 테두리 + 입체 그림자 (포켓몬 디바이스 톤)
 */
import React from 'react'
import { TYPE_INFO } from '@/constants/pokedex'

// 한글 → duiker101 repo 슬러그
const SLUG = {
  불꽃:   'fire',
  물:     'water',
  풀:     'grass',
  전기:   'electric',
  에스퍼: 'psychic',
  비행:   'flying',
  독:     'poison',
  벌레:   'bug',
  노말:   'normal',
  얼음:   'ice',
  격투:   'fighting',
  바위:   'rock',
  땅:     'ground',
  드래곤: 'dragon',
  고스트: 'ghost',
}

const CDN = (slug) =>
  `https://cdn.jsdelivr.net/gh/duiker101/pokemon-type-svg-icons@master/icons/${slug}.svg`

export default function TypeSymbol({
  type,
  size = 24,
  variant = 'plain',
  className = '',
  ariaLabel,
}) {
  const info = TYPE_INFO[type]
  const slug = SLUG[type]
  if (!info || !slug) return null

  // 실루엣 자체는 항상 흰색(SVG 안에 fill="white"). plain일 땐 컬러로 바꾸기 위해
  // CSS mask로 단색 칠을 입힘 → 어떤 컬러 위에 얹어도 깔끔.
  const useColored = variant === 'plain'
  const symbolColor = useColored ? info.hex : '#fff'

  const symbol = (
    <span
      role={ariaLabel ? 'img' : 'presentation'}
      aria-label={ariaLabel || type}
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        backgroundColor: symbolColor,
        WebkitMaskImage: `url(${CDN(slug)})`,
        maskImage: `url(${CDN(slug)})`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
      className={className}
    />
  )

  if (variant === 'plain') return symbol

  const ringSize = size + (variant === 'badge' ? 14 : 8)
  return (
    <span
      className="inline-flex items-center justify-center rounded-full"
      style={{
        width: ringSize,
        height: ringSize,
        backgroundColor: info.hex,
        border: variant === 'badge' ? '2px solid #1a1a1a' : '2px solid rgba(255,255,255,0.6)',
        boxShadow:
          variant === 'badge'
            ? '0 3px 0 #1a1a1a, inset 0 1px 0 rgba(255,255,255,0.25)'
            : 'inset 0 1px 0 rgba(255,255,255,0.25)',
      }}
      aria-hidden={ariaLabel ? undefined : true}
    >
      {symbol}
    </span>
  )
}
