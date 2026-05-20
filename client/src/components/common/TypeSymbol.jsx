/**
 * TypeSymbol — 포켓몬 타입 픽토그램을 "유리알 보석" 처럼 렌더링.
 *
 * 출처: duiker101/pokemon-type-svg-icons (MIT) — 흰 실루엣 path SVG.
 *   jsDelivr CDN으로 직접 호스트, CSS mask-image로 색상 칠.
 *
 * variant:
 *   - plain : 흰/컬러 실루엣만 (배경 없음, 다른 컬러 배지 위에 얹을 때)
 *   - solid : 평면 컬러 원 안에 흰 실루엣 (작은 인라인 칩용)
 *   - jewel : 유리알 보석 — 그라데이션 + 하이라이트 + 안쪽 그림자 + 외곽 그림자
 *
 * jewel은 도감 디바이스의 D-pad 버튼처럼 보이도록 다층 box-shadow 합성.
 */
import React from 'react'
import { TYPE_INFO } from '@/constants/pokedex'

const SLUG = {
  불꽃: 'fire', 물: 'water', 풀: 'grass', 전기: 'electric',
  에스퍼: 'psychic', 비행: 'flying', 독: 'poison', 벌레: 'bug',
  노말: 'normal', 얼음: 'ice', 격투: 'fighting', 바위: 'rock',
  땅: 'ground', 드래곤: 'dragon', 고스트: 'ghost',
  페어리: 'fairy', 강철: 'steel', 악: 'dark',
}

const CDN = (slug) =>
  `https://cdn.jsdelivr.net/gh/duiker101/pokemon-type-svg-icons@master/icons/${slug}.svg`

// 헥스 컬러를 어둡게 / 밝게 — jewel 보디 그라데이션용
function shade(hex, amt) {
  const c = hex.replace('#', '')
  const num = parseInt(c, 16)
  let r = (num >> 16) + amt
  let g = ((num >> 8) & 0xff) + amt
  let b = (num & 0xff) + amt
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return `rgb(${r},${g},${b})`
}

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

  const symbolMask = {
    display: 'inline-block',
    width: size,
    height: size,
    WebkitMaskImage: `url(${CDN(slug)})`,
    maskImage: `url(${CDN(slug)})`,
    WebkitMaskRepeat: 'no-repeat',
    maskRepeat: 'no-repeat',
    WebkitMaskPosition: 'center',
    maskPosition: 'center',
    WebkitMaskSize: 'contain',
    maskSize: 'contain',
  }

  // ─── plain : 단순 색 실루엣 (위쪽 컬러 배경 가정) ───────
  if (variant === 'plain') {
    return (
      <span
        role={ariaLabel ? 'img' : 'presentation'}
        aria-label={ariaLabel || type}
        style={{ ...symbolMask, backgroundColor: '#fff' }}
        className={className}
      />
    )
  }

  // ─── solid : 평면 원 + 흰 실루엣 (인라인 칩용) ───────
  if (variant === 'solid') {
    const ringSize = size + 8
    return (
      <span
        aria-hidden={ariaLabel ? undefined : true}
        className="inline-flex items-center justify-center rounded-full"
        style={{
          width: ringSize,
          height: ringSize,
          backgroundColor: info.hex,
          border: '2px solid rgba(255,255,255,0.6)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3)',
        }}
      >
        <span style={{ ...symbolMask, backgroundColor: '#fff' }} />
      </span>
    )
  }

  // ─── jewel : 유리알 보석 ─────────────────────────────
  // 1. 베이스 원: 컬러 라디얼 그라디언트 (위→밝게, 아래→어둡게)
  // 2. 안쪽 그림자: 아래쪽 어둠, 위쪽 흰 하이라이트
  // 3. 외곽 그림자: 둥근 드롭 (페이지 위에 놓인 보석 느낌)
  // 4. 심볼 자체는 좀 어둡게 (그림자 처럼) 처리해서 보석 안에 새겨진 음각 느낌
  const ringSize = size + 16
  const light = shade(info.hex, 65)
  const dark = shade(info.hex, -55)
  const darker = shade(info.hex, -90)

  return (
    <span
      aria-hidden={ariaLabel ? undefined : true}
      className={`inline-flex items-center justify-center rounded-full relative ${className}`}
      style={{
        width: ringSize,
        height: ringSize,
        background: `radial-gradient(circle at 32% 28%, ${light} 0%, ${info.hex} 45%, ${dark} 100%)`,
        boxShadow: [
          'inset 0 2px 3px rgba(255,255,255,0.6)',     // 위쪽 매끈 하이라이트
          'inset 0 -4px 6px rgba(0,0,0,0.35)',         // 아래쪽 깊이감
          `inset 0 0 0 1.5px ${darker}`,               // 안쪽 진한 테두리
          '0 3px 6px rgba(0,0,0,0.25)',                // 드롭 그림자
          '0 1px 0 rgba(255,255,255,0.4)',             // 살짝 떠 보이는 상단 가장자리
        ].join(', '),
      }}
    >
      {/* 보석 광택 — 위쪽 작은 라이트 패치 */}
      <span
        aria-hidden="true"
        className="absolute pointer-events-none rounded-full"
        style={{
          top: '8%',
          left: '20%',
          width: '40%',
          height: '28%',
          background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.9), transparent 65%)',
          filter: 'blur(0.5px)',
        }}
      />
      {/* 심볼 — 살짝 그늘진 흰색으로 보석 위 음각 느낌 */}
      <span
        style={{
          ...symbolMask,
          backgroundColor: '#fff',
          filter: `drop-shadow(0 1px 0 ${darker}) drop-shadow(0 -0.5px 0 rgba(255,255,255,0.3))`,
        }}
      />
    </span>
  )
}
