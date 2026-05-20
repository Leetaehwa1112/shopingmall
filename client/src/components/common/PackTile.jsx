import { memo } from 'react'
import { Link } from 'react-router-dom'
import PackVisual from './PackVisual'
import OpenedPackVisual from './OpenedPackVisual'
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

      {/* 카드깡 심리 유도 — 단순 hover swap (애니메이션 X).
          기본: 밀봉 PackVisual / hover: OpenedPackVisual (찢어진 팩 + 카드 3장 부채꼴)
          opacity 페이드만 짧게(150ms) — 위치/크기 변화 없어 'jank' 0. */}
      <div
        className="relative px-6 py-6 flex justify-center holo-sheen"
        style={{
          background: `radial-gradient(ellipse at center, ${pack.accent}12 0%, transparent 70%)`,
        }}
      >
        {/* 밀봉(기본) */}
        <div className="transition-opacity duration-150 group-hover:opacity-0">
          <PackVisual pack={pack} size="md" />
        </div>
        {/* 개봉됨(hover) — 같은 자리에 stack */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
          <OpenedPackVisual pack={pack} size="md" />
        </div>
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
