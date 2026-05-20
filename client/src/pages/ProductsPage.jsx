import { useMemo, useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CATEGORIES } from '@/api/cards'
import { normalizeProduct } from '@/api/normalize'
import api from '@/api/axios'
import CardTile from '@/components/common/CardTile'
import Icon from '@/components/common/Icon'
import Sparkles from '@/components/common/Sparkles'
import Eyebrow from '@/components/common/Eyebrow'
import MiniBroadcastPlayer from '@/components/common/MiniBroadcastPlayer'
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

  // React Query로 캐시 — /products(auction|all)는 staleTime(5분) 동안 재요청 X.
  // 경매 페이지는 LIVE(active) + 예정(upcoming) 모두 받아 페이지 내부에서 분리.
  const { data: products = [], isLoading: loading, isError: error } = useQuery({
    queryKey: ['products', isAuctionOnly ? 'auction' : 'all'],
    queryFn: () => {
      const params = { limit: 100 }
      if (isAuctionOnly) {
        params.sale_type = 'auction'
        params.status = 'active,upcoming'
      } else {
        params.status = 'active'
      }
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
// 경매 라이브 페이지 — 사이트 전체 톤(따뜻한 크림 + Pokédex 빨강) 통일
// ═══════════════════════════════════════════════════════════════
//
// 타깃 : 포켓몬 TCG 컬렉터 (20–30대, 추억 + 자산 가치 동시 동기)
// 감정 : 두근거림(설렘) · 신뢰 · 프리미엄 · 안정
//
// 디자인 통일 원칙 (HomePage·MarketPage와 일관) :
//   surface  bg-bone(크림) · surface-pop(종이 양각) · dex-casing(빨간 Pokédex)
//   accent   var(--color-dex) #dc2626 · electric(#facc15) · fire(#ff7a45)
//   motion   sparkle-host · card-sway · turntable-disc · spotlight · holo-shine
//   buttons  .btn .btn-pop (메인) · .btn .btn-electric (보조)
//   text     Eyebrow + font-display(Bungee) h1 + pixel-label
//   LED      .led .led-red/blue/yellow/green .led-pulse (전체 사이트와 동일)
//
// 정보 위계 (5초 안에 전달) :
//   ① 카드 비주얼(Pokédex 화면 안) → ② 현재가 LCD → ③ 마감 LCD → ④ 빨간 CTA → ⑤ 신뢰
//
// 컴포넌트 :
//   CompactHeroStrip  : Eyebrow + h1 + Sparkles (홈/마켓과 같은 형식)
//   BroadcastStream   : dex-casing 빨간 외장 + dex-casing-inset 화면 안 카드 회전
//   MiniBroadcastPlayer : 종이 양각 카드 + dex 빨간 상단 띠 + 미니 화면
//   FeaturedLot/CounterReceipt : 종이 양각 상세 정보 + .btn-pop CTA + 신뢰 배지
//   BidFeed           : 종이 베이스 "in-game battle log" — 도트 패턴 배경
//   AllLotsModal      : 종이 카탈로그 모달
//   QuickBidSheet     : 종이 시트 (.btn-pop CTA)
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

function AuctionLivePage({ lots, loading, error }) {
  const [showAll, setShowAll] = useState(false)
  const [bidLot, setBidLot] = useState(null)
  // BidFeed로 "내 입찰" 시스템 메시지를 흘려보내는 가벼운 이벤트 채널
  const [userBidEvent, setUserBidEvent] = useState(null)

  // 정책: 동시 LIVE 1건 — status='active'인 첫 LOT(서버에서 lotOrder 정렬)만 무대 위.
  //   나머지는 status='upcoming'으로 큐에서 대기.
  const { liveLot, upcomingQueue } = useMemo(() => {
    const live = lots.filter(
      (l) => l.status === 'active' && (!l.endsAt || l.endsAt - Date.now() > 0)
    )
    const upcoming = lots
      .filter((l) => l.status === 'upcoming')
      .sort((a, b) => (a.lotOrder || 0) - (b.lotOrder || 0) || (a.startsAt || Infinity) - (b.startsAt || Infinity))
    return { liveLot: live[0] || null, upcomingQueue: upcoming }
  }, [lots])

  const openBid = (lot) => setBidLot(lot)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 pb-28 lg:pb-10">
      {/* === 1. 헤더 (컴팩트) === */}
      <CompactHeroStrip
        liveLot={liveLot}
        upcomingCount={upcomingQueue.length}
        onOpenAll={() => setShowAll(true)}
        disabled={loading || (!liveLot && upcomingQueue.length === 0)}
      />

      {/* === 2. 라이브 방송 플레이어 — LIVE 1건만 === */}
      {!error && !loading && liveLot && (
        <BroadcastStream lot={liveLot} onBid={() => openBid(liveLot)} />
      )}

      {/* === 3. 상태별 본문 === */}
      {error ? (
        <ErrorState />
      ) : loading ? (
        <LoadingState />
      ) : !liveLot && upcomingQueue.length === 0 ? (
        <EmptyState />
      ) : liveLot ? (
        <div className="mt-5 grid lg:grid-cols-[1fr_320px] gap-5">
          <FeaturedLot lot={liveLot} onBid={() => openBid(liveLot)} />
          <LiveSidebar
            featured={liveLot}
            upcoming={upcomingQueue.slice(0, 4)}
            onOpenAll={() => setShowAll(true)}
            userBidEvent={userBidEvent}
          />
        </div>
      ) : (
        // LIVE 없음 — 첫 예정 LOT을 카운트다운 패널로
        <NextLotCountdown lot={upcomingQueue[0]} queueCount={upcomingQueue.length} onOpenAll={() => setShowAll(true)} />
      )}

      {/* === 4. 다음 경매 큐 (LIVE가 있을 때도 별도 섹션으로) === */}
      {!loading && !error && upcomingQueue.length > 0 && liveLot && (
        <UpcomingQueueSection lots={upcomingQueue} />
      )}

      {/* === 5. 모바일 sticky CTA — 항상 시야 === */}
      {liveLot && !loading && !error && (
        <MobileStickyCta lot={liveLot} onBid={() => openBid(liveLot)} />
      )}

      {showAll && (
        <AllLotsModal
          lots={[...(liveLot ? [liveLot] : []), ...upcomingQueue]}
          featuredId={liveLot?.id}
          onClose={() => setShowAll(false)}
          onPickLot={() => setShowAll(false)}
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

function BroadcastStream({ lot, onBid }) {
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

  // ── 미니 플레이어 : 본 방송의 "가시 비율" 기반으로 토글 ──────
  //   - visibleRatio < 1/3  → 미니 ON  (1/3 미만 보이면 작게 띄움)
  //   - visibleRatio >= 2/3 → 미니 OFF (2/3 이상 보이면 본 화면이 충분히 보이니까 꺼짐)
  //   - 1/3 ~ 2/3 사이는 현재 상태 유지 → 토글 깜빡임 방지 (히스테리시스)
  const containerRef = useRef(null)
  const [pinned, setPinned] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let raf = 0
    let lastPinned = false
    const PIN_THRESHOLD = 1 / 3   // 이 이하로 보이면 미니 ON
    const UNPIN_THRESHOLD = 2 / 3 // 이 이상 보이면 미니 OFF
    const evaluate = () => {
      const rect = el.getBoundingClientRect()
      const viewportH = window.innerHeight || document.documentElement.clientHeight
      // 화면(뷰포트)에 실제로 보이는 본 방송 영역의 높이
      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, viewportH) - Math.max(rect.top, 0)
      )
      // 비율의 분모는 본 방송 높이와 뷰포트 높이 중 작은 쪽 (작은 화면에서도 1.0 도달 가능)
      const denom = Math.max(1, Math.min(rect.height, viewportH))
      const visibleRatio = visibleHeight / denom
      // 히스테리시스 적용 — 현재 상태에 따라 임계값이 다름
      const next = lastPinned
        ? visibleRatio < UNPIN_THRESHOLD  // 핀 상태 : 2/3 이상 보이면 끔
        : visibleRatio < PIN_THRESHOLD    // 언핀 상태 : 1/3 미만 보이면 켬
      if (next !== lastPinned) {
        lastPinned = next
        setPinned(next)
      }
    }
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        evaluate()
      })
    }
    evaluate() // 초기 1회
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])
  // LOT 바뀌면 닫기 상태 리셋 — 새 LOT은 다시 보여줘야 함
  useEffect(() => { setDismissed(false) }, [lot.id])
  // 부드러운 스크롤 복귀 — 헤더 오프셋 보정
  const expand = () => {
    const el = containerRef.current
    if (!el) return
    const top = el.getBoundingClientRect().top + window.pageYOffset - 24
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }
  // 미니 플레이어 가시성: pinned 이고 dismissed 아닐 때 보임 (트랜지션 위해 unmount 안 함)
  const miniVisible = pinned && !dismissed

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
      className="dex-casing p-4 sm:p-5 relative reveal-up"
      aria-label="라이브 방송 화면"
    >
      {/* ── Pokédex 상단 LED + 라이브 정보 라인 ────────────────── */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="inline-flex items-center gap-2.5 min-w-0">
          <span className="led led-red led-pulse" aria-hidden="true" />
          <span className="pixel-label text-white">LIVE · CH.01</span>
          <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded font-mono text-[10px] font-extrabold uppercase tracking-[0.18em] bg-paper/15 text-paper border border-paper/25">
            LOT-{String(lot.id || '').slice(-4).toUpperCase() || '0000'}
          </span>
        </div>

        <div className="inline-flex items-center gap-2 sm:gap-2.5">
          <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] font-extrabold text-paper tabular-nums">
            <Icon name="eye" size={12} strokeWidth={2.6} className="text-electric" />
            {viewers.toLocaleString()}명
          </span>
          <span className="pixel-label text-white/70 hidden sm:inline">시청중</span>
          <div className="hidden sm:flex items-center gap-1.5" aria-hidden="true">
            <span className="led led-blue" />
            <span className="led led-yellow" />
            <span className="led led-green" />
          </div>
        </div>
      </div>

      {/* ── Pokédex 화면 인셋 — 카드가 진열된 라이브 무대 ───────── */}
      <div
        className="dex-casing-inset relative overflow-hidden sparkle-host"
        style={{ aspectRatio: '16 / 9' }}
      >
        <Sparkles always />
        <div className="spotlight" aria-hidden="true" />
        <span
          aria-hidden="true"
          className="turntable-disc"
          style={{ width: '52%', aspectRatio: '1', bottom: '8%', left: '50%', transform: 'translateX(-50%)' }}
        />

        {/* 카드 — 회전 단상 위 */}
        <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 z-10">
          {img ? (
            <div className="card-sway relative">
              <span
                aria-hidden="true"
                className="absolute inset-0 -m-8 rounded-3xl pointer-events-none"
                style={{
                  background:
                    'radial-gradient(ellipse at center, rgba(255,255,255,0.45) 0%, rgba(245,184,0,0.22) 35%, transparent 70%)',
                  filter: 'blur(10px)',
                }}
              />
              <img
                src={img}
                alt={lot.nameKo || lot.name}
                className="relative rounded-lg border-2 border-ink"
                style={{
                  maxHeight: 'min(54vh, 360px)',
                  boxShadow:
                    '0 16px 32px rgba(0,0,0,0.5), 0 0 0 4px #ffffff, 0 0 0 5.5px #1a1a1a',
                }}
              />
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

        {/* PIP: 우상단 진행자 — Pokéball 도장 (작고 부드럽게) */}
        <div className="absolute top-2.5 right-2.5 z-20 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-paper/15 backdrop-blur-sm border border-paper/30">
            <PokeballMark size={18} animated />
            <span className="pixel-label text-white">진행자</span>
          </span>
        </div>

        {/* 좌상단 NOW BIDDING 칩 — 부드러운 톤 */}
        <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-paper/15 backdrop-blur-sm border border-paper/30">
            <span className="led led-yellow led-pulse" style={{ width: 6, height: 6 }} aria-hidden="true" />
            <span className="pixel-label text-electric">NOW BIDDING</span>
          </span>
        </div>

        {/* ── 로어서드 자막 (카드명 + 등급) ─────────────────── */}
        <div className="absolute left-0 right-0 bottom-0 z-10 px-3 sm:px-5 py-3 pointer-events-none">
          <div className="inline-block">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded chip-type chip-type-fire" style={{ boxShadow: '0 2px 0 #1a1a1a' }}>
              {lot.set || lot.setShort || 'POKÉMON TCG'}
            </div>
            <h2
              className="mt-1.5 font-display font-bold text-paper leading-tight truncate drop-shadow-[0_2px_0_rgba(0,0,0,0.7)]"
              style={{ fontSize: 'clamp(20px, 3.2vw, 30px)' }}
            >
              {lot.nameKo || lot.name}
              {lot.grade?.grade != null && (
                <span className="ml-2 align-middle inline-flex items-center px-1.5 py-0.5 rounded bg-electric text-ink font-mono text-[12px] font-extrabold border-2 border-ink">
                  {lot.grade.cert || 'PSA'} {lot.grade.grade}
                </span>
              )}
            </h2>
          </div>
        </div>
      </div>

      {/* ── 화면 아래: 가격 / 시간 / 입찰 CTA — Pokédex 컨트롤 패널 ── */}
      <div className="mt-4 grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-stretch">
        {/* 현재 입찰가 */}
        <div className="lcd p-3 scan flex flex-col justify-center min-h-[72px]">
          <div className="pixel-label text-ink/55 mb-1">CURRENT BID</div>
          <div
            className="font-mono font-extrabold tabular-nums leading-none text-ink"
            style={{ fontSize: 'clamp(20px, 4vw, 30px)' }}
          >
            {formatKRWFull(current)}
          </div>
        </div>

        {/* 마감까지 */}
        <div
          className={`lcd p-3 scan flex flex-col justify-center min-h-[72px] ${
            isCritical ? 'ring-2 ring-dex' : ''
          }`}
          style={isCritical ? { animation: 'shake-soft 0.6s ease-in-out infinite' } : undefined}
        >
          <div className="pixel-label text-ink/55 mb-1 inline-flex items-center gap-1.5">
            <Icon name="clock" size={10} strokeWidth={2.5} />
            {!t ? '상시 진행' : t.ended ? '경매 종료' : isCritical ? '곧 마감!' : '마감까지'}
          </div>
          <div
            className={`font-mono font-extrabold tabular-nums leading-none ${
              isCritical ? 'text-dex' : isUrgent ? 'text-fire' : 'text-ink'
            }`}
            style={{ fontSize: 'clamp(16px, 3vw, 22px)' }}
          >
            {clockText}
          </div>
        </div>

        {/* 입찰 CTA — Button variant="pop" 톤 */}
        {onBid && (
          <button
            type="button"
            onClick={onBid}
            className="btn btn-pop btn-lg relative overflow-hidden whitespace-nowrap sm:min-w-[140px]"
            aria-label="지금 입찰 참여하기"
          >
            <Icon name="gavel" size={16} strokeWidth={2.6} />
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

      {/* ── 하단 보조 정보 라인 (티커 대체 — 정적, 친근한 톤) ── */}
      <div className="mt-3 flex items-center justify-between gap-3 flex-wrap text-[11px] font-bold">
        <div className="inline-flex items-center gap-3 flex-wrap text-paper/85">
          <span className="inline-flex items-center gap-1.5">
            <Icon name="arrow" size={11} strokeWidth={2.6} className="text-electric" />
            다음 최소 입찰{' '}
            <span className="font-mono font-extrabold text-electric tabular-nums">
              {formatKRWFull(nextMin)}
            </span>
          </span>
          <span className="text-paper/40">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Icon name="user" size={11} strokeWidth={2.6} className="text-paper/70" />
            <span className="font-mono tabular-nums">{lot.bidCount || 0}</span>회 입찰
          </span>
        </div>
        <span className="pixel-label text-electric">
          정품인증 · 안전결제 · 입찰보호
        </span>
      </div>
    </section>

    {/* 미니 플레이어 — 본 화면이 화면 밖으로 스크롤되면 우하단으로 핀
        unmount 하지 않고 visible prop으로 opacity/transform 트랜지션 처리 */}
    <MiniBroadcastPlayer
      visible={miniVisible}
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
    </>
  )
}

// ─── 미니 플레이어 (YouTube/네이버 쇼핑라이브 톤) ──────────────
//   - lg+ 에서만 노출 (mobile은 이미 sticky CTA가 있음)
//   - 우하단 고정, 280px 폭, 16:9 미니 비디오
//   - 클릭 → 본 방송으로 부드럽게 스크롤
//   - X 버튼 → 세션 동안 숨김 (LOT 바뀌면 다시 등장)
//   - 미니 안 "지금 입찰" 빨강 버튼 → 동일 시트
function CompactHeroStrip({ liveLot, upcomingCount, onOpenAll, disabled }) {
  const totalCount = (liveLot ? 1 : 0) + upcomingCount
  const hasLive = !!liveLot
  return (
    <header
      className="relative sparkle-host mb-6"
      aria-label="라이브 경매장 헤더"
    >
      <Sparkles always className="hidden lg:block" />

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <Eyebrow tone="ink" dot dotColor="red" className="mb-4">
            {hasLive ? 'LIVE AUCTION · 두근두근 진행 중' : 'AUCTION · 곧 시작'}
          </Eyebrow>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-[44px] font-bold text-ink tracking-tight leading-[1.05]">
            {hasLive ? (
              <>
                지금{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">{liveLot.nameKo || liveLot.name}</span>
                  <span className="absolute -bottom-1 left-0 right-0 h-3 bg-electric -z-0 rounded-full" aria-hidden="true" />
                </span>
                {' '}경매 중!
              </>
            ) : (
              <>
                다음 경매까지{' '}
                <span className="text-dex">차분히 준비</span> 중
              </>
            )}
          </h1>
          <p className="mt-3 text-[14px] sm:text-[15px] text-mute leading-relaxed font-medium max-w-xl">
            한 번에 한 LOT만 차분히 진행해요. 모든 카드는 정품 인증 완료 · 안심 결제 보호.{' '}
            <span className="text-ink font-bold">한 번 두근거려보실래요?</span>
          </p>
          <div className="mt-4 inline-flex items-center gap-2 text-[12px] font-bold text-ink/70">
            <CounterPokeballs liveCount={hasLive ? 1 : 0} />
            <span>
              {hasLive ? (
                <>지금 <span className="text-dex font-extrabold tabular-nums">1</span>건 LIVE · </>
              ) : null}
              예정 <span className="text-ink font-extrabold tabular-nums">{upcomingCount}</span>건 대기
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAll}
          disabled={disabled}
          className="focus-ring relative inline-flex items-center gap-2 px-5 py-3 rounded-full bg-paper text-ink border-2 border-ink shadow-[0_3px_0_#1a1a1a] hover:-translate-y-0.5 hover:shadow-[0_4px_0_#1a1a1a] hover:bg-electric/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-extrabold text-sm shrink-0 self-start md:self-auto"
          aria-label={`전체 LOT 보기, 총 ${totalCount}건`}
        >
          <Icon name="layers" size={14} strokeWidth={2.4} />
          오늘의 LOT 전체보기
          <span className="ml-0.5 inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 rounded-full bg-dex text-paper font-mono text-[10.5px] font-bold tabular-nums border-2 border-ink">
            {totalCount}
          </span>
        </button>
      </div>
    </header>
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

  const current = lot.currentBid || lot.startingBid || 0
  const nextMin = Math.round(current * 1.05 / 1000) * 1000 || current + 1000

  // BroadcastStream이 이미 카드 비주얼을 차지하므로,
  // FeaturedLot은 상세 정보 + CTA + 신뢰 배지 패널로만 활용
  return (
    <section
      className="surface-pop p-5 sm:p-6"
      aria-label={`라이브 LOT: ${lot.nameKo || lot.name}`}
    >
      <CounterReceipt
        lot={lot}
        current={current}
        nextMin={nextMin}
        viewers={viewers}
        onBid={onBid}
      />
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
    <div className="flex flex-col gap-4">
      {/* 카드명 + 감정 등급 */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <Eyebrow tone="fire" dot dotColor="red">
            지금 진행 중
          </Eyebrow>
          <span className="font-mono text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-mute">
            {lot.set || lot.setShort || 'POKÉMON TCG'} · NO.{String(lot.number || '').padStart(3, '0') || '???'}
          </span>
        </div>
        <h2 className="mt-3 font-display text-2xl sm:text-3xl font-bold text-ink leading-[1.05] tracking-tight">
          {lot.nameKo || lot.name}
        </h2>
        {lot.grade?.grade != null && (
          <div className="mt-2.5 inline-flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded bg-electric text-ink font-mono text-[11px] font-extrabold border-2 border-ink shadow-[0_2px_0_#1a1a1a]">
              {lot.grade.cert || 'PSA'} · {lot.grade.grade}
            </span>
            <span className="text-[10.5px] text-mute font-bold">감정 완료</span>
          </div>
        )}
      </div>

      {/* 현재가 — 페이지에서 가장 큰 숫자 (LCD 영수증 톤) */}
      <div className="rounded-2xl border-2 border-ink bg-bone-2 shadow-[0_3px_0_#1a1a1a] p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="pixel-label text-ink/55">
            현재 입찰가
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-paper border-2 border-ink font-mono text-[10px] font-extrabold tabular-nums">
            <Icon name="user" size={10} strokeWidth={2.6} />
            {lot.bidCount || 0}회
          </span>
        </div>
        <div
          className="mt-1 font-display font-bold text-ink leading-[1] tabular-nums"
          style={{ fontSize: 'clamp(30px, 5.4vw, 44px)' }}
        >
          {formatKRWFull(current)}
        </div>
        <div className="mt-2 flex items-baseline gap-2 flex-wrap text-[11.5px]">
          <Icon name="arrow" size={11} strokeWidth={2.6} className="text-grass" />
          <span className="text-mute font-bold">다음 최소 입찰</span>
          <span className="font-mono font-extrabold text-grass tabular-nums">
            {formatKRWFull(nextMin)}
          </span>
        </div>
      </div>

      {/* 입찰 CTA — btn-pop 톤 (사이트 전체 메인 CTA 패턴) */}
      <button
        type="button"
        onClick={onBid}
        className="btn btn-pop btn-lg group relative overflow-hidden w-full"
        aria-label="입찰 참여하기"
      >
        <Icon name="gavel" size={18} strokeWidth={2.6} />
        지금 두근두근 입찰!
        <Icon
          name="arrow"
          size={16}
          strokeWidth={2.6}
          className="ml-0.5 transition-transform group-hover:translate-x-0.5"
        />
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
        지금 <span className="text-dex font-extrabold">{viewers.toLocaleString()}명</span>이 함께 지켜보는 중
        <span className="hidden sm:inline"> · </span>
        <br className="sm:hidden" />
        클릭하면 페이지 위에서 바로 입찰할 수 있어요
      </div>

      {/* 신뢰 배지 */}
      <TrustBadges />
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
function LiveSidebar({ featured, upcoming, onOpenAll, userBidEvent }) {
  return (
    <aside className="flex flex-col gap-4 lg:max-h-[calc(100vh-9rem)] lg:overflow-hidden lg:sticky lg:top-24">
      {/* 다음 LOT — 시작까지 카운트다운으로 표기 */}
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
          {upcoming.map((c) => {
            const img = c.images?.[0] || c.image
            const startMs = c.startsAt ? c.startsAt - Date.now() : 0
            const urgent = startMs > 0 && startMs < 1000 * 60 * 60
            return (
              <li key={c.id}>
                <Link
                  to={`/products/${c.id}`}
                  className="focus-ring w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-electric/20 transition-colors"
                  aria-label={`예정 LOT: ${c.nameKo || c.name}`}
                >
                  {/* LOT 번호 칩 */}
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-ink text-electric text-[11px] font-mono font-extrabold tabular-nums border-2 border-ink shrink-0">
                    {c.lotOrder || '·'}
                  </span>
                  <span className="w-10 h-12 rounded-md bg-bone-2 border-2 border-ink overflow-hidden shrink-0">
                    {img && <img src={img} alt="" className="w-full h-full object-cover" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-xs font-extrabold text-ink truncate">
                      {c.nameKo || c.name}
                    </span>
                    <span className="block text-[10.5px] font-mono text-mute truncate tabular-nums">
                      시작가 {formatKRW(c.startPrice || 0)}
                    </span>
                  </span>
                  {startMs > 0 && (
                    <span
                      className={`font-mono text-[10px] font-extrabold tabular-nums shrink-0 ${
                        urgent ? 'text-fire' : 'text-mute'
                      }`}
                    >
                      {urgent && <LiveDot size={4} />}{' '}
                      {formatStartMs(startMs)}
                    </span>
                  )}
                </Link>
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

// 시작까지 남은 시간 — 짧게 (1H 12M / 3H / 1D)
function formatStartMs(ms) {
  if (ms <= 0) return '진행 중'
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}M`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) {
    const rm = mins - hrs * 60
    return rm > 0 && hrs < 6 ? `${hrs}H ${String(rm).padStart(2, '0')}M` : `${hrs}H`
  }
  const days = Math.floor(hrs / 24)
  return `${days}D`
}

// LIVE 없을 때 — 첫 예정 LOT의 시작 카운트다운 (페이지 중앙)
function NextLotCountdown({ lot, queueCount, onOpenAll }) {
  if (!lot) return null
  return (
    <section className="mt-5 surface-pop p-6 sm:p-8 sparkle-host relative" aria-label={`다음 경매: ${lot.nameKo || lot.name}`}>
      <Sparkles always />
      <div className="grid lg:grid-cols-[280px_1fr] gap-6 items-center">
        <div className="flex justify-center">
          <div className="relative">
            <img
              src={lot.images?.[0] || lot.image || ''}
              alt={lot.nameKo || lot.name}
              className="max-w-[240px] rounded-lg border-2 border-ink shadow-[0_6px_0_#1a1a1a]"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </div>
        </div>
        <div>
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="led led-yellow led-pulse" aria-hidden="true" />
            <span className="pixel-label text-mute">곧 시작 · LOT #{lot.lotOrder || '-'}</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-ink leading-[1.05] tracking-tight mb-2">
            {lot.nameKo || lot.name}
          </h2>
          <div className="text-[13px] text-mute font-medium mb-4">
            {lot.name} · {lot.setShort || lot.set} · {lot.year}
          </div>
          <div className="rounded-xl bg-ink text-white px-4 py-4 mb-4 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-electric">
              <Icon name="clock" size={11} strokeWidth={2.6} aria-hidden="true" />
              시작까지
            </span>
            {lot.startsAt && (
              <span className="font-mono text-2xl font-extrabold text-electric tabular-nums">
                <Countdown endsAt={lot.startsAt} size="lg" label={false} />
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-5">
            <div className="rounded-lg border-2 border-ink/15 bg-bone-2 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-mute">시작가</div>
              <div className="font-mono text-lg font-extrabold text-ink tabular-nums">
                {formatKRWFull(lot.startPrice)}
              </div>
            </div>
            <div className="rounded-lg border-2 border-ink/15 bg-bone-2 px-3 py-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-mute">대기열</div>
              <div className="font-mono text-lg font-extrabold text-ink tabular-nums">{queueCount}건</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/products/${lot.id}`} className="btn btn-pop btn-md" aria-label={`${lot.nameKo} 상세 보기`}>
              <Icon name="eye" size={14} strokeWidth={2.4} />
              상세 보기
            </Link>
            <button type="button" onClick={onOpenAll}
              className="focus-ring inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-paper text-ink border-2 border-ink shadow-[0_3px_0_#1a1a1a] hover:-translate-y-0.5 hover:shadow-[0_4px_0_#1a1a1a] hover:bg-electric/20 transition-all font-extrabold text-sm">
              <Icon name="layers" size={13} strokeWidth={2.4} />
              전체 LOT 보기
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// Countdown 컴포넌트 — startsAt까지의 시간을 보여주기 위해 간단히 inline 구현
//   (기존 Countdown은 endsAt 기반 — props명은 그대로 두고 의미만 "목표 ms"로 사용)
function Countdown({ endsAt, label }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const ms = (endsAt || 0) - Date.now()
  if (ms <= 0) return <span className="font-mono">00:00:00</span>
  const totalSec = Math.floor(ms / 1000)
  const d = Math.floor(totalSec / 86400)
  const h = Math.floor((totalSec % 86400) / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return (
    <span className="font-mono tabular-nums">
      {d > 0 ? `${d}D ` : ''}
      {String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
      {label && <span className="ml-1 text-[10px] font-bold opacity-70">남음</span>}
      {/* tick 의존 — 매초 리렌더 트리거 */}
      <span className="hidden">{tick}</span>
    </span>
  )
}

// 페이지 하단 풀와이드 큐 — 본 LIVE 아래에 흐름 표시
function UpcomingQueueSection({ lots }) {
  return (
    <section className="mt-10 sm:mt-12" aria-label="다음 경매 큐">
      <div className="flex items-end justify-between gap-4 mb-5 flex-wrap">
        <div>
          <Eyebrow tone="ink" dot dotColor="yellow" className="mb-2">
            오늘의 경매 큐
          </Eyebrow>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink tracking-tight leading-tight">
            다음 차례는 <span className="text-dex">{lots[0]?.nameKo || lots[0]?.name}</span>!
          </h2>
        </div>
      </div>
      <ol className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {lots.slice(0, 8).map((c) => {
          const img = c.images?.[0] || c.image
          const startMs = c.startsAt ? c.startsAt - Date.now() : 0
          return (
            <li key={c.id}>
              <Link
                to={`/products/${c.id}`}
                className="block surface-pop p-3 hover:-translate-y-0.5 transition-all group"
                aria-label={`예정: ${c.nameKo || c.name}`}
              >
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center w-9 h-9 rounded-md bg-ink text-electric text-xs font-mono font-extrabold tabular-nums border-2 border-ink shrink-0">
                    {c.lotOrder || '·'}
                  </span>
                  <div className="w-12 h-16 rounded-md bg-bone-2 border-2 border-ink overflow-hidden shrink-0">
                    {img && <img src={img} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-sm font-bold text-ink leading-tight truncate group-hover:text-dex transition-colors">
                      {c.nameKo || c.name}
                    </div>
                    <div className="text-[10.5px] text-mute font-medium truncate mt-0.5">
                      {c.setShort || c.set}
                    </div>
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-mono font-extrabold tabular-nums text-mute">
                      <Icon name="clock" size={10} strokeWidth={2.4} aria-hidden="true" />
                      {startMs > 0 ? `${formatStartMs(startMs)} 후 시작` : '곧 시작'}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          )
        })}
      </ol>
    </section>
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
    <div className="relative overflow-hidden rounded-2xl border-2 border-ink bg-paper shadow-[0_4px_0_#1a1a1a] flex flex-col lg:min-h-0 lg:flex-1">
      {/* 헤더 — 종이 톤 + LED 펄스 */}
      <div className="bg-bone-2 px-4 py-2.5 flex items-center justify-between border-b-2 border-ink/15">
        <div className="inline-flex items-center gap-2 text-ink">
          <span className="led led-red led-pulse" style={{ width: 7, height: 7 }} aria-hidden="true" />
          <span className="font-display text-sm font-bold tracking-tight">
            실시간 입찰 로그
          </span>
        </div>
        <span className="pixel-label text-mute">
          LIVE
        </span>
      </div>
      {/* 입찰 로그 — 종이 베이스 + 살짝 도트 패턴 (in-game battle log 느낌) */}
      <div className="relative flex-1 lg:min-h-0">
        <div
          ref={scrollRef}
          className="relative h-60 lg:absolute lg:inset-0 overflow-y-auto px-3 py-3 scrollbar-none flex flex-col gap-1.5"
          role="log"
          aria-live="polite"
          aria-label="실시간 입찰 메시지"
          style={{
            background: 'var(--color-bone)',
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(13,23,48,0.05) 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        >
          {items.map((it) => (
            <FeedRow key={it.id} item={it} />
          ))}
        </div>
      </div>
    </div>
  )
}

function FeedRow({ item }) {
  if (item.kind === 'me') {
    // 내 입찰 — 노란 양각 칩, 별 마크
    return (
      <div
        className="relative z-10 flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border-2 border-ink bg-electric"
        style={{
          animation: 'bid-pop 0.3s ease-out',
          boxShadow: '0 3px 0 #1a1a1a',
        }}
      >
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span
            className="w-5 h-5 rounded-full grid place-items-center font-mono text-[10px] font-extrabold bg-ink text-electric border-2 border-ink shrink-0"
            aria-hidden="true"
          >
            ★
          </span>
          <span className="text-[12px] font-extrabold text-ink truncate">
            {item.who}
          </span>
        </span>
        <span className="font-mono text-[12.5px] font-extrabold text-ink tabular-nums">
          {formatKRWFull(item.amt)}
        </span>
      </div>
    )
  }
  if (item.sys) {
    // 시스템 메시지 — 점선 안내 줄
    return (
      <div
        className="relative z-10 px-2.5 py-1.5 rounded-md text-center font-mono text-[10.5px] font-extrabold text-ink bg-paper border-2 border-dashed border-ink/30"
        style={{ animation: 'bid-pop 0.3s ease-out' }}
      >
        <span className="text-grass">▸</span> {item.msg}
      </div>
    )
  }
  if (item.kind === 'react') {
    // 리액션 — 가볍게 흘러가는 텍스트
    return (
      <div
        className="relative z-10 inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono font-bold text-mute"
        style={{ animation: 'bid-pop 0.3s ease-out' }}
      >
        <span className="text-ink/80">{item.who}</span>
        <span aria-hidden="true">{item.r}</span>
      </div>
    )
  }
  // 일반 입찰 — 종이 양각 칩, 빨간 dex 동전
  return (
    <div
      className="relative z-10 flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-paper border-2 border-ink/15"
      style={{
        animation: 'bid-pop 0.3s ease-out',
        boxShadow: '0 2px 0 rgba(13,23,48,0.08)',
      }}
    >
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <span
          className="w-5 h-5 rounded-full grid place-items-center font-mono text-[10px] font-extrabold bg-dex text-paper border-2 border-ink shrink-0"
          aria-hidden="true"
        >
          ₩
        </span>
        <span className="text-[11.5px] font-extrabold text-ink truncate">{item.who}</span>
      </span>
      <span className="font-mono text-[12px] font-extrabold text-dex tabular-nums">
        {formatKRWFull(item.amt)}
      </span>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 모바일 sticky CTA — 종이 양각 바 + Pokédex 빨간 입찰 버튼
// ═══════════════════════════════════════════════════════════════
function MobileStickyCta({ lot, onBid }) {
  const current = lot.currentBid || lot.startingBid || 0
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2 bg-paper/95 backdrop-blur-sm border-t-2 border-ink">
      <div className="flex items-center gap-3">
        <PokeballMark size={32} />
        <div className="min-w-0 flex-1">
          <div className="pixel-label text-mute inline-flex items-center gap-1.5">
            <span className="led led-red led-pulse" style={{ width: 5, height: 5 }} aria-hidden="true" />
            현재 입찰가
          </div>
          <div className="mt-0.5 font-display text-base font-extrabold text-ink leading-none tabular-nums truncate">
            {formatKRWFull(current)}
          </div>
        </div>
        <button
          type="button"
          onClick={onBid}
          className="btn btn-pop btn-md relative overflow-hidden shrink-0 rounded-full"
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
