import { memo } from 'react'
import { Link } from 'react-router-dom'
import PackVisual from './PackVisual'
import Icon from './Icon'
import { formatKRW } from '@/api/cards'
import useWishlistStore from '@/store/wishlistStore'
import useAuthStore from '@/store/authStore'
import useToastStore from '@/store/toastStore'

function PackTile({ pack }) {
  const packId = pack.id || pack._id
  const wished = useWishlistStore((s) => s.has(packId))
  const toggle = useWishlistStore((s) => s.toggle)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const toast = useToastStore((s) => s.push)

  const onWish = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      toast?.({ type: 'info', message: '로그인 후 이용하실 수 있어요.' })
      return
    }
    try { await toggle(packId) }
    catch { toast?.({ type: 'error', message: '위시리스트 동기화 실패' }) }
  }

  return (
    <Link to={`/packs/${packId}`} className="group block surface-card holo-shine sparkle-host overflow-hidden relative">
      <div className="px-4 pt-4 flex justify-between items-center">
        <span className="inline-flex items-center gap-2">
          <span className="led led-yellow" style={{ width: 7, height: 7 }} />
          <span className="pixel-label text-amber-700">
            {pack.type === 'box' ? 'SEALED BOX' : 'SEALED PACK'}
          </span>
        </span>
        <button onClick={onWish}
          className={`transition-colors ${wished ? 'text-gold' : 'text-mute hover:text-ink'}`}
          aria-label="관심">
          <Icon name="star" size={18} strokeWidth={1.8} style={{ fill: wished ? 'currentColor' : 'none' }} />
        </button>
      </div>

      {/* 카드깡 심리 유도 영역 — 마우스 올리면 팩 상단이 뜯어지면서
          안에서 카드 3장이 살짝 솟아나옴 (peek). 클릭 욕구 자극. */}
      <div
        className="relative px-6 py-6 flex justify-center holo-sheen overflow-hidden"
        style={{
          background: `radial-gradient(ellipse at center, ${pack.accent}12 0%, transparent 70%)`,
          minHeight: 220,
        }}
      >
        {/* 안에서 솟아나오는 카드들 — 절대 배치, hover 시 위로 슬라이드 */}
        <div
          aria-hidden="true"
          className="pack-peek-cards absolute inset-x-0 top-[28%] flex justify-center items-end gap-1 pointer-events-none"
        >
          {[-1, 0, 1].map((i) => (
            <span
              key={i}
              className="pack-peek-card"
              style={{
                ['--peek-rot']: `${i * 8}deg`,
                ['--peek-delay']: `${0.04 * Math.abs(i)}s`,
                ['--peek-tx']: `${i * 14}px`,
                background:
                  i === 0
                    ? `linear-gradient(135deg, ${pack.accent || '#facc15'} 0%, #fff 50%, ${pack.accent || '#facc15'} 100%)`
                    : 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 50%, #e5e5e5 100%)',
              }}
            >
              {/* 카드 상단 홀로 띠 */}
              <span className="pack-peek-holo" aria-hidden="true" />
            </span>
          ))}
        </div>

        {/* 팩 자체 — hover 시 상단 살짝 들리는 효과 */}
        <div className="pack-visual-wrap relative z-10">
          <PackVisual pack={pack} size="md" />
          {/* 찢어진 가장자리 — hover 시 상단 1/4 살짝 위로 분리되는 듯 */}
          <span aria-hidden="true" className="pack-tear-strip" />
        </div>

        {/* hover 시 떠다니는 작은 sparkle */}
        <span aria-hidden="true" className="pack-peek-sparkle s-a" />
        <span aria-hidden="true" className="pack-peek-sparkle s-b" />
        <span aria-hidden="true" className="pack-peek-sparkle s-c" />
      </div>
      <span aria-hidden="true">
        <span className="sparkle s1" />
        <span className="sparkle s2" />
        <span className="sparkle s3" />
        <span className="sparkle s4" />
      </span>

      <div className="px-5 pb-5 border-t border-line pt-4">
        <h3 className="font-display text-xl font-bold text-ink leading-tight">{pack.nameKo}</h3>
        <div className="text-xs text-mute mt-1 truncate font-medium">
          {pack.setShort} <span className="text-mute/60">·</span> {pack.year} <span className="text-mute/60">·</span> {pack.cardsPerPack}장
        </div>

        {/* Quick delivery badge */}
        <div className="flex items-center gap-1.5 mt-2 text-[10px] text-amber-700 font-bold">
          <Icon name="bolt" size={11} strokeWidth={2.5} />
          <span>퀵 배송 가능 · 당일 도착</span>
        </div>

        <div className="pt-3 mt-3 border-t border-line flex justify-between items-baseline">
          <div>
            <div className="text-[9px] text-mute font-bold tracking-[0.15em] uppercase mb-0.5">판매가</div>
            <div className="font-display text-2xl font-bold text-ink leading-none tabular-nums">{formatKRW(pack.price)}</div>
          </div>
          <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md font-bold">
            재고 {pack.stock}
          </span>
        </div>
      </div>
    </Link>
  )
}

// React.memo — 팩 그리드 부모 재렌더 시 pack prop 동일하면 bail-out
export default memo(PackTile)
