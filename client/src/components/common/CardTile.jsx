import { useState, useEffect, memo } from 'react'
import { Link } from 'react-router-dom'
import PokeCard from './PokeCard'
import GradeBadge from './GradeBadge'
import Countdown from './Countdown'
import Icon from './Icon'
import { formatKRW, timeUntil } from '@/api/cards'
import useWishlistStore from '@/store/wishlistStore'
import useAuthStore from '@/store/authStore'
import useToastStore from '@/store/toastStore'

function CardTile({ card, stage = false }) {
  const cardId = card.id || card._id
  const wished = useWishlistStore((s) => s.has(cardId))
  const toggle = useWishlistStore((s) => s.toggle)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const toast = useToastStore((s) => s.push)
  const [pop, setPop] = useState(false)

  const onWish = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      toast?.({ type: 'info', message: '로그인 후 이용하실 수 있어요.' })
      return
    }
    try {
      await toggle(cardId)
      if (!wished) {
        setPop(true)
        setTimeout(() => setPop(false), 500)
      }
    } catch {
      toast?.({ type: 'error', message: '위시리스트 동기화 실패' })
    }
  }

  // Lot 번호: card.lot_number > card.number > cardId 끝자리 fallback
  // 숫자 형태일 때만 3자리 zero-pad (예: "4" → "004"). 텍스트(Promo 등)는 그대로.
  const lotLabel = (() => {
    const pad = (s) => /^\d+$/.test(s) ? s.padStart(3, '0') : s
    if (card.lot_number) return pad(String(card.lot_number))
    if (card.number) return pad(String(card.number).split('/')[0])
    const digits = String(cardId).replace(/\D/g, '')
    return (digits.slice(-3) || '001').padStart(3, '0')
  })()

  const cardType = card.type || card.sale_type
  const auctionEnded = cardType === 'auction' && card.endsAt && card.endsAt - Date.now() <= 0
  // upcoming: 일정 확정된 예정 경매 — 시작 전이므로 가격 대신 "경매 예정"
  const auctionUpcoming = cardType === 'auction' && card.status === 'upcoming'

  return (
    <Link to={`/products/${cardId}`} className="group block surface-card holo-shine sparkle-host overflow-hidden relative">
      <span aria-hidden="true">
        <span className="sparkle s1" />
        <span className="sparkle s2" />
        <span className="sparkle s3" />
        <span className="sparkle s4" />
        <span className="sparkle s5" />
      </span>
      {/* Status strip — micro pixel label */}
      <div className="px-4 pt-4 flex justify-between items-center">
        {cardType === 'auction' ? (
          auctionUpcoming ? (
            <span className="inline-flex items-center gap-2">
              <span className="led led-yellow led-pulse" style={{ width: 7, height: 7 }} />
              <span className="pixel-label text-mute">UPCOMING · No.{lotLabel}</span>
            </span>
          ) : auctionEnded ? (
            <span className="inline-flex items-center gap-2">
              <span className="led" style={{ width: 7, height: 7, background: '#9aa1a8' }} />
              <span className="pixel-label text-mute">CLOSED · No.{lotLabel}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <span className="led led-red led-pulse" style={{ width: 7, height: 7 }} />
              <span className="pixel-label text-dex">LIVE · No.{lotLabel}</span>
            </span>
          )
        ) : (
          <span className="inline-flex items-center gap-2">
            <span className="led led-blue" style={{ width: 7, height: 7 }} />
            <span className="pixel-label text-blue">BUY NOW · No.{lotLabel}</span>
          </span>
        )}
        <button
          type="button"
          onClick={onWish}
          onMouseDown={(e) => e.preventDefault()}
          className={`relative z-10 p-1.5 -m-1.5 rounded-full transition-colors ${wished ? 'text-gold' : 'text-mute hover:text-ink'} ${pop ? 'scale-125' : ''}`}
          aria-label={wished ? '관심 해제' : '관심 등록'}
          aria-pressed={wished}
        >
          <Icon name="star" size={18} strokeWidth={1.8} style={{ fill: wished ? 'currentColor' : 'none' }} />
        </button>
      </div>

      {/* Big card image — holo sheen sweeps across on hover.
          stage=true 일 때 .card-stage 적용 → spotlight + turntable + sparkles 무대 효과 (리자몽 톤) */}
      <div className={`px-6 py-5 flex justify-center holo-sheen ${stage ? 'card-stage' : ''}`}
        style={{ background: `radial-gradient(ellipse at center, ${card.accent || '#fbf7ec'}12 0%, transparent 70%)` }}>
        <PokeCard card={card} size="md" />
      </div>

      {/* Info */}
      <div className="px-5 pb-5 border-t border-line pt-4">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <h3 className="font-display text-xl font-bold text-ink leading-tight">{card.nameKo}</h3>
          <span className="text-[10px] text-mute font-mono">#{card.number}</span>
        </div>
        <div className="text-xs text-mute mb-3 truncate font-medium">
          {card.name} <span className="text-mute/60">·</span> {card.setShort} <span className="text-mute/60">·</span> {card.year}
        </div>

        <div className="flex items-center justify-between mb-3">
          <GradeBadge grade={card.grade} size="sm" />
          {card.population && (
            <span className="text-[10px] text-mute font-mono">Pop. {Object.values(card.population)[0]}</span>
          )}
        </div>

        {/* Price block */}
        <div className="pt-3 border-t border-line">
          {cardType === 'auction'
            ? auctionUpcoming
              ? <UpcomingFooter card={card} />
              : <AuctionFooter card={card} />
            : <BuyNowFooter card={card} />}
        </div>
      </div>
    </Link>
  )
}

function AuctionFooter({ card }) {
  // 칩 전환 시점(urgent / ended)에만 정밀 setTimeout으로 1회 갱신.
  // 초 단위 디스플레이는 자식 <Countdown>의 자체 ticker가 담당 → 부모는 칩 상태만 추적.
  const [, force] = useState(0)
  useEffect(() => {
    if (!card.endsAt) return
    const now = Date.now()
    const msToEnd = card.endsAt - now
    if (msToEnd <= 0) return // 이미 종료
    const HOUR = 1000 * 60 * 60
    // 다음 전환까지의 시간: urgent 진입(end - 1hr) 또는 ended(end)
    const nextDelay = msToEnd > HOUR ? msToEnd - HOUR : msToEnd
    const id = setTimeout(() => force((x) => x + 1), nextDelay + 50)
    return () => clearTimeout(id)
  }, [card.endsAt])

  const t = timeUntil(card.endsAt)
  const ended = t.ended
  const urgent = !ended && t.totalMs < 1000 * 60 * 60

  // 단일 상태칩 — 종료 / 마감 임박 / 종료까지 중 하나만
  const statusTone = ended
    ? 'bg-bone-2 text-mute'
    : urgent
      ? 'bg-dex/8 text-dex'
      : 'bg-bone-2/60 text-mute'
  const statusLabel = ended ? '경매 종료' : urgent ? '마감 임박' : '종료까지'

  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-baseline">
        <div>
          <div className="text-[9px] text-mute font-bold tracking-[0.15em] uppercase mb-0.5">
            {ended ? '최종 입찰가' : '현재 입찰가'}
          </div>
          <div className="font-display text-2xl font-bold text-ink leading-none tabular-nums">
            {formatKRW(card.currentBid)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-mute font-bold tracking-[0.15em] uppercase mb-0.5">입찰</div>
          <div className="font-mono text-sm font-bold text-ink">{card.bidCount}회</div>
        </div>
      </div>
      <div className={`flex items-center justify-between rounded-lg px-3 py-1.5 ${statusTone}`}>
        <span className="text-[10px] font-bold inline-flex items-center gap-1.5 tracking-wider">
          <Icon name="clock" size={11} strokeWidth={2.2} />
          {statusLabel}
        </span>
        {ended ? (
          <span className="text-[10px] font-mono font-bold tracking-wider">—</span>
        ) : (
          <Countdown endsAt={card.endsAt} size="sm" label={false} />
        )}
      </div>
    </div>
  )
}

// 예정 경매 — 가격(아직 입찰 없음) 대신 "경매 예정" 라벨 + 시작 카운트다운.
function UpcomingFooter({ card }) {
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-baseline">
        <div>
          <div className="text-[9px] text-mute font-bold tracking-[0.15em] uppercase mb-0.5">
            상태
          </div>
          <div className="font-display text-xl font-bold text-ink leading-none">
            경매 예정
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-mute font-bold tracking-[0.15em] uppercase mb-0.5">시작가</div>
          <div className="font-mono text-sm font-bold text-ink tabular-nums">{formatKRW(card.startPrice || card.price || 0)}</div>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg px-3 py-1.5 bg-electric/15 text-ink">
        <span className="text-[10px] font-bold inline-flex items-center gap-1.5 tracking-wider">
          <Icon name="clock" size={11} strokeWidth={2.2} />
          시작까지
        </span>
        {card.startsAt ? (
          <Countdown endsAt={card.startsAt} size="sm" label={false} />
        ) : (
          <span className="text-[10px] font-mono font-bold tracking-wider">곧</span>
        )}
      </div>
    </div>
  )
}

function BuyNowFooter({ card }) {
  return (
    <div className="flex justify-between items-baseline">
      <div>
        <div className="text-[9px] text-mute font-bold tracking-[0.15em] uppercase mb-0.5">판매가</div>
        <div className="font-display text-2xl font-bold text-ink leading-none tabular-nums">{formatKRW(card.price)}</div>
      </div>
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-led-g/10 text-emerald-700 rounded-md text-[10px] font-bold">
        <Icon name="check" size={10} strokeWidth={3} /> 즉시구매
      </span>
    </div>
  )
}

// React.memo — sort/filter 변경으로 부모(ProductsPage/HomePage) 재렌더 시
// card prop 동일하면 (useQuery cache 안정) 카드 그리드 전체 bail-out
export default memo(CardTile)
