import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { ALL_CARDS, AUCTION_CARDS, BUYNOW_CARDS, CATEGORIES } from '@/api/cards'
import CardTile from '@/components/common/CardTile'

export default function ProductsPage() {
  const loc = useLocation()
  const isAuctionOnly = loc.pathname === '/auctions'
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('default')

  const source = isAuctionOnly ? AUCTION_CARDS : ALL_CARDS
  const list = useMemo(() => {
    let arr = cat === 'all' ? source : source.filter((c) => c.category === cat)
    if (sort === 'price-asc')  arr = [...arr].sort((a, b) => (a.price || a.currentBid) - (b.price || b.currentBid))
    if (sort === 'price-desc') arr = [...arr].sort((a, b) => (b.price || b.currentBid) - (a.price || a.currentBid))
    if (sort === 'ending')     arr = [...arr].sort((a, b) => (a.endsAt || Infinity) - (b.endsAt || Infinity))
    return arr
  }, [cat, sort, source])

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <div className={`inline-flex items-center gap-2 mb-3 ${isAuctionOnly ? 'text-dex' : 'text-blue'}`}>
          <span className={`led led-${isAuctionOnly ? 'red led-pulse' : 'blue'}`} style={{ width: 7, height: 7 }} />
          <span className="pixel-label">{isAuctionOnly ? 'Live Auction' : 'Marketplace'}</span>
        </div>
        <h1 className="font-display text-4xl lg:text-5xl font-bold text-ink tracking-tight">
          {isAuctionOnly ? '진행중인 경매' : '카드 카탈로그'}
        </h1>
        <p className="text-sm text-mute mt-3 max-w-2xl leading-relaxed">
          {isAuctionOnly
            ? `초희귀 카드 ${AUCTION_CARDS.length}건이 경매중. 본인 인증 후 입찰 가능합니다.`
            : `옥션 ${AUCTION_CARDS.length}건 + 즉시구매 ${BUYNOW_CARDS.length}건, 모든 카드 정품 인증.`}
        </p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 mb-10 border-b border-line">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)}
              className={`px-4 py-2 text-sm font-bold rounded-full border transition-all ${
                cat === c.id
                  ? 'bg-ink text-paper border-ink elev-1'
                  : 'bg-paper border-line text-ink hover:border-ink/40'
              }`}>
              {c.label}
              <span className="ml-1.5 opacity-60 text-xs font-mono">
                {c.id === 'all' ? source.length : source.filter((s) => s.category === c.id).length}
              </span>
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)}
          className="bg-paper border border-line rounded-full px-4 py-2 text-sm font-bold text-ink">
          <option value="default">추천순</option>
          <option value="price-asc">가격 낮은순</option>
          <option value="price-desc">가격 높은순</option>
          {isAuctionOnly && <option value="ending">마감 임박순</option>}
        </select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {list.map((c, i) => (
          <div key={c.id} className="reveal-up" style={{ animationDelay: `${i * 0.04}s` }}>
            <CardTile card={c} />
          </div>
        ))}
      </div>

      {list.length === 0 && (
        <div className="text-center py-24 text-mute font-bold">해당 조건의 카드가 없습니다.</div>
      )}
    </div>
  )
}
