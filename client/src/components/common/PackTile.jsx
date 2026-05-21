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
      {/* 상단 상태 바 — 모바일에선 좁아 숨김 */}
      <div className="hidden sm:flex px-4 pt-4 justify-between items-center">
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

      <div className="px-2 py-3 sm:px-6 sm:py-6 flex justify-center holo-sheen"
        style={{ background: `radial-gradient(ellipse at center, ${pack.accent}12 0%, transparent 70%)` }}>
        {/* 모바일은 sm 사이즈, 데스크탑은 md */}
        <span className="sm:hidden"><PackVisual pack={pack} size="sm" /></span>
        <span className="hidden sm:inline"><PackVisual pack={pack} size="md" /></span>
      </div>
      <span aria-hidden="true">
        <span className="sparkle s1" />
        <span className="sparkle s2" />
        <span className="sparkle s3" />
        <span className="sparkle s4" />
      </span>

      <div className="px-2 pb-2 sm:px-5 sm:pb-5 sm:border-t sm:border-line sm:pt-4">
        <h3 className="font-display text-[12px] sm:text-xl font-bold text-ink leading-tight line-clamp-2 sm:line-clamp-none">{pack.nameKo}</h3>

        {/* 서브 메타 — 모바일 숨김 */}
        <div className="hidden sm:block text-xs text-mute mt-1 truncate font-medium">
          {pack.setShort} <span className="text-mute/60">·</span> {pack.year} <span className="text-mute/60">·</span> {pack.cardsPerPack}장
        </div>

        {/* Quick delivery badge — 모바일 숨김 */}
        <div className="hidden sm:flex items-center gap-1.5 mt-2 text-[10px] text-amber-700 font-bold">
          <Icon name="bolt" size={11} strokeWidth={2.5} />
          <span>퀵 배송 가능 · 당일 도착</span>
        </div>

        {/* 가격 — 모바일 단순 한 줄 */}
        <div className="pt-1.5 sm:pt-3 sm:mt-3 sm:border-t sm:border-line flex justify-between items-baseline">
          <div className="min-w-0">
            <div className="hidden sm:block text-[9px] text-mute font-bold tracking-[0.15em] uppercase mb-0.5">판매가</div>
            <div className="font-display text-[13px] sm:text-2xl font-bold text-ink leading-none tabular-nums">{formatKRW(pack.price)}</div>
          </div>
          {/* 재고 배지 — 모바일 숨김 */}
          <span className="hidden sm:inline-block text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-md font-bold">
            재고 {pack.stock}
          </span>
        </div>
      </div>
    </Link>
  )
}

// React.memo — 팩 그리드 부모 재렌더 시 pack prop 동일하면 bail-out
export default memo(PackTile)
