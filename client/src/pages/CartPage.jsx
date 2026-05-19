import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import { formatKRWFull } from '@/api/cards'
import PokeCard from '@/components/common/PokeCard'
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
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-10 relative sparkle-host">
        <Sparkles always />
        <Eyebrow tone="fire" led="red" pulse>MY CART · 곧 내 컬렉션</Eyebrow>
        <h1 className="mt-4 font-display text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-[1.1]">
          장바구니
          <span className="relative inline-block ml-3">
            <span className="relative z-10 text-fire">두근두근!</span>
            <span className="absolute left-0 right-0 bottom-1 h-3 bg-electric/60 -z-0 rounded-sm" aria-hidden />
          </span>
        </h1>
        <p className="text-sm text-mute mt-3 font-medium">결제 한 번이면 안전하게 우리 집까지 도착해요.</p>
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
              return (
                <div key={productId} className="surface-pop p-5 flex gap-5 items-start">
                  <PokeCard card={c} size="sm" interactive={false} showShine={false} />
                  <div className="flex-1 min-w-0">
                    <Link to={`/products/${productId}`} className="block hover:text-dex transition-colors">
                      <div className="font-display text-2xl font-bold text-ink">{c.nameKo || c.name}</div>
                      <div className="text-sm text-mute italic font-medium">{c.name}</div>
                    </Link>
                    <div className="text-xs text-mute font-mono mt-2 font-bold">
                      {c.set || c.setShort} · {c.year} · #{c.number}
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <GradeBadge grade={c.grade} size="sm" />
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(productId, Math.max(1, (c.qty || 1) - 1))}
                          className="w-8 h-8 rounded-md bg-paper border-2 border-ink text-ink font-bold text-sm shadow-[0_2px_0_#1a1a1a] hover:bg-electric/30 transition-colors">−</button>
                        <span className="font-display font-bold text-base w-7 text-center tabular-nums">{c.qty || 1}</span>
                        <button onClick={() => updateQty(productId, (c.qty || 1) + 1)}
                          className="w-8 h-8 rounded-md bg-paper border-2 border-ink text-ink font-bold text-sm shadow-[0_2px_0_#1a1a1a] hover:bg-electric/30 transition-colors">+</button>
                      </div>
                    </div>
                    {c.shippingOption === 'quick' && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-1 bg-electric/30 border border-ink rounded-full text-[10px] text-ink font-bold">
                        <Icon name="bolt" size={10} strokeWidth={2.5} /> 퀵 배송 +₩50,000
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-display text-2xl font-bold text-ink tabular-nums">
                      {formatKRWFull(price * (c.qty || 1))}
                    </div>
                    <div className="text-xs text-mute mt-1 font-mono">{formatKRWFull(price)} × {c.qty || 1}</div>
                    <button onClick={() => remove(productId)}
                      className="text-xs font-bold text-mute hover:text-dex mt-3 inline-flex items-center gap-1 transition-colors">
                      <Icon name="close" size={12} strokeWidth={2.5} /> 제거
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <aside>
            <div className="surface-pop p-6 sticky top-32">
              <Eyebrow tone="electric" led="yellow">FINAL · 결제 요약</Eyebrow>
              <div className="mt-4 space-y-1">
                <Row label="상품 합계" value={formatKRWFull(total())} />
                <Row label="배송 (FedEx)" value={formatKRWFull(shipping)} />
                <Row label="보험료 (0.5%)" value={formatKRWFull(insurance)} />
              </div>
              <div className="my-4 border-t-2 border-ink/15" />
              <div className="flex justify-between items-baseline">
                <span className="text-ink font-bold text-sm">총 결제</span>
                <span className="font-display text-3xl font-bold text-dex tabular-nums">{formatKRWFull(grand)}</span>
              </div>
              <button onClick={() => navigate('/order')}
                className="btn-pop w-full mt-6 py-3 rounded-xl inline-flex items-center justify-center gap-2 font-bold">
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
