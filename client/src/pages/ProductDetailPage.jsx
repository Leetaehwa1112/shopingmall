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
import Sparkles from '@/components/common/Sparkles'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import useToastStore from '@/store/toastStore'
import useAuthStore from '@/store/authStore'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const add = useCartStore((s) => s.add)
  const wishlist = useWishlistStore()
  const toast = useToastStore((s) => s.push)
  const { isAuthenticated } = useAuthStore()
  const [card, setCard] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('description')
  const [bidAmount, setBidAmount] = useState('')
  const [bidding, setBidding] = useState(false)
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
      .catch((err) => {
        // 404면 상품 자체 없음, 그 외 에러는 토스트로
        if (err?.response?.status === 404) {
          setCard(null)
        } else {
          setRelated([])
          toast?.({ type: 'error', message: '관련 카드를 불러오지 못했어요.' })
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="p-20 text-center text-mute font-bold">불러오는 중...</div>
  if (!card)   return <div className="p-20 text-center text-mute">카드를 찾을 수 없어요.</div>

  const cardType = card.type || card.sale_type
  const cardId   = card.id || card._id
  const minBid   = (card.currentBid || 0) + 1000000

  const quickBid = (mult) => setBidAmount(((card.currentBid + 1000000) * mult).toString())

  const handleBid = async () => {
    if (!isAuthenticated) {
      toast({ type: 'error', title: '로그인이 필요해요', message: '입찰하려면 먼저 로그인해주세요.' })
      navigate('/login')
      return
    }
    const amt = parseInt(bidAmount.replace(/[^0-9]/g, ''))
    if (!amt || amt < minBid) {
      toast({ type: 'error', title: '입찰 실패', message: `최소 ${formatKRWFull(minBid)} 이상 입찰해주세요` })
      return
    }
    if (bidding) return
    setBidding(true)
    try {
      const { data } = await api.post(`/products/${cardId}/bid`, { amount: amt })
      // 서버가 돌려준 최신 currentBid/bidCount/bidHistory 로 카드 갱신
      setCard((prev) => prev ? {
        ...prev,
        currentBid: data.data.currentBid,
        bidCount: data.data.bidCount,
        bidHistory: data.data.bidHistory,
      } : prev)
      toast({ type: 'success', title: '두근두근! 입찰 완료', message: `${formatKRWFull(amt)} 입찰됨` })
      setBidAmount('')
    } catch (err) {
      const msg = err?.response?.data?.message || '입찰에 실패했어요. 잠시 후 다시 시도해주세요.'
      toast({ type: 'error', title: '입찰 실패', message: Array.isArray(msg) ? msg[0] : msg })
    } finally {
      setBidding(false)
    }
  }

  const handleBuyNow = () => {
    add(card)
    toast({ type: 'success', title: '장바구니에 추가했어요', message: card.nameKo || card.name })
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      {/* Breadcrumb */}
      <div className="text-xs font-bold text-mute mb-8 flex items-center gap-2">
        <Link to="/" className="hover:text-ink">홈</Link>
        <Icon name="arrow" size={10} strokeWidth={2.2} className="opacity-50" />
        <Link to={cardType === 'auction' ? '/auctions' : '/products'} className="hover:text-ink">
          {cardType === 'auction' ? '경매' : '카탈로그'}
        </Link>
        <Icon name="arrow" size={10} strokeWidth={2.2} className="opacity-50" />
        <span className="text-ink">{card.nameKo || card.name}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-10 lg:gap-12">
        {/* ═════════════════════════════════════════════════
            LEFT — 전시대 (Pack opening stage)
            ═════════════════════════════════════════════════ */}
        <div className="space-y-4">
          <div className="surface-pop sparkle-host holo-shine relative overflow-hidden p-8 sm:p-10 flex justify-center items-center min-h-[560px] bg-confetti">
            <Sparkles always />
            {/* dotted backdrop layer */}
            <div className="absolute inset-0 bg-polka opacity-50 pointer-events-none" aria-hidden="true" />

            {/* Card center */}
            <div className="relative z-10">
              {view === 'front'  && <PokeCard card={card} size="xl" />}
              {view === 'back'   && <CardBack size="xl" />}
              {view === 'slab'   && <PSASlab card={card} size="xl" />}
              {view === 'detail' && <CardDetail card={card} size="xl" />}
            </div>

            {/* View label badge */}
            <div className="absolute top-4 left-4 inline-flex items-center gap-2 px-3 py-1.5 bg-paper rounded-full border-2 border-ink shadow-[0_2px_0_#1a1a1a] z-10">
              <span className="led led-yellow led-pulse" style={{ width: 7, height: 7 }} />
              <span className="pixel-label text-ink">
                {{ front: 'FRONT', back: 'BACK', slab: 'CERT SLAB', detail: 'CONDITION' }[view]}
              </span>
            </div>

            {/* Lot tag */}
            <div className="absolute top-4 right-4 pricetag z-10">
              #{String(cardId).slice(-6).toUpperCase()}
            </div>
          </div>

          {/* Thumbs — chunky pop tiles */}
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { id: 'front',  label: '앞면',   render: <PokeCard card={card} size="xs" interactive={false} showShine={false} /> },
              { id: 'back',   label: '뒷면',   render: <CardBack size="sm" /> },
              { id: 'slab',   label: '인증서', render: <PSASlab card={card} size="md" /> },
              { id: 'detail', label: '디테일', render: <ThumbDetail card={card} /> },
            ].map((v) => {
              const active = view === v.id
              return (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={`relative aspect-[3/4] rounded-xl overflow-hidden bg-paper transition-all border-2 ${
                    active
                      ? 'border-ink shadow-[0_4px_0_#1a1a1a] -translate-y-0.5'
                      : 'border-line hover:border-ink hover:-translate-y-0.5 hover:shadow-[0_3px_0_#1a1a1a]'
                  }`}
                >
                  <div className="absolute inset-0 flex items-center justify-center scale-[0.42] origin-center">{v.render}</div>
                  <div className={`absolute bottom-0 inset-x-0 py-1 text-center text-[10px] font-bold transition-colors ${
                    active ? 'bg-ink text-electric' : 'bg-paper/90 text-mute'
                  }`}>{v.label}</div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ═════════════════════════════════════════════════
            RIGHT — Info + Bid/Buy
            ═════════════════════════════════════════════════ */}
        <div className="space-y-6">
          {/* Status chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {cardType === 'auction' ? (
              <span className="chip-type chip-type-fire">
                <span className="led led-red led-pulse" style={{ width: 7, height: 7 }} aria-hidden="true" />
                LIVE 경매 · 🔥
              </span>
            ) : (
              <span className="chip-type chip-type-water">
                <span className="led led-blue" style={{ width: 7, height: 7 }} aria-hidden="true" />
                즉시구매 · ⚡
              </span>
            )}
            <span className="pixel-label text-mute">Lot #{String(cardId).slice(-6).toUpperCase()}</span>
          </div>

          {/* Title */}
          <div>
            <div className="text-sm font-mono text-mute mb-2 font-bold">
              {card.set} · {card.year} · #{card.number}
            </div>
            <h1 className="font-display font-bold text-5xl lg:text-6xl text-ink tracking-tight leading-[0.95]">
              {card.nameKo || card.name}
            </h1>
            <div className="text-xl italic text-mute mt-2 font-medium">{card.name}</div>
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap gap-2 items-center">
            {card.grade?.company && <GradeBadge grade={card.grade} size="lg" />}
            {card.population && Object.values(card.population)[0] && (
              <span className="px-3 py-1.5 bg-paper border-2 border-ink rounded-full text-xs font-bold shadow-[0_2px_0_#1a1a1a]">
                인구 <span className="text-dex">{Object.values(card.population)[0]}장</span>
              </span>
            )}
            {card.grade?.cert && (
              <span className="px-3 py-1.5 bg-paper border-2 border-ink rounded-full text-xs font-mono font-bold shadow-[0_2px_0_#1a1a1a]">
                Cert #{card.grade.cert}
              </span>
            )}
            {cardType === 'auction' && card.watchers > 0 && (
              <span className="chip-type chip-type-electric">
                <Icon name="eye" size={11} strokeWidth={2.5} /> {card.watchers}명이 노리는 중
              </span>
            )}
          </div>

          {/* ═══════ Bid / Buy panel ═══════ */}
          {cardType === 'auction' ? (
            <div className="surface-pop p-6 space-y-5 relative overflow-hidden">
              {/* Price + bid count */}
              <div className="flex justify-between items-end">
                <div>
                  <div className="text-[10px] text-dex font-bold tracking-[0.18em] uppercase mb-1.5">🔥 현재 입찰가</div>
                  <div className="font-display text-5xl font-bold text-ink leading-none tabular-nums">{formatKRW(card.currentBid)}</div>
                  <div className="text-xs text-mute font-mono mt-2 font-bold">{formatKRWFull(card.currentBid)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-mute font-bold tracking-[0.18em] uppercase mb-1.5">입찰 수</div>
                  <div className="font-display text-3xl font-bold text-ink tabular-nums">{card.bidCount}회</div>
                </div>
              </div>

              {/* Countdown — chunky black box with electric label */}
              <div className="bg-ink rounded-xl p-4 text-white border-2 border-ink">
                <div className="text-[10px] font-bold tracking-[0.18em] uppercase mb-3 inline-flex items-center gap-1.5 text-electric">
                  <Icon name="clock" size={11} strokeWidth={2.5} /> 마감까지
                </div>
                <Countdown endsAt={card.endsAt} size="md" />
              </div>

              {/* Quick bid */}
              <div>
                <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase mb-2">⚡ 빠른 입찰 금액 선택</div>
                <div className="grid grid-cols-3 gap-2">
                  {[{ mult: 1, label: '최소가' }, { mult: 1.1, label: '+10%' }, { mult: 1.25, label: '+25%' }].map(({ mult, label }) => {
                    const amount = (card.currentBid + 1000000) * mult
                    return (
                      <button
                        key={mult}
                        type="button"
                        onClick={() => quickBid(mult)}
                        className="group flex flex-col items-stretch px-3 py-2.5 bg-paper hover:bg-electric border-2 border-ink rounded-lg transition-all text-left shadow-[0_3px_0_#1a1a1a] hover:-translate-y-0.5 hover:shadow-[0_5px_0_#1a1a1a] active:translate-y-0.5 active:shadow-[0_1px_0_#1a1a1a]"
                      >
                        <span className="text-[10px] font-bold text-mute group-hover:text-ink tracking-wide">{label}</span>
                        <span className="font-display font-bold text-ink tabular-nums mt-0.5">{formatKRW(amount)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Direct input */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase">또는 직접 입력</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={bidAmount}
                    onChange={(e) => setBidAmount(e.target.value)}
                    placeholder={`최소 ${formatKRWFull(minBid)}`}
                    inputMode="numeric"
                    className="flex-1 bg-bone-2 border-2 border-ink rounded-lg px-4 py-3 font-mono text-sm font-bold text-ink focus:bg-paper focus:border-dex focus:outline-none transition-colors placeholder:text-mute placeholder:font-medium"
                  />
                </div>
                <Button variant="pop" size="lg" className="w-full" onClick={handleBid} disabled={bidding}>
                  <Icon name="bolt" size={14} strokeWidth={2.5} />
                  {bidding ? '입찰 중…' : '지금 두근두근 입찰!'}
                </Button>
              </div>

              {/* Auto-bid toggle */}
              <label className="flex items-center gap-2.5 text-xs text-mute font-medium cursor-pointer p-2.5 rounded-lg hover:bg-bone-2/60 transition-colors">
                <input type="checkbox" className="accent-dex w-4 h-4" />
                <span><strong className="text-ink">자동 입찰(Snipe)</strong> · 마감 직전 자동으로 한 번 더 입찰해드려요</span>
              </label>

              {/* Wishlist / notify */}
              <div className="grid grid-cols-2 gap-2 pt-4 border-t-2 border-line">
                <button
                  type="button"
                  onClick={async () => {
                  if (!isAuthenticated) { toast({ type: 'info', message: '로그인 후 이용하실 수 있어요.' }); return }
                  try { await wishlist.toggle(cardId) }
                  catch { toast({ type: 'error', message: '위시리스트 동기화 실패' }) }
                }}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 text-xs font-bold transition-all ${
                    wishlist.has(cardId)
                      ? 'bg-electric border-ink text-ink shadow-[0_2px_0_#1a1a1a]'
                      : 'bg-paper border-ink text-ink hover:bg-electric/30 shadow-[0_2px_0_#1a1a1a]'
                  }`}
                >
                  <Icon name="star" size={14} strokeWidth={2} style={{ fill: wishlist.has(cardId) ? '#1a1a1a' : 'none' }} />
                  {wishlist.has(cardId) ? '관심 등록됨' : '관심 등록'}
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 border-line text-xs font-bold text-mute hover:text-ink hover:border-ink transition-all"
                >
                  <Icon name="bell" size={14} strokeWidth={2} /> 알림 받기
                </button>
              </div>

              {card.watchers > 0 && (
                <div className="text-xs text-center text-mute pt-1 font-medium">
                  지금 <span className="text-dex font-bold">{card.watchers}명</span>이 이 카드를 노리고 있어요 👀
                </div>
              )}
            </div>
          ) : (
            <div className="surface-pop p-6 space-y-5">
              <div>
                <div className="text-[10px] text-water font-bold tracking-[0.18em] uppercase mb-1.5">⚡ 판매가</div>
                <div className="font-display text-5xl font-bold text-ink leading-none tabular-nums">{formatKRW(card.price)}</div>
                <div className="text-xs text-mute font-mono mt-2 font-bold">{formatKRWFull(card.price)}</div>
              </div>
              <div className="flex gap-2">
                <Button variant="electric" size="lg" className="flex-1" onClick={handleBuyNow}>
                  <Icon name="cart" size={16} strokeWidth={2} /> 장바구니
                </Button>
                <Button variant="pop" size="lg" onClick={() => { add(card); navigate('/order') }}>
                  바로 데려가기
                </Button>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!isAuthenticated) { toast({ type: 'info', message: '로그인 후 이용하실 수 있어요.' }); return }
                  try { await wishlist.toggle(cardId) }
                  catch { toast({ type: 'error', message: '위시리스트 동기화 실패' }) }
                }}
                className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg border-2 text-xs font-bold transition-all ${
                  wishlist.has(cardId)
                    ? 'bg-electric border-ink text-ink shadow-[0_2px_0_#1a1a1a]'
                    : 'bg-paper border-ink text-ink hover:bg-electric/30 shadow-[0_2px_0_#1a1a1a]'
                }`}
              >
                <Icon name="star" size={14} strokeWidth={2} style={{ fill: wishlist.has(cardId) ? '#1a1a1a' : 'none' }} />
                {wishlist.has(cardId) ? '관심 등록됨' : '관심 등록'}
              </button>
            </div>
          )}

          <ShippingBanner price={card.price || card.currentBid} />

          {/* Trust chips */}
          <div className="grid grid-cols-2 gap-2">
            {[
              ['shield',  '정품 100% 보증', 'grass'],
              ['trophy',  'PSA 공식 인증',  'electric'],
              ['package', '안심 운송 + 보험', 'water'],
              ['lock',    '에스크로 결제',  'psychic'],
            ].map(([icon, text, tone]) => (
              <TrustChip key={text} icon={icon} text={text} tone={tone} />
            ))}
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════
          TABS
          ═════════════════════════════════════════════════ */}
      <div className="mt-16">
        <div className="flex gap-2 mb-8 overflow-x-auto pb-1">
          {[
            ['description', '카드 정보'],
            ['history', cardType === 'auction' ? '입찰 내역' : '출처'],
            ['sales', '시세 추이'],
            ['shipping', '배송'],
          ].map(([tid, label]) => {
            const active = tab === tid
            return (
              <button
                key={tid}
                onClick={() => setTab(tid)}
                className={`px-5 py-2.5 text-sm font-bold whitespace-nowrap rounded-full border-2 transition-all ${
                  active
                    ? 'bg-ink text-electric border-ink shadow-[0_3px_0_#1a1a1a]'
                    : 'bg-paper text-mute border-line hover:border-ink hover:text-ink'
                }`}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="surface-pop p-8">
          {tab === 'description' && (
            <div className="space-y-4">
              <p className="text-ink/85 leading-relaxed font-medium">{card.description}</p>
              <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1 mt-6 max-w-2xl">
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
                  <div
                    key={i}
                    className={`flex justify-between items-center py-3.5 px-5 rounded-xl border-2 ${
                      i === 0
                        ? 'bg-dex/10 border-dex text-dex shadow-[0_2px_0_#dc2626]'
                        : 'bg-bone-2/50 border-line text-ink'
                    }`}
                  >
                    <div>
                      <div className="font-mono text-sm font-bold">{b.bidder}</div>
                      <div className="text-[10px] text-mute font-mono mt-0.5">{relTime(b.at)}</div>
                    </div>
                    <div className={`font-display text-xl font-bold tabular-nums`}>
                      {formatKRW(b.amount)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-mute py-8 font-bold">아직 입찰 내역이 없어요. 첫 입찰자가 되어보세요!</div>
            )
          )}

          {tab === 'sales' && (
            card.lastSales?.length > 0 ? (
              <div>
                <ChartLine sales={card.lastSales} />
                <div className="mt-6 space-y-2">
                  {card.lastSales.map((s, i) => (
                    <div key={i} className="flex justify-between py-3 px-5 bg-bone-2/50 rounded-xl text-sm border-2 border-line">
                      <span className="font-mono text-mute font-bold">{s.date}</span>
                      <span className="font-mono text-ink font-bold">{s.grade}</span>
                      <span className="font-mono text-ink font-bold tabular-nums">{formatKRWFull(s.price)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-mute py-8 font-bold">시세 데이터가 아직 없어요.</div>
            )
          )}

          {tab === 'shipping' && (
            <div className="space-y-3 text-ink/85">
              <p className="font-display font-bold text-ink text-base mb-3">📦 안심 배송, 이렇게 보내드려요</p>
              <ul className="space-y-2.5 text-sm leading-relaxed font-medium">
                {['강화 패키지 + 충격 흡수 인서트', 'FedEx Priority Insured (전액 보험)',
                  '수령인 서명 필수', '발송 후 24시간 내 트래킹 제공', '국내 1-2일 / 해외 3-5일'].map((t, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-grass text-white text-[10px] font-bold border-2 border-ink shrink-0 mt-0.5">✓</span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="font-display text-3xl font-bold text-ink mb-2 tracking-tight">
            이것도 <span className="text-dex">마음에 드실</span> 거예요
          </h2>
          <p className="text-sm text-mute mb-8 font-medium">같은 카테고리에서 골랐어요.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((c) => <CardTile key={c.id || c._id} card={c} />)}
          </div>
        </div>
      )}
    </div>
  )
}

const trustChipTone = {
  grass:    { ring: 'border-grass',    dot: 'led-green',  ic: 'text-grass' },
  electric: { ring: 'border-electric', dot: 'led-yellow', ic: 'text-gold' },
  water:    { ring: 'border-water',    dot: 'led-blue',   ic: 'text-water' },
  psychic:  { ring: 'border-psychic',  dot: 'led-blue',   ic: 'text-psychic' },
}

function TrustChip({ icon, text, tone }) {
  const t = trustChipTone[tone] || trustChipTone.grass
  return (
    <div className={`flex items-center gap-2 px-3 py-2.5 bg-paper rounded-lg border-2 ${t.ring}`}>
      <span className={`led ${t.dot}`} style={{ width: 7, height: 7 }} aria-hidden="true" />
      <Icon name={icon} size={14} strokeWidth={2} className={t.ic} />
      <span className="text-ink font-bold text-xs">{text}</span>
    </div>
  )
}

function KV({ k, v }) {
  return (
    <div className="flex justify-between text-sm py-2.5 border-b-2 border-dotted border-line/70">
      <span className="text-mute font-bold">{k}</span>
      <span className="text-ink font-mono font-bold">{v}</span>
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
    <div className="bg-bone-2/50 rounded-2xl p-6 border-2 border-line">
      <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase mb-4">📈 가격 추이 (최근 거래)</div>
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
  const t = typeof ts === 'string' || ts instanceof Date ? new Date(ts).getTime() : Number(ts)
  if (!t) return ''
  const diff = Date.now() - t
  const m = Math.floor(diff / 60000)
  if (m < 1) return '방금 전'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}
