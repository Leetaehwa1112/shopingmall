import { useMemo, useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CATEGORIES } from '@/api/cards'
import { normalizeProduct } from '@/api/normalize'
import api from '@/api/axios'
import CardTile from '@/components/common/CardTile'
import Icon from '@/components/common/Icon'

const PAGE_SIZE = 8

export default function ProductsPage() {
  const loc = useLocation()
  const navigate = useNavigate()
  const isAuctionOnly = loc.pathname === '/auctions'
  const queryParam = new URLSearchParams(loc.search).get('q')?.trim() || ''
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('default')
  const [query, setQuery] = useState(queryParam)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  // URL의 q 쿼리가 바뀌면 동기화
  useEffect(() => { setQuery(queryParam) }, [queryParam])

  useEffect(() => {
    setLoading(true)
    const params = { status: 'active', limit: 100 }
    if (isAuctionOnly) params.sale_type = 'auction'
    api.get('/products', { params })
      .then(({ data }) => setProducts(data.data.map(normalizeProduct)))
      .finally(() => setLoading(false))
  }, [isAuctionOnly])

  // 카테고리/정렬/검색 변경시 페이지 리셋
  useEffect(() => { setPage(1) }, [cat, sort, query])

  const auctionCount = products.filter((c) => c.sale_type === 'auction').length
  const buynowCount  = products.filter((c) => c.sale_type === 'buynow').length

  const filtered = useMemo(() => {
    let arr = cat === 'all' ? products : products.filter((c) => c.category === cat)
    if (query) {
      const q = query.toLowerCase()
      arr = arr.filter((c) =>
        [c.name, c.nameKo, c.set, c.setShort, c.number, c.grade?.cert]
          .filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
      )
    }
    if (sort === 'price-asc')  arr = [...arr].sort((a, b) => (a.price || a.currentBid || 0) - (b.price || b.currentBid || 0))
    if (sort === 'price-desc') arr = [...arr].sort((a, b) => (b.price || b.currentBid || 0) - (a.price || a.currentBid || 0))
    if (sort === 'ending')     arr = [...arr].sort((a, b) => (a.endsAt || Infinity) - (b.endsAt || Infinity))
    return arr
  }, [cat, sort, query, products])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const list = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-6 sm:mb-10">
        <div className={`inline-flex items-center gap-2 mb-3 ${isAuctionOnly ? 'text-dex' : 'text-blue'}`}>
          <span className={`led led-${isAuctionOnly ? 'red led-pulse' : 'blue'}`} style={{ width: 7, height: 7 }} />
          <span className="pixel-label">{isAuctionOnly ? 'Live Auction' : 'Marketplace'}</span>
        </div>
        <h1 className="font-display text-2xl sm:text-4xl lg:text-5xl font-bold text-ink tracking-tight">
          {isAuctionOnly ? '진행중인 경매' : '카드 카탈로그'}
        </h1>
        <p className="text-sm text-mute mt-3 max-w-2xl leading-relaxed">
          {isAuctionOnly
            ? `초희귀 카드 ${auctionCount}건이 경매중. 본인 인증 후 입찰 가능합니다.`
            : `옥션 ${auctionCount}건 + 즉시구매 ${buynowCount}건, 모든 카드 정품 인증.`}
        </p>

        {/* 검색 결과 표시 */}
        {query && (
          <div className="mt-5 inline-flex items-center gap-3 bg-bone-2 border border-line rounded-full pl-4 pr-2 py-1.5 text-sm">
            <Icon name="search" size={14} strokeWidth={2} className="text-mute" />
            <span className="text-mute">검색어</span>
            <span className="font-bold text-ink">"{query}"</span>
            <span className="text-mute font-mono text-xs">· {filtered.length}건</span>
            <button
              type="button"
              onClick={() => { setQuery(''); navigate(loc.pathname, { replace: true }) }}
              className="ml-1 w-6 h-6 rounded-full bg-paper hover:bg-line text-ink flex items-center justify-center"
              aria-label="검색 초기화"
            >
              <Icon name="close" size={12} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 sm:pb-6 mb-6 sm:mb-10 border-b border-line">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const count = c.id === 'all' ? products.length : products.filter((s) => s.category === c.id).length
            const active = cat === c.id
            return (
              <button key={c.id} onClick={() => setCat(c.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full border transition-all ${
                  active
                    ? 'bg-ink text-paper border-ink elev-1'
                    : 'bg-paper border-line text-ink hover:border-ink/40'
                }`}>
                <span>{c.label}</span>
                <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-paper/15 text-paper' : 'bg-bone-2 text-mute'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)}
          className="bg-paper border border-line rounded-full px-4 py-2 text-sm font-bold text-ink">
          <option value="default">추천순</option>
          <option value="price-asc">가격 낮은순</option>
          <option value="price-desc">가격 높은순</option>
          {isAuctionOnly && <option value="ending">마감 임박순</option>}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-24 text-mute font-bold">불러오는 중...</div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {list.map((c, i) => (
            <div key={c.id} className="reveal-up" style={{ animationDelay: `${i * 0.04}s` }}>
              <CardTile card={c} />
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-24 text-mute font-bold">해당 조건의 카드가 없습니다.</div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-9 h-9 rounded-lg border border-line font-bold text-ink bg-paper hover:bg-bone-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            ‹
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`w-9 h-9 rounded-lg border font-bold text-sm transition-all ${
                n === page
                  ? 'bg-ink text-paper border-ink elev-1'
                  : 'bg-paper border-line text-ink hover:bg-bone-2'
              }`}>
              {n}
            </button>
          ))}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-9 h-9 rounded-lg border border-line font-bold text-ink bg-paper hover:bg-bone-2 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
            ›
          </button>

          <span className="ml-3 text-xs text-mute font-mono">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}건
          </span>
        </div>
      )}
    </div>
  )
}
