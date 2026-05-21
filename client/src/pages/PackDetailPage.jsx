import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { formatKRW, formatKRWFull } from '@/api/cards'
import { normalizePack } from '@/api/normalize'
import api from '@/api/axios'
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
  const navigate = useNavigate()
  const add = useCartStore((s) => s.add)
  const wishlist = useWishlistStore()
  const toast = useToastStore((s) => s.push)
  const [pack, setPack] = useState(null)
  const [related, setRelated] = useState([])
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)

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

  if (loading) return <div className="p-20 text-center text-mute font-bold">불러오는 중...</div>
  if (!pack)   return <div className="p-20 text-center text-mute">카드팩을 찾을 수 없습니다.</div>

  const packId = pack.id || pack._id

  const handleAdd = () => {
    add({ ...pack, qty })
    toast({ type: 'success', title: '장바구니에 추가', message: `${pack.nameKo || pack.name} ${qty}개` })
  }

  const handleQuick = () => {
    add({ ...pack, qty, shippingOption: 'quick' })
    toast({ type: 'success', title: '⚡ 퀵 배송 선택됨', message: `${pack.nameKo || pack.name} · 당일 2-4시간 내 도착` })
    navigate('/order')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <div className="text-xs font-bold text-mute mb-6 sm:mb-8 flex items-center gap-2 overflow-x-auto whitespace-nowrap">
        <Link to="/" className="hover:text-ink shrink-0">홈</Link>
        <Icon name="arrow" size={10} strokeWidth={2} className="opacity-50 shrink-0" />
        <Link to="/packs" className="hover:text-ink shrink-0">카드팩</Link>
        <Icon name="arrow" size={10} strokeWidth={2} className="opacity-50 shrink-0" />
        <span className="text-ink truncate">{pack.nameKo || pack.name}</span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
        {/* LEFT: Pack visual */}
        <div className="surface-soft p-6 sm:p-10 flex justify-center items-center min-h-[360px] sm:min-h-[500px] relative overflow-hidden"
          style={{ background: `radial-gradient(ellipse at center, ${pack.accent || '#fbbf24'}15 0%, transparent 70%)` }}>
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
            <div className="text-xs sm:text-sm font-mono text-mute mb-2">
              {pack.setShort} · {pack.year} · {pack.cardsPerPack ? `${pack.cardsPerPack}장 / ` : ''}{pack.type === 'box' ? '박스' : '팩'}
            </div>
            <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-tight sm:leading-none">
              {pack.nameKo || pack.name}
            </h1>
            <div className="text-base sm:text-lg italic text-mute mt-2">{pack.name}</div>
          </div>

          <p className="text-sm sm:text-base text-ink/80 leading-relaxed">{pack.description}</p>

          <div className="surface-soft p-5 sm:p-6 elev-2 space-y-5">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase mb-1.5">판매가</div>
                <div className="font-display text-3xl sm:text-5xl font-bold text-ink leading-none tabular-nums">{formatKRW(pack.price)}</div>
                <div className="text-xs text-mute font-mono mt-2 truncate">{formatKRWFull(pack.price)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[10px] font-bold text-mute tracking-[0.18em] uppercase mb-1.5">재고</div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-emerald-600 tabular-nums">{pack.stock}</div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-mute">수량</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setQty(Math.max(1, qty - 1))}
                  className="w-9 h-9 rounded-lg bg-bone-2 hover:bg-line text-ink font-bold">−</button>
                <span className="font-display text-lg font-bold text-ink w-8 text-center tabular-nums">{qty}</span>
                <button onClick={() => setQty(Math.min(pack.stock || 99, qty + 1))}
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

            <button onClick={handleQuick}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-ink font-bold py-3 rounded-xl elev-2 transition-all flex items-center justify-center gap-2">
              <Icon name="bolt" size={18} strokeWidth={2.5} />
              <span>퀵 배송으로 받기</span>
              <span className="text-xs font-mono opacity-70">+₩50,000 · 당일</span>
            </button>

            <Button variant="secondary" size="sm" className="w-full" onClick={() => wishlist.toggle(packId)}>
              <Icon name="star" size={14} strokeWidth={1.8} style={{ fill: wishlist.has(packId) ? '#f5b800' : 'none' }} />
              {wishlist.has(packId) ? '관심 등록됨' : '관심 등록'}
            </Button>
          </div>

          <ShippingBanner price={pack.price} isPack={true} />

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[['shield', '미개봉 인증', 'blue'], ['trophy', '정품 보증', 'yellow'],
              ['package', '보안 운송', 'red'], ['lock', '에스크로 결제', 'green']].map(([icon, text, c]) => (
              <div key={text} className="flex items-center gap-2 px-3 py-2.5 bg-paper rounded-lg border border-line">
                <span className={`led led-${c}`} style={{ width: 6, height: 6 }} />
                <Icon name={icon} size={14} strokeWidth={1.6} className="text-ink/70" />
                <span className="text-ink font-medium">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-12 sm:mt-20">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink mb-6 sm:mb-8 tracking-tight">다른 카드팩</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {related.map((p) => <PackTile key={p.id || p._id} pack={p} />)}
          </div>
        </div>
      )}
    </div>
  )
}
