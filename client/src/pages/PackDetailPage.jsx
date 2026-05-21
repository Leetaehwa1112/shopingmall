import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { formatKRW, formatKRWFull } from '@/api/cards'
import { normalizePack } from '@/api/normalize'
import api from '@/api/axios'
import PackVisual from '@/components/common/PackVisual'
import PackTile from '@/components/common/PackTile'
import ShippingBanner from '@/components/common/ShippingBanner'
import Icon from '@/components/common/Icon'
import Sparkles from '@/components/common/Sparkles'
import Eyebrow from '@/components/common/Eyebrow'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import useToastStore from '@/store/toastStore'
import PackOpener from '@/components/dex/PackOpener'

export default function PackDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const add = useCartStore((s) => s.add)
  const wishlist = useWishlistStore()
  const toast = useToastStore((s) => s.push)
  const [pack, setPack] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.get(`/packs/${id}`)
      .then(({ data }) => {
        const p = normalizePack(data.data)
        setPack(p)
        return api.get('/packs', { params: { status: 'active', limit: 5 } })
      })
      .then(({ data }) => {
        setRelated(data.data.map(normalizePack).filter((p) => p.id !== id).slice(0, 4))
      })
      .catch(() => setPack(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="p-20 text-center">
      <div className="inline-flex items-center gap-3 text-mute font-bold">
        <span className="led led-yellow led-pulse" style={{ width: 8, height: 8 }} />
        팩을 꺼내는 중...
      </div>
    </div>
  )
  if (!pack) return <div className="p-20 text-center text-mute font-bold">카드팩을 찾을 수 없어요.</div>

  const packId = pack.id || pack._id
  const wished = wishlist.has(packId)

  const handleAdd = () => {
    add({ ...pack, qty })
    toast({ type: 'success', title: '장바구니에 추가했어요', message: `${pack.nameKo || pack.name} ${qty}개` })
  }

  const handleQuick = () => {
    add({ ...pack, qty, shippingOption: 'quick' })
    toast({ type: 'success', title: '⚡ 퀵 배송 선택!', message: `${pack.nameKo || pack.name} · 당일 2-4시간 내 도착` })
    navigate('/order')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 lg:py-10">
      <div className="text-xs font-bold text-mute mb-4 lg:mb-8 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
        <Link to="/" className="hover:text-ink">홈</Link>
        <Icon name="arrow" size={10} strokeWidth={2} className="opacity-50" />
        <Link to="/packs" className="hover:text-ink">카드팩</Link>
        <Icon name="arrow" size={10} strokeWidth={2} className="opacity-50" />
        <span className="text-ink truncate">{pack.nameKo || pack.name}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
        {/* LEFT: Pack visual — chunky + holo + sparkles + polka */}
        <div className="surface-pop sparkle-host holo-shine bg-confetti p-6 lg:p-10 flex justify-center items-center min-h-[280px] lg:min-h-[500px] relative overflow-hidden">
          <Sparkles always />
          <div className="absolute inset-0 bg-polka opacity-40 pointer-events-none" aria-hidden />
          <div className="relative float-bob">
            <PackVisual pack={pack} size="lg" />
          </div>
        </div>

        {/* RIGHT: Info */}
        <div className="space-y-6">
          <div>
            <Eyebrow tone="electric" led="yellow" pulse>
              {pack.type === 'box' ? 'SEALED BOX · 미개봉 박스' : 'SEALED PACK · 두근두근 개봉'}
            </Eyebrow>
            <div className="text-xs font-mono text-mute mt-3 mb-2 font-bold">
              {pack.setShort} · {pack.year} · {pack.cardsPerPack ? `${pack.cardsPerPack}장 / ` : ''}{pack.type === 'box' ? '박스' : '팩'}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-[1.05]">
              {pack.nameKo || pack.name}
            </h1>
            <div className="text-base lg:text-lg italic text-mute mt-2 font-medium">{pack.name}</div>
          </div>

          {pack.description && (
            <p className="text-ink/80 leading-relaxed font-medium">{pack.description}</p>
          )}

          <div className="surface-pop p-6 space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] font-bold text-dex tracking-[0.18em] uppercase mb-1.5">⚡ 판매가</div>
                <div className="font-display text-5xl font-bold text-ink leading-none tabular-nums">{formatKRW(pack.price)}</div>
                <div className="text-xs text-mute font-mono mt-2">{formatKRWFull(pack.price)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase mb-1.5">재고</div>
                <div className="font-display text-3xl font-bold text-grass tabular-nums">{pack.stock}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t-2 border-ink/15">
              <span className="text-sm font-bold text-ink">수량</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-10 h-10 rounded-lg bg-paper border-2 border-ink text-ink font-bold shadow-[0_2px_0_#1a1a1a] hover:bg-electric/30 transition-colors">−</button>
                <span className="font-display text-2xl font-bold text-ink w-10 text-center tabular-nums">{qty}</span>
                <button onClick={() => setQty(Math.min(pack.stock || 99, qty + 1))}
                  className="w-10 h-10 rounded-lg bg-paper border-2 border-ink text-ink font-bold shadow-[0_2px_0_#1a1a1a] hover:bg-electric/30 transition-colors">+</button>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={handleAdd}
                className="flex-1 inline-flex items-center justify-center gap-2 bg-paper border-2 border-ink text-ink font-bold py-3 rounded-xl shadow-[0_3px_0_#1a1a1a] hover:bg-electric/30 hover:-translate-y-0.5 transition-all">
                <Icon name="cart" size={16} strokeWidth={2} /> 장바구니
              </button>
              <button onClick={() => { add({ ...pack, qty }); navigate('/order') }}
                className="btn-pop px-6 py-3 rounded-xl font-bold">
                바로 데려가기
              </button>
            </div>

            <button onClick={handleQuick}
              className="w-full bg-electric border-2 border-ink text-ink font-bold py-3 rounded-xl shadow-[0_3px_0_#1a1a1a] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2">
              <Icon name="bolt" size={18} strokeWidth={2.5} />
              <span>⚡ 퀵 배송으로 오늘 받기</span>
              <span className="text-xs font-mono opacity-80">+₩50,000</span>
            </button>

            {/* 데모 — 팩 열어보기 (실제 카드 미지급) */}
            <button
              onClick={() => setOpening(true)}
              className="w-full bg-paper border-2 border-dashed border-ink/40 text-ink font-bold py-2.5 rounded-xl hover:bg-electric/15 hover:border-ink transition-all flex items-center justify-center gap-2 group"
            >
              <span className="text-base">📦</span>
              <span>지금 미리 열어보기 <span className="text-xs text-mute font-medium">(데모)</span></span>
              <span className="text-xs opacity-60 group-hover:translate-x-0.5 transition-transform">→</span>
            </button>

            <button onClick={() => wishlist.toggle(packId)}
              className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-ink font-bold text-sm transition-all ${
                wished ? 'bg-gold/30 text-ink' : 'bg-paper text-ink hover:bg-electric/20'
              }`}>
              <Icon name="star" size={14} strokeWidth={2} style={{ fill: wished ? 'currentColor' : 'none' }} />
              {wished ? '관심 등록됨 ★' : '관심 등록'}
            </button>
          </div>

          <ShippingBanner price={pack.price} isPack={true} />

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ['shield',  '미개봉 인증',  'water'],
              ['trophy',  '정품 보증',    'electric'],
              ['package', '보안 운송',    'fire'],
              ['lock',    '에스크로 결제','grass'],
            ].map(([icon, text, tone]) => (
              <div key={text} className={`chip-type chip-type-${tone}`}>
                <Icon name={icon} size={12} strokeWidth={2} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-20">
          <Eyebrow tone="electric" led="yellow">MORE PACKS · 더 둘러볼래요?</Eyebrow>
          <h2 className="font-display text-3xl font-bold text-ink mt-3 mb-8 tracking-tight">
            이런 팩은 어때요?
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {related.map((p) => <PackTile key={p.id || p._id} pack={p} />)}
          </div>
        </div>
      )}

      {opening && <PackOpener pack={pack} onClose={() => setOpening(false)} />}

      {/* sticky CTA가 마지막 콘텐츠를 가리지 않게 — 모바일에서만 spacer */}
      <div aria-hidden className="lg:hidden h-[72px]" />

      {/* === Mobile sticky CTA — 스크롤해도 항상 액션 가능 (lg 이하) === */}
      <MobileStickyCTA
        price={pack.price}
        priceLabel={formatKRW(pack.price)}
        onAddToCart={handleAdd}
        onBuyNow={() => { add({ ...pack, qty }); navigate('/order') }}
      />
    </div>
  )
}

// ─── 모바일 하단 sticky CTA — 디테일 페이지 전환 최적화 ───
// 하단 탭바(64px) 위에 떠 있음. 스크롤해도 항상 노출 → 친화적 전환
function MobileStickyCTA({ priceLabel, onAddToCart, onBuyNow }) {
  return (
    <div
      className="lg:hidden fixed left-0 right-0 z-30 bg-paper border-t-2 border-ink shadow-[0_-4px_12px_rgba(13,23,48,0.08)]"
      style={{
        bottom: `calc(64px + env(safe-area-inset-bottom))`,
      }}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold text-dex tracking-wider uppercase">판매가</div>
          <div className="font-display text-xl font-bold text-ink leading-none tabular-nums truncate">{priceLabel}</div>
        </div>
        <button
          onClick={onAddToCart}
          className="shrink-0 inline-flex items-center justify-center gap-1.5 bg-paper border-2 border-ink text-ink font-bold py-3 px-3 rounded-xl shadow-[0_2px_0_#1a1a1a] active:translate-y-0.5 active:shadow-[0_1px_0_#1a1a1a] transition-all"
          aria-label="장바구니 담기"
        >
          <Icon name="cart" size={18} strokeWidth={2.2} />
        </button>
        <button
          onClick={onBuyNow}
          className="shrink-0 bg-dex text-white border-2 border-ink font-bold py-3 px-5 rounded-xl shadow-[0_2px_0_#1a1a1a] active:translate-y-0.5 active:shadow-[0_1px_0_#1a1a1a] transition-all min-w-[120px]"
        >
          바로 구매
        </button>
      </div>
    </div>
  )
}
