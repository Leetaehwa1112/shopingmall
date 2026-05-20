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
    return <AuctionLivePage lots={auctionList} loading={loading} error={error} />
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
// 경매 라이브 페이지 — 5초 테스트 + 휴리스틱 평가 기반 재설계
// ═══════════════════════════════════════════════════════════════
//
// 정보 위계 (5초 안에 전달):
//   1. 카운트다운 (시간 압박)              ← 빨간 배너, 큰 모노 숫자
//   2. 카드 이미지 (대상)                  ← 페이지 최대 비주얼
//   3. 현재가 (가격)                       ← 페이지 최대 숫자
//   4. CTA "입찰 참여하기"                 ← 페이지 최대 빨간 버튼
//   5. 신뢰 배지 (정품/안전)
//   6. 보조: 다음 LOT · 입찰 피드          ← 위계 ↓ 회색톤
//
// 모바일: 단일 컬럼 스택 + 하단 sticky CTA 바.
// 접근성: aria-live(피드), aria-label, focus-visible ring, 색+텍스트 이중표기.
// ═══════════════════════════════════════════════════════════════
function AuctionLivePage({ lots, loading, error }) {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-28 lg:pb-10">
      {/* === 1. 컴팩트 컨텍스트 스트립 (시각 점유 최소) === */}
      <CompactHeroStrip
        liveCount={sorted.length}
        onOpenAll={() => setShowAll(true)}
        disabled={loading || sorted.length === 0}
      />

      {/* === 2. 상태별 본문 === */}
      {error ? (
        <ErrorState />
      ) : loading ? (
        <LoadingState />
      ) : !featured ? (
        <EmptyState />
      ) : (
        <div className="mt-5 grid lg:grid-cols-[1fr_320px] gap-5">
          <FeaturedLot lot={featured} />
          <LiveSidebar
            featured={featured}
            upcoming={sorted.filter((c) => c.id !== featured.id).slice(0, 4)}
            onPickLot={setFeaturedId}
            onOpenAll={() => setShowAll(true)}
          />
        </div>
      )}

      {/* === 3. 모바일 sticky CTA — 항상 시야 === */}
      {featured && !loading && !error && (
        <MobileStickyCta lot={featured} />
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
        @keyframes shake-soft {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
        .focus-ring:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px #facc15, 0 0 0 5px #0d1730;
        }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 1) 컴팩트 컨텍스트 스트립 — 단일 행, 정보 압축
// ═══════════════════════════════════════════════════════════════
function CompactHeroStrip({ liveCount, onOpenAll, disabled }) {
  return (
    <header
      className="relative overflow-hidden rounded-2xl border-2 border-ink bg-paper shadow-[0_4px_0_#1a1a1a]"
      aria-label="라이브 경매장 헤더"
    >
      {/* 빨간 단일 띠 — 위계 ↓ 위해 통계 타일 제거, 인라인 메타로 통합 */}
      <div className="bg-fire px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {/* 포켓볼 미니 메달 */}
          <span
            className="relative inline-flex w-10 h-10 rounded-full border-2 border-ink shrink-0"
            style={{
              background:
                'linear-gradient(180deg, #ff7a45 0%, #ff7a45 47%, #0d1730 47%, #0d1730 53%, #fff 53%, #fff 100%)',
            }}
            aria-hidden="true"
          >
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-paper border-2 border-ink" />
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-fire"
              style={{ animation: 'pulse-live 1.4s ease-in-out infinite' }} />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.18em] bg-paper text-fire border-2 border-ink">
                <span className="w-1.5 h-1.5 rounded-full bg-fire"
                  style={{ animation: 'pulse-live 1.2s ease-in-out infinite' }} />
                ON AIR
              </span>
              <span className="font-mono text-[10px] font-extrabold tracking-[0.18em] uppercase text-paper/90">
                지금 <span className="text-paper tabular-nums">{liveCount}</span>건 경매 중
              </span>
            </div>
            <h1 className="font-display text-xl sm:text-2xl font-extrabold text-paper tracking-tight leading-tight">
              두근두근 라이브 경매장
            </h1>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAll}
          disabled={disabled}
          className="focus-ring inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-paper border-2 border-ink shadow-[0_3px_0_#1a1a1a] hover:-translate-y-0.5 hover:bg-electric/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-extrabold text-ink text-sm"
          aria-label={`전체 LOT 보기, ${liveCount}건`}
        >
          <Icon name="layers" size={14} strokeWidth={2.4} />
          전체 LOT
          <span className="ml-0.5 inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1.5 rounded-full bg-fire text-paper font-mono text-[10.5px] font-bold tabular-nums">
            {liveCount}
          </span>
        </button>
      </div>
    </header>
  )
}

// ═══════════════════════════════════════════════════════════════
// 2) Featured LOT — 정보 위계 재배치 (시간 → 가격 → CTA)
// ═══════════════════════════════════════════════════════════════
function FeaturedLot({ lot }) {
  const navigate = useNavigate()
  const [, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const t = lot.endsAt ? timeUntil(lot.endsAt) : null

  // 시청자 카운트 — 라이브 분위기 (실제 소켓 없이도)
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

  // 마감 임박도 — 1시간 이내면 강조
  const isCritical = t && !t.ended && t.totalMs < 1000 * 60 * 10  // 10분 이하
  const isUrgent   = t && !t.ended && t.totalMs < 1000 * 60 * 60  // 1시간 이하

  return (
    <section
      className="relative overflow-hidden rounded-2xl border-2 border-ink bg-paper shadow-[0_6px_0_#1a1a1a]"
      aria-label={`라이브 LOT: ${lot.nameKo || lot.name}`}
    >
      {/* ── 위계 1: 카운트다운 배너 (가장 먼저 인지) ── */}
      <CountdownBanner t={t} isCritical={isCritical} isUrgent={isUrgent} />

      <div className="grid sm:grid-cols-[1.2fr_1fr] gap-0">
        {/* ── 위계 2: 카드 이미지 (가장 큰 비주얼) ── */}
        <div
          className="relative aspect-[4/5] sm:aspect-auto sm:min-h-[420px] overflow-hidden border-b-2 sm:border-b-0 sm:border-r-2 border-ink"
          style={{
            background: `
              radial-gradient(120% 90% at 50% -10%, rgba(255,122,69,0.18) 0%, transparent 55%),
              linear-gradient(180deg, #fff6e8 0%, #fbf7ec 55%, #f5efe0 100%)
            `,
          }}
        >
          {img && (
            <img
              src={img}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover opacity-[0.08]"
            />
          )}
          {/* 살구색 부드러운 카메라 스캔 */}
          <span className="absolute left-0 right-0 h-24 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, transparent, rgba(255,122,69,0.18), transparent)',
              animation: 'scan-soft 6s linear infinite',
            }}
          />

          {/* 상단 좌측 — 시청자 수만 (LOT 번호는 사이드 카드로 이동, ON AIR는 헤더에만) */}
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-mono text-[10px] font-bold text-ink bg-paper/90 border-2 border-ink shadow-[0_2px_0_#1a1a1a]">
              <Icon name="eye" size={11} strokeWidth={2.4} />
              <span className="tabular-nums">{viewers.toLocaleString()}</span> 명 시청 중
            </span>
          </div>

          {/* 카드 이미지 — 중앙 큰 비주얼 */}
          <div className="absolute inset-0 flex items-center justify-center p-5 sm:p-6">
            {img ? (
              <div className="relative">
                <img
                  src={img}
                  alt={lot.nameKo || lot.name}
                  className="max-h-[320px] sm:max-h-[360px] rounded-lg border-2 border-ink"
                  style={{
                    boxShadow: '0 14px 28px rgba(13,23,48,0.25), 0 0 0 4px #ffffff',
                  }}
                />
                {/* 발판 그림자 */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-3/4 h-3 rounded-full"
                  style={{ background: 'radial-gradient(ellipse at center, rgba(13,23,48,0.28), transparent 70%)' }}
                />
              </div>
            ) : (
              <div className="w-40 h-56 rounded-lg bg-bone-2 border-2 border-ink" />
            )}
          </div>
        </div>

        {/* ── 위계 3-4: 카드명 → 현재가 → CTA ── */}
        <div className="p-5 sm:p-6 flex flex-col gap-4 bg-paper">
          {/* 카드명 */}
          <div>
            <div className="font-mono text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-mute">
              {lot.set || lot.setShort || 'POKÉMON TCG'} · LOT {String(lot.id || '').slice(-4).toUpperCase()}
            </div>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-extrabold text-ink leading-tight">
              {lot.nameKo || lot.name}
            </h2>
            {lot.grade?.grade != null && (
              <div className="mt-1 inline-flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-electric text-ink font-mono text-[10px] font-extrabold border-2 border-ink">
                  {lot.grade.cert || 'PSA'} · {lot.grade.grade}
                </span>
                <span className="text-[10.5px] text-mute font-bold">감정 등급</span>
              </div>
            )}
          </div>

          {/* 위계 3: 현재가 — 페이지에서 가장 큰 숫자 */}
          <div>
            <div className="text-[10.5px] font-mono font-extrabold uppercase tracking-wider text-mute">
              현재 입찰가
            </div>
            <div className="font-display font-extrabold text-ink leading-[1] tabular-nums" style={{ fontSize: 'clamp(28px, 5vw, 40px)' }}>
              {formatKRWFull(current)}
            </div>
            <div className="mt-1.5 flex items-baseline gap-3 flex-wrap text-[12px]">
              <span className="text-mute font-bold">
                다음 최소 입찰
                <span className="ml-1.5 font-mono font-extrabold text-grass">{formatKRWFull(nextMin)}</span>
              </span>
              <span className="text-mute font-bold">
                누적
                <span className="ml-1.5 font-mono font-extrabold text-ink tabular-nums">{lot.bidCount || 0}회</span>
              </span>
            </div>
          </div>

          {/* 위계 4: CTA — 페이지에서 가장 큰 빨간 버튼 */}
          <button
            type="button"
            onClick={() => navigate(`/product/${lot.id}`)}
            className="focus-ring group w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-extrabold text-base sm:text-lg border-2 border-ink shadow-[0_5px_0_#1a1a1a] hover:-translate-y-1 hover:shadow-[0_6px_0_#1a1a1a] active:translate-y-0 active:shadow-[0_2px_0_#1a1a1a] transition-all bg-fire text-paper"
            aria-label="입찰 참여하기"
          >
            <Icon name="gavel" size={18} strokeWidth={2.6} />
            입찰 참여하기
            <Icon name="arrow" size={16} strokeWidth={2.6} className="ml-0.5 transition-transform group-hover:translate-x-0.5" />
          </button>
          <div className="text-center text-[11px] font-bold text-mute">
            지금 <span className="text-fire">{viewers.toLocaleString()}명</span>이 함께 지켜보는 중 · 클릭하면 안전한 입찰장으로 이동해요
          </div>

          {/* 위계 5: 신뢰 배지 */}
          <TrustBadges />
        </div>
      </div>
    </section>
  )
}

// ── 카운트다운 배너 — 위계 1순위, 시간 압박 시각화 ──────────────
function CountdownBanner({ t, isCritical, isUrgent }) {
  if (!t) {
    return (
      <div className="bg-ink px-4 py-2 flex items-center justify-center">
        <span className="font-mono text-[11px] font-extrabold uppercase tracking-wider text-electric">
          상시 입찰 · 마감 기한 없음
        </span>
      </div>
    )
  }
  if (t.ended) {
    return (
      <div className="bg-ink/90 px-4 py-2 flex items-center justify-center">
        <span className="font-mono text-[11px] font-extrabold uppercase tracking-wider text-mute-2">
          ⛔ 경매가 종료되었어요
        </span>
      </div>
    )
  }
  const bg = isCritical ? 'bg-rose' : isUrgent ? 'bg-fire' : 'bg-ink'
  const fg = isCritical ? 'text-paper' : isUrgent ? 'text-paper' : 'text-electric'
  const headline = isCritical ? '⚠️ 곧 마감!' : isUrgent ? '🔥 마감 임박' : '⏱ 마감까지'
  return (
    <div
      className={`${bg} px-4 py-2 sm:py-2.5 flex items-center justify-center gap-3 flex-wrap`}
      style={isCritical ? { animation: 'shake-soft 0.6s ease-in-out infinite' } : undefined}
      aria-live={isCritical ? 'assertive' : 'polite'}
    >
      <span className={`font-display text-xs sm:text-sm font-extrabold tracking-tight ${fg}`}>
        {headline}
      </span>
      <span className={`font-mono text-lg sm:text-xl font-extrabold tabular-nums tracking-wider ${fg}`}>
        {t.d > 0 ? `${t.d}일 ` : ''}
        {String(t.h).padStart(2, '0')}:{String(t.m).padStart(2, '0')}:{String(t.s).padStart(2, '0')}
      </span>
    </div>
  )
}

// ── 신뢰 배지 — 전환 이탈 방지용 ────────────────────────────────
function TrustBadges() {
  return (
    <ul className="grid grid-cols-3 gap-1.5 mt-1" aria-label="신뢰 보증">
      <TrustItem icon="shield" title="정품 인증" sub="감정 완료" />
      <TrustItem icon="lock"   title="안전 결제" sub="에스크로" />
      <TrustItem icon="check"  title="입찰 보호" sub="자동 환불" />
    </ul>
  )
}
function TrustItem({ icon, title, sub }) {
  return (
    <li className="inline-flex flex-col items-center gap-0.5 px-2 py-2 rounded-lg bg-bone-2 border border-ink/15">
      <Icon name={icon} size={14} strokeWidth={2.2} className="text-grass" />
      <span className="text-[10.5px] font-extrabold text-ink leading-tight">{title}</span>
      <span className="text-[9.5px] font-mono text-mute">{sub}</span>
    </li>
  )
}

// ═══════════════════════════════════════════════════════════════
// 3) Sidebar — 위계 ↓ (회색톤·작은 카드), 다음 LOT + 입찰 피드
// ═══════════════════════════════════════════════════════════════
function LiveSidebar({ featured, upcoming, onPickLot, onOpenAll }) {
  return (
    <aside className="flex flex-col gap-4 lg:max-h-[calc(100vh-9rem)] lg:overflow-hidden lg:sticky lg:top-24">
      {/* 다음 LOT — 위쪽 (시각 비중 ↑) */}
      <div className="rounded-xl border-2 border-ink bg-paper shadow-[0_4px_0_#1a1a1a] overflow-hidden">
        <div className="bg-bone-2 px-4 py-2 flex items-center justify-between border-b-2 border-ink/10">
          <div className="inline-flex items-center gap-2 text-ink">
            <Icon name="layers" size={13} strokeWidth={2.4} />
            <span className="font-display text-sm font-extrabold">다음 LOT</span>
          </div>
          <span className="font-mono text-[10px] font-bold text-mute tabular-nums">
            {upcoming.length}건 대기
          </span>
        </div>
        <ul className="divide-y divide-ink/10">
          {upcoming.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-mute font-bold">
              곧 새로운 LOT이 무대에 올라옵니다.
            </li>
          )}
          {upcoming.map((c, i) => {
            const t = c.endsAt ? timeUntil(c.endsAt) : null
            const img = c.images?.[0] || c.image
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onPickLot(c.id)}
                  className="focus-ring w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-electric/20 transition-colors"
                  aria-label={`${c.nameKo || c.name} 단상에 올리기`}
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
          className="focus-ring w-full text-center py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-ink border-t-2 border-ink/10 hover:bg-electric/20 transition-colors"
        >
          전체 LOT 자세히 보기 →
        </button>
      </div>

      {/* 입찰 피드 — 보조 (위계 ↓, 회색톤 헤더) */}
      <BidFeed lot={featured} />
    </aside>
  )
}

// ═══════════════════════════════════════════════════════════════
// 입찰 피드 — 위계 ↓ (회색 헤더, 작은 폰트, aria-live)
// ═══════════════════════════════════════════════════════════════
const FEED_NAMES = [
  '트레이너_레드', '체육관관장이슬', '로켓단J', '오바람', '꼬마이브이',
  '엘리트포', '오박사 어시스턴트', '비키니아가씨', '낚시광 마사오', '바다트레이너지나',
]
const FEED_REACT = ['🔥', '⚡', '✨', '👀', '💥', '⭐', '🎯', '🛎️']

function BidFeed({ lot }) {
  const seedRef = useRef(Math.max(1000, lot.currentBid || 0))
  const [items, setItems] = useState(() => [
    { id: 'sys', sys: true, msg: `시작가 ${formatKRWFull(seedRef.current)}부터 입찰을 받아요`, t: Date.now() },
  ])

  useEffect(() => {
    seedRef.current = Math.max(1000, lot.currentBid || 0)
    setItems([{ id: `sys-${lot.id}`, sys: true, msg: `${lot.nameKo || lot.name} 단상 입장!`, t: Date.now() }])
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
    <div className="relative overflow-hidden rounded-xl border-2 border-ink bg-paper shadow-[0_4px_0_#1a1a1a] flex flex-col lg:min-h-0 lg:flex-1">
      {/* 회색톤 헤더 — 위계 ↓ (메인 무대보다 덜 강조) */}
      <div className="bg-bone-2 px-4 py-2 flex items-center justify-between border-b-2 border-ink/10">
        <div className="inline-flex items-center gap-2 text-ink">
          <span className="w-1.5 h-1.5 rounded-full bg-fire"
            style={{ animation: 'pulse-live 1.2s ease-in-out infinite' }} />
          <span className="font-display text-sm font-extrabold">실시간 입찰 피드</span>
        </div>
        <span className="font-mono text-[10px] font-bold text-mute tabular-nums uppercase tracking-wider">
          LIVE
        </span>
      </div>
      <div
        ref={scrollRef}
        className="h-60 lg:flex-1 overflow-y-auto px-3 py-3 scrollbar-none flex flex-col gap-1.5 bg-bone"
        role="log"
        aria-live="polite"
        aria-label="실시간 입찰 메시지"
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
        <span aria-hidden="true">{item.r}</span>
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
        <span className="w-5 h-5 rounded-full grid place-items-center font-mono text-[9px] font-extrabold bg-fire text-paper border-2 border-ink" aria-hidden="true">
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
// 모바일 sticky CTA — 항상 시야 (스크롤 시 위치 고정)
// ═══════════════════════════════════════════════════════════════
function MobileStickyCta({ lot }) {
  const navigate = useNavigate()
  const current = lot.currentBid || lot.startingBid || 0
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2 bg-paper/95 backdrop-blur-sm border-t-2 border-ink">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-mute">
            현재가
          </div>
          <div className="font-display text-base font-extrabold text-ink leading-none tabular-nums truncate">
            {formatKRWFull(current)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/product/${lot.id}`)}
          className="focus-ring inline-flex items-center gap-2 px-4 py-3 rounded-full font-extrabold text-sm border-2 border-ink shadow-[0_3px_0_#1a1a1a] active:translate-y-0.5 active:shadow-[0_1px_0_#1a1a1a] transition-all bg-fire text-paper shrink-0"
          aria-label="입찰 참여하기"
        >
          <Icon name="gavel" size={14} strokeWidth={2.6} />
          입찰하기
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 상태 컴포넌트 — Loading / Empty / Error
// ═══════════════════════════════════════════════════════════════
function LoadingState() {
  return (
    <div className="mt-10 text-center py-20" role="status" aria-live="polite">
      <div className="inline-flex flex-col items-center gap-4">
        {/* 회전하는 포켓볼 — 사이트 톤과 일관 */}
        <div className="relative w-14 h-14">
          <span
            className="absolute inset-0 rounded-full border-2 border-ink"
            style={{
              background:
                'linear-gradient(180deg, #ff7a45 0%, #ff7a45 47%, #0d1730 47%, #0d1730 53%, #fff 53%, #fff 100%)',
              animation: 'spin 1.4s linear infinite',
            }}
          />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-paper border-2 border-ink" />
        </div>
        <div>
          <div className="font-display text-lg font-extrabold text-ink">단상을 준비하고 있어요</div>
          <div className="mt-1 text-sm text-mute font-medium">잠시만 기다려주세요…</div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

function EmptyState() {
  const navigate = useNavigate()
  return (
    <div className="mt-10 text-center py-16 relative sparkle-host" role="status">
      <Sparkles always />
      <div className="inline-flex flex-col items-center gap-4 max-w-md">
        <div className="w-20 h-20 rounded-full bg-fire/15 border-2 border-ink flex items-center justify-center shadow-[0_4px_0_#1a1a1a]">
          <Icon name="broadcast" size={32} strokeWidth={2.2} className="text-fire" />
        </div>
        <div>
          <div className="font-display text-2xl font-extrabold text-ink">오늘 경매장은 휴무예요</div>
          <p className="mt-2 text-sm text-mute font-medium leading-relaxed">
            지금 단상에 오른 카드가 없어요. 즉시 구매 카탈로그에서 마음에 드는 카드를 먼저 골라볼 수 있어요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="focus-ring inline-flex items-center gap-2 px-5 py-3 rounded-full font-extrabold text-sm border-2 border-ink shadow-[0_4px_0_#1a1a1a] hover:-translate-y-0.5 transition-all bg-electric text-ink"
        >
          <Icon name="package" size={14} strokeWidth={2.4} />
          마켓플레이스 둘러보기
        </button>
      </div>
    </div>
  )
}

function ErrorState() {
  return (
    <div className="mt-10 text-center py-16" role="alert">
      <div className="inline-flex flex-col items-center gap-4 max-w-md">
        <div className="w-20 h-20 rounded-full bg-rose/15 border-2 border-ink flex items-center justify-center shadow-[0_4px_0_#1a1a1a]">
          <Icon name="bell" size={32} strokeWidth={2.2} className="text-rose" />
        </div>
        <div>
          <div className="font-display text-2xl font-extrabold text-ink">방송 신호가 잠시 끊겼어요</div>
          <p className="mt-2 text-sm text-mute font-medium leading-relaxed">
            경매 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="focus-ring inline-flex items-center gap-2 px-5 py-3 rounded-full font-extrabold text-sm border-2 border-ink shadow-[0_4px_0_#1a1a1a] hover:-translate-y-0.5 transition-all bg-paper text-ink"
        >
          <Icon name="arrow" size={14} strokeWidth={2.4} />
          새로고침
        </button>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 전체 LOT 모달 — 페이퍼 카드 그리드 (포켓몬센터 카탈로그 톤)
// ═══════════════════════════════════════════════════════════════
function AllLotsModal({ lots, featuredId, onClose, onPickLot }) {
  // ESC + body scroll lock + focus trap (간소화)
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
      className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6"
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-ink/55 backdrop-blur-sm"
      />
      <div
        className="relative w-full max-w-5xl max-h-[88vh] rounded-2xl border-2 border-ink bg-paper shadow-[0_8px_0_#1a1a1a] overflow-hidden flex flex-col"
        style={{ animation: 'modal-in 0.22s ease-out' }}
      >
        <div className="bg-fire px-4 sm:px-5 py-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="relative inline-flex w-9 h-9 rounded-full border-2 border-ink shrink-0"
              style={{
                background:
                  'linear-gradient(180deg, #ff7a45 0%, #ff7a45 47%, #0d1730 47%, #0d1730 53%, #fff 53%, #fff 100%)',
              }}
              aria-hidden="true"
            >
              <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-paper border-2 border-ink" />
            </span>
            <div className="min-w-0">
              <div className="font-mono text-[10px] font-extrabold uppercase tracking-[0.22em] text-paper/80">
                LIVE AUCTION · 전체 LOT
              </div>
              <div className="font-display text-base sm:text-lg font-extrabold text-paper leading-tight truncate">
                오늘 단상에 오른 카드 모음
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="focus-ring w-9 h-9 rounded-full bg-paper border-2 border-ink shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:-translate-y-0.5 transition-all inline-flex items-center justify-center shrink-0"
          >
            <Icon name="close" size={14} strokeWidth={2.8} className="text-ink" />
          </button>
        </div>

        <div className="h-1 bg-ink shrink-0" aria-hidden="true" />

        <div className="flex-1 overflow-y-auto bg-bone p-3 sm:p-5">
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

        <div className="px-4 sm:px-5 py-3 bg-bone-2 border-t-2 border-ink/10 flex items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] sm:text-xs text-mute font-bold">
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
      aria-label={`${lot.nameKo || lot.name}, ${formatKRWFull(lot.currentBid || lot.startingBid || 0)}, 단상에 올리기`}
      className={`focus-ring group w-full flex items-stretch gap-3 p-2.5 rounded-xl border-2 bg-paper text-left transition-all ${
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
