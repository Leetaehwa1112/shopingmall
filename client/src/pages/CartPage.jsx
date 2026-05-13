import { Link, useNavigate } from 'react-router-dom'
import useCartStore from '@/store/cartStore'
import { formatKRWFull } from '@/api/cards'
import PokeCard from '@/components/common/PokeCard'
import GradeBadge from '@/components/common/GradeBadge'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'

export default function CartPage() {
  const { items, remove, total } = useCartStore()
  const navigate = useNavigate()
  const shipping = items.length ? 30000 : 0
  const insurance = Math.floor(total() * 0.005)
  const grand = total() + shipping + insurance

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="mb-10">
        <div className="pixel-label text-mute mb-3">Cart</div>
        <h1 className="font-display text-4xl font-bold text-ink tracking-tight">장바구니</h1>
      </div>

      {items.length === 0 ? (
        <div className="surface-soft p-20 text-center">
          <Icon name="cart" size={48} strokeWidth={1.2} className="text-mute mx-auto mb-5" />
          <p className="font-display text-2xl font-bold text-ink mb-2">장바구니가 비어있습니다</p>
          <p className="text-sm text-mute mb-6">카탈로그에서 카드를 담아보세요.</p>
          <Link to="/products"><Button variant="primary" size="lg">카탈로그 둘러보기 <Icon name="arrow" size={14} strokeWidth={2.2} /></Button></Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            {items.map((c) => (
              <div key={c.id} className="surface-soft p-5 flex gap-5 items-start">
                <PokeCard card={c} size="sm" interactive={false} showShine={false} />
                <div className="flex-1 min-w-0">
                  <Link to={`/products/${c.id}`} className="block hover:text-dex transition-colors">
                    <div className="font-display text-2xl font-bold text-ink">{c.nameKo}</div>
                    <div className="text-sm text-mute italic">{c.name}</div>
                  </Link>
                  <div className="text-xs text-mute font-mono mt-2">
                    {c.set} · {c.year} · #{c.number}
                  </div>
                  <div className="mt-3"><GradeBadge grade={c.grade} size="sm" /></div>
                </div>
                <div className="text-right">
                  <div className="font-display text-2xl font-bold text-ink tabular-nums">
                    {formatKRWFull(c.price || c.currentBid)}
                  </div>
                  <button onClick={() => remove(c.id)}
                    className="text-xs font-bold text-mute hover:text-dex mt-3 inline-flex items-center gap-1">
                    <Icon name="close" size={12} strokeWidth={2.2} /> 제거
                  </button>
                </div>
              </div>
            ))}
          </div>

          <aside>
            <div className="surface-soft p-6 elev-2 sticky top-32">
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
