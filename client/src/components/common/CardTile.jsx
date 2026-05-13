import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PokeCard from './PokeCard'
import GradeBadge from './GradeBadge'
import Countdown from './Countdown'
import Icon from './Icon'
import { formatKRW, timeUntil } from '@/api/cards'
import useWishlistStore from '@/store/wishlistStore'

export default function CardTile({ card }) {
  const wished = useWishlistStore((s) => s.has(card.id))
  const toggle = useWishlistStore((s) => s.toggle)
  const [pop, setPop] = useState(false)

  const onWish = (e) => {
    e.preventDefault()
    e.stopPropagation()
    toggle(card.id)
    if (!wished) {
      setPop(true)
      setTimeout(() => setPop(false), 500)
    }
  }

  const entryNum = String(parseInt(card.id.replace(/\D/g, '').slice(0, 3) || '001')).padStart(3, '0')

  return (
    <Link to={`/products/${card.id}`} className="group block surface-card overflow-hidden">
      {/* Status strip — micro pixel label */}
      <div className="px-4 pt-4 flex justify-between items-center">
        {card.type === 'auction' ? (
          <span className="inline-flex items-center gap-2">
            <span className="led led-red led-pulse" style={{ width: 7, height: 7 }} />
            <span className="pixel-label text-dex">LIVE · No.{entryNum}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-2">
            <span className="led led-blue" style={{ width: 7, height: 7 }} />
            <span className="pixel-label text-blue">BUY NOW · No.{entryNum}</span>
          </span>
        )}
        <button
          onClick={onWish}
          className={`transition-colors ${wished ? 'text-gold' : 'text-mute hover:text-ink'} ${pop ? 'scale-125' : ''}`}
          aria-label="관심"
        >
          <Icon name="star" size={18} strokeWidth={1.8} style={{ fill: wished ? 'currentColor' : 'none' }} />
        </button>
      </div>

      {/* Big card image */}
      <div className="px-6 py-5 flex justify-center"
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
          {card.type === 'auction' ? <AuctionFooter card={card} /> : <BuyNowFooter card={card} />}
        </div>
      </div>
    </Link>
  )
}

function AuctionFooter({ card }) {
  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const t = timeUntil(card.endsAt)
  const urgent = t.totalMs < 1000 * 60 * 60

  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-baseline">
        <div>
          <div className="text-[9px] text-mute font-bold tracking-[0.15em] uppercase mb-0.5">현재 입찰가</div>
          <div className="font-display text-2xl font-bold text-ink leading-none tabular-nums">
            {formatKRW(card.currentBid)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] text-mute font-bold tracking-[0.15em] uppercase mb-0.5">입찰</div>
          <div className="font-mono text-sm font-bold text-ink">{card.bidCount}회</div>
        </div>
      </div>
      <div className={`flex items-center justify-between rounded-lg px-3 py-1.5 ${
        urgent ? 'bg-dex/8 text-dex' : 'bg-bone-2/60 text-mute'
      }`}>
        <span className="text-[10px] font-bold inline-flex items-center gap-1.5 tracking-wider">
          <Icon name="clock" size={11} strokeWidth={2.2} />
          {urgent ? '마감 임박' : '종료까지'}
        </span>
        <Countdown endsAt={card.endsAt} size="sm" label={false} />
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
