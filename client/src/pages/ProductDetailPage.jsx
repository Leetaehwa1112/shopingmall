import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { formatKRW, formatKRWFull } from '@/api/cards'
import { normalizeProduct } from '@/api/normalize'
import api from '@/api/axios'
import PokeCard from '@/components/common/PokeCard'
import CardBack from '@/components/common/CardBack'
import PSASlab from '@/components/common/PSASlab'
import CardDetail from '@/components/common/CardDetail'
import GradeBadge from '@/components/common/GradeBadge'
import Countdown from '@/components/common/Countdown'
import Button from '@/components/common/Button'
import CardTile from '@/components/common/CardTile'
import ShippingBanner from '@/components/common/ShippingBanner'
import Icon from '@/components/common/Icon'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import useToastStore from '@/store/toastStore'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const add = useCartStore((s) => s.add)
  const wishlist = useWishlistStore()
  const toast = useToastStore((s) => s.push)
  const [card, setCard] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('description')
  const [bidAmount, setBidAmount] = useState('')
  const [view, setView] = useState('front')

  useEffect(() => {
    setLoading(true)
    api.get(`/products/${id}`)
      .then(({ data }) => {
        const c = normalizeProduct(data.data)
        setCard(c)
        return api.get('/products', { params: { status: 'active', limit: 4, category: c.category } })
      })
      .then(({ data }) => {
        setRelated(data.data.map(normalizeProduct).filter((c) => c.id !== id).slice(0, 4))
      })
      .catch(() => setCard(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-20 text-center text-mute font-bold">불러오는 중...</div>
  if (!card)   return <div className="p-20 text-center text-mute">카드를 찾을 수 없습니다.</div>

  const cardType = card.type || card.sale_type
  const cardId   = card.id || card._id
  const minBid   = (card.currentBid || 0) + 1000000

  const quickBid = (mult) => setBidAmount(((card.currentBid + 1000000) * mult).toString())

  const handleBid = () => {
    const amt = parseInt(bidAmount.replace(/[^0-9]/g, ''))
    if (!amt || amt < minBid) {
      toast({ type: 'error', title: '입찰 실패', message: `최소 ${formatKRWFull(minBid)} 이상 입찰해주세요` })
      return
    }
    toast({ type: 'success', title: '입찰 완료', message: `${formatKRWFull(amt)} 입찰됨` })
    setBidAmount('')
  }

  const handleBuyNow = () => {
    add(card)
    toast({ type: 'success', title: '장바구니에 추가', message: card.nameKo || card.name })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Breadcrumb */}
      <div className="text-xs font-bold text-mute mb-6 sm:mb-8 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
        <Link to="/" className="hover:text-ink shrink-0">홈</Link>
        <Icon name="arrow" size={10} strokeWidth={2} className="opacity-50 shrink-0" />
        <Link to={cardType === 'auction' ? '/auctions' : '/products'} className="hover:text-ink shrink-0">
          {cardType === 'auction' ? '경매' : '카탈로그'}
        </Link>
        <Icon name="arrow" size={10} strokeWidth={2} className="opacity-50 shrink-0" />
        <span className="text-ink truncate">{card.nameKo || card.name}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
        {/* === LEFT: Card visual + thumbnails === */}
        <div className="space-y-4">
          <div className="surface-soft p-6 sm:p-10 flex justify-center items-center min-h-[400px] sm:min-h-[560px] relative overflow-hidden"
            style={{ background: `radial-gradient(ellipse at center, ${card.accent || '#fbf7ec'}10 0%, transparent 70%)` }}>
            {view === 'front'  && <PokeCard card={card} size="xl" />}
            {view === 'back'   && <CardBack size="xl" />}
            {view === 'slab'   && <PSASlab card={card} size="xl" />}
            {view === 'detail' && <CardDetail card={card} size="xl" />}
            <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 bg-paper/80 backdrop-blur rounded-full border border-line">
              <span className="led led-blue" style={{ width: 6, height: 6 }} />
              <span className="pixel-label text-ink/70">
                {{ front: 'FRONT', back: 'BACK', slab: 'CERT SLAB', detail: 'CONDITION' }[view]}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'front',  label: '앞면',   render: <PokeCard card={card} size="xs" interactive={false} showShine={false} /> },
              { id: 'back',   label: '뒷면',   render: <CardBack size="sm" /> },
              { id: 'slab',   label: '인증서', render: <PSASlab card={card} size="md" /> },
              { id: 'detail', label: '디테일', render: <ThumbDetail card={card} /> },
            ].map((v) => (
              <button key={v.id} onClick={() => setView(v.id)}
                className={`relative aspect-[3/4] rounded-lg overflow-hidden border-2 transition-all bg-paper ${
                  view === v.id ? 'border-ink elev-2' : 'border-line hover:border-ink/30'
                }`}>
                <div className="absolute inset-0 flex items-center justify-center scale-[0.42] origin-center">{v.render}</div>
                <div className={`absolute bottom-0 inset-x-0 py-1 text-center text-[10px] font-bold ${
                  view === v.id ? 'bg-ink text-paper' : 'bg-paper/90 text-mute'
                }`}>{v.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* === RIGHT: Info + Bid === */}
        <div className="space-y-6">
          <div className="flex items-center gap-2 flex-wrap">
            {cardType === 'auction' ? (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-dex/8 border border-dex/30 rounded-full">
                <span className="led led-red led-pulse" style={{ width: 7, height: 7 }} />
                <span className="pixel-label text-dex">Live Auction</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue/30 rounded-full">
                <span className="led led-blue" style={{ width: 7, height: 7 }} />
                <span className="pixel-label text-blue">Buy Now</span>
              </span>
            )}
            <span className="pixel-label text-mute">Lot #{String(cardId).slice(-6).toUpperCase()}</span>
          </div>

          <div>
            <div className="text-xs sm:text-sm font-mono text-mute mb-2">
              {card.set} · {card.year} · #{card.number}
            </div>
            <h1 className="font-display font-bold text-3xl sm:text-5xl lg:text-6xl text-ink tracking-tight leading-tight sm:leading-none">
              {card.nameKo || card.name}
            </h1>
            <div className="text-base sm:text-xl italic text-mute mt-2">{card.name}</div>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {card.grade?.company && <GradeBadge grade={card.grade} size="lg" />}
            {card.population && Object.values(card.population)[0] && (
              <span className="px-3 py-1.5 bg-paper border border-line rounded-full text-xs font-bold">
                인구 {Object.values(card.population)[0]}장
              </span>
            )}
            {card.grade?.cert && (
              <span className="px-3 py-1.5 bg-paper border border-line rounded-full text-xs font-mono">
                Cert #{card.grade.cert}
              </span>
            )}
            {cardType === 'auction' && card.watchers > 0 && (
              <span className="px-3 py-1.5 bg-gold/15 border border-gold/40 rounded-full text-xs font-bold inline-flex items-center gap-1.5">
                <Icon name="eye" size={11} strokeWidth={2} /> {card.watchers}명 관심
              </span>
            )}
          </div>

          {/* Bid / Buy panel */}
          {cardType === 'auction' ? (
            <div className="surface-soft p-5 sm:p-6 elev-2 space-y-5">
              <div className="flex justify-between items-end gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] text-mute font-bold tracking-[0.18em] uppercase mb-1.5">현재 입찰가</div>
                  <div className="font-display text-3xl sm:text-5xl font-bold text-ink leading-none tabular-nums">{formatKRW(card.currentBid)}</div>
                  <div className="text-xs text-mute font-mono mt-2 truncate">{formatKRWFull(card.currentBid)}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[10px] text-mute font-bold tracking-[0.18em] uppercase mb-1.5">입찰</div>
                  <div className="font-display text-2xl sm:text-3xl font-bold text-ink tabular-nums">{card.bidCount}회</div>
                </div>
              </div>

              <div className="bg-ink rounded-xl p-4 text-paper">
                <div className="text-[10px] font-bold tracking-[0.18em] uppercase mb-3 inline-flex items-center gap-1.5 text-gold">
                  <Icon name="clock" size={11} strokeWidth={2.5} /> 마감까지
                </div>
                <Countdown endsAt={card.endsAt} size="md" />
              </div>

              <div>
                <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase mb-2">빠른 입찰 금액 선택</div>
                <div className="grid grid-cols-3 gap-2">
                  {[{ mult: 1, label: '최소가' }, { mult: 1.1, label: '+10%' }, { mult: 1.25, label: '+25%' }].map(({ mult, label }) => {
                    const amount = (card.currentBid + 1000000) * mult
                    return (
                      <button key={mult} type="button" onClick={() => quickBid(mult)}
                        className="group flex flex-col items-stretch px-3 py-2.5 bg-paper hover:bg-bone-2 hover:-translate-y-0.5 border-2 border-line hover:border-ink rounded-lg transition-all text-left">
                        <span className="text-[10px] font-bold text-mute group-hover:text-ink tracking-wide">{label}</span>
                        <span className="font-display font-bold text-ink tabular-nums mt-0.5">{formatKRW(amount)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase">또는 직접 입력</div>
                <div className="flex gap-2">
                  <input type="text" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`최소 ${formatKRWFull(minBid)}`}
                    inputMode="numeric"
                    className="flex-1 bg-bone-2 border-2 border-line rounded-lg px-4 py-3 font-mono text-sm text-ink focus:border-ink focus:bg-paper outline-none transition-colors" />
                </div>
                <Button variant="accent" size="lg" className="w-full" onClick={handleBid}>
                  <Icon name="bolt" size={14} strokeWidth={2.5} /> 입찰하기
                </Button>
              </div>

              <label className="flex items-center gap-2 text-xs text-mute font-medium cursor-pointer">
                <input type="checkbox" className="accent-ink" />
                <span><strong className="text-ink">자동 입찰(Snipe)</strong> · 마감 직전 자동 입찰</span>
              </label>

              <div className="grid grid-cols-2 gap-2 pt-4 border-t border-line">
                <Button variant="secondary" size="sm" onClick={() => wishlist.toggle(cardId)}>
                  <Icon name="star" size={14} strokeWidth={1.8} style={{ fill: wishlist.has(cardId) ? '#f5b800' : 'none' }} />
                  {wishlist.has(cardId) ? '관심 등록됨' : '관심 등록'}
                </Button>
                <Button variant="ghost" size="sm">
                  <Icon name="bell" size={14} strokeWidth={1.8} /> 알림 받기
                </Button>
              </div>

              {card.watchers > 0 && (
                <div className="text-xs text-center text-mute pt-1">
                  지금 <span className="text-dex font-bold">{card.watchers}명</span>이 이 카드를 보고 있어요
                </div>
              )}
            </div>
          ) : (
            <div className="surface-soft p-5 sm:p-6 elev-2 space-y-5">
              <div>
                <div className="text-[10px] text-mute font-bold tracking-[0.18em] uppercase mb-1.5">판매가</div>
                <div className="font-display text-3xl sm:text-5xl font-bold text-ink leading-none tabular-nums">{formatKRW(card.price)}</div>
                <div className="text-xs text-mute font-mono mt-2">{formatKRWFull(card.price)}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="primary" size="lg" className="flex-1" onClick={handleBuyNow}>
                  <Icon name="cart" size={16} strokeWidth={1.8} /> 장바구니
                </Button>
                <Button variant="accent" size="lg" onClick={() => { add(card); navigate('/order') }}>
                  바로 구매
                </Button>
              </div>
              <Button variant="secondary" size="sm" className="w-full" onClick={() => wishlist.toggle(cardId)}>
                <Icon name="star" size={14} strokeWidth={1.8} style={{ fill: wishlist.has(cardId) ? '#f5b800' : 'none' }} />
                {wishlist.has(cardId) ? '관심 등록됨' : '관심 등록'}
              </Button>
            </div>
          )}

          <ShippingBanner price={card.price || card.currentBid} />

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[['shield', '정품 100% 보증', 'blue'], ['trophy', 'PSA 공식 인증', 'yellow'],
              ['package', '보안 운송 + 보험', 'red'], ['lock', '에스크로 결제', 'green']].map(([icon, text, c]) => (
              <div key={text} className="flex items-center gap-2 px-3 py-2.5 bg-paper rounded-lg border border-line">
                <span className={`led led-${c}`} style={{ width: 6, height: 6 }} />
                <Icon name={icon} size={14} strokeWidth={1.6} className="text-ink/70" />
                <span className="text-ink font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* === TABS === */}
      <div className="mt-10 sm:mt-16">
        <div className="flex gap-1 mb-6 sm:mb-8 border-b border-line overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            ['description', '카드 정보'],
            ['history', cardType === 'auction' ? '입찰 내역' : '출처'],
            ['sales', '시세 추이'],
            ['shipping', '배송'],
          ].map(([tid, label]) => (
            <button key={tid} onClick={() => setTab(tid)}
              className={`px-4 sm:px-5 py-3 sm:py-3.5 text-sm font-bold whitespace-nowrap transition-all relative ${
                tab === tid ? 'text-ink' : 'text-mute hover:text-ink'
              }`}>
              {label}
              {tab === tid && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-ink" />}
            </button>
          ))}
        </div>

        <div className="surface-soft p-5 sm:p-8">
          {tab === 'description' && (
            <div className="space-y-4">
              <p className="text-ink/80 leading-relaxed">{card.description}</p>
              <div className="grid sm:grid-cols-2 gap-2 mt-6 max-w-2xl">
                <KV k="발매년도" v={card.year || '-'} />
                <KV k="세트" v={card.set || '-'} />
                <KV k="카드 번호" v={card.number || '-'} />
                {card.grade?.company && <KV k="등급" v={`${card.grade.company} ${card.grade.score}`} />}
                {card.grade?.country && <KV k="언어판" v={{ USA: '🇺🇸 US판', JPN: '🇯🇵 JP판', KOR: '🇰🇷 KR판' }[card.grade.country] ?? '-'} />}
                {card.grade?.cert && <KV k="인증서 번호" v={card.grade.cert} />}
              </div>
            </div>
          )}

          {tab === 'history' && cardType === 'auction' && (
            card.bidHistory?.length > 0 ? (
              <div className="space-y-2">
                {card.bidHistory.map((b, i) => (
                  <div key={i} className={`flex justify-between items-center py-3.5 px-5 rounded-lg ${
                    i === 0 ? 'bg-dex/5 border border-dex/20' : 'bg-bone-2/50'
                  }`}>
                    <div>
                      <div className="font-mono text-sm font-bold text-ink">{b.bidder}</div>
                      <div className="text-[10px] text-mute font-mono mt-0.5">{relTime(b.at)}</div>
                    </div>
                    <div className={`font-display text-xl font-bold tabular-nums ${i === 0 ? 'text-dex' : 'text-ink'}`}>
                      {formatKRW(b.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-mute py-8 font-bold">입찰 내역이 없습니다.</div>
            )
          )}

          {tab === 'sales' && (
            card.lastSales?.length > 0 ? (
              <div>
                <ChartLine sales={card.lastSales} />
                <div className="mt-6 space-y-2">
                  {card.lastSales.map((s, i) => (
                    <div key={i} className="flex justify-between py-3 px-5 bg-bone-2/50 rounded-lg text-sm">
                      <span className="font-mono text-mute">{s.date}</span>
                      <span className="font-mono text-ink font-bold">{s.grade}</span>
                      <span className="font-mono text-ink font-bold tabular-nums">{formatKRWFull(s.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-mute py-8 font-bold">시세 데이터가 없습니다.</div>
            )
          )}

          {tab === 'shipping' && (
            <div className="space-y-3 text-ink/80">
              <p className="font-bold text-ink text-sm">보안 배송 표준 절차</p>
              <ul className="space-y-2.5 text-sm leading-relaxed">
                {['강화 패키지 + 충격 흡수 인서트', 'FedEx Priority Insured (전액 보험)',
                  '수령인 서명 필수', '발송 후 24시간 내 트래킹 제공', '국내 1-2일 / 해외 3-5일'].map((t, i) => (
                  <li key={i} className="flex gap-3"><span className="text-gold font-bold">·</span> {t}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="font-display text-3xl font-bold text-ink mb-8 tracking-tight">함께 보면 좋은 카드</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((c) => <CardTile key={c.id || c._id} card={c} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function KV({ k, v }) {
  return (
    <div className="flex justify-between text-sm py-2.5 border-b border-line">
      <span className="text-mute font-bold">{k}</span>
      <span className="text-ink font-mono">{v}</span>
    </div>
  )
}

function ThumbDetail({ card }) {
  const img = card.image || card.images?.[0] || ''
  return (
    <div className="grid grid-cols-2 gap-1 w-full h-full p-1 bg-bone-2 rounded-md">
      {['0% 0%', '100% 0%', '0% 100%', '100% 100%'].map((bg, i) => (
        <div key={i} className="bg-white rounded"
          style={{ backgroundImage: `url(${img})`, backgroundSize: '320%', backgroundPosition: bg }} />
      ))}
    </div>
  )
}

function ChartLine({ sales }) {
  const max = Math.max(...sales.map((s) => s.price))
  const min = Math.min(...sales.map((s) => s.price))
  const pts = sales.slice().reverse().map((s, i, arr) => {
    const x = (i / (arr.length - 1)) * 100
    const y = 100 - ((s.price - min) / (max - min || 1)) * 80 - 10
    return `${x},${y}`
  }).join(' ')
  return (
    <div className="bg-bone-2/50 rounded-2xl p-6">
      <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase mb-4">가격 추이 (최근 거래)</div>
      <svg width="100%" height="180" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline points={pts} fill="none" stroke="#dc2626" strokeWidth="0.8" />
        <polygon points={`${pts} 100,100 0,100`} fill="url(#cg)" />
      </svg>
    </div>
  )
}

function relTime(ts) {
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}
