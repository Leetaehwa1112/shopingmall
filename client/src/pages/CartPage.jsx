import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import { formatKRWFull } from '@/api/cards'
import PokeCard from '@/components/common/PokeCard'
import PackVisual from '@/components/common/PackVisual'
import GradeBadge from '@/components/common/GradeBadge'
import Icon from '@/components/common/Icon'
import Sparkles from '@/components/common/Sparkles'
import Eyebrow from '@/components/common/Eyebrow'

export default function CartPage() {
  const { items, remove, updateQty, total, fetchCart, loading } = useCartStore()
  const navigate = useNavigate()

  useEffect(() => { fetchCart() }, [])

  const shipping = items.length ? 30000 : 0
  const insurance = Math.floor(total() * 0.005)
  const grand = total() + shipping + insurance

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 lg:py-12">
      <div className="mb-5 lg:mb-10 relative sparkle-host">
        <Sparkles always />
        <Eyebrow tone="fire" led="red" pulse>MY CART · 곧 내 컬렉션</Eyebrow>
        <h1 className="mt-3 lg:mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-[1.1]">
          장바구니
          <span className="relative inline-block ml-2 lg:ml-3">
            <span className="relative z-10 text-fire">두근두근!</span>
            <span className="absolute left-0 right-0 bottom-1 h-3 bg-electric/60 -z-0 rounded-sm" aria-hidden />
          </span>
        </h1>
        <p className="text-sm text-mute mt-2 lg:mt-3 font-medium">결제 한 번이면 안전하게 우리 집까지 도착해요.</p>
      </div>

      {loading ? (
        <div className="text-center py-24">
          <div className="inline-flex items-center gap-3 text-mute font-bold">
            <span className="led led-yellow led-pulse" style={{ width: 8, height: 8 }} />
            장바구니 불러오는 중...
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="surface-pop p-16 text-center sparkle-host relative bg-confetti">
          <Sparkles always />
          <div className="w-20 h-20 mx-auto rounded-full bg-electric/30 border-2 border-ink flex items-center justify-center shadow-[0_4px_0_#1a1a1a] mb-5">
            <Icon name="cart" size={36} strokeWidth={2} className="text-ink" />
          </div>
          <p className="font-display text-2xl font-bold text-ink mb-2">아직 장바구니가 비어있어요</p>
          <p className="text-sm text-mute mb-6 font-medium">마음에 드는 카드를 골라 담아보세요.</p>
          <Link to="/products" className="btn-pop px-6 py-3 rounded-xl inline-flex items-center gap-2">
            카탈로그 둘러보기 <Icon name="arrow" size={14} strokeWidth={2.4} />
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((c) => {
              const productId = c.id || c._id
              const price = c.priceSnapshot || c.price || c.currentBid || 0
              const isPack = c.itemType === 'pack' || c.type === 'pack' || c.type === 'box' || !!c.heroArt
              const detailHref = isPack ? `/packs/${productId}` : `/products/${productId}`
              return (
                <div key={productId} className="surface-pop p-3 sm:p-5 flex gap-3 sm:gap-5 items-start">
                  <div className="shrink-0">
                    {isPack
                      ? <PackVisual pack={c} size="sm" />
                      : <PokeCard card={c} size="sm" interactive={false} showShine={false} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link to={detailHref} className="block hover:text-dex transition-colors">
                      <div className="font-display text-lg sm:text-2xl font-bold text-ink leading-tight truncate">{c.nameKo || c.name}</div>
                      <div className="text-xs sm:text-sm text-mute italic font-medium truncate">{c.name}</div>
                    </Link>
                    <div className="text-[11px] sm:text-xs text-mute font-mono mt-1.5 font-bold truncate">
                      {[c.set || c.setShort, c.year, c.number && `#${c.number}`].filter(Boolean).join(' · ')}
                    </div>
                    {/* 모바일에선 가격 + 수량 + 제거가 같은 줄로, 데스크탑에선 분리 */}
                    <div className="mt-2 sm:mt-3 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {!isPack && <GradeBadge grade={c.grade} size="sm" />}
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => updateQty(productId, Math.max(1, (c.qty || 1) - 1))}
                            disabled={(c.qty || 1) <= 1}
                            aria-label="수량 감소"
                            className="w-9 h-9 rounded-md bg-paper border-2 border-ink text-ink font-bold text-base shadow-[0_2px_0_#1a1a1a] active:translate-y-0.5 active:shadow-[0_1px_0_#1a1a1a] hover:bg-electric/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">−</button>
                          <span className="font-display font-bold text-base w-7 text-center tabular-nums">{c.qty || 1}</span>
                          <button onClick={() => updateQty(productId, (c.qty || 1) + 1)}
                            disabled={typeof c.stock === 'number' && (c.qty || 1) >= c.stock}
                            aria-label="수량 증가"
                            title={typeof c.stock === 'number' && (c.qty || 1) >= c.stock ? `재고 ${c.stock}개 한도` : ''}
                            className="w-9 h-9 rounded-md bg-paper border-2 border-ink text-ink font-bold text-base shadow-[0_2px_0_#1a1a1a] active:translate-y-0.5 active:shadow-[0_1px_0_#1a1a1a] hover:bg-electric/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed">+</button>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-base sm:text-2xl font-bold text-ink tabular-nums">
                          {formatKRWFull(price * (c.qty || 1))}
                        </div>
                        <button onClick={() => remove(productId)}
                          aria-label="장바구니에서 제거"
                          className="text-[11px] sm:text-xs font-bold text-mute hover:text-dex mt-1 inline-flex items-center gap-1 transition-colors">
                          <Icon name="close" size={11} strokeWidth={2.5} /> 제거
                        </button>
                      </div>
                    </div>
                    {c.shippingOption === 'quick' && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-electric/30 border border-ink rounded-full text-[10px] text-ink font-bold">
                        <Icon name="bolt" size={10} strokeWidth={2.5} /> 퀵 배송 +₩50,000
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <aside>
            <div className="surface-pop p-5 lg:p-6 lg:sticky lg:top-32">
              <Eyebrow tone="electric" led="yellow">FINAL · 결제 요약</Eyebrow>
              <div className="mt-3 lg:mt-4 space-y-1">
                <Row label="상품 합계" value={formatKRWFull(total())} />
                <Row label="배송 (FedEx)" value={formatKRWFull(shipping)} />
                <Row label="보험료 (0.5%)" value={formatKRWFull(insurance)} />
              </div>
              <div className="my-3 lg:my-4 border-t-2 border-ink/15" />
              <div className="flex justify-between items-baseline">
                <span className="text-ink font-bold text-sm">총 결제</span>
                <span className="font-display text-2xl lg:text-3xl font-bold text-dex tabular-nums">{formatKRWFull(grand)}</span>
              </div>
              {/* 모바일에선 sticky CTA로 분리 → 여기선 데스크탑만 */}
              <button onClick={() => navigate('/order')}
                className="hidden lg:inline-flex btn-pop w-full mt-6 py-3 rounded-xl items-center justify-center gap-2 font-bold">
                결제하러 가기 <Icon name="arrow" size={14} strokeWidth={2.4} />
              </button>
              <div className="text-[10px] text-ink/70 mt-4 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="led led-green" style={{ width: 6, height: 6 }} />
                  100만원 이상 자동 에스크로
                </div>
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="led led-green" style={{ width: 6, height: 6 }} />
                  가품 시 100% 환불 보증
                </div>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* sticky CTA spacer — 모바일에서만 */}
      {items.length > 0 && <div aria-hidden className="lg:hidden h-[72px]" />}

      {/* === Mobile sticky 결제 CTA === */}
      {items.length > 0 && (
        <div
          className="lg:hidden fixed left-0 right-0 z-30 bg-paper border-t-2 border-ink shadow-[0_-4px_12px_rgba(13,23,48,0.08)]"
          style={{ bottom: `calc(64px + env(safe-area-inset-bottom))` }}
        >
          <div className="flex items-center gap-2 px-3 py-2.5">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-dex tracking-wider uppercase">총 결제</div>
              <div className="font-display text-xl font-bold text-ink leading-none tabular-nums truncate">{formatKRWFull(grand)}</div>
            </div>
            <button
              onClick={() => navigate('/order')}
              className="shrink-0 bg-dex text-white border-2 border-ink font-bold py-3 px-6 rounded-xl shadow-[0_2px_0_#1a1a1a] active:translate-y-0.5 active:shadow-[0_1px_0_#1a1a1a] transition-all inline-flex items-center gap-1.5"
            >
              결제하기 <Icon name="arrow" size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between text-sm py-1.5">
      <span className="text-mute font-medium">{label}</span>
      <span className="font-mono font-bold text-ink tabular-nums">{value}</span>
    </div>
  )
}
