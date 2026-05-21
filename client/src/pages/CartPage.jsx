import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import { formatKRWFull } from '@/api/cards'
import PokeCard from '@/components/common/PokeCard'
import GradeBadge from '@/components/common/GradeBadge'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'

export default function CartPage() {
  const { items, remove, updateQty, total, fetchCart, loading } = useCartStore()
  const navigate = useNavigate()

  useEffect(() => { fetchCart() }, [])

  const shipping = items.length ? 30000 : 0
  const insurance = Math.floor(total() * 0.005)
  const grand = total() + shipping + insurance

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-6 sm:mb-10">
        <div className="pixel-label text-mute mb-3">Cart</div>
        <h1 className="font-display text-2xl sm:text-4xl font-bold text-ink tracking-tight">장바구니</h1>
      </div>

      {loading ? (
        <div className="text-center py-24 text-mute font-bold">불러오는 중...</div>
      ) : items.length === 0 ? (
        <div className="surface-soft px-6 py-12 sm:p-20 text-center">
          <Icon name="cart" size={48} strokeWidth={1.2} className="text-mute mx-auto mb-5" />
          <p className="font-display text-xl sm:text-2xl font-bold text-ink mb-2">장바구니가 비어있습니다</p>
          <p className="text-sm text-mute mb-6">카탈로그에서 카드를 담아보세요.</p>
          <Link to="/products"><Button variant="primary" size="lg">카탈로그 둘러보기 <Icon name="arrow" size={14} strokeWidth={2.2} /></Button></Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((c) => {
              const productId = c.id || c._id
              const price = c.priceSnapshot || c.price || c.currentBid || 0
              return (
                <div key={productId} className="surface-soft p-4 sm:p-5 flex gap-3 sm:gap-5 items-start">
                  <PokeCard card={c} size="sm" interactive={false} showShine={false} />
                  <div className="flex-1 min-w-0">
                    <Link to={`/products/${productId}`} className="block hover:text-dex transition-colors">
                      <div className="font-display text-lg sm:text-2xl font-bold text-ink truncate">{c.nameKo || c.name}</div>
                      <div className="text-xs sm:text-sm text-mute italic truncate">{c.name}</div>
                    </Link>
                    <div className="text-[11px] sm:text-xs text-mute font-mono mt-2 truncate">
                      {c.set || c.setShort} · {c.year} · #{c.number}
                    </div>
                    <div className="mt-3 flex items-center gap-3 sm:gap-4 flex-wrap">
                      <GradeBadge grade={c.grade} size="sm" />
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQty(productId, Math.max(1, (c.qty || 1) - 1))}
                          className="w-7 h-7 rounded-md bg-bone-2 hover:bg-line text-ink font-bold text-sm">−</button>
                        <span className="font-mono font-bold text-sm w-6 text-center">{c.qty || 1}</span>
                        <button onClick={() => updateQty(productId, (c.qty || 1) + 1)}
                          className="w-7 h-7 rounded-md bg-bone-2 hover:bg-line text-ink font-bold text-sm">+</button>
                      </div>
                    </div>
                    {c.shippingOption === 'quick' && (
                      <div className="mt-2 text-[10px] text-amber-700 font-bold flex items-center gap-1">
                        <Icon name="bolt" size={10} strokeWidth={2.5} /> 퀵 배송 +₩50,000
                      </div>
                    )}
                    {/* Mobile-only price/remove row */}
                    <div className="sm:hidden mt-3 flex items-center justify-between border-t border-line pt-3">
                      <div>
                        <div className="font-display text-lg font-bold text-ink tabular-nums">
                          {formatKRWFull(price * (c.qty || 1))}
                        </div>
                        <div className="text-[10px] text-mute">{formatKRWFull(price)} × {c.qty || 1}</div>
                      </div>
                      <button onClick={() => remove(productId)}
                        className="text-xs font-bold text-mute hover:text-dex inline-flex items-center gap-1">
                        <Icon name="close" size={12} strokeWidth={2.2} /> 제거
                      </button>
                    </div>
                  </div>
                  {/* Desktop price/remove column */}
                  <div className="hidden sm:block text-right">
                    <div className="font-display text-2xl font-bold text-ink tabular-nums">
                      {formatKRWFull(price * (c.qty || 1))}
                    </div>
                    <div className="text-xs text-mute mt-1">{formatKRWFull(price)} × {c.qty || 1}</div>
                    <button onClick={() => remove(productId)}
                      className="text-xs font-bold text-mute hover:text-dex mt-3 inline-flex items-center gap-1">
                      <Icon name="close" size={12} strokeWidth={2.2} /> 제거
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <aside>
            <div className="surface-soft p-5 sm:p-6 elev-2 lg:sticky lg:top-32">
              <div className="pixel-label text-mute mb-5">Summary</div>
              <Row label="상품 합계" value={formatKRWFull(total())} />
              <Row label="배송 (FedEx)" value={formatKRWFull(shipping)} />
              <Row label="보험료 (0.5%)" value={formatKRWFull(insurance)} />
              <div className="my-4 border-t border-line" />
              <div className="flex justify-between items-baseline">
                <span className="text-mute font-bold text-sm">총 결제</span>
                <span className="font-display text-3xl font-bold text-ink tabular-nums">{formatKRWFull(grand)}</span>
              </div>
              <Button variant="accent" size="lg" className="w-full mt-6" onClick={() => navigate('/order')}>
                결제하러 가기 <Icon name="arrow" size={14} strokeWidth={2.2} />
              </Button>
              <div className="text-[10px] text-mute mt-4 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="led led-green" style={{ width: 5, height: 5 }} />
                  100만원 이상 자동 에스크로
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="led led-green" style={{ width: 5, height: 5 }} />
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
      <span className="text-mute">{label}</span>
      <span className="font-mono font-bold text-ink tabular-nums">{value}</span>
    </div>
  )
}
