import { useMemo, useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CATEGORIES } from '@/api/cards'
import { normalizeProduct } from '@/api/normalize'
import api from '@/api/axios'
import CardTile from '@/components/common/CardTile'
import Icon from '@/components/common/Icon'
import Sparkles from '@/components/common/Sparkles'
import Eyebrow from '@/components/common/Eyebrow'
import useToastStore from '@/store/toastStore'
import useAuthStore from '@/store/authStore'
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
// 경매 라이브 페이지 — Norman emotional design (Visceral · Behavioral · Reflective)
// ═══════════════════════════════════════════════════════════════
//
// 타깃 : 포켓몬 TCG 컬렉터 (20–30대, 추억 + 자산 가치 동시 동기)
// 감정 : 두근거림(설렘) · 신뢰 · 프리미엄 · 안정
//
// 디자인 시스템 :
//   color   fire(#ff7a45) primary · electric(#facc15) accent · paper · bone · ink
//   shape   "무대(stage)" 메타포 — 핀스팟 라이트 + 헤일로 + 발판 그림자
//   elev    양각 그림자 [0_3px_0 · 0_5px_0 · 0_8px_0]  ※ 포켓몬센터 종이박스 톤
//   motion  pulse-live · halo-glow · spotlight · shine-sweep · digit-tick · shake-soft
//
// 재사용 표현 컴포넌트 :
//   PokeballMark · LiveDot · SerialTag · SectionHeader · DigitClock
//   SpotlightStage · PriceDisplay · PrimaryCta · TrustGrid · MetaChip
//
// 정보 위계 (5초 안에 전달) :
//   ① 카운트다운(시간) → ② 카드(대상) → ③ 현재가(숫자) → ④ CTA → ⑤ 신뢰 → ⑥ 보조
// ═══════════════════════════════════════════════════════════════

// ─── 공통 토큰 ────────────────────────────────────────────────
const POKEBALL_BG =
  'linear-gradient(180deg, #ff7a45 0%, #ff7a45 47%, #0d1730 47%, #0d1730 53%, #fff 53%, #fff 100%)'

// ─── 재사용: 포켓볼 마크 (다양한 사이즈에서 동일하게 동작) ─────
function PokeballMark({ size = 40, animated = true, className = '' }) {
  const dot = Math.max(6, Math.round(size * 0.3))
  const inner = Math.max(2, Math.round(size * 0.1))
  return (
    <span
      className={`relative inline-flex rounded-full border-2 border-ink shrink-0 ${className}`}
      style={{ width: size, height: size, background: POKEBALL_BG }}
      aria-hidden="true"
    >
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper border-2 border-ink"
        style={{ width: dot, height: dot }}
      />
      <span
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fire"
        style={{
          width: inner,
          height: inner,
          animation: animated ? 'pulse-live 1.4s ease-in-out infinite' : undefined,
        }}
      />
    </span>
  )
}

// ─── 재사용: LIVE 도트 (펄스 동그라미) ────────────────────────
function LiveDot({ size = 6, color = '#ff7a45' }) {
  return (
    <span
      className="inline-block rounded-full shrink-0"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        boxShadow: `0 0 0 3px ${color}33`,
        animation: 'pulse-live 1.2s ease-in-out infinite',
      }}
      aria-hidden="true"
    />
  )
}

// ─── 재사용: 시리얼 태그 (LOT 일련번호 — 박물관/감정서 톤) ────
function SerialTag({ children, tone = 'paper' }) {
  const bg = tone === 'dark' ? 'bg-ink text-paper' : 'bg-paper text-ink'
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] border-2 border-ink ${bg}`}
      style={{ letterSpacing: '0.18em' }}
    >
      {children}
    </span>
  )
}

// ─── 재사용: 작은 메타 칩 ─────────────────────────────────────
function MetaChip({ icon, children, accent = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border-2 border-ink font-mono text-[10px] font-extrabold tabular-nums ${
        accent ? 'bg-electric text-ink' : 'bg-paper text-ink'
      }`}
    >
      {icon && <Icon name={icon} size={10} strokeWidth={2.6} />}
      {children}
    </span>
  )
}

// ─── 재사용: 섹션 헤더 (사이드바·피드 공통 톤) ────────────────
function SectionHeader({ icon, title, meta, accent = false }) {
  return (
    <div
      className={`px-4 py-2.5 flex items-center justify-between border-b-2 border-ink/10 ${
        accent ? 'bg-fire/10' : 'bg-bone-2'
      }`}
    >
      <div className="inline-flex items-center gap-2 text-ink">
        {icon === 'live' ? (
          <LiveDot size={6} />
        ) : (
          <Icon name={icon} size={13} strokeWidth={2.4} />
        )}
        <span className="font-display text-sm font-extrabold tracking-tight">
          {title}
        </span>
      </div>
      {meta && (
        <span className="font-mono text-[10px] font-bold text-mute tabular-nums uppercase tracking-[0.16em]">
          {meta}
        </span>
      )}
    </div>
  )
}

// ─── 재사용: LED 디지트 시계 (카운트다운 위계 #1) ─────────────
function DigitGroup({ value, label }) {
  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <span
        className="inline-flex items-center justify-center min-w-[2.1rem] sm:min-w-[2.5rem] px-1.5 py-1 sm:py-1.5 rounded-md font-mono font-extrabold tabular-nums leading-none bg-ink/90 text-electric border-2 border-ink"
        style={{
          fontSize: 'clamp(18px, 3.5vw, 22px)',
          letterSpacing: '0.04em',
          boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.35), inset 0 2px 0 rgba(255,255,255,0.06)',
        }}
      >
        {value}
      </span>
      <span className="font-mono text-[8.5px] font-extrabold uppercase tracking-[0.18em] text-paper/80">
        {label}
      </span>
    </span>
  )
}
function DigitClock({ t, tone = 'urgent' }) {
  // tone: 'critical' | 'urgent' | 'calm'
  const labelText =
    tone === 'critical' ? '곧 마감!' : tone === 'urgent' ? '마감 임박' : '마감까지'
  return (
    <div className="inline-flex items-center gap-2.5 sm:gap-3 flex-wrap">
      <span className="font-display text-xs sm:text-sm font-extrabold tracking-tight text-paper inline-flex items-center gap-1.5">
        {tone === 'critical' ? (
          <span aria-hidden="true">⚠️</span>
        ) : tone === 'urgent' ? (
          <span aria-hidden="true">🔥</span>
        ) : (
          <Icon name="clock" size={14} strokeWidth={2.4} />
        )}
        {labelText}
      </span>
      <span className="inline-flex items-center gap-1 sm:gap-1.5">
        {t.d > 0 && (
          <>
            <DigitGroup value={String(t.d).padStart(2, '0')} label="DAYS" />
            <span className="font-mono text-electric font-extrabold pb-2.5" aria-hidden="true">:</span>
          </>
        )}
        <DigitGroup value={String(t.h).padStart(2, '0')} label="HOURS" />
        <span className="font-mono text-electric font-extrabold pb-2.5" aria-hidden="true">:</span>
        <DigitGroup value={String(t.m).padStart(2, '0')} label="MIN" />
        <span className="font-mono text-electric font-extrabold pb-2.5" aria-hidden="true">:</span>
        <DigitGroup value={String(t.s).padStart(2, '0')} label="SEC" />
      </span>
    </div>
  )
}

function AuctionLivePage({ lots, loading, error }) {
  const [showAll, setShowAll] = useState(false)
  const [featuredId, setFeaturedId] = useState(null)
  const [bidLot, setBidLot] = useState(null)
  // BidFeed로 "내 입찰" 시스템 메시지를 흘려보내는 가벼운 이벤트 채널
  const [userBidEvent, setUserBidEvent] = useState(null)

  // 마감 임박 LOT부터 정렬 — 메인 화면에 올라가는 LOT 선정 기준
  const sorted = useMemo(() => {
    return [...lots].sort((a, b) => (a.endsAt || Infinity) - (b.endsAt || Infinity))
  }, [lots])

  const featured = useMemo(() => {
    if (featuredId) return sorted.find((c) => c.id === featuredId) || sorted[0]
    return sorted[0]
  }, [sorted, featuredId])

  const openBid = (lot) => setBidLot(lot)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-28 lg:pb-10">
      {/* === 1. 헤더 (컴팩트) === */}
      <CompactHeroStrip
        liveCount={sorted.length}
        onOpenAll={() => setShowAll(true)}
        disabled={loading || sorted.length === 0}
      />

      {/* === 2. 라이브 방송 플레이어 — 페이지 최대 비주얼 === */}
      {!error && !loading && featured && (
        <BroadcastStream lot={featured} liveCount={sorted.length} onBid={() => openBid(featured)} />
      )}

      {/* === 3. 상태별 본문 === */}
      {error ? (
        <ErrorState />
      ) : loading ? (
        <LoadingState />
      ) : !featured ? (
        <EmptyState />
      ) : (
        <div className="mt-5 grid lg:grid-cols-[1fr_320px] gap-5">
          <FeaturedLot lot={featured} onBid={() => openBid(featured)} />
          <LiveSidebar
            featured={featured}
            upcoming={sorted.filter((c) => c.id !== featured.id).slice(0, 4)}
            onPickLot={setFeaturedId}
            onOpenAll={() => setShowAll(true)}
            userBidEvent={userBidEvent}
          />
        </div>
      )}

      {/* === 4. 모바일 sticky CTA — 항상 시야 === */}
      {featured && !loading && !error && (
        <MobileStickyCta lot={featured} onBid={() => openBid(featured)} />
      )}

      {showAll && (
        <AllLotsModal
          lots={sorted}
          featuredId={featured?.id}
          onClose={() => setShowAll(false)}
          onPickLot={(id) => { setFeaturedId(id); setShowAll(false) }}
        />
      )}

      {/* === 5. 입찰 시트 (in-place) === */}
      {bidLot && (
        <QuickBidSheet
          lot={bidLot}
          onClose={() => setBidLot(null)}
          onSuccess={(amt) =>
            setUserBidEvent({ id: `me-${Date.now()}`, amount: amt, lotId: bidLot.id, t: Date.now() })
          }
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
        /* 회복기 도크의 부드러운 호흡 — 포켓몬센터 회복기 모티브 */
        @keyframes heal-breathe {
          0%, 100% { opacity: 0.55; transform: scaleY(1); }
          50%      { opacity: 0.95; transform: scaleY(1.04); }
        }
        /* 자동문/대각선 광택 스윕 — 프리미엄 CTA */
        @keyframes shine-sweep {
          0%   { transform: translateX(-120%) skewX(-18deg); }
          100% { transform: translateX(260%) skewX(-18deg); }
        }
        /* 빌의 PC 스캔라인 — 입찰 피드 모니터 */
        @keyframes crt-flicker {
          0%, 96%, 100% { opacity: 0.18; }
          97%, 99%      { opacity: 0.35; }
        }
        /* 회복 도트가 카운터 위 포켓볼처럼 펄스 */
        @keyframes counter-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,122,69,0); }
          50%      { box-shadow: 0 0 0 4px rgba(255,122,69,0.28); }
        }
        /* 방송 하단 티커 (보조 데이터 마키) */
        @keyframes ticker-slide {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        /* 미니 플레이어 등장 — 살짝 튀어오르듯 */
        @keyframes mini-pop {
          from { transform: translateY(20px) scale(0.92); opacity: 0; }
          to   { transform: translateY(0) scale(1); opacity: 1; }
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
// 1) 포켓몬센터 정면 마스트헤드
//    - 빨간 사다리꼴 지붕 (포켓몬센터 시그니처)
//    - 흰 벽 + 자동문 라인 LED
//    - 카운터 위 포켓볼 5개 (대기 LOT 상징)
//    - ON AIR 한 번만 노출 (중복 제거)
// ═══════════════════════════════════════════════════════════════
function CounterPokeballs({ liveCount }) {
  // 카운터 위 일렬 포켓볼 — 활성 갯수만큼 fire, 나머지는 회색
  const SLOTS = 5
  return (
    <ul className="inline-flex items-center gap-1.5" aria-hidden="true">
      {Array.from({ length: SLOTS }).map((_, i) => {
        const active = i < Math.min(SLOTS, liveCount)
        return (
          <li
            key={i}
            className="relative w-3 h-3 rounded-full border-2 border-ink"
            style={{
              background: active
                ? POKEBALL_BG
                : 'linear-gradient(180deg, #cfcdc4 0%, #cfcdc4 47%, #0d1730 47%, #0d1730 53%, #ece9df 53%, #ece9df 100%)',
              animation: active ? `counter-glow ${1.6 + i * 0.15}s ease-in-out infinite` : undefined,
            }}
          />
        )
      })}
    </ul>
  )
}

// ═══════════════════════════════════════════════════════════════
// 📺 라이브 방송 스트림 (BroadcastStream)
// ───────────────────────────────────────────────────────────────
//  실제 라이브 커머스 / 옥션 방송 플레이어를 그대로 재현
//  - 16:9 비디오 영역 (TV 베젤 프레임)
//  - 상단 컨트롤바 : ● LIVE · CH · 시청자 · 음소거 · 풀스크린
//  - 메인 비디오 : Featured 카드를 스튜디오 핀스팟 아래 비춤
//  - PIP 카메라 : 우상단 작은 진행자 캠 (포켓볼 마크)
//  - 로어서드 자막 : 카드명 / LOT 시리얼 / 현재가 LED / 카운트다운
//  - 하단 티커 : 다음 최소가 · 입찰 수 · 시청자 마키
// ═══════════════════════════════════════════════════════════════

function BroadcastStream({ lot, liveCount, onBid }) {
  const [, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // 시청자 카운터
  const seedViewers = useMemo(
    () => 80 + ((lot.id?.charCodeAt?.(0) || 7) * 13) % 240,
    [lot.id]
  )
  const [viewers, setViewers] = useState(seedViewers)
  useEffect(() => {
    setViewers(seedViewers)
    const id = setInterval(
      () => setViewers((v) => Math.max(20, v + Math.round((Math.random() - 0.45) * 6))),
      2400
    )
    return () => clearInterval(id)
  }, [lot.id, seedViewers])

  // UI-only 컨트롤 (음소거/풀스크린은 표현용 토글 — 실제 영상 X)
  const [muted, setMuted] = useState(true)

  // ── 미니 플레이어 : 본 방송이 화면 밖으로 스크롤되면 우하단으로 핀 ──
  const containerRef = useRef(null)
  const [pinned, setPinned] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        const rect = entry.boundingClientRect
        // 본 화면이 헤더 아래쪽으로 충분히 사라진 경우에만 핀
        setPinned(rect.bottom < 80)
      },
      { threshold: 0 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  // LOT 바뀌면 닫기 상태 리셋 — 새 LOT은 다시 보여줘야 함
  useEffect(() => { setDismissed(false) }, [lot.id])
  const expand = () => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const current = lot.currentBid || lot.startingBid || 0
  const nextMin = Math.round(current * 1.05 / 1000) * 1000 || current + 1000
  const t = lot.endsAt ? timeUntil(lot.endsAt) : null
  const isCritical = t && !t.ended && t.totalMs < 1000 * 60 * 10
  const isUrgent = t && !t.ended && t.totalMs < 1000 * 60 * 60
  const img = lot.images?.[0] || lot.image
  const clockText = !t
    ? '상시 진행'
    : t.ended
    ? '방송 종료'
    : `${t.d > 0 ? `${t.d}D ` : ''}${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}:${String(t.s).padStart(2, '0')}`

  return (
    <>
    <section
      ref={containerRef}
      className="mt-4 relative rounded-2xl border-[3px] border-ink shadow-[0_8px_0_#1a1a1a] overflow-hidden"
      aria-label="라이브 방송 화면"
      style={{
        background: 'linear-gradient(180deg, #1a1a1a 0%, #0a0a0a 100%)',
      }}
    >
      {/* ── 상단 컨트롤 바 (TV 베젤 위) ────────────────────────── */}
      <div className="relative px-3 sm:px-4 py-2 flex items-center justify-between gap-2 border-b-2 border-electric/15 bg-ink">
        <div className="inline-flex items-center gap-2 min-w-0">
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[10px] font-extrabold uppercase tracking-[0.22em] text-paper"
            style={{
              background: '#dc2626',
              boxShadow: '0 0 12px rgba(220,38,38,0.7)',
              animation: 'pulse-live 1.6s ease-in-out infinite',
            }}
          >
            ● LIVE
          </span>
          <span className="font-mono text-[10px] sm:text-[11px] font-extrabold uppercase tracking-[0.22em] text-electric/85 truncate">
            CH.01 · POKÉ AUCTION
          </span>
          <SerialTag tone="dark">
            LOT-{String(lot.id || '').slice(-4).toUpperCase() || '0000'}
          </SerialTag>
        </div>

        <div className="inline-flex items-center gap-1.5 sm:gap-2.5">
          <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[10.5px] font-extrabold text-paper/90 tabular-nums">
            <Icon name="eye" size={11} strokeWidth={2.6} className="text-electric/80" />
            {viewers.toLocaleString()}
          </span>
          <button
            type="button"
            onClick={() => setMuted((v) => !v)}
            aria-label={muted ? '음소거 해제' : '음소거'}
            className="focus-ring w-7 h-7 rounded-md inline-flex items-center justify-center border border-electric/30 bg-ink hover:bg-ink/70 transition-colors"
          >
            <span className="text-electric/85 text-xs font-extrabold" aria-hidden="true">
              {muted ? '🔇' : '🔊'}
            </span>
          </button>
          <button
            type="button"
            aria-label="전체 화면"
            className="focus-ring w-7 h-7 rounded-md inline-flex items-center justify-center border border-electric/30 bg-ink hover:bg-ink/70 transition-colors"
          >
            <span className="text-electric/85 text-xs font-extrabold" aria-hidden="true">⛶</span>
          </button>
        </div>
      </div>

      {/* ── 16:9 비디오 영역 ──────────────────────────────────── */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: '16 / 9',
          background:
            'radial-gradient(120% 90% at 50% -10%, #1a2747 0%, #0a1126 60%, #050912 100%)',
        }}
      >
        {/* 스튜디오 핀스팟 — 천장 빛 */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none"
          style={{
            width: '65%',
            height: '95%',
            background:
              'conic-gradient(from 270deg at 50% 0%, transparent 0deg, rgba(250,204,21,0.16) 8deg, rgba(255,255,255,0.28) 12deg, rgba(250,204,21,0.16) 16deg, transparent 24deg)',
            filter: 'blur(6px)',
            animation: 'heal-breathe 4s ease-in-out infinite',
            transformOrigin: 'top center',
          }}
        />
        {/* 스튜디오 바닥 그라데이션 */}
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-0 right-0 h-1/3 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, transparent 0%, rgba(255,122,69,0.08) 60%, rgba(255,122,69,0.18) 100%)',
          }}
        />

        {/* 메인: 카드 (화면에 비춰지는 것처럼) */}
        <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
          {img ? (
            <div className="relative">
              {/* 헤일로 */}
              <span
                aria-hidden="true"
                className="absolute inset-0 -m-10 rounded-3xl pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(255,255,255,0.4) 0%, rgba(250,204,21,0.18) 30%, transparent 65%)',
                  filter: 'blur(12px)',
                }}
              />
              <img
                src={img}
                alt={lot.nameKo || lot.name}
                className="relative rounded-lg border-2 border-ink"
                style={{
                  maxHeight: 'min(58vh, 380px)',
                  boxShadow:
                    '0 18px 36px rgba(0,0,0,0.55), 0 0 0 4px #ffffff, 0 0 0 5.5px #1a1a1a',
                }}
              />
              {/* 발판 */}
              <div
                aria-hidden="true"
                className="absolute -bottom-5 left-1/2 -translate-x-1/2 w-[90%] h-3 rounded-full"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(0,0,0,0.55), transparent 70%)',
                }}
              />
            </div>
          ) : (
            <div className="w-40 h-56 rounded-lg bg-bone-2 border-2 border-ink" />
          )}
        </div>

        {/* CRT 스캔라인 */}
        <span
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px)',
          }}
        />
        {/* 비네팅 */}
        <span
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(120% 120% at 50% 50%, transparent 55%, rgba(0,0,0,0.35) 100%)',
          }}
        />
        {/* flicker */}
        <span
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none bg-electric/5"
          style={{ animation: 'crt-flicker 4s steps(1) infinite' }}
        />

        {/* PIP: 우상단 진행자 캠 (포켓볼 마크) */}
        <div className="absolute top-3 right-3 z-10">
          <div
            className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-paper/85 overflow-hidden shadow-[0_3px_8px_rgba(0,0,0,0.6)]"
            style={{
              background:
                'radial-gradient(circle at 50% 30%, #2a3a6a 0%, #0d1730 70%)',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <PokeballMark size={40} />
            </div>
            <span className="absolute bottom-0 inset-x-0 bg-ink/85 text-paper text-[8.5px] font-mono font-extrabold tracking-[0.18em] uppercase text-center py-0.5">
              진행자
            </span>
          </div>
        </div>

        {/* 좌상단 NOW BIDDING 칩 (현장감) */}
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] bg-ink/75 backdrop-blur-sm text-electric border border-electric/40">
            <LiveDot size={5} color="#facc15" />
            NOW BIDDING
          </span>
        </div>

        {/* ── 로어서드 자막 — 방송 TV 톤 ──────────────────────── */}
        <div className="absolute left-0 right-0 bottom-0 z-10 px-3 sm:px-5 py-3 sm:py-4">
          <div className="flex items-end justify-between gap-3 flex-wrap">
            {/* 좌: 카드명 + 등급 */}
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-fire text-paper font-mono text-[10px] font-extrabold uppercase tracking-[0.22em] border-2 border-ink">
                {lot.set || lot.setShort || 'POKÉMON TCG'}
              </div>
              <h2
                className="mt-1 font-display font-extrabold text-paper leading-tight truncate drop-shadow-[0_2px_0_#000]"
                style={{ fontSize: 'clamp(20px, 3.4vw, 30px)' }}
              >
                {lot.nameKo || lot.name}
                {lot.grade?.grade != null && (
                  <span
                    className="ml-2 align-middle font-mono text-[12px] sm:text-sm font-extrabold px-1.5 py-0.5 rounded border-2 border-electric text-electric"
                    style={{ textShadow: '0 0 6px rgba(250,204,21,0.55)' }}
                  >
                    {lot.grade.cert || 'PSA'} {lot.grade.grade}
                  </span>
                )}
              </h2>
            </div>

            {/* 우: BID + TIME LED */}
            <div className="inline-flex items-stretch gap-2 sm:gap-3">
              <div
                className="rounded-md border-2 border-ink px-2.5 sm:px-3 py-1.5 sm:py-2"
                style={{
                  background: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(2px)',
                }}
              >
                <div className="font-mono text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.22em] text-electric/70 text-right">
                  CURRENT BID
                </div>
                <div
                  className="font-mono font-extrabold tabular-nums leading-none text-right"
                  style={{
                    color: '#ffb347',
                    textShadow: '0 0 10px rgba(255,179,71,0.7), 0 0 18px rgba(255,179,71,0.45)',
                    fontSize: 'clamp(20px, 4vw, 32px)',
                  }}
                >
                  {formatKRWFull(current).replace('₩', '₩ ')}
                </div>
              </div>

              <div
                className="rounded-md border-2 border-ink px-2.5 sm:px-3 py-1.5 sm:py-2"
                style={{
                  background: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(2px)',
                  animation: isCritical ? 'shake-soft 0.6s ease-in-out infinite' : undefined,
                }}
              >
                <div className="font-mono text-[9px] sm:text-[10px] font-extrabold uppercase tracking-[0.22em] text-electric/70 text-right">
                  TIME LEFT
                </div>
                <div
                  className="font-mono font-extrabold tabular-nums leading-none text-right"
                  style={{
                    color: isCritical ? '#ff6b6b' : isUrgent ? '#ffb347' : '#facc15',
                    textShadow: isCritical
                      ? '0 0 10px rgba(255,107,107,0.7)'
                      : '0 0 10px rgba(250,204,21,0.55)',
                    fontSize: 'clamp(18px, 3vw, 26px)',
                  }}
                >
                  {clockText}
                </div>
              </div>

              {/* 방송 화면 안 큰 입찰 CTA (현장 즉시 입찰) */}
              {onBid && (
                <button
                  type="button"
                  onClick={onBid}
                  className="focus-ring relative overflow-hidden inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-md font-extrabold text-sm sm:text-base border-2 border-ink shadow-[0_3px_0_#1a1a1a] hover:-translate-y-0.5 hover:shadow-[0_4px_0_#1a1a1a] active:translate-y-0 active:shadow-[0_1px_0_#1a1a1a] transition-all bg-fire text-paper"
                  aria-label="지금 입찰 참여하기"
                >
                  <Icon name="gavel" size={14} strokeWidth={2.6} />
                  지금 입찰
                  <span
                    aria-hidden="true"
                    className="absolute top-0 left-0 h-full w-1/3 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                      animation: 'shine-sweep 3.4s ease-in-out infinite',
                    }}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 하단 티커 (마키 형식 보조 데이터) ────────────────── */}
      <div className="relative bg-ink border-t-2 border-electric/15 overflow-hidden">
        <div
          className="flex items-center gap-8 px-4 py-2 whitespace-nowrap font-mono text-[11px] font-extrabold uppercase tracking-[0.18em] text-electric/85"
          style={{ animation: 'ticker-slide 28s linear infinite' }}
        >
          <span>
            <span className="text-electric/60">NEXT MIN BID</span>{' '}
            <span className="text-electric tabular-nums" style={{ textShadow: '0 0 6px rgba(250,204,21,0.5)' }}>
              {formatKRWFull(nextMin)}
            </span>
          </span>
          <span className="text-electric/30">●</span>
          <span>
            <span className="text-electric/60">TOTAL BIDS</span>{' '}
            <span className="text-paper tabular-nums">{lot.bidCount || 0}</span>
          </span>
          <span className="text-electric/30">●</span>
          <span>
            <span className="text-electric/60">VIEWERS</span>{' '}
            <span className="text-paper tabular-nums">{viewers.toLocaleString()}</span>
          </span>
          <span className="text-electric/30">●</span>
          <span>
            <span className="text-electric/60">ALL LOTS TODAY</span>{' '}
            <span className="text-paper tabular-nums">{String(liveCount).padStart(2, '0')}</span>
          </span>
          <span className="text-electric/30">●</span>
          <span className="text-fire">
            정품 인증 · 안전 결제 · 입찰 보호
          </span>
          <span className="text-electric/30">●</span>
          {/* 한번 더 반복 (seamless loop 보조) */}
          <span>
            <span className="text-electric/60">NEXT MIN BID</span>{' '}
            <span className="text-electric tabular-nums">{formatKRWFull(nextMin)}</span>
          </span>
          <span className="text-electric/30">●</span>
          <span>
            <span className="text-electric/60">TOTAL BIDS</span>{' '}
            <span className="text-paper tabular-nums">{lot.bidCount || 0}</span>
          </span>
        </div>
      </div>
    </section>

    {/* 미니 플레이어 — 본 화면이 화면 밖으로 스크롤되면 우하단으로 핀 */}
    {pinned && !dismissed && (
      <MiniBroadcastPlayer
        lot={lot}
        viewers={viewers}
        current={current}
        clockText={clockText}
        isCritical={isCritical}
        isUrgent={isUrgent}
        onBid={onBid}
        onClose={() => setDismissed(true)}
        onExpand={expand}
      />
    )}
    </>
  )
}

// ─── 미니 플레이어 (YouTube/네이버 쇼핑라이브 톤) ──────────────
//   - lg+ 에서만 노출 (mobile은 이미 sticky CTA가 있음)
//   - 우하단 고정, 280px 폭, 16:9 미니 비디오
//   - 클릭 → 본 방송으로 부드럽게 스크롤
//   - X 버튼 → 세션 동안 숨김 (LOT 바뀌면 다시 등장)
//   - 미니 안 "지금 입찰" 빨강 버튼 → 동일 시트
function MiniBroadcastPlayer({
  lot, viewers, current, clockText, isCritical, isUrgent, onBid, onClose, onExpand,
}) {
  const img = lot.images?.[0] || lot.image
  return (
    <div
      className="hidden lg:block fixed bottom-4 right-4 z-50 w-[300px] rounded-xl border-2 border-ink overflow-hidden"
      style={{
        background: '#0a0a0a',
        boxShadow: '0 10px 30px rgba(0,0,0,0.55), 0 0 0 1px rgba(250,204,21,0.12)',
        animation: 'mini-pop 0.28s ease-out',
      }}
      role="region"
      aria-label="라이브 미니 플레이어"
    >
      {/* 상단 베젤 — LIVE + 컨트롤 */}
      <div className="px-2.5 py-1.5 flex items-center justify-between gap-2 bg-ink border-b border-electric/15">
        <span
          className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded font-mono text-[9px] font-extrabold uppercase tracking-[0.2em] text-paper"
          style={{
            background: '#dc2626',
            boxShadow: '0 0 8px rgba(220,38,38,0.7)',
            animation: 'pulse-live 1.6s ease-in-out infinite',
          }}
        >
          ● LIVE
        </span>
        <span className="font-mono text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-electric/70 tabular-nums">
          <Icon name="eye" size={9} strokeWidth={2.6} className="inline -mt-0.5 mr-0.5 text-electric/80" />
          {viewers.toLocaleString()}
        </span>
        <div className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={onExpand}
            aria-label="원래 크기로 보기"
            className="focus-ring w-6 h-6 rounded inline-flex items-center justify-center border border-electric/30 hover:bg-ink/60 transition-colors"
          >
            <span className="text-electric/85 text-[11px] font-extrabold" aria-hidden="true">⤢</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="미니 플레이어 닫기"
            className="focus-ring w-6 h-6 rounded inline-flex items-center justify-center border border-electric/30 hover:bg-ink/60 transition-colors"
          >
            <Icon name="close" size={9} strokeWidth={3} className="text-electric/85" />
          </button>
        </div>
      </div>

      {/* 미니 비디오 — 클릭하면 본 방송으로 스크롤 */}
      <button
        type="button"
        onClick={onExpand}
        className="focus-ring relative block w-full overflow-hidden text-left"
        style={{ aspectRatio: '16 / 9' }}
        aria-label="라이브 방송 펼치기"
      >
        {/* 스튜디오 백드롭 */}
        <span
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(120% 90% at 50% -10%, #1a2747 0%, #0a1126 60%, #050912 100%)',
          }}
        />
        {/* 핀스팟 */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none"
          style={{
            width: '60%',
            height: '95%',
            background:
              'conic-gradient(from 270deg at 50% 0%, transparent 0deg, rgba(250,204,21,0.16) 10deg, rgba(255,255,255,0.28) 14deg, rgba(250,204,21,0.16) 18deg, transparent 26deg)',
            filter: 'blur(4px)',
            animation: 'heal-breathe 4s ease-in-out infinite',
            transformOrigin: 'top center',
          }}
        />
        {/* 카드 이미지 */}
        {img && (
          <div className="absolute inset-0 flex items-center justify-center p-3">
            <img
              src={img}
              alt=""
              className="max-h-full rounded border border-paper/40"
              style={{ boxShadow: '0 6px 14px rgba(0,0,0,0.55)' }}
            />
          </div>
        )}
        {/* 스캔라인 */}
        <span
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 3px)',
          }}
        />
        {/* 좌상단 NOW BIDDING 작은 칩 */}
        <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-mono font-extrabold uppercase tracking-[0.18em] bg-ink/80 text-electric border border-electric/30">
          <LiveDot size={4} color="#facc15" />
          NOW BIDDING
        </span>
      </button>

      {/* 미니 자막 + 가격 */}
      <div className="px-2.5 py-2 bg-ink border-t border-electric/10">
        <div className="font-display text-[12.5px] font-extrabold text-paper truncate">
          {lot.nameKo || lot.name}
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-2">
          <span
            className="font-mono font-extrabold tabular-nums"
            style={{
              color: '#ffb347',
              textShadow: '0 0 6px rgba(255,179,71,0.6)',
              fontSize: '13.5px',
            }}
          >
            {formatKRWFull(current).replace('₩', '₩ ')}
          </span>
          <span
            className="font-mono text-[10px] font-extrabold tabular-nums"
            style={{
              color: isCritical ? '#ff6b6b' : isUrgent ? '#ffb347' : '#facc15',
              textShadow: isCritical
                ? '0 0 6px rgba(255,107,107,0.6)'
                : '0 0 6px rgba(250,204,21,0.5)',
              animation: isCritical ? 'shake-soft 0.6s ease-in-out infinite' : undefined,
            }}
          >
            ⏱ {clockText}
          </span>
        </div>
      </div>

      {/* 미니 CTA */}
      {onBid && (
        <button
          type="button"
          onClick={onBid}
          className="focus-ring relative overflow-hidden w-full inline-flex items-center justify-center gap-1.5 py-2.5 font-extrabold text-sm border-t-2 border-ink bg-fire text-paper hover:bg-fire/90 active:bg-fire/80 transition-colors"
          aria-label="지금 입찰 참여하기"
        >
          <Icon name="gavel" size={13} strokeWidth={2.6} />
          지금 입찰하기
          <span
            aria-hidden="true"
            className="absolute top-0 left-0 h-full w-1/3 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
              animation: 'shine-sweep 3.4s ease-in-out infinite',
            }}
          />
        </button>
      )}
    </div>
  )
}

function CompactHeroStrip({ liveCount, onOpenAll, disabled }) {
  return (
    <header
      className="relative overflow-hidden rounded-2xl border-2 border-ink bg-paper shadow-[0_4px_0_#1a1a1a]"
      aria-label="라이브 경매장 헤더"
    >
      <div className="bg-fire px-4 sm:px-5 py-3 flex items-center justify-between gap-3 flex-wrap border-b-2 border-ink">
        <div className="flex items-center gap-3 min-w-0">
          <PokeballMark size={40} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.18em] bg-paper text-fire border-2 border-ink">
                <LiveDot size={5} color="#ff7a45" />
                ON AIR
              </span>
              <span className="font-mono text-[10px] font-extrabold tracking-[0.18em] uppercase text-paper/85">
                LIVE AUCTION · 정품 인증
              </span>
            </div>
            <h1 className="mt-0.5 font-display text-xl sm:text-2xl font-extrabold text-paper tracking-tight leading-tight">
              두근두근 라이브 경매장
            </h1>
            <div className="mt-0.5 inline-flex items-center gap-2 text-[11px] font-bold text-paper/85">
              <CounterPokeballs liveCount={liveCount} />
              <span>
                지금 <span className="text-paper font-extrabold tabular-nums">{liveCount}</span>건이 진행 중이에요
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAll}
          disabled={disabled}
          className="focus-ring relative inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-ink text-electric border-2 border-ink shadow-[0_3px_0_#1a1a1a] hover:-translate-y-0.5 hover:shadow-[0_4px_0_#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-extrabold text-sm"
          aria-label={`전체 LOT 보기, ${liveCount}건`}
        >
          <Icon name="layers" size={14} strokeWidth={2.4} />
          오늘의 LOT
          <span className="ml-0.5 inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-electric text-ink font-mono text-[10.5px] font-bold tabular-nums border-2 border-electric">
            {liveCount}
          </span>
        </button>
      </div>
    </header>
  )
}

// ═══════════════════════════════════════════════════════════════
// 회복기(Healing Machine) 도크 — 포켓몬센터 카운터 뒤편 회복기 모티프
//   - 천장에서 떨어지는 빛 기둥 (콘 그라데이션)
//   - 카드 좌우 회복 포드 2개 (포켓볼 슬롯처럼)
//   - 발판(plinth) 그림자 + 빛 반사
//   - 시청자 수 칩 (라이브 분위기)
// ═══════════════════════════════════════════════════════════════
function HealingStage({ img, alt, viewers, lotId }) {
  return (
    <div
      className="relative aspect-[4/5] sm:aspect-auto sm:min-h-[440px] overflow-hidden border-b-2 sm:border-b-0 sm:border-r-2 border-ink"
      style={{
        background: `
          radial-gradient(120% 80% at 50% -10%, rgba(255,122,69,0.22) 0%, transparent 55%),
          linear-gradient(180deg, #fff6e8 0%, #fbf7ec 55%, #f1e9d5 100%)
        `,
      }}
    >
      {/* 천장 빛 기둥 — 회복기 위쪽에서 떨어지는 핀스팟 */}
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-0 -translate-x-1/2 pointer-events-none"
        style={{
          width: '70%',
          height: '90%',
          background:
            'conic-gradient(from 270deg at 50% 0%, transparent 0deg, rgba(250,204,21,0.16) 8deg, rgba(255,255,255,0.32) 12deg, rgba(250,204,21,0.16) 16deg, transparent 24deg)',
          filter: 'blur(6px)',
          animation: 'heal-breathe 3.6s ease-in-out infinite',
          transformOrigin: 'top center',
        }}
      />
      {/* 부드러운 살구색 스캔 */}
      <span
        className="absolute left-0 right-0 h-24 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, transparent, rgba(255,122,69,0.18), transparent)',
          animation: 'scan-soft 6s linear infinite',
        }}
        aria-hidden="true"
      />

      {/* 상단 좌측 — 시청자 수 (라이브 분위기) */}
      <div className="absolute top-3 left-3 z-10">
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-mono text-[10px] font-bold text-ink bg-paper/95 border-2 border-ink shadow-[0_2px_0_#1a1a1a]">
          <Icon name="eye" size={11} strokeWidth={2.4} />
          <span className="tabular-nums">{viewers.toLocaleString()}</span>
          <span className="text-mute">명 시청</span>
        </span>
      </div>

      {/* 상단 우측 — LOT 일련번호 (감정서 톤) */}
      <div className="absolute top-3 right-3 z-10">
        <SerialTag>
          LOT-{String(lotId || '').slice(-4).toUpperCase() || '0000'}
        </SerialTag>
      </div>

      {/* 회복 포드 좌우 2개 — 카드 양옆 작은 빛 도트 (포켓볼 슬롯) */}
      <span
        aria-hidden="true"
        className="absolute left-[14%] top-1/2 -translate-y-1/2 z-0 w-3 h-3 rounded-full border-2 border-ink"
        style={{
          background: POKEBALL_BG,
          boxShadow: '0 0 0 3px rgba(255,122,69,0.18), 0 0 14px rgba(255,122,69,0.45)',
          animation: 'counter-glow 2s ease-in-out infinite',
        }}
      />
      <span
        aria-hidden="true"
        className="absolute right-[14%] top-1/2 -translate-y-1/2 z-0 w-3 h-3 rounded-full border-2 border-ink"
        style={{
          background: POKEBALL_BG,
          boxShadow: '0 0 0 3px rgba(255,122,69,0.18), 0 0 14px rgba(255,122,69,0.45)',
          animation: 'counter-glow 2s ease-in-out 0.6s infinite',
        }}
      />

      {/* 카드 이미지 — 중앙 큰 비주얼 */}
      <div className="absolute inset-0 flex items-center justify-center p-5 sm:p-6 z-[5]">
        {img ? (
          <div className="relative">
            {/* 헤일로 */}
            <span
              aria-hidden="true"
              className="absolute inset-0 -m-6 rounded-2xl pointer-events-none"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(255,255,255,0.55) 0%, rgba(255,122,69,0.18) 35%, transparent 70%)',
                filter: 'blur(8px)',
              }}
            />
            <img
              src={img}
              alt={alt}
              className="relative max-h-[320px] sm:max-h-[360px] rounded-lg border-2 border-ink"
              style={{
                boxShadow:
                  '0 14px 28px rgba(13,23,48,0.28), 0 0 0 4px #ffffff, 0 0 0 5.5px #1a1a1a',
              }}
            />
            {/* 발판 — 회복기 도크 받침 */}
            <div
              aria-hidden="true"
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-[88%] h-3 rounded-full"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(13,23,48,0.32), transparent 72%)',
              }}
            />
            <div
              aria-hidden="true"
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[64%] h-1.5 rounded-full bg-ink/30"
            />
          </div>
        ) : (
          <div className="w-40 h-56 rounded-lg bg-bone-2 border-2 border-ink" />
        )}
      </div>

      {/* 바닥 타일 그릴 (회복기 받침대 라인) */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-8"
        style={{
          background:
            'linear-gradient(180deg, transparent 0%, rgba(13,23,48,0.06) 40%, rgba(13,23,48,0.16) 100%)',
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent 0 14px, rgba(13,23,48,0.08) 14px 15px)',
        }}
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 2) Featured LOT — 정보 위계 재배치 (시간 → 가격 → CTA)
// ═══════════════════════════════════════════════════════════════
function FeaturedLot({ lot, onBid }) {
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

  return (
    <section
      className="relative overflow-hidden rounded-2xl border-2 border-ink bg-paper shadow-[0_6px_0_#1a1a1a]"
      aria-label={`라이브 LOT: ${lot.nameKo || lot.name}`}
    >
      <div className="grid sm:grid-cols-[1.2fr_1fr] gap-0">
        {/* ── 카드 이미지 = 라이브 단상 (핀스팟 + 헤일로 + 발판) ── */}
        <HealingStage
          img={img}
          alt={lot.nameKo || lot.name}
          viewers={viewers}
          lotId={lot.id}
        />

        {/* ── 가격 → CTA → 신뢰 ── */}
        <CounterReceipt
          lot={lot}
          current={current}
          nextMin={nextMin}
          viewers={viewers}
          onBid={onBid}
        />
      </div>
    </section>
  )
}

// ─── 포켓몬센터 카운터 영수증 패널 ─────────────────────────────
//   - 영수증 톱니 외곽 (받침 라인)
//   - 큰 가격 숫자 (rolodex 톤)
//   - 회복(=입찰) 버튼: 빨강 + 광택 스윕
//   - 신뢰 배지 (정품/안전/입찰보호)
function CounterReceipt({ lot, current, nextMin, viewers, onBid }) {
  return (
    <div
      className="relative p-5 sm:p-6 flex flex-col gap-4 bg-paper"
      style={{
        backgroundImage:
          'linear-gradient(180deg, #ffffff 0%, #fbf7ec 100%)',
      }}
    >
      {/* 영수증 톱니 (모바일에선 상단, 데스크탑에선 좌측) */}
      <span
        aria-hidden="true"
        className="hidden sm:block absolute left-0 top-3 bottom-3 w-2"
        style={{
          backgroundImage:
            'radial-gradient(circle at left center, #fbf7ec 5px, transparent 5px)',
          backgroundSize: '8px 12px',
          backgroundRepeat: 'repeat-y',
        }}
      />

      {/* 카드명 + 감정 등급 */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <SerialTag>
            {lot.set || lot.setShort || 'POKÉMON TCG'}
          </SerialTag>
          <span className="font-mono text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-mute">
            · NO.{String(lot.number || '').padStart(3, '0') || '???'}
          </span>
        </div>
        <h2 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-ink leading-tight">
          {lot.nameKo || lot.name}
        </h2>
        {lot.grade?.grade != null && (
          <div className="mt-2 inline-flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-electric text-ink font-mono text-[11px] font-extrabold border-2 border-ink shadow-[0_2px_0_#1a1a1a]">
              {lot.grade.cert || 'PSA'} · {lot.grade.grade}
            </span>
            <span className="text-[10.5px] text-mute font-bold">감정 완료</span>
          </div>
        )}
      </div>

      {/* 위계 3: 현재가 — 페이지에서 가장 큰 숫자 (영수증 강조 라인) */}
      <div
        className="rounded-xl border-2 border-ink bg-paper shadow-[0_3px_0_#1a1a1a] p-3 sm:p-4"
        style={{
          backgroundImage:
            'repeating-linear-gradient(180deg, transparent 0 22px, rgba(13,23,48,0.04) 22px 23px)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10.5px] font-mono font-extrabold uppercase tracking-[0.18em] text-mute">
            현재 입찰가
          </span>
          <MetaChip icon="user">
            {lot.bidCount || 0}회
          </MetaChip>
        </div>
        <div
          className="mt-0.5 font-display font-extrabold text-ink leading-[1] tabular-nums"
          style={{ fontSize: 'clamp(30px, 5.4vw, 44px)' }}
        >
          {formatKRWFull(current)}
        </div>
        <div className="mt-1.5 flex items-baseline gap-2 flex-wrap text-[11.5px]">
          <Icon name="arrow" size={11} strokeWidth={2.6} className="text-grass" />
          <span className="text-mute font-bold">다음 최소 입찰</span>
          <span className="font-mono font-extrabold text-grass tabular-nums">
            {formatKRWFull(nextMin)}
          </span>
        </div>
      </div>

      {/* 위계 4: 회복(=입찰) 버튼 — 광택 스윕 */}
      <button
        type="button"
        onClick={onBid}
        className="focus-ring group relative w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-extrabold text-base sm:text-lg border-2 border-ink shadow-[0_5px_0_#1a1a1a] hover:-translate-y-1 hover:shadow-[0_6px_0_#1a1a1a] active:translate-y-0 active:shadow-[0_2px_0_#1a1a1a] transition-all bg-fire text-paper overflow-hidden"
        aria-label="입찰 참여하기"
      >
        <Icon name="gavel" size={18} strokeWidth={2.6} />
        지금 입찰 참여하기
        <Icon
          name="arrow"
          size={16}
          strokeWidth={2.6}
          className="ml-0.5 transition-transform group-hover:translate-x-0.5"
        />
        {/* 대각 광택 스윕 — 회복기 LED 라인 느낌 */}
        <span
          aria-hidden="true"
          className="absolute top-0 left-0 h-full w-1/3 pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
            animation: 'shine-sweep 3.4s ease-in-out infinite',
          }}
        />
      </button>
      <div className="text-center text-[11px] font-bold text-mute leading-relaxed">
        지금 <span className="text-fire font-extrabold">{viewers.toLocaleString()}명</span>이 함께 지켜보는 중
        <br className="sm:hidden" />
        <span className="hidden sm:inline"> · </span>
        클릭하면 안전한 입찰 화면으로 이동해요
      </div>

      {/* 위계 5: 신뢰 배지 */}
      <TrustBadges />
    </div>
  )
}

// ── 카운트다운 배너 — 위계 #1, LED 디지트 디스플레이 ───────────
function CountdownBanner({ t, isCritical, isUrgent }) {
  if (!t) {
    return (
      <div className="bg-ink px-4 py-2.5 flex items-center justify-center border-b-2 border-ink">
        <span className="inline-flex items-center gap-2 font-mono text-[11px] font-extrabold uppercase tracking-[0.18em] text-electric">
          <LiveDot size={5} color="#facc15" />
          상시 입찰 · 마감 기한 없음
        </span>
      </div>
    )
  }
  if (t.ended) {
    return (
      <div className="bg-ink/90 px-4 py-2.5 flex items-center justify-center border-b-2 border-ink">
        <span className="font-mono text-[11px] font-extrabold uppercase tracking-[0.18em] text-mute-2">
          ⛔ 카운터 마감 · 경매가 종료되었어요
        </span>
      </div>
    )
  }
  const bg = isCritical ? 'bg-rose' : isUrgent ? 'bg-fire' : 'bg-ink'
  const tone = isCritical ? 'critical' : isUrgent ? 'urgent' : 'calm'
  return (
    <div
      className={`${bg} px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-center gap-3 flex-wrap border-b-2 border-ink`}
      style={isCritical ? { animation: 'shake-soft 0.6s ease-in-out infinite' } : undefined}
      aria-live={isCritical ? 'assertive' : 'polite'}
    >
      <DigitClock t={t} tone={tone} />
    </div>
  )
}

// ── 신뢰 배지 — 회복 도크 스타일 (포켓몬센터 정품 인증) ──────────
function TrustBadges() {
  return (
    <ul className="grid grid-cols-3 gap-1.5" aria-label="신뢰 보증">
      <TrustItem icon="shield" title="정품 인증" sub="PSA/CGC" tone="grass" />
      <TrustItem icon="lock"   title="안전 결제" sub="에스크로" tone="water" />
      <TrustItem icon="check"  title="입찰 보호" sub="자동 환불" tone="fire" />
    </ul>
  )
}
function TrustItem({ icon, title, sub, tone = 'grass' }) {
  const toneColor =
    tone === 'water' ? '#3b82f6' : tone === 'fire' ? '#ff7a45' : '#22a06b'
  return (
    <li
      className="inline-flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-lg bg-paper border-2 border-ink/15 hover:border-ink/35 transition-colors"
      style={{
        backgroundImage: `linear-gradient(180deg, ${toneColor}0d, transparent 60%)`,
      }}
    >
      <span
        className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 border-ink"
        style={{
          background: `${toneColor}18`,
          boxShadow: `inset 0 -2px 0 ${toneColor}28`,
        }}
        aria-hidden="true"
      >
        <Icon name={icon} size={14} strokeWidth={2.4} style={{ color: toneColor }} />
      </span>
      <span className="mt-0.5 text-[10.5px] font-extrabold text-ink leading-tight">{title}</span>
      <span className="text-[9.5px] font-mono text-mute uppercase tracking-wider">{sub}</span>
    </li>
  )
}

// ═══════════════════════════════════════════════════════════════
// 3) Sidebar — 포켓몬센터 카운터 + 빌의 PC 모니터
//    - 위: 다음 LOT (카운터 위 포켓볼 줄지어 대기)
//    - 아래: 입찰 피드 (빌의 PC CRT 모니터 톤)
// ═══════════════════════════════════════════════════════════════
function LiveSidebar({ featured, upcoming, onPickLot, onOpenAll, userBidEvent }) {
  return (
    <aside className="flex flex-col gap-4 lg:max-h-[calc(100vh-9rem)] lg:overflow-hidden lg:sticky lg:top-24">
      {/* 다음 LOT — 카운터 줄 */}
      <div className="rounded-xl border-2 border-ink bg-paper shadow-[0_4px_0_#1a1a1a] overflow-hidden">
        <SectionHeader
          icon="layers"
          title="다음 LOT"
          meta={`${upcoming.length}건 대기`}
        />
        <ul className="divide-y divide-ink/10">
          {upcoming.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-mute font-bold">
              대기 중인 LOT이 없어요.
            </li>
          )}
          {upcoming.map((c, i) => {
            const t = c.endsAt ? timeUntil(c.endsAt) : null
            const img = c.images?.[0] || c.image
            const urgent = t && !t.ended && t.totalMs < 1000 * 60 * 60
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onPickLot(c.id)}
                  className="focus-ring w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-electric/20 transition-colors"
                  aria-label={`${c.nameKo || c.name} 메인 화면에 띄우기`}
                >
                  {/* 줄지어선 포켓볼 슬롯 번호 */}
                  <span className="relative shrink-0">
                    <PokeballMark size={20} animated={false} />
                    <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 font-mono text-[8.5px] font-extrabold text-mute tabular-nums">
                      {String(i + 2).padStart(2, '0')}
                    </span>
                  </span>
                  <span className="w-10 h-12 rounded-md bg-bone-2 border-2 border-ink overflow-hidden shrink-0">
                    {img && <img src={img} alt="" className="w-full h-full object-cover" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-extrabold text-ink truncate">
                      {c.nameKo || c.name}
                    </span>
                    <span className="block text-[10.5px] font-mono text-mute truncate tabular-nums">
                      {formatKRW(c.currentBid || c.startingBid || 0)} · {c.bidCount || 0}회
                    </span>
                  </span>
                  {t && !t.ended && (
                    <span
                      className={`font-mono text-[10px] font-extrabold tabular-nums shrink-0 ${
                        urgent ? 'text-fire' : 'text-mute'
                      }`}
                    >
                      {urgent && <LiveDot size={4} />}{' '}
                      {t.d > 0 ? `${t.d}D` : `${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`}
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
          className="focus-ring w-full text-center py-2.5 text-[11px] font-extrabold uppercase tracking-[0.18em] text-ink border-t-2 border-ink/10 hover:bg-electric/20 transition-colors"
        >
          오늘의 전체 LOT 보기 →
        </button>
      </div>

      {/* 입찰 피드 — 실시간 입찰 모니터 */}
      <BidFeed lot={featured} userBidEvent={userBidEvent} />
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

function BidFeed({ lot, userBidEvent }) {
  const seedRef = useRef(Math.max(1000, lot.currentBid || 0))
  const [items, setItems] = useState(() => [
    { id: 'sys', sys: true, msg: `시작가 ${formatKRWFull(seedRef.current)}부터 입찰을 받아요`, t: Date.now() },
  ])

  useEffect(() => {
    seedRef.current = Math.max(1000, lot.currentBid || 0)
    setItems([{ id: `sys-${lot.id}`, sys: true, msg: `${lot.nameKo || lot.name} 라이브 시작!`, t: Date.now() }])
  }, [lot.id, lot.currentBid, lot.nameKo, lot.name])

  // 내 입찰 — 모달에서 성공 콜백 → 피드에 강조 메시지
  useEffect(() => {
    if (!userBidEvent || userBidEvent.lotId !== lot.id) return
    seedRef.current = Math.max(seedRef.current, userBidEvent.amount)
    setItems((arr) => [
      ...arr.slice(-30),
      {
        id: userBidEvent.id,
        kind: 'me',
        who: '나의 입찰',
        amt: userBidEvent.amount,
        t: userBidEvent.t,
      },
    ])
  }, [userBidEvent, lot.id])

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
      {/* 실시간 입찰 모니터 — CRT 헤더 베젤 */}
      <div className="bg-ink px-4 py-2.5 flex items-center justify-between border-b-2 border-ink">
        <div className="inline-flex items-center gap-2 text-electric">
          <LiveDot size={6} color="#facc15" />
          <span className="font-display text-sm font-extrabold tracking-tight">
            실시간 입찰 모니터
          </span>
        </div>
        <span className="font-mono text-[10px] font-bold text-electric/70 tabular-nums uppercase tracking-[0.18em]">
          LIVE
        </span>
      </div>
      {/* CRT 화면 — 스캔라인 오버레이 + 다크 톤 */}
      <div className="relative flex-1 lg:min-h-0">
        <div
          ref={scrollRef}
          className="relative h-60 lg:absolute lg:inset-0 overflow-y-auto px-3 py-3 scrollbar-none flex flex-col gap-1.5"
          role="log"
          aria-live="polite"
          aria-label="실시간 입찰 메시지"
          style={{
            background:
              'radial-gradient(120% 90% at 50% 0%, #1a2747 0%, #0d1730 60%, #08101f 100%)',
          }}
        >
          {items.map((it) => (
            <FeedRow key={it.id} item={it} />
          ))}
          {/* CRT 스캔라인 */}
          <span
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none mix-blend-overlay"
            style={{
              backgroundImage:
                'repeating-linear-gradient(180deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 3px)',
            }}
          />
          {/* CRT flicker */}
          <span
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none bg-electric/5"
            style={{ animation: 'crt-flicker 4s steps(1) infinite' }}
          />
        </div>
      </div>
    </div>
  )
}

function FeedRow({ item }) {
  if (item.kind === 'me') {
    return (
      <div
        className="relative z-10 flex items-center justify-between gap-2 px-2.5 py-2 rounded-md border-2 border-electric"
        style={{
          animation: 'bid-pop 0.3s ease-out',
          background:
            'linear-gradient(90deg, rgba(250,204,21,0.18), rgba(250,204,21,0.05))',
          boxShadow: '0 0 0 1px rgba(250,204,21,0.35), 0 0 12px rgba(250,204,21,0.35)',
        }}
      >
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span
            className="w-5 h-5 rounded-full grid place-items-center font-mono text-[9px] font-extrabold bg-electric text-ink border-2 border-ink shrink-0"
            aria-hidden="true"
          >
            ★
          </span>
          <span className="text-[12px] font-extrabold text-electric truncate"
            style={{ textShadow: '0 0 6px rgba(250,204,21,0.55)' }}>
            {item.who}
          </span>
        </span>
        <span className="font-mono text-[12.5px] font-extrabold text-electric tabular-nums"
          style={{ textShadow: '0 0 6px rgba(250,204,21,0.55)' }}>
          {formatKRWFull(item.amt)}
        </span>
      </div>
    )
  }
  if (item.sys) {
    return (
      <div
        className="relative z-10 px-2.5 py-1.5 rounded-md text-center font-mono text-[10.5px] font-extrabold text-electric bg-electric/10 border border-electric/30"
        style={{
          animation: 'bid-pop 0.3s ease-out',
          textShadow: '0 0 8px rgba(250,204,21,0.45)',
        }}
      >
        ▸ {item.msg}
      </div>
    )
  }
  if (item.kind === 'react') {
    return (
      <div
        className="relative z-10 inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-paper/70"
        style={{ animation: 'bid-pop 0.3s ease-out' }}
      >
        <span className="text-paper">{item.who}</span>
        <span aria-hidden="true">{item.r}</span>
      </div>
    )
  }
  // bid
  return (
    <div
      className="relative z-10 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-ink/40 border border-electric/20"
      style={{
        animation: 'bid-pop 0.3s ease-out',
        boxShadow: 'inset 0 0 0 1px rgba(250,204,21,0.08)',
      }}
    >
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <span
          className="w-5 h-5 rounded-full grid place-items-center font-mono text-[9px] font-extrabold bg-fire text-paper border-2 border-ink shrink-0"
          aria-hidden="true"
          style={{ boxShadow: '0 0 8px rgba(255,122,69,0.55)' }}
        >
          ₩
        </span>
        <span className="text-[11.5px] font-extrabold text-paper truncate">{item.who}</span>
      </span>
      <span className="font-mono text-[12px] font-extrabold text-electric tabular-nums"
        style={{ textShadow: '0 0 6px rgba(250,204,21,0.45)' }}>
        {formatKRWFull(item.amt)}
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 모바일 sticky CTA — 회복기 톤 (포켓볼 마크 + 광택 스윕)
// ═══════════════════════════════════════════════════════════════
function MobileStickyCta({ lot, onBid }) {
  const current = lot.currentBid || lot.startingBid || 0
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2 bg-paper/95 backdrop-blur-sm border-t-2 border-ink">
      <div className="flex items-center gap-3">
        <PokeballMark size={32} />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-mono font-extrabold uppercase tracking-[0.18em] text-mute inline-flex items-center gap-1">
            <LiveDot size={4} />
            현재 입찰가
          </div>
          <div className="font-display text-base font-extrabold text-ink leading-none tabular-nums truncate">
            {formatKRWFull(current)}
          </div>
        </div>
        <button
          type="button"
          onClick={onBid}
          className="focus-ring relative overflow-hidden inline-flex items-center gap-2 px-4 py-3 rounded-full font-extrabold text-sm border-2 border-ink shadow-[0_3px_0_#1a1a1a] active:translate-y-0.5 active:shadow-[0_1px_0_#1a1a1a] transition-all bg-fire text-paper shrink-0"
          aria-label="입찰 참여하기"
        >
          <Icon name="gavel" size={14} strokeWidth={2.6} />
          입찰하기
          <span
            aria-hidden="true"
            className="absolute top-0 left-0 h-full w-1/3 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
              animation: 'shine-sweep 3.4s ease-in-out infinite',
            }}
          />
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
        {/* 회복기 도크에 들어가는 포켓볼 — 회전 + 호흡 */}
        <div className="relative w-16 h-16">
          <span
            className="absolute inset-0 rounded-full border-2 border-ink"
            style={{
              background: POKEBALL_BG,
              animation: 'spin 1.6s linear infinite',
              boxShadow: '0 0 0 4px rgba(255,122,69,0.18), 0 0 24px rgba(255,122,69,0.45)',
            }}
          />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-paper border-2 border-ink" />
        </div>
        <div>
          <div className="font-display text-lg font-extrabold text-ink">
            라이브 경매를 불러오는 중
          </div>
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
        <PokeballMark size={72} />
        <div>
          <div className="font-display text-2xl font-extrabold text-ink">
            진행 중인 라이브 경매가 없어요
          </div>
          <p className="mt-2 text-sm text-mute font-medium leading-relaxed">
            지금 라이브로 진행되는 LOT이 없어요.<br />
            즉시구매 카탈로그에서 먼저 둘러볼 수 있어요.
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
          <div className="font-display text-2xl font-extrabold text-ink">
            연결이 잠시 끊겼어요
          </div>
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
        {/* 모달 헤더 */}
        <div className="bg-fire px-4 sm:px-5 py-3 flex items-center justify-between gap-3 border-b-2 border-ink shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <PokeballMark size={36} />
            <div className="min-w-0">
              <div className="font-mono text-[10px] font-extrabold uppercase tracking-[0.22em] text-paper/85">
                LIVE AUCTION · 오늘의 LOT
              </div>
              <div className="font-display text-base sm:text-lg font-extrabold text-paper leading-tight truncate">
                현재 진행 중인 카드 모음
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

        <div className="flex-1 overflow-y-auto bg-bone p-3 sm:p-5">
          {lots.length === 0 ? (
            <div className="py-16 text-center">
              <div className="inline-flex flex-col items-center gap-3">
                <PokeballMark size={56} />
                <div className="font-display text-lg font-bold text-ink">
                  아직 등록된 LOT이 없어요
                </div>
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
          <span className="text-[11px] sm:text-xs text-mute font-bold inline-flex items-center gap-1.5">
            <Icon name="bolt" size={11} strokeWidth={2.4} className="text-fire" />
            LOT을 누르면 메인 화면에 즉시 띄워져요.
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
  const urgent = t && !t.ended && t.totalMs < 1000 * 60 * 60
  return (
    <button
      type="button"
      onClick={onPick}
      aria-current={active ? 'true' : undefined}
      aria-label={`${lot.nameKo || lot.name}, ${formatKRWFull(lot.currentBid || lot.startingBid || 0)}, 메인 화면에 띄우기`}
      className={`focus-ring group w-full flex items-stretch gap-3 p-2.5 rounded-xl border-2 bg-paper text-left transition-all ${
        active
          ? 'border-fire shadow-[0_3px_0_#ff7a45] -translate-y-0.5'
          : 'border-ink/15 hover:border-ink hover:shadow-[0_3px_0_#1a1a1a] hover:-translate-y-0.5'
      }`}
    >
      <span className="relative w-16 h-20 rounded-lg bg-bone-2 border-2 border-ink overflow-hidden shrink-0">
        {img && <img src={img} alt="" className="w-full h-full object-cover" />}
        {active && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5"
          >
            <PokeballMark size={18} />
          </span>
        )}
      </span>
      <span className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <span>
          <span className="font-mono text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-mute">
            LOT {String(index).padStart(3, '0')}
            {active && <span className="ml-1.5 text-fire">· ON AIR</span>}
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
            <span
              className={`inline-flex items-center gap-1 font-mono text-[10px] font-extrabold tabular-nums ${
                urgent ? 'text-fire' : 'text-mute'
              }`}
            >
              {urgent && <LiveDot size={4} />}
              {t.d > 0 ? `${t.d}D` : `${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`}
            </span>
          )}
        </span>
      </span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════
// QuickBidSheet — 페이지를 떠나지 않고 즉시 입찰
// ───────────────────────────────────────────────────────────────
//  - POST /products/:id/bid  (ProductDetailPage 와 동일한 엔드포인트)
//  - 인증 안 됐으면 토스트 + /login 으로 안내
//  - 빠른 증액 칩: 다음 최소 / +100만 / +500만 / 최대(즉시낙찰)
//  - 성공 시 React Query 캐시 즉시 갱신 → 방송 화면·전광판·CTA 가 갱신
//  - onSuccess 콜백으로 BidFeed에 "나의 입찰" 시스템 메시지 푸시
// ═══════════════════════════════════════════════════════════════
function QuickBidSheet({ lot, onClose, onSuccess }) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const toast = useToastStore((s) => s.push)
  const queryClient = useQueryClient()

  // 입찰 규칙 (ProductDetailPage 와 동일)
  const roundUpToMan = (n) => Math.ceil(n / 10000) * 10000
  const baseline = lot.currentBid || lot.startPrice || lot.startingBid || 0
  const minBid = roundUpToMan(baseline + 1000000)
  const maxBid = lot.buyNowPrice || (lot.startPrice || lot.price || 0) * 5 || minBid * 10

  const [amount, setAmount] = useState(String(minBid))
  const [submitting, setSubmitting] = useState(false)

  // ESC + body scroll lock
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose, submitting])

  const setQuick = (target) => setAmount(String(target))
  const parsed = parseInt(String(amount).replace(/[^0-9]/g, '')) || 0
  const isValid = parsed >= minBid && parsed <= maxBid
  const wouldInstantWin = lot.buyNowPrice && parsed >= lot.buyNowPrice

  const submit = async () => {
    if (!isAuthenticated) {
      toast({
        type: 'error',
        title: '로그인이 필요해요',
        message: '입찰하려면 먼저 로그인해주세요.',
      })
      onClose()
      navigate('/login')
      return
    }
    if (!parsed || parsed < minBid) {
      toast({
        type: 'error',
        title: '입찰 실패',
        message: `최소 ${formatKRWFull(minBid)} 이상 입찰해주세요`,
      })
      return
    }
    if (parsed > maxBid) {
      toast({
        type: 'error',
        title: '입찰 한도 초과',
        message: `최대 ${formatKRWFull(maxBid)} 까지 입찰 가능해요`,
      })
      return
    }
    if (parsed >= baseline * 2 && baseline > 0) {
      const ok = window.confirm(
        `정말 ${formatKRWFull(parsed)} 으로 입찰하시겠어요?\n\n` +
          `현재가(${formatKRWFull(baseline)})의 ${(parsed / baseline).toFixed(1)}배입니다.\n` +
          `입찰은 취소할 수 없으니 한 번 더 확인해주세요.`
      )
      if (!ok) return
    }
    if (submitting) return
    setSubmitting(true)
    try {
      const { data } = await api.post(`/products/${lot.id}/bid`, { amount: parsed })
      const { instantWin, currentBid, bidCount, bidHistory } = data.data
      // React Query 캐시 즉시 갱신 — 방송/전광판/CTA 가 한번에 반영
      queryClient.setQueryData(['products', 'auction'], (old) => {
        if (!Array.isArray(old)) return old
        return old.map((p) =>
          (p.id || p._id) === (lot.id || lot._id)
            ? {
                ...p,
                currentBid,
                bidCount,
                bidHistory,
                ...(instantWin
                  ? { status: 'sold_out', endsAt: new Date().toISOString() }
                  : {}),
              }
            : p
        )
      })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast({
        type: 'success',
        title: instantWin ? '🎉 즉시낙찰 성공!' : '두근두근! 입찰 완료',
        message: `${formatKRWFull(parsed)} ${instantWin ? '으로 낙찰됨' : '입찰됨'}`,
      })
      onSuccess?.(parsed)
      onClose()
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        '입찰에 실패했어요. 잠시 후 다시 시도해주세요.'
      toast({
        type: 'error',
        title: '입찰 실패',
        message: Array.isArray(msg) ? msg[0] : msg,
      })
    } finally {
      setSubmitting(false)
    }
  }

  const img = lot.images?.[0] || lot.image
  const t = lot.endsAt ? timeUntil(lot.endsAt) : null
  const quickOptions = [
    { label: '다음 최소', value: minBid, primary: true },
    { label: '+100만', value: roundUpToMan(parsed + 1000000 || minBid + 1000000) },
    { label: '+500만', value: roundUpToMan(parsed + 5000000 || minBid + 5000000) },
    ...(lot.buyNowPrice
      ? [{ label: `즉시낙찰 ${formatKRW(lot.buyNowPrice)}`, value: lot.buyNowPrice, gold: true }]
      : []),
  ].filter((o) => o.value <= maxBid)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="입찰 참여"
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-6"
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={() => !submitting && onClose()}
        className="absolute inset-0 bg-ink/65 backdrop-blur-sm"
      />
      <div
        className="relative w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl border-2 border-ink bg-paper shadow-[0_8px_0_#1a1a1a] overflow-hidden"
        style={{ animation: 'modal-in 0.22s ease-out' }}
      >
        {/* 헤더 — 빨간 띠 */}
        <div className="bg-fire px-4 sm:px-5 py-3 flex items-center justify-between border-b-2 border-ink">
          <div className="flex items-center gap-2.5 min-w-0">
            <PokeballMark size={28} />
            <div className="min-w-0">
              <div className="font-mono text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-paper/85">
                LIVE BID · 즉시 입찰
              </div>
              <div className="font-display text-sm sm:text-base font-extrabold text-paper truncate">
                {lot.nameKo || lot.name}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            aria-label="닫기"
            className="focus-ring w-8 h-8 rounded-full bg-paper border-2 border-ink shadow-[0_2px_0_rgba(0,0,0,0.35)] hover:-translate-y-0.5 disabled:opacity-50 transition-all inline-flex items-center justify-center shrink-0"
          >
            <Icon name="close" size={12} strokeWidth={2.8} className="text-ink" />
          </button>
        </div>

        {/* 본문 */}
        <div className="px-4 sm:px-5 py-4 sm:py-5 flex flex-col gap-4 bg-paper">
          {/* 카드 요약 — 썸네일 + 메타 */}
          <div className="flex items-center gap-3">
            <div className="w-14 h-18 rounded-md bg-bone-2 border-2 border-ink overflow-hidden shrink-0">
              {img && <img src={img} alt="" className="w-full h-full object-cover" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <SerialTag>
                  LOT-{String(lot.id || '').slice(-4).toUpperCase() || '0000'}
                </SerialTag>
                {lot.grade?.grade != null && (
                  <span className="px-1.5 py-0.5 rounded bg-electric text-ink font-mono text-[10px] font-extrabold border-2 border-ink">
                    {lot.grade.cert || 'PSA'} · {lot.grade.grade}
                  </span>
                )}
              </div>
              <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                <span className="font-mono text-[10px] font-bold text-mute uppercase tracking-wider">현재가</span>
                <span className="font-display text-lg font-extrabold text-ink tabular-nums leading-none">
                  {formatKRWFull(baseline)}
                </span>
                {t && !t.ended && (
                  <span className="font-mono text-[10px] font-extrabold text-fire tabular-nums">
                    ⏱ {t.d > 0 ? `${t.d}D` : `${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 입찰 금액 입력 */}
          <div>
            <label
              htmlFor="bid-amount"
              className="text-[10.5px] font-mono font-extrabold uppercase tracking-[0.18em] text-mute inline-flex items-center gap-1.5"
            >
              <LiveDot size={4} />
              나의 입찰가
            </label>
            <div className="mt-1.5 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-display text-lg font-extrabold text-mute pointer-events-none">
                ₩
              </span>
              <input
                id="bid-amount"
                type="text"
                inputMode="numeric"
                value={
                  parsed
                    ? parsed.toLocaleString()
                    : amount.replace(/[^0-9]/g, '')
                }
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                disabled={submitting}
                className={`focus-ring w-full pl-9 pr-3 py-3 rounded-lg border-2 bg-paper font-display text-xl sm:text-2xl font-extrabold text-ink tabular-nums tracking-tight outline-none transition-colors ${
                  isValid ? 'border-ink' : 'border-rose'
                }`}
                aria-invalid={!isValid}
                aria-describedby="bid-help"
              />
            </div>
            <div
              id="bid-help"
              className={`mt-1.5 text-[11px] font-bold ${
                isValid ? 'text-mute' : 'text-rose'
              }`}
            >
              최소 <span className="font-mono font-extrabold text-grass">{formatKRWFull(minBid)}</span>
              {' · '}최대 <span className="font-mono font-extrabold text-ink">{formatKRWFull(maxBid)}</span>
              {wouldInstantWin && (
                <span className="ml-2 text-fire">🎯 즉시낙찰 가격이에요</span>
              )}
            </div>
          </div>

          {/* 빠른 증액 칩 */}
          <div className="flex flex-wrap gap-1.5">
            {quickOptions.map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setQuick(o.value)}
                disabled={submitting}
                className={`focus-ring inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-extrabold border-2 transition-all shadow-[0_2px_0_#1a1a1a] hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 ${
                  o.gold
                    ? 'bg-electric text-ink border-ink'
                    : o.primary
                    ? 'bg-fire text-paper border-ink'
                    : 'bg-paper text-ink border-ink'
                }`}
              >
                {o.label}
                {!o.label.startsWith('즉시') && (
                  <span className="font-mono opacity-80 tabular-nums">
                    · {formatKRW(o.value)}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* 제출 */}
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !isValid}
            className="focus-ring relative overflow-hidden w-full inline-flex items-center justify-center gap-2 px-5 py-4 rounded-2xl font-extrabold text-base sm:text-lg border-2 border-ink shadow-[0_5px_0_#1a1a1a] hover:-translate-y-1 hover:shadow-[0_6px_0_#1a1a1a] active:translate-y-0 active:shadow-[0_2px_0_#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_5px_0_#1a1a1a] transition-all bg-fire text-paper"
          >
            {submitting ? (
              <>
                <span
                  className="inline-block w-4 h-4 rounded-full border-2 border-paper border-t-transparent"
                  style={{ animation: 'spin 0.8s linear infinite' }}
                  aria-hidden="true"
                />
                입찰 중...
              </>
            ) : (
              <>
                <Icon name="gavel" size={18} strokeWidth={2.6} />
                {wouldInstantWin ? '즉시낙찰 받기' : `${formatKRW(parsed)} 입찰하기`}
              </>
            )}
            {!submitting && (
              <span
                aria-hidden="true"
                className="absolute top-0 left-0 h-full w-1/3 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                  animation: 'shine-sweep 3.4s ease-in-out infinite',
                }}
              />
            )}
          </button>

          <p className="text-[10.5px] text-mute font-medium leading-relaxed text-center">
            입찰은 취소할 수 없어요. 낙찰 시 결제는 안전한 에스크로로 보호돼요.
          </p>
        </div>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  )
}
