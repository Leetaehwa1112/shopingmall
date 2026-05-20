/**
 * OpenedPackVisual — 마우스 hover 시 PackTile 안에서 swap되는 "개봉된 모습".
 *
 * 디자인: 팩 하단부(찢어진 위 가장자리 톱니) + 안에서 솟아난 카드 3장 부채꼴.
 *   - 애니메이션 없이 정적 이미지처럼 한 번에 swap (PackTile이 opacity 페이드 처리)
 *   - 카드 3장: pack.heroArt를 활용. 좌우 카드는 회전·각도 다르게.
 *   - 팩 윗부분은 톱니 모양 mask로 찢어진 듯이.
 *
 * 사이즈는 PackVisual과 동일 — md 기본.
 */
export default function OpenedPackVisual({ pack, size = 'md' }) {
  const dims = {
    sm: { w: 110, h: 170 },
    md: { w: 160, h: 250 },
    lg: { w: 220, h: 340 },
    xl: { w: 280, h: 430 },
  }[size]
  const [c1, c2] = pack.gradient || ['#dc2626', '#7f1d1d']
  const accent = pack.accent || '#facc15'

  // 카드 사이즈 — 팩 너비의 75% 정도
  const cardW = Math.round(dims.w * 0.62)
  const cardH = Math.round(cardW * 1.4)

  return (
    <div
      className="relative select-none"
      style={{ width: dims.w, height: dims.h }}
    >
      {/* ── 팩 하단부 — 찢어진 윗부분이 톱니 모양 ── */}
      <div
        className="absolute left-0 right-0 bottom-0 rounded-md overflow-hidden"
        style={{
          height: dims.h * 0.65,
          background: `linear-gradient(165deg, ${c1} 0%, ${c2} 100%)`,
          // 윗부분 톱니 (찢어짐) — clip-path로 zigzag
          clipPath:
            'polygon(0 12%, 8% 4%, 16% 14%, 24% 6%, 32% 16%, 40% 8%, 48% 18%, 56% 6%, 64% 16%, 72% 4%, 80% 14%, 88% 6%, 100% 14%, 100% 100%, 0 100%)',
          boxShadow:
            '0 12px 32px rgba(13,23,48,0.25), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -3px 8px rgba(0,0,0,0.25)',
        }}
      >
        {/* 홀로 띠 */}
        <div
          className="absolute inset-x-0 bottom-[30%] h-[10%]"
          style={{
            background:
              'repeating-linear-gradient(115deg, rgba(255,255,255,0.55) 0, rgba(255,255,255,0.55) 6px, rgba(255,255,255,0.1) 6px, rgba(255,255,255,0.1) 12px)',
            opacity: 0.8,
          }}
        />
        {/* 하단 set 라벨 */}
        <div
          className="absolute inset-x-2 bottom-[8%] text-center font-display font-black text-white italic tracking-wide"
          style={{ fontSize: dims.h * 0.045, textShadow: '1px 1px 0 #000' }}
        >
          {pack.setShort || 'POKÉMON TCG'}
        </div>
        {/* 안쪽 어둠 — 팩 안에서 카드들이 솟아나는 느낌 */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[20%]"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.55), transparent)' }}
        />
      </div>

      {/* ── 카드 3장 부채꼴 — 팩 위로 솟아나옴 ── */}
      <div
        className="absolute inset-x-0 flex justify-center items-end pointer-events-none"
        style={{
          top: 0,
          height: dims.h * 0.78,
        }}
      >
        {/* 좌측 카드 — 살짝 회전 + 뒤로 밀림 */}
        <FanCard
          w={cardW * 0.88}
          h={cardH * 0.88}
          rotate={-14}
          translateX={cardW * 0.42}
          translateY={cardH * 0.12}
          z={1}
          accent={accent}
          heroArt={pack.heroArt}
          dim
        />
        {/* 우측 카드 */}
        <FanCard
          w={cardW * 0.88}
          h={cardH * 0.88}
          rotate={14}
          translateX={-cardW * 0.42}
          translateY={cardH * 0.12}
          z={1}
          accent={accent}
          heroArt={pack.heroArt}
          dim
        />
        {/* 중앙 카드 — 가장 크고 또렷 */}
        <FanCard
          w={cardW}
          h={cardH}
          rotate={0}
          translateX={0}
          translateY={0}
          z={2}
          accent={accent}
          heroArt={pack.heroArt}
        />
      </div>

      {/* 솟아남 강조 — 팩 위 가장자리 글로우 */}
      <div
        aria-hidden="true"
        className="absolute inset-x-[10%]"
        style={{
          top: dims.h * 0.3,
          height: 12,
          background: `radial-gradient(ellipse at center, ${accent}99, transparent 70%)`,
          filter: 'blur(6px)',
        }}
      />
    </div>
  )
}

/* ─── 부채꼴 안의 카드 1장 — heroArt(있으면) + 카드 프레임 ─── */
function FanCard({ w, h, rotate, translateX, translateY, z, accent, heroArt, dim = false }) {
  return (
    <div
      className="absolute rounded-md border-2 border-ink overflow-hidden"
      style={{
        width: w,
        height: h,
        transform: `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`,
        zIndex: z,
        background: `linear-gradient(135deg, #fff 0%, #faf6ea 50%, ${accent}22 100%)`,
        boxShadow: '0 8px 14px rgba(0,0,0,0.35), 0 0 0 1.5px rgba(255,255,255,0.4) inset',
        opacity: dim ? 0.92 : 1,
      }}
    >
      {/* 카드 상단 홀로 띠 */}
      <div
        aria-hidden="true"
        className="absolute inset-x-1 top-1 h-2 rounded-sm"
        style={{
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.6), rgba(255,200,100,0.65), rgba(255,255,255,0.6))',
          mixBlendMode: 'screen',
        }}
      />
      {/* 카드 메인 아트 — heroArt 잘라서 (있으면) */}
      <div
        className="absolute"
        style={{ inset: '14% 8% 28% 8%', borderRadius: 4, overflow: 'hidden', background: '#1a1a1a' }}
      >
        {heroArt ? (
          <img
            src={heroArt}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
            style={{ filter: dim ? 'brightness(0.85)' : 'none' }}
          />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `radial-gradient(circle at 50% 40%, ${accent}66, #1a1a1a 80%)` }}
          />
        )}
      </div>
      {/* 카드 하단 라벨 영역 (이름 줄) */}
      <div
        className="absolute inset-x-2 bottom-2 h-[18%] rounded-sm border border-ink/30"
        style={{ background: 'linear-gradient(180deg, #fff 0%, #f0eadf 100%)' }}
      />
      {/* 우상단 HP 자리 */}
      <div
        className="absolute top-1.5 right-1.5 w-7 h-3 rounded-sm border border-ink/30"
        style={{ background: '#fff' }}
      />
    </div>
  )
}
