import { useMemo, useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CATEGORIES } from '@/api/cards'
import { normalizeProduct } from '@/api/normalize'
import api from '@/api/axios'
import CardTile from '@/components/common/CardTile'
import Icon from '@/components/common/Icon'
import Sparkles from '@/components/common/Sparkles'
import Eyebrow from '@/components/common/Eyebrow'
import useToastStore from '@/store/toastStore'
import { formatKRW, formatKRWFull, timeUntil } from '@/utils/format'

const PAGE_SIZE = 8

export default function ProductsPage() {
  const loc = useLocation()
  const navigate = useNavigate()
  const isAuctionOnly = loc.pathname === '/auctions'
  const queryParam = new URLSearchParams(loc.search).get('q')?.trim() || ''
  const [cat, setCat] = useState('all')
  const [sort, setSort] = useState('default')
  const [query, setQuery] = useState(queryParam)
  const [page, setPage] = useState(1)
  const toast = useToastStore((s) => s.push)

  useEffect(() => { setQuery(queryParam) }, [queryParam])

  // React Query로 캐시 — /products(auction|all)는 staleTime(5분) 동안 재요청 X
  const { data: products = [], isLoading: loading, isError: error } = useQuery({
    queryKey: ['products', isAuctionOnly ? 'auction' : 'all'],
    queryFn: () => {
      const params = { status: 'active', limit: 100 }
      if (isAuctionOnly) params.sale_type = 'auction'
      return api.get('/products', { params }).then((r) => r.data.data.map(normalizeProduct))
    },
  })

  useEffect(() => {
    if (error) toast?.({ type: 'error', message: '상품 목록을 불러오지 못했어요.' })
  }, [error, toast])

  useEffect(() => { setPage(1) }, [cat, sort, query])

  const auctionList = useMemo(() => products.filter((c) => c.sale_type === 'auction'), [products])

  // ─── 경매 페이지: 라이브 시청만 노출. 전체 LOT은 모달로 ──────
  if (isAuctionOnly) {
    return <AuctionLivePage lots={auctionList} loading={loading} />
  }

  // ─── 일반 마켓 페이지 (즉시구매 + 경매 카드 카탈로그) ───────
  return (
    <MarketPage
      products={products}
      loading={loading}
      cat={cat} setCat={setCat}
      sort={sort} setSort={setSort}
      query={query} setQuery={setQuery}
      page={page} setPage={setPage}
      loc={loc} navigate={navigate}
    />
  )
}

// ═══════════════════════════════════════════════════════════════
// 일반 마켓 페이지 — 기존 카탈로그 그리드 유지
// ═══════════════════════════════════════════════════════════════
function MarketPage({
  products, loading, cat, setCat, sort, setSort, query, setQuery, page, setPage, loc, navigate,
}) {
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
    return arr
  }, [cat, sort, query, products])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const list = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="relative sparkle-host mb-10">
        <Sparkles always />
        <Eyebrow tone="water" led="blue">MARKETPLACE · 정품 인증</Eyebrow>
        <h1 className="mt-4 font-display text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-[1.1]">
          오늘의 카드 카탈로그
        </h1>
        <p className="text-sm text-mute mt-4 max-w-2xl leading-relaxed font-medium">
          옥션 {auctionCount}건 + 즉시구매 {buynowCount}건. 모두 정품 인증 완료, 클릭 한 번이면 데려갈 수 있어요.
        </p>

        {query && (
          <div className="mt-6 inline-flex items-center gap-3 bg-paper border-2 border-ink rounded-full pl-4 pr-2 py-1.5 text-sm shadow-[0_3px_0_#1a1a1a]">
            <Icon name="search" size={14} strokeWidth={2.4} className="text-ink" />
            <span className="text-mute font-bold">검색어</span>
            <span className="font-bold text-ink">"{query}"</span>
            <span className="text-dex font-mono text-xs font-bold">· {filtered.length}건 발견!</span>
            <button
              type="button"
              onClick={() => { setQuery(''); navigate(loc.pathname, { replace: true }) }}
              className="ml-1 w-6 h-6 rounded-full bg-bone-2 hover:bg-electric text-ink flex items-center justify-center border-2 border-ink transition-colors"
              aria-label="검색 초기화"
            >
              <Icon name="close" size={11} strokeWidth={2.8} />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 mb-10 border-b-2 border-ink/15">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const count = c.id === 'all' ? products.length : products.filter((s) => s.category === c.id).length
            const active = cat === c.id
            return (
              <button key={c.id} onClick={() => setCat(c.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full border-2 transition-all ${
                  active
                    ? 'bg-ink text-electric border-ink shadow-[0_3px_0_#1a1a1a] -translate-y-0.5'
                    : 'bg-paper border-ink/20 text-ink hover:border-ink hover:-translate-y-0.5 hover:shadow-[0_3px_0_#1a1a1a]'
                }`}>
                <span>{c.label}</span>
                <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                  active ? 'bg-electric/20 text-electric' : 'bg-bone-2 text-mute'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)}
          className="bg-paper border-2 border-ink rounded-full px-4 py-2 text-sm font-bold text-ink shadow-[0_3px_0_#1a1a1a] cursor-pointer hover:bg-electric/20 transition-colors">
          <option value="default">추천순</option>
          <option value="price-asc">가격 낮은순</option>
          <option value="price-desc">가격 높은순</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-24">
          <div className="inline-flex items-center gap-3 text-mute font-bold">
            <span className="led led-yellow led-pulse" style={{ width: 8, height: 8 }} />
            카드를 꺼내는 중...
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {list.map((c, i) => (
            <div key={c.id} className="reveal-up" style={{ animationDelay: `${i * 0.04}s` }}>
              <CardTile card={c} />
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-24 relative sparkle-host">
          <Sparkles always />
          <div className="inline-flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-electric/30 border-2 border-ink flex items-center justify-center shadow-[0_4px_0_#1a1a1a]">
              <Icon name="search" size={28} strokeWidth={2.2} className="text-ink" />
            </div>
            <div className="font-display text-xl font-bold text-ink">아직 이 조건에 맞는 카드가 없어요</div>
            <div className="text-sm text-mute font-medium">필터를 풀거나 다른 검색어로 찾아보세요.</div>
          </div>
        </div>
      )}

      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12 flex-wrap">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-10 h-10 rounded-lg border-2 border-ink font-bold text-ink bg-paper hover:bg-electric/20 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_3px_0_#1a1a1a] hover:-translate-y-0.5 disabled:hover:translate-y-0 transition-all">
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`w-10 h-10 rounded-lg border-2 font-bold text-sm transition-all shadow-[0_3px_0_#1a1a1a] hover:-translate-y-0.5 ${
                n === page
                  ? 'bg-ink text-electric border-ink -translate-y-0.5'
                  : 'bg-paper border-ink text-ink hover:bg-electric/20'
              }`}>
              {n}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-10 h-10 rounded-lg border-2 border-ink font-bold text-ink bg-paper hover:bg-electric/20 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_3px_0_#1a1a1a] hover:-translate-y-0.5 disabled:hover:translate-y-0 transition-all">
            ›
          </button>
          <span className="ml-3 text-xs text-mute font-mono font-bold">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} / {filtered.length}건
          </span>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 경매 라이브 페이지 — 포켓몬센터 무드 (크림 + 페이퍼 + 레드 트림)
// ═══════════════════════════════════════════════════════════════
//
// 디자인 톤:
//   - 사이트 전반의 '두꺼운 잉크 보더 + 크림 페이지 + 노란 셰도우 카드'
//     형식을 그대로 가져와 옥션장의 'gold/velvet' 무드를 버림.
//   - 포켓몬센터 카운터처럼 위쪽에 빨간 (fire #ff7a45) 띠가 있는 흰
//     페이퍼 카드로 무대를 구성.
//   - 포켓볼 모티브 (상단 빨강 + 하단 흰색 + 가운데 잉크 라인) 를
//     섹션 헤더에 차용.
function AuctionLivePage({ lots, loading }) {
  const [showAll, setShowAll] = useState(false)
  const [featuredId, setFeaturedId] = useState(null)

  // 마감 임박 LOT부터 정렬 — 단상에 올라가는 LOT 선정 기준
  const sorted = useMemo(() => {
    return [...lots].sort((a, b) => (a.endsAt || Infinity) - (b.endsAt || Infinity))
  }, [lots])

  const featured = useMemo(() => {
    if (featuredId) return sorted.find((c) => c.id === featuredId) || sorted[0]
    return sorted[0]
  }, [sorted, featuredId])

  return (
    <div className="max-w-7xl mx-auto px-6 py-10">
      <PokeCenterHero
        liveCount={sorted.length}
        onOpenAll={() => setShowAll(true)}
        lots={sorted}
      />

      {loading ? (
        <div className="mt-10 text-center py-24 text-mute font-bold">
          <span className="inline-flex items-center gap-2">
            <span className="led led-red led-pulse" style={{ width: 8, height: 8 }} />
            방송 준비 중…
          </span>
        </div>
      ) : !featured ? (
        <div className="mt-10 text-center py-24">
          <div className="inline-flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-fire/20 border-2 border-ink flex items-center justify-center shadow-[0_4px_0_#1a1a1a]">
              <Icon name="broadcast" size={28} strokeWidth={2.2} className="text-fire" />
            </div>
            <div className="font-display text-xl font-bold text-ink">아직 방송 중인 LOT이 없어요</div>
            <div className="text-sm text-mute font-medium">곧 새로운 카드가 단상 위에 올라와요.</div>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid lg:grid-cols-[1fr_320px] gap-5">
          <FeaturedLot lot={featured} />
          <LiveSidebar
            featured={featured}
            upcoming={sorted.filter((c) => c.id !== featured.id).slice(0, 5)}
            onPickLot={setFeaturedId}
            onOpenAll={() => setShowAll(true)}
          />
        </div>
      )}

      {showAll && (
        <AllLotsModal
          lots={sorted}
          featuredId={featured?.id}
          onClose={() => setShowAll(false)}
          onPickLot={(id) => { setFeaturedId(id); setShowAll(false) }}
        />
      )}

      <style>{`
        @keyframes pulse-live {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes scan-soft {
          0% { transform: translateY(-120%); }
          100% { transform: translateY(120%); }
        }
        @keyframes bid-pop {
          0% { transform: translateY(6px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes modal-in {
          from { transform: translateY(12px) scale(0.98); opacity: 0; }
          to   { transform: translateY(0) scale(1);     opacity: 1; }
        }
      `}</style>
    </div>
  )
}

// ── 포켓몬센터 카운터 Hero ───────────────────────────────────
function PokeCenterHero({ liveCount, onOpenAll, lots }) {
  const stats = useMemo(() => {
    const totalBids = lots.reduce((s, c) => s + (c.bidCount || 0), 0)
    const topBid = lots.reduce((m, c) => Math.max(m, c.currentBid || 0), 0)
    const now = Date.now()
    const endingSoon = lots.filter((c) => c.endsAt && c.endsAt - now < 1000 * 60 * 60).length
    return { totalBids, topBid, endingSoon }
  }, [lots])

  return (
    <section
      className="relative overflow-hidden rounded-2xl border-2 border-ink bg-paper shadow-[0_4px_0_#1a1a1a]"
      aria-label="라이브 경매장"
    >
      {/* === 빨간 카운터 띠 — 포켓센터 입구 사인 === */}
      <div className="relative px-5 sm:px-7 py-4 bg-fire">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {/* 포켓볼 메달 — 상단 빨강 + 하단 흰 + 중앙 잉크 라인 */}
            <span
              className="relative inline-flex w-12 h-12 rounded-full border-2 border-ink shadow-[0_3px_0_rgba(0,0,0,0.35)] shrink-0"
              style={{
                background:
                  'linear-gradient(180deg, #ff7a45 0%, #ff7a45 47%, #0d1730 47%, #0d1730 53%, #fff 53%, #fff 100%)',
              }}
              aria-hidden="true"
            >
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-paper border-2 border-ink" />
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-fire"
                style={{ animation: 'pulse-live 1.4s ease-in-out infinite' }} />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.2em] bg-paper text-fire border-2 border-ink">
                  <span className="w-1.5 h-1.5 rounded-full bg-fire"
                    style={{ animation: 'pulse-live 1.2s ease-in-out infinite' }} />
                  ON AIR
                </span>
                <span className="font-mono text-[10px] font-extrabold tracking-[0.2em] uppercase text-paper/90">
                  POKÉVAULT · AUCTION CENTER
                </span>
              </div>
              <h1 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-paper tracking-tight leading-tight">
                두근두근 라이브 경매장
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={onOpenAll}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-paper border-2 border-ink shadow-[0_3px_0_#1a1a1a] hover:-translate-y-0.5 hover:bg-electric/20 transition-all font-extrabold text-ink text-sm"
          >
            <Icon name="layers" size={14} strokeWidth={2.4} />
            전체 LOT 보기
            <span className="ml-1 inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1.5 rounded-full bg-fire text-paper font-mono text-[10.5px] font-bold tabular-nums">
              {liveCount}
            </span>
          </button>
        </div>
      </div>

      {/* 상단/하단 분리 라인 (포켓볼 적도) — 흰 카드 위쪽 */}
      <div className="h-1 bg-ink" aria-hidden="true" />

      {/* === 페이퍼 카운터 본체 — 친근한 멘트 + 4칸 통계 === */}
      <div className="px-5 sm:px-7 py-5 sm:py-6 bg-paper">
        <p className="text-sm text-mute leading-relaxed font-medium max-w-2xl">
          어서오세요! 지금 단상 위엔 <b className="text-ink">{liveCount}장</b>의 카드가 새 주인을 기다리고 있어요.
          마감이 임박한 LOT부터 차례대로 무대에 올라옵니다.
        </p>

        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <StatTile label="라이브 LOTS" value={String(liveCount).padStart(3, '0')} suffix="건" tone="fire" />
          <StatTile label="누적 입찰" value={String(stats.totalBids).padStart(4, '0')} suffix="회" tone="grass" />
          <StatTile label="마감 임박" value={String(stats.endingSoon).padStart(2, '0')} suffix="< 1H" tone="rose" alert={stats.endingSoon > 0} />
          <StatTile label="최고 입찰가" value={formatKRW(stats.topBid)} suffix="KRW" tone="water" mono />
        </div>
      </div>
    </section>
  )
}

function StatTile({ label, value, suffix, tone = 'fire', alert, mono }) {
  // tone → 컬러 매핑: 사이트 토큰을 그대로 활용
  const toneMap = {
    fire:  { bg: 'bg-fire/10',  bd: 'border-fire/40',  text: 'text-fire',  led: '#ff7a45' },
    grass: { bg: 'bg-grass/10', bd: 'border-grass/40', text: 'text-grass', led: '#7bc043' },
    rose:  { bg: 'bg-rose/10',  bd: 'border-rose/40',  text: 'text-rose',  led: '#fb7185' },
    water: { bg: 'bg-water/10', bd: 'border-water/40', text: 'text-water', led: '#3ba7e8' },
  }
  const c = toneMap[tone] || toneMap.fire
  return (
    <div className={`relative overflow-hidden rounded-xl border-2 ${c.bg} ${c.bd} px-3 py-2.5`}>
      <div className="flex items-center justify-between gap-1.5">
        <span className="font-mono text-[9px] font-extrabold tracking-[0.2em] uppercase text-mute">
          {label}
        </span>
        {alert && (
          <span className="w-1.5 h-1.5 rounded-full"
            style={{ background: c.led, boxShadow: `0 0 6px ${c.led}`, animation: 'pulse-live 1s ease-in-out infinite' }} />
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={`${mono ? 'font-mono tabular-nums' : 'font-display'} font-extrabold leading-none ${c.text}`}
          style={{ fontSize: 22 }}
        >
          {value}
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-mute">
          {suffix}
        </span>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 메인 무대 (Featured LOT) — 페이퍼 + 빨간 헤더
// ═══════════════════════════════════════════════════════════════
function FeaturedLot({ lot }) {
  const navigate = useNavigate()
  const [, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const t = lot.endsAt ? timeUntil(lot.endsAt) : null

  // 가짜 시청자 카운트 — 라이브 분위기 (실제 소켓 없이도)
  const seedViewers = useMemo(
    () => 80 + ((lot.id?.charCodeAt?.(0) || 7) * 13) % 240,
    [lot.id]
  )
  const [viewers, setViewers] = useState(seedViewers)
  useEffect(() => {
    setViewers(seedViewers)
    const t = setInterval(
      () => setViewers((v) => Math.max(20, v + Math.round((Math.random() - 0.45) * 6))),
      2200
    )
    return () => clearInterval(t)
  }, [lot.id, seedViewers])

  const img = lot.images?.[0] || lot.image
  const current = lot.currentBid || lot.startingBid || 0
  const nextMin = Math.round(current * 1.05 / 1000) * 1000 || current + 1000

  return (
    <section
      className="relative overflow-hidden rounded-2xl border-2 border-ink bg-paper shadow-[0_6px_0_#1a1a1a]"
      aria-label={`LIVE LOT ${lot.name}`}
    >
      {/* ── 빨간 방송 헤더 (포켓센터 입구 사인 톤) ── */}
      <div className="relative px-4 sm:px-5 py-2.5 bg-fire flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.2em] bg-paper text-fire border-2 border-ink">
            <span className="w-1.5 h-1.5 rounded-full bg-fire"
              style={{ animation: 'pulse-live 1.2s ease-in-out infinite' }} />
            ON AIR
          </span>
          <span className="font-mono text-[10px] font-extrabold tracking-[0.2em] uppercase text-paper">
            LIVE STAGE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-mono text-[10px] font-bold text-ink bg-paper border-2 border-ink">
            <Icon name="eye" size={11} strokeWidth={2.4} />
            <span className="tabular-nums">{viewers.toLocaleString()}</span> 시청
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-full font-mono text-[10px] font-bold text-paper bg-ink border-2 border-ink">
            LOT · {String(lot.id || '').slice(-4).toUpperCase()}
          </span>
        </div>
      </div>

      {/* 잉크 적도 라인 */}
      <div className="h-1 bg-ink" aria-hidden="true" />

      {/* ── 스튜디오 무대 ── */}
      <div
        className="relative aspect-[16/10] overflow-hidden"
        style={{
          // 따뜻한 크림 ~ 살구 빛 그라데이션 + 위쪽 부드러운 스포트라이트
          background: `
            radial-gradient(120% 90% at 50% -10%, rgba(255,122,69,0.18) 0%, transparent 55%),
            linear-gradient(180deg, #fff6e8 0%, #fbf7ec 55%, #f5efe0 100%)
          `,
        }}
      >
        {/* 살짝 깔리는 카드 배경 (블러 대신 옅게) */}
        {img && (
          <img
            src={img}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-[0.08]"
          />
        )}

        {/* 부드러운 카메라 스캔 — 살구색 광선이 위→아래로 */}
        <span className="absolute left-0 right-0 h-24 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(255,122,69,0.18), transparent)',
            animation: 'scan-soft 6s linear infinite',
          }}
        />

        {/* 중앙 — 카드 이미지 */}
        <div className="absolute inset-0 flex items-center justify-center p-6">
          {img ? (
            <div className="relative">
              <img
                src={img}
                alt={lot.nameKo || lot.name}
                className="max-h-[270px] sm:max-h-[330px] rounded-lg border-2 border-ink"
                style={{
                  boxShadow: '0 14px 28px rgba(13,23,48,0.25), 0 0 0 4px #ffffff',
                }}
              />
              {/* 카드 발판 그림자 */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3/4 h-3 rounded-full"
                style={{ background: 'radial-gradient(ellipse at center, rgba(13,23,48,0.28), transparent 70%)' }}
              />
            </div>
          ) : (
            <div className="w-40 h-56 rounded-lg bg-bone-2 border-2 border-ink" />
          )}
        </div>

        {/* 하단 — 카드명 + 카운트다운 */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 flex-wrap">
          <div className="inline-flex flex-col bg-paper/85 border-2 border-ink rounded-lg px-2.5 py-1.5 shadow-[0_3px_0_#1a1a1a]">
            <span className="font-mono text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-mute">
              {lot.set || lot.setShort || 'POKÉMON TCG'}
            </span>
            <span className="font-display text-base sm:text-lg font-extrabold text-ink leading-tight">
              {lot.nameKo || lot.name}
            </span>
          </div>
          {t && (
            <div className="inline-flex items-center gap-1 rounded-lg bg-ink px-2.5 py-1.5 border-2 border-ink shadow-[0_3px_0_rgba(0,0,0,0.35)]">
              <Icon name="clock" size={11} strokeWidth={2.4} className="text-electric" />
              <span className={`font-mono text-xs font-extrabold tabular-nums ${t.ended ? 'text-mute-2' : 'text-electric'}`}>
                {t.ended
                  ? '경매 종료'
                  : `${t.d > 0 ? `${t.d}D ` : ''}${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}:${String(t.s).padStart(2, '0')}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 잉크 적도 라인 */}
      <div className="h-1 bg-ink" aria-hidden="true" />

      {/* ── 페이퍼 입찰 액션 바 ── */}
      <div className="px-5 py-4 sm:px-6 sm:py-5 bg-paper flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-5 flex-wrap">
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-mute">현재가</div>
            <div className="font-display text-2xl font-extrabold text-ink leading-none">{formatKRWFull(current)}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-mute">최소 다음 입찰</div>
            <div className="font-mono text-base font-bold text-grass leading-none">{formatKRWFull(nextMin)}</div>
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-mute">누적 입찰</div>
            <div className="font-mono text-base font-bold text-ink leading-none">{lot.bidCount || 0} 회</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/product/${lot.id}`)}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-extrabold text-sm border-2 border-ink shadow-[0_4px_0_#1a1a1a] hover:-translate-y-0.5 transition-all bg-fire text-paper"
        >
          <Icon name="gavel" size={14} strokeWidth={2.4} />
          입찰장 입장하기
        </button>
      </div>
    </section>
  )
}

// ═══════════════════════════════════════════════════════════════
// 사이드바 — 입찰 피드 + 다음 LOT 미리보기 (페이퍼 톤)
// ═══════════════════════════════════════════════════════════════
function LiveSidebar({ featured, upcoming, onPickLot, onOpenAll }) {
  return (
    <aside className="flex flex-col gap-4">
      <BidFeed lot={featured} />

      <div className="rounded-xl border-2 border-ink bg-paper shadow-[0_4px_0_#1a1a1a] overflow-hidden">
        {/* 빨간 헤더 — 통일된 카운터 톤 */}
        <div className="bg-fire px-4 py-2 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 text-paper">
            <Icon name="layers" size={13} strokeWidth={2.4} />
            <span className="font-display text-sm font-extrabold">다음 LOT</span>
          </div>
          <span className="font-mono text-[10px] font-bold text-paper/90 tabular-nums">
            UP NEXT · {upcoming.length}
          </span>
        </div>
        <ul className="divide-y divide-ink/10">
          {upcoming.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-mute font-bold">대기 중인 LOT이 없어요.</li>
          )}
          {upcoming.map((c, i) => {
            const t = c.endsAt ? timeUntil(c.endsAt) : null
            const img = c.images?.[0] || c.image
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onPickLot(c.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-electric/20 transition-colors"
                >
                  <span className="font-mono text-[10px] font-extrabold w-5 text-mute tabular-nums">
                    {String(i + 2).padStart(2, '0')}
                  </span>
                  <span className="w-10 h-12 rounded-md bg-bone-2 border-2 border-ink overflow-hidden shrink-0">
                    {img && <img src={img} alt="" className="w-full h-full object-cover" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-extrabold text-ink truncate">
                      {c.nameKo || c.name}
                    </span>
                    <span className="block text-[10.5px] font-mono text-mute truncate">
                      {formatKRW(c.currentBid || c.startingBid || 0)} · {c.bidCount || 0}회
                    </span>
                  </span>
                  {t && !t.ended && (
                    <span className="font-mono text-[10px] font-bold text-fire tabular-nums shrink-0">
                      {t.d > 0 ? `${t.d}D` : `${String(t.h).padStart(2,'0')}:${String(t.m).padStart(2,'0')}`}
                    </span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
        <button
          type="button"
          onClick={onOpenAll}
          className="w-full text-center py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-ink border-t-2 border-ink/10 hover:bg-electric/20 transition-colors"
        >
          전체 LOT 자세히 보기 →
        </button>
      </div>
    </aside>
  )
}

// ═══════════════════════════════════════════════════════════════
// 입찰 피드 — 페이퍼 + 빨간 헤더, 흰색 버블 채팅
// ═══════════════════════════════════════════════════════════════
const FEED_NAMES = [
  '트레이너_레드', '체육관관장이슬', '로켓단J', '오바람', '꼬마이브이',
  '엘리트포', '오박사 어시스턴트', '비키니아가씨', '낚시광 마사오', '바다트레이너지나',
]
const FEED_REACT = ['🔥', '⚡', '✨', '👀', '💥', '⭐', '🎯', '🛎️']

function BidFeed({ lot }) {
  const seedRef = useRef(Math.max(1000, lot.currentBid || 0))
  const [items, setItems] = useState(() => [
    { id: 'sys', sys: true, msg: `LOT 입장 — 시작가 ${formatKRWFull(seedRef.current)}`, t: Date.now() },
  ])

  useEffect(() => {
    seedRef.current = Math.max(1000, lot.currentBid || 0)
    setItems([{ id: `sys-${lot.id}`, sys: true, msg: `LOT 전환 — ${lot.nameKo || lot.name}`, t: Date.now() }])
  }, [lot.id, lot.currentBid, lot.nameKo, lot.name])

  useEffect(() => {
    const tick = () => {
      const kind = Math.random()
      if (kind < 0.5) {
        const inc = Math.round((seedRef.current * (0.03 + Math.random() * 0.08)) / 1000) * 1000 || 1000
        seedRef.current += inc
        const who = FEED_NAMES[Math.floor(Math.random() * FEED_NAMES.length)]
        setItems((arr) => [
          ...arr.slice(-30),
          { id: `b-${Date.now()}`, kind: 'bid', who, amt: seedRef.current, t: Date.now() },
        ])
      } else if (kind < 0.85) {
        const who = FEED_NAMES[Math.floor(Math.random() * FEED_NAMES.length)]
        const r = FEED_REACT[Math.floor(Math.random() * FEED_REACT.length)]
        setItems((arr) => [
          ...arr.slice(-30),
          { id: `r-${Date.now()}`, kind: 'react', who, r, t: Date.now() },
        ])
      } else {
        setItems((arr) => [
          ...arr.slice(-30),
          { id: `s-${Date.now()}`, sys: true, msg: '🛎️ 마감 5분 전 — 마지막 입찰 기회예요!', t: Date.now() },
        ])
      }
    }
    const interval = setInterval(tick, 2200 + Math.random() * 1800)
    return () => clearInterval(interval)
  }, [])

  const scrollRef = useRef(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [items])

  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-ink bg-paper shadow-[0_4px_0_#1a1a1a]">
      <div className="bg-fire px-4 py-2 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-paper">
          <span className="w-1.5 h-1.5 rounded-full bg-paper"
            style={{ animation: 'pulse-live 1.2s ease-in-out infinite' }} />
          <span className="font-display text-sm font-extrabold">실시간 입찰 피드</span>
        </div>
        <span className="font-mono text-[10px] font-bold text-paper/90 tabular-nums uppercase tracking-wider">
          LIVE
        </span>
      </div>
      <div
        ref={scrollRef}
        className="h-72 overflow-y-auto px-3 py-3 scrollbar-none flex flex-col gap-1.5 bg-bone"
      >
        {items.map((it) => (
          <FeedRow key={it.id} item={it} />
        ))}
      </div>
    </div>
  )
}

function FeedRow({ item }) {
  if (item.sys) {
    return (
      <div
        className="px-2.5 py-1.5 rounded-md text-center font-mono text-[10.5px] font-bold text-ink bg-electric/30 border-2 border-ink/20"
        style={{ animation: 'bid-pop 0.3s ease-out' }}
      >
        {item.msg}
      </div>
    )
  }
  if (item.kind === 'react') {
    return (
      <div className="inline-flex items-center gap-1.5 text-[11px] text-mute font-bold"
        style={{ animation: 'bid-pop 0.3s ease-out' }}
      >
        <span className="text-ink">{item.who}</span>
        <span>{item.r}</span>
      </div>
    )
  }
  // bid
  return (
    <div
      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-paper border-2 border-ink/15"
      style={{ animation: 'bid-pop 0.3s ease-out' }}
    >
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <span className="w-5 h-5 rounded-full grid place-items-center font-mono text-[9px] font-extrabold bg-fire text-paper border-2 border-ink">
          ₩
        </span>
        <span className="text-[11.5px] font-extrabold text-ink truncate">{item.who}</span>
      </span>
      <span className="font-mono text-[12px] font-extrabold text-ink tabular-nums">
        {formatKRWFull(item.amt)}
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 전체 LOT 모달 — 페이퍼 카드 그리드 (포켓몬센터 카탈로그 톤)
// ═══════════════════════════════════════════════════════════════
function AllLotsModal({ lots, featuredId, onClose, onPickLot }) {
  // ESC + body scroll lock
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="전체 LOT 보기"
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-8"
    >
      {/* 백드롭 */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
      />
      {/* 본체 */}
      <div
        className="relative w-full max-w-5xl max-h-[88vh] rounded-2xl border-2 border-ink bg-paper shadow-[0_8px_0_#1a1a1a] overflow-hidden flex flex-col"
        style={{ animation: 'modal-in 0.22s ease-out' }}
      >
        {/* 빨간 카운터 헤더 */}
        <div className="bg-fire px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span
              className="relative inline-flex w-9 h-9 rounded-full border-2 border-ink"
              style={{
                background:
                  'linear-gradient(180deg, #ff7a45 0%, #ff7a45 47%, #0d1730 47%, #0d1730 53%, #fff 53%, #fff 100%)',
              }}
              aria-hidden="true"
            >
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-paper border-2 border-ink" />
            </span>
            <div>
              <div className="font-mono text-[10px] font-extrabold uppercase tracking-[0.22em] text-paper/80">
                LIVE AUCTION · 전체 LOT
              </div>
              <div className="font-display text-lg font-extrabold text-paper leading-tight">
                오늘 단상에 오른 카드 모음
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="w-9 h-9 rounded-full bg-paper border-2 border-ink shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:-translate-y-0.5 transition-all inline-flex items-center justify-center"
          >
            <Icon name="close" size={14} strokeWidth={2.8} className="text-ink" />
          </button>
        </div>

        {/* 잉크 적도 */}
        <div className="h-1 bg-ink shrink-0" aria-hidden="true" />

        {/* 그리드 */}
        <div className="flex-1 overflow-y-auto bg-bone p-4 sm:p-5">
          {lots.length === 0 ? (
            <div className="py-16 text-center">
              <div className="inline-flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-fire/20 border-2 border-ink flex items-center justify-center shadow-[0_4px_0_#1a1a1a]">
                  <Icon name="broadcast" size={28} strokeWidth={2.2} className="text-fire" />
                </div>
                <div className="font-display text-lg font-bold text-ink">아직 등록된 LOT이 없어요</div>
              </div>
            </div>
          ) : (
            <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lots.map((c, i) => (
                <li key={c.id}>
                  <ModalLotRow
                    lot={c}
                    index={i + 1}
                    active={c.id === featuredId}
                    onPick={() => onPickLot(c.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 하단 안내 바 */}
        <div className="px-5 py-3 bg-bone-2 border-t-2 border-ink/10 flex items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-mute font-bold">
            LOT을 누르면 메인 무대에 즉시 올라와요.
          </span>
          <span className="font-mono text-[11px] font-extrabold text-ink tabular-nums">
            TOTAL · {lots.length}
          </span>
        </div>
      </div>
    </div>
  )
}

function ModalLotRow({ lot, index, active, onPick }) {
  const t = lot.endsAt ? timeUntil(lot.endsAt) : null
  const img = lot.images?.[0] || lot.image
  return (
    <button
      type="button"
      onClick={onPick}
      aria-current={active ? 'true' : undefined}
      className={`group w-full flex items-stretch gap-3 p-2.5 rounded-xl border-2 bg-paper text-left transition-all ${
        active
          ? 'border-fire shadow-[0_3px_0_#ff7a45] -translate-y-0.5'
          : 'border-ink/15 hover:border-ink hover:shadow-[0_3px_0_#1a1a1a] hover:-translate-y-0.5'
      }`}
    >
      <span className="w-16 h-20 rounded-lg bg-bone-2 border-2 border-ink overflow-hidden shrink-0">
        {img && <img src={img} alt="" className="w-full h-full object-cover" />}
      </span>
      <span className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <span>
          <span className="font-mono text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-mute">
            LOT {String(index).padStart(3, '0')}
            {active && <span className="ml-1.5 text-fire">· ON STAGE</span>}
          </span>
          <span className="block font-display text-sm font-extrabold text-ink leading-tight truncate">
            {lot.nameKo || lot.name}
          </span>
          <span className="block font-mono text-[10px] font-bold text-mute truncate">
            {lot.set || lot.setShort || 'POKÉMON TCG'}
          </span>
        </span>
        <span className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[11.5px] font-extrabold text-ink tabular-nums">
            {formatKRW(lot.currentBid || lot.startingBid || 0)}
          </span>
          {t && !t.ended && (
            <span className="font-mono text-[10px] font-bold text-fire tabular-nums">
              ⏱ {t.d > 0 ? `${t.d}D` : `${String(t.h).padStart(2,'0')}:${String(t.m).padStart(2,'0')}`}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}
