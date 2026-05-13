import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getPack, formatKRW, formatKRWFull, PACKS } from '@/api/cards'
import PackVisual from '@/components/common/PackVisual'
import PackTile from '@/components/common/PackTile'
import ShippingBanner from '@/components/common/ShippingBanner'
import Button from '@/components/common/Button'
import Icon from '@/components/common/Icon'
import useCartStore from '@/store/cartStore'
import useWishlistStore from '@/store/wishlistStore'
import useToastStore from '@/store/toastStore'

export default function PackDetailPage() {
  const { id } = useParams()
  const pack = getPack(id)
  const navigate = useNavigate()
  const add = useCartStore((s) => s.add)
  const wishlist = useWishlistStore()
  const toast = useToastStore((s) => s.push)
  const [qty, setQty] = useState(1)

  if (!pack) return <div className="p-20 text-center text-mute">카드팩을 찾을 수 없습니다.</div>

  const related = PACKS.filter((p) => p.id !== pack.id).slice(0, 4)

  const handleAdd = () => {
    add({ ...pack, qty })
    toast({ type: 'success', title: '장바구니에 추가', message: `${pack.nameKo} ${qty}개` })
  }

  const handleQuick = () => {
    add({ ...pack, qty, shippingOption: 'quick' })
    toast({ type: 'success', title: '⚡ 퀵 배송 선택됨', message: `${pack.nameKo} · 당일 2-4시간 내 도착` })
    navigate('/order')
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <div className="text-xs font-bold text-mute mb-8 flex items-center gap-2">
        <Link to="/" className="hover:text-ink">홈</Link>
        <Icon name="arrow" size={10} strokeWidth={2} className="opacity-50" />
        <Link to="/packs" className="hover:text-ink">카드팩</Link>
        <Icon name="arrow" size={10} strokeWidth={2} className="opacity-50" />
        <span className="text-ink">{pack.nameKo}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        {/* LEFT: Pack visual */}
        <div className="surface-soft p-10 flex justify-center items-center min-h-[500px] relative overflow-hidden"
          style={{ background: `radial-gradient(ellipse at center, ${pack.accent}15 0%, transparent 70%)` }}>
          <PackVisual pack={pack} size="lg" />
        </div>

        {/* RIGHT: Info */}
        <div className="space-y-6">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full mb-3">
              <span className="led led-yellow" style={{ width: 7, height: 7 }} />
              <span className="pixel-label text-amber-700">
                {pack.type === 'box' ? 'SEALED BOX' : 'SEALED PACK'}
              </span>
            </span>
            <div className="text-sm font-mono text-mute mb-2">
              {pack.setShort} · {pack.year} · {pack.cardsPerPack}장 / {pack.type === 'box' ? '박스' : '팩'}
            </div>
            <h1 className="font-display text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-none">
              {pack.nameKo}
            </h1>
            <div className="text-lg italic text-mute mt-2">{pack.name}</div>
          </div>

          <p className="text-ink/80 leading-relaxed">{pack.description}</p>

          {/* Buy panel */}
          <div className="surface-soft p-6 elev-2 space-y-5">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase mb-1.5">판매가</div>
                <div className="font-display text-5xl font-bold text-ink leading-none tabular-nums">{formatKRW(pack.price)}</div>
                <div className="text-xs text-mute font-mono mt-2">{formatKRWFull(pack.price)}</div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase mb-1.5">재고</div>
                <div className="font-display text-3xl font-bold text-emerald-600 tabular-nums">{pack.stock}</div>
              </div>
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-mute">수량</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-9 h-9 rounded-lg bg-bone-2 hover:bg-line text-ink font-bold">−</button>
                <span className="font-display text-lg font-bold text-ink w-8 text-center tabular-nums">{qty}</span>
                <button onClick={() => setQty(Math.min(pack.stock, qty + 1))}
                  className="w-9 h-9 rounded-lg bg-bone-2 hover:bg-line text-ink font-bold">+</button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="primary" size="lg" className="flex-1" onClick={handleAdd}>
                <Icon name="cart" size={16} strokeWidth={1.8} /> 장바구니
              </Button>
              <Button variant="accent" size="lg" onClick={() => { add({ ...pack, qty }); navigate('/order') }}>
                바로 구매
              </Button>
            </div>

            {/* Quick delivery button */}
            <button
              onClick={handleQuick}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-ink font-bold py-3 rounded-xl elev-2 transition-all flex items-center justify-center gap-2"
            >
              <Icon name="bolt" size={18} strokeWidth={2.5} />
              <span>퀵 배송으로 받기</span>
              <span className="text-xs font-mono opacity-70">+₩50,000 · 당일</span>
            </button>

            <Button variant="secondary" size="sm" className="w-full" onClick={() => wishlist.toggle(pack.id)}>
              <Icon name="star" size={14} strokeWidth={1.8} style={{ fill: wishlist.has(pack.id) ? '#f5b800' : 'none' }} />
              {wishlist.has(pack.id) ? '관심 등록됨' : '관심 등록'}
            </Button>
          </div>

          {/* Shipping info banner */}
          <ShippingBanner price={pack.price} isPack={true} />

          {/* Trust */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ['shield', '미개봉 인증', 'blue'],
              ['trophy', '정품 보증', 'yellow'],
              ['package', '보안 운송', 'red'],
              ['lock', '에스크로 결제', 'green'],
            ].map(([icon, text, c]) => (
              <div key={text} className="flex items-center gap-2 px-3 py-2.5 bg-paper rounded-lg border border-line">
                <span className={`led led-${c}`} style={{ width: 6, height: 6 }} />
                <Icon name={icon} size={14} strokeWidth={1.6} className="text-ink/70" />
                <span className="text-ink font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mt-20">
          <h2 className="font-display text-3xl font-bold text-ink mb-8 tracking-tight">다른 카드팩</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {related.map((p) => <PackTile key={p.id} pack={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}
