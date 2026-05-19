import { useState } from 'react'

// 실제 포켓몬 부스터팩 디자인을 재현:
// - 상단 1/3: 그라데이션 + 홀로 스트립 (실제 부스터팩 윗부분 디자인)
// - 중앙: heroArt (대표 카드 일러스트, 카드의 위쪽 art 부분만 노출)
// - 하단: setLogo (공식 set 로고) + sealed 라벨
export default function PackVisual({ pack, size = 'md' }) {
  const dims = {
    sm: { w: 110, h: 170 },
    md: { w: 160, h: 250 },
    lg: { w: 220, h: 340 },
    xl: { w: 280, h: 430 },
  }[size]
  const [c1, c2] = pack.gradient || ['#dc2626', '#7f1d1d']
  const [heroLoaded, setHeroLoaded] = useState(false)
  const [heroErr, setHeroErr] = useState(false)
  const [logoLoaded, setLogoLoaded] = useState(false)
  const [logoErr, setLogoErr] = useState(false)

  return (
    <div
      className="relative rounded-md overflow-hidden select-none"
      style={{
        width: dims.w,
        height: dims.h,
        background: `linear-gradient(165deg, ${c1} 0%, ${c2} 100%)`,
        boxShadow:
          '0 12px 32px rgba(13, 23, 48, 0.25), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 8px rgba(0,0,0,0.25), inset 8px 0 8px -8px rgba(0,0,0,0.15)',
      }}
    >
      {/* Top perforation hint */}
      <div className="absolute top-0 inset-x-0 h-1.5"
        style={{ background: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.25) 0 4px, transparent 4px 8px)' }} />

      {/* Holographic strip — wide, near top */}
      <div className="absolute inset-x-0 top-[8%] h-[8%]"
        style={{
          background: 'repeating-linear-gradient(115deg, rgba(255,255,255,0.55) 0, rgba(255,255,255,0.55) 6px, rgba(255,255,255,0.1) 6px, rgba(255,255,255,0.1) 12px)',
          opacity: 0.85,
        }} />

      {/* Set Logo strip — at top */}
      <div className="absolute inset-x-3 z-10 flex justify-center" style={{ top: dims.h * 0.05 }}>
        {pack.setLogo && !logoErr ? (
          <img
            src={pack.setLogo}
            alt={pack.setShort}
            onLoad={() => setLogoLoaded(true)}
            onError={() => setLogoErr(true)}
            style={{
              height: dims.h * 0.07,
              filter: 'drop-shadow(1px 1px 0 rgba(0,0,0,0.4))',
              opacity: logoLoaded ? 1 : 0,
              transition: 'opacity 0.4s',
            }}
            draggable={false}
          />
        ) : (
          <div className="font-display font-black text-white italic tracking-wide"
            style={{ fontSize: dims.h * 0.04, textShadow: '1px 1px 0 #000' }}>
            POKÉMON · {pack.setShort}
          </div>
        )}
      </div>

      {/* Hero art window — central, cropped to top portion of card */}
      <div className="absolute inset-x-0 flex justify-center" style={{ top: dims.h * 0.22, height: dims.h * 0.50 }}>
        <div className="relative h-full overflow-hidden rounded-sm"
          style={{ width: dims.w * 0.78 }}>
          {!heroLoaded && !heroErr && (
            <div className="absolute inset-0 bg-black/20" />
          )}
          {pack.heroArt && !heroErr && (
            <img
              src={pack.heroArt}
              alt=""
              onLoad={() => setHeroLoaded(true)}
              onError={() => setHeroErr(true)}
              className="absolute"
              style={{
                width: '100%',
                height: 'auto',
                top: '0',
                left: '0',
                transform: 'scale(1.15)',
                transformOrigin: '50% 18%',
                opacity: heroLoaded ? 1 : 0,
                transition: 'opacity 0.4s',
                filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
              }}
              draggable={false}
            />
          )}
          {heroErr && (
            <div className="absolute inset-0 flex items-center justify-center text-white/70 text-xs">
              {pack.setShort}
            </div>
          )}
        </div>
      </div>

      {/* Bottom decorative band */}
      <div className="absolute inset-x-0 bottom-[18%] h-[3%]"
        style={{
          background: 'repeating-linear-gradient(115deg, rgba(0,0,0,0.3) 0, rgba(0,0,0,0.3) 4px, transparent 4px 8px)',
        }} />

      {/* Set name + year */}
      <div className="absolute inset-x-3 text-center" style={{ bottom: dims.h * 0.10 }}>
        <div className="font-display font-bold text-white leading-tight tracking-wide"
          style={{ fontSize: dims.h * 0.04, textShadow: '1px 1px 2px rgba(0,0,0,0.6)' }}>
          {pack.setShort}
        </div>
        <div className="font-mono text-white/80 mt-0.5"
          style={{ fontSize: dims.h * 0.025 }}>
          {pack.year}{pack.cardsPerPack ? ` · ${pack.cardsPerPack} CARDS` : ''}
        </div>
      </div>

      {/* Sealed banner */}
      <div className="absolute bottom-2 inset-x-2 bg-black/70 text-yellow-300 border border-yellow-300/50 text-center rounded"
        style={{ padding: dims.h * 0.008 }}>
        <div className="font-mono font-bold tracking-[0.25em]"
          style={{ fontSize: dims.h * 0.022 }}>
          {pack.type === 'box' ? '◆ SEALED BOX ◆' : '◆ SEALED PACK ◆'}
        </div>
      </div>
    </div>
  )
}
