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
  // 경매 페이지 전용 뷰 모드. 'lots' = 그리드 목록, 'live' = 라이브 커머스 화면
  const [viewMode, setViewMode] = useState('lots')
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
  const auctionCount = auctionList.length
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

  // 경매 페이지에서만 라이브 모드 가능
  const inLiveMode = isAuctionOnly && viewMode === 'live'

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* ── Hero ────────────────────────────────────────────── */}
      {isAuctionOnly
        ? <AuctionHero
            auctionCount={auctionCount}
            list={auctionList}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        : <DefaultHero
            auctionCount={auctionCount}
            buynowCount={buynowCount}
          />
      }

      {/* 검색 결과 칩 — 라이브 모드에선 숨김 */}
      {query && !inLiveMode && (
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

      {/* ── 라이브 커머스 모드 ─────────────────────────────── */}
      {inLiveMode ? (
        <LiveCommerceView lots={auctionList} loading={loading} />
      ) : (
        <>
          {/* ── Filters bar ─────────────────────────────────────── */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-6 mt-10 mb-10 border-b-2 border-ink/15">
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
              {isAuctionOnly && <option value="ending">마감 임박순</option>}
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
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 일반 마켓 Hero — 기존 디자인 유지
// ═══════════════════════════════════════════════════════════════
function DefaultHero({ auctionCount, buynowCount }) {
  return (
    <div className="relative sparkle-host mb-10">
      <Sparkles always />
      <Eyebrow tone="water" led="blue">MARKETPLACE · 정품 인증</Eyebrow>
      <h1 className="mt-4 font-display text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-[1.1]">
        오늘의 카드 카탈로그
      </h1>
      <p className="text-sm text-mute mt-4 max-w-2xl leading-relaxed font-medium">
        옥션 {auctionCount}건 + 즉시구매 {buynowCount}건. 모두 정품 인증 완료, 클릭 한 번이면 데려갈 수 있어요.
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// 경매 전용 Hero — 옥션하우스 단상 + LCD 통계 + 뷰 토글
// ═══════════════════════════════════════════════════════════════
function AuctionHero({ auctionCount, list, viewMode, setViewMode }) {
  // 상위 통계: 총 입찰 횟수, 최고 입찰가, 마감 임박 수, 신규 출품 수
  const stats = useMemo(() => {
    const totalBids = list.reduce((s, c) => s + (c.bidCount || 0), 0)
    const topBid = list.reduce((m, c) => Math.max(m, c.currentBid || 0), 0)
    const now = Date.now()
    const endingSoon = list.filter((c) => c.endsAt && c.endsAt - now < 1000 * 60 * 60).length
    return { totalBids, topBid, endingSoon, live: auctionCount }
  }, [list, auctionCount])

  return (
    <div className="relative mb-8">
      {/* === 옥션 하우스 단상 — 벨벳 무대 + 스포트라이트 + 골드 트림 === */}
      <div
        className="relative overflow-hidden rounded-2xl border-2 border-ink shadow-[0_6px_0_#1a1a1a]"
        style={{
          // 어두운 벨벳 무대: 위에서 비추는 라디얼 스포트라이트 + 보르도 색 베이스
          background: `
            radial-gradient(120% 90% at 50% -10%, rgba(255,205,90,0.35) 0%, rgba(201,16,25,0.0) 38%),
            radial-gradient(100% 80% at 50% 110%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.0) 50%),
            linear-gradient(180deg, #4a0610 0%, #2a040a 55%, #1a0307 100%)
          `,
        }}
      >
        {/* 금테 — 옥션하우스 마감 느낌 */}
        <div className="absolute inset-2 rounded-xl pointer-events-none"
          style={{
            boxShadow: 'inset 0 0 0 1px rgba(255,205,90,0.35), inset 0 0 0 2px rgba(0,0,0,0.4)',
          }}
        />
        {/* 상단 골드 띠 */}
        <div className="absolute top-0 inset-x-0 h-1.5"
          style={{ background: 'linear-gradient(90deg, transparent, #f4c64a 30%, #ffd97a 50%, #f4c64a 70%, transparent)' }}
        />
        {/* 좌우 빛 줄 (스테이지 조명) */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[140%] h-24 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(255,220,120,0.35), transparent 70%)',
            filter: 'blur(4px)',
          }}
        />

        <div className="relative px-6 py-7 sm:px-9 sm:py-9 flex flex-col gap-6">
          {/* === 헤더 행: 가벨 + ON AIR · 타이틀 · 뷰토글 === */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {/* 가벨 메달 — 포켓볼처럼 동그란 골드 메달 안에 가벨 SVG */}
              <span
                className="relative inline-flex w-14 h-14 rounded-full items-center justify-center"
                style={{
                  background: 'radial-gradient(circle at 30% 25%, #ffe89e, #c9971a 60%, #6f4a00 100%)',
                  boxShadow: 'inset 0 2px 3px rgba(255,255,255,0.45), inset 0 -3px 5px rgba(0,0,0,0.4), 0 4px 8px rgba(0,0,0,0.45)',
                }}
              >
                <GavelIcon />
                {/* 작은 LED 도트 — 라이브 표식 */}
                <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#2a040a]"
                  style={{
                    background: '#ff3344',
                    boxShadow: '0 0 8px #ff3344, 0 0 14px #ff3344aa',
                    animation: 'pulse-live 1.4s ease-in-out infinite',
                  }}
                />
              </span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-[0.2em]"
                    style={{
                      background: 'linear-gradient(180deg, #ff4d5c, #c2222d)',
                      color: '#fff',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 4px rgba(0,0,0,0.4)',
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white"
                      style={{ animation: 'pulse-live 1.2s ease-in-out infinite' }} />
                    ON AIR
                  </span>
                  <span className="font-mono text-[10px] font-bold tracking-[0.25em] uppercase text-[#f4c64a]">
                    POKÉVAULT · LIVE AUCTION HOUSE
                  </span>
                </div>
                <h1
                  className="mt-1.5 font-display text-3xl lg:text-4xl font-extrabold tracking-tight leading-[1.05]"
                  style={{
                    color: '#fff',
                    textShadow: '0 2px 0 rgba(0,0,0,0.6), 0 0 24px rgba(255,205,90,0.15)',
                  }}
                >
                  두근두근 LIVE 경매장
                </h1>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#ffe7a8]/85 max-w-xl">
                  망치가 떨어지는 순간, 카드의 새 주인이 결정돼요. 지금 단상 위엔 <b className="text-[#ffd97a]">{auctionCount}장</b>의 카드가 입찰을 기다리고 있어요.
                </p>
              </div>
            </div>

            {/* 뷰 토글 — LCD 세그먼트 버튼 */}
            <div
              className="inline-flex items-center rounded-full p-1 border border-[#f4c64a]/40"
              style={{ background: 'rgba(0,0,0,0.45)', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.6)' }}
              role="tablist"
              aria-label="경매 뷰 모드"
            >
              <ViewTab active={viewMode === 'lots'} onClick={() => setViewMode('lots')} icon="grid">
                LOT 목록
              </ViewTab>
              <ViewTab active={viewMode === 'live'} onClick={() => setViewMode('live')} icon="broadcast" pulse>
                LIVE 시청
              </ViewTab>
            </div>
          </div>

          {/* === LCD 보드 — 4 칸 라이브 통계 === */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatTile label="라이브 LOTS" value={String(stats.live).padStart(3, '0')} suffix="건" accent="#ffd97a" />
            <StatTile label="누적 입찰" value={String(stats.totalBids).padStart(4, '0')} suffix="회" accent="#8ec25a" />
            <StatTile label="마감 임박" value={String(stats.endingSoon).padStart(2, '0')} suffix="< 1H" accent="#ff7a45" alert={stats.endingSoon > 0} />
            <StatTile label="최고 입찰가" value={formatKRW(stats.topBid)} suffix="KRW" accent="#62caf0" mono />
          </div>
        </div>
      </div>

      {/* 키프레임 — 한 곳에서만 정의되도록 inline */}
      <style>{`
        @keyframes pulse-live {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.35; }
        }
        @keyframes scan-line {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
        @keyframes bid-pop {
          0% { transform: translateY(8px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function ViewTab({ active, onClick, icon, pulse, children }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="relative inline-flex items-center gap-1.5 h-8 px-3 rounded-full font-mono text-[10.5px] font-extrabold tracking-[0.18em] uppercase transition-all"
      style={{
        background: active
          ? 'linear-gradient(180deg, #ffe89e, #f4c64a)'
          : 'transparent',
        color: active ? '#3a1a00' : '#ffe7a8',
        boxShadow: active
          ? 'inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -2px 0 rgba(0,0,0,0.18), 0 2px 4px rgba(0,0,0,0.35)'
          : 'none',
      }}
    >
      {pulse && active && (
        <span className="w-1.5 h-1.5 rounded-full bg-[#c2222d]"
          style={{ animation: 'pulse-live 1.2s ease-in-out infinite' }} />
      )}
      <Icon name={icon} size={11} strokeWidth={2.4} />
      {children}
    </button>
  )
}

function StatTile({ label, value, suffix, accent, alert, mono }) {
  return (
    <div
      className="relative overflow-hidden rounded-lg border px-3 py-2.5"
      style={{
        background: 'rgba(0,0,0,0.55)',
        borderColor: 'rgba(244,198,74,0.25)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 0 1px rgba(0,0,0,0.4)',
      }}
    >
      {/* LCD 스캔라인 */}
      <span className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 3px)',
        }}
      />
      <div className="flex items-center justify-between gap-1.5">
        <span className="font-mono text-[9px] font-extrabold tracking-[0.2em] uppercase" style={{ color: '#ffe7a8aa' }}>
          {label}
        </span>
        {alert && (
          <span className="w-1.5 h-1.5 rounded-full"
            style={{ background: '#ff3344', boxShadow: '0 0 6px #ff3344', animation: 'pulse-live 1s ease-in-out infinite' }} />
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={mono ? 'font-mono tabular-nums' : 'font-display'}
          style={{
            color: accent,
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: mono ? '0.04em' : 'normal',
            textShadow: `0 0 12px ${accent}55`,
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: '#ffe7a8aa' }}>
          {suffix}
        </span>
      </div>
    </div>
  )
}

function GavelIcon() {
  // 단순화한 가벨 SVG — 무거운 망치 + 받침대
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3a1a00" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 4l6 6-3 3-6-6 3-3z" fill="#fff4cf" />
      <path d="M3 17l8-8" />
      <path d="M2 22h12" />
      <path d="M6 14l4 4" />
    </svg>
  )
}

// ═══════════════════════════════════════════════════════════════
// 라이브 커머스 뷰 — featured LOT + 입찰 피드 + 시청자 카운트
// ═══════════════════════════════════════════════════════════════
function LiveCommerceView({ lots, loading }) {
  // 마감 임박 LOT부터 정렬해 첫 LOT을 메인 무대에 올림
  const sorted = useMemo(() => {
    return [...lots].sort((a, b) => (a.endsAt || Infinity) - (b.endsAt || Infinity))
  }, [lots])

  const [featuredId, setFeaturedId] = useState(null)
  const featured = useMemo(() => {
    if (featuredId) return sorted.find((c) => c.id === featuredId) || sorted[0]
    return sorted[0]
  }, [sorted, featuredId])

  if (loading) {
    return (
      <div className="mt-10 text-center py-24 text-mute font-bold">
        <span className="led led-red led-pulse" style={{ width: 8, height: 8 }} /> 방송 준비 중…
      </div>
    )
  }
  if (!featured) {
    return (
      <div className="mt-10 text-center py-24">
        <div className="inline-flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-[#c2222d]/20 border-2 border-ink flex items-center justify-center shadow-[0_4px_0_#1a1a1a]">
            <Icon name="broadcast" size={28} strokeWidth={2.2} className="text-[#c2222d]" />
          </div>
          <div className="font-display text-xl font-bold text-ink">아직 방송 중인 LOT이 없어요</div>
          <div className="text-sm text-mute font-medium">곧 새로운 카드가 단상 위에 올라와요.</div>
        </div>
      </div>
    )
  }

  const upcoming = sorted.filter((c) => c.id !== featured.id).slice(0, 6)

  return (
    <div className="mt-6 grid lg:grid-cols-[1fr_320px] gap-5">
      <FeaturedLot lot={featured} />
      <LiveSidebar featured={featured} upcoming={upcoming} onPickLot={setFeaturedId} />
    </div>
  )
}

// ── 메인 무대 (스튜디오 화면) ───────────────────────────────
function FeaturedLot({ lot }) {
  const navigate = useNavigate()
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const t = lot.endsAt ? timeUntil(lot.endsAt) : null

  // 가짜 시청자 카운트 — 실제 소켓 없이도 라이브 느낌
  const viewers = useMemo(() => 80 + ((lot.id?.charCodeAt?.(0) || 7) * 13) % 240, [lot.id])
  const [pulse, setPulse] = useState(viewers)
  useEffect(() => {
    const t = setInterval(() => setPulse((v) => Math.max(20, v + Math.round((Math.random() - 0.45) * 6))), 2200)
    return () => clearInterval(t)
  }, [])

  const img = lot.images?.[0] || lot.image
  const current = lot.currentBid || lot.startingBid || 0
  const nextMin = Math.round(current * 1.05 / 1000) * 1000 || current + 1000

  return (
    <section
      className="relative overflow-hidden rounded-2xl border-2 border-ink shadow-[0_6px_0_#1a1a1a]"
      style={{
        background: 'linear-gradient(180deg, #1a0307 0%, #2a040a 100%)',
      }}
      aria-label={`LIVE LOT ${lot.name}`}
    >
      {/* 골드 트림 */}
      <div className="absolute inset-2 rounded-xl pointer-events-none"
        style={{ boxShadow: 'inset 0 0 0 1px rgba(255,205,90,0.3)' }}
      />

      {/* 스튜디오 화면부 */}
      <div className="relative aspect-[16/10] overflow-hidden">
        {/* 배경 카드 이미지 — 부드럽게 줌 인 */}
        {img && (
          <img
            src={img}
            alt={lot.nameKo || lot.name}
            className="absolute inset-0 w-full h-full object-cover opacity-40 blur-2xl scale-110"
            aria-hidden="true"
          />
        )}
        {/* 어둡게 가는 베일 */}
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse at 50% 35%, rgba(0,0,0,0.2), rgba(0,0,0,0.75) 75%)' }}
        />
        {/* 스캔 라인 — 라이브 방송 글리치 */}
        <span className="absolute inset-0 pointer-events-none"
          style={{
            background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 3px)',
          }}
        />
        {/* 카메라 무빙 스캔 — 위에서 아래로 빛이 흐름 */}
        <span className="absolute left-0 right-0 h-24 pointer-events-none"
          style={{
            background: 'linear-gradient(180deg, transparent, rgba(255,205,90,0.18), transparent)',
            animation: 'scan-line 5.5s linear infinite',
          }}
        />

        {/* 상단 좌측 — LIVE 배지, 시청자, 시간 */}
        <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-[0.2em]"
            style={{
              background: 'linear-gradient(180deg, #ff4d5c, #c2222d)',
              color: '#fff',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 4px rgba(0,0,0,0.4)',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white"
              style={{ animation: 'pulse-live 1.2s ease-in-out infinite' }} />
            ON AIR
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-mono text-[10px] font-bold text-[#ffe7a8] bg-black/60 border border-[#f4c64a]/30">
            <Icon name="eye" size={11} strokeWidth={2.4} />
            <span className="tabular-nums">{pulse.toLocaleString()}</span> 시청 중
          </span>
        </div>

        {/* 상단 우측 — LOT 번호 */}
        <div className="absolute top-3 right-3">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full font-mono text-[10px] font-bold text-[#3a1a00]"
            style={{ background: 'linear-gradient(180deg, #ffe89e, #f4c64a)' }}
          >
            LOT · {String(lot.id || '').slice(-4).toUpperCase()}
          </span>
        </div>

        {/* 중앙 — 카드 이미지 (포커스) */}
        <div className="absolute inset-0 flex items-center justify-center p-6">
          {img ? (
            <div className="relative">
              <img
                src={img}
                alt={lot.nameKo || lot.name}
                className="max-h-[280px] sm:max-h-[340px] rounded-lg shadow-2xl"
                style={{
                  filter: 'drop-shadow(0 18px 28px rgba(0,0,0,0.55)) drop-shadow(0 0 24px rgba(255,205,90,0.18))',
                }}
              />
              {/* 스포트라이트 그림자 */}
              <div className="absolute -inset-3 -z-10 rounded-2xl"
                style={{ background: 'radial-gradient(ellipse at center, rgba(255,205,90,0.25), transparent 65%)' }}
              />
            </div>
          ) : (
            <div className="w-40 h-56 rounded-lg bg-black/40 border border-[#f4c64a]/30" />
          )}
        </div>

        {/* 하단 좌 — 카드명 + set */}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <div className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-[#ffe7a8]/80">
              {lot.set || lot.setShort || 'POKÉMON TCG'}
            </div>
            <div className="font-display text-xl sm:text-2xl font-extrabold text-white leading-tight">
              {lot.nameKo || lot.name}
            </div>
          </div>
          {/* 카운트다운 */}
          {t && (
            <div className="inline-flex items-center gap-1 rounded-md border border-[#f4c64a]/40 bg-black/60 px-2 py-1">
              <Icon name="clock" size={11} strokeWidth={2.4} className="text-[#ffe7a8]" />
              <span className={`font-mono text-xs font-extrabold tabular-nums ${t.ended ? 'text-mute' : 'text-[#ffe7a8]'}`}>
                {t.ended ? '경매 종료' : `${t.d > 0 ? `${t.d}D ` : ''}${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}:${String(t.s).padStart(2, '0')}`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 입찰 액션 바 — 페이퍼 톤으로 전환해 가독성 ↑ */}
      <div className="px-5 py-4 sm:px-6 sm:py-5 bg-paper border-t-2 border-ink/15 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-4 flex-wrap">
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
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-extrabold text-sm border-2 border-ink shadow-[0_4px_0_#1a1a1a] hover:-translate-y-0.5 transition-all"
          style={{
            background: 'linear-gradient(180deg, #ff4d5c, #c2222d)',
            color: '#fff',
          }}
        >
          <Icon name="gavel" size={14} strokeWidth={2.4} />
          입찰장 입장하기
        </button>
      </div>
    </section>
  )
}

// ── 사이드바: 입찰 피드 + 대기 중 LOT ─────────────────────────
function LiveSidebar({ featured, upcoming, onPickLot }) {
  const navigate = useNavigate()
  return (
    <aside className="flex flex-col gap-4">
      <BidFeed lot={featured} />

      <div
        className="rounded-xl border-2 border-ink shadow-[0_4px_0_#1a1a1a] overflow-hidden"
        style={{ background: '#fffaee' }}
      >
        <div className="px-4 py-2.5 border-b-2 border-ink/10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2">
            <Icon name="layers" size={13} strokeWidth={2.4} className="text-ink" />
            <span className="font-display text-sm font-extrabold text-ink">다음 LOT</span>
          </div>
          <span className="font-mono text-[10px] font-bold text-mute tabular-nums">
            UP NEXT · {upcoming.length}
          </span>
        </div>
        <ul className="divide-y divide-ink/10">
          {upcoming.length === 0 && (
            <li className="px-4 py-6 text-center text-xs text-mute font-bold">대기 중인 LOT이 없어요.</li>
          )}
          {upcoming.map((c, i) => {
            const t = c.endsAt ? timeUntil(c.endsAt) : null
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onPickLot(c.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-electric/15 transition-colors"
                >
                  <span className="font-mono text-[10px] font-extrabold w-5 text-mute tabular-nums">
                    {String(i + 2).padStart(2, '0')}
                  </span>
                  <span className="w-10 h-12 rounded-md bg-bone-2 border border-ink/15 overflow-hidden shrink-0">
                    {(c.images?.[0] || c.image) && (
                      <img src={c.images?.[0] || c.image} alt="" className="w-full h-full object-cover" />
                    )}
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
                    <span className="font-mono text-[10px] font-bold text-rose tabular-nums shrink-0">
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
          onClick={() => navigate('/auctions')}
          className="w-full text-center py-2 text-[11px] font-extrabold uppercase tracking-wider text-ink border-t-2 border-ink/10 hover:bg-electric/15 transition-colors"
        >
          전체 LOT 보기 →
        </button>
      </div>
    </aside>
  )
}

// ── 입찰 피드 — 채팅처럼 흐르는 입찰 메시지 ───────────────────
const FEED_NAMES = [
  '트레이너_레드', '체육관관장이슬', '로켓단J', '오바람', '꼬마이브이',
  '엘리트포', '오박사 어시스턴트', '비키니아가씨', '낚시광 마사오', '바다트레이너지나',
]
const FEED_REACT = ['🔥', '⚡', '✨', '👀', '💥', '⭐', '🎯', '🛎️']

function BidFeed({ lot }) {
  // 가짜 실시간 피드 — 라이브 분위기 연출용 (실제 입찰은 상세 페이지에서)
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
        // 입찰
        const inc = Math.round((seedRef.current * (0.03 + Math.random() * 0.08)) / 1000) * 1000 || 1000
        seedRef.current += inc
        const who = FEED_NAMES[Math.floor(Math.random() * FEED_NAMES.length)]
        setItems((arr) => [
          ...arr.slice(-30),
          { id: `b-${Date.now()}`, kind: 'bid', who, amt: seedRef.current, t: Date.now() },
        ])
      } else if (kind < 0.85) {
        // 반응
        const who = FEED_NAMES[Math.floor(Math.random() * FEED_NAMES.length)]
        const r = FEED_REACT[Math.floor(Math.random() * FEED_REACT.length)]
        setItems((arr) => [
          ...arr.slice(-30),
          { id: `r-${Date.now()}`, kind: 'react', who, r, t: Date.now() },
        ])
      } else {
        // 시스템 — 마감 임박 알림
        setItems((arr) => [
          ...arr.slice(-30),
          { id: `s-${Date.now()}`, sys: true, msg: '🛎️ 마감 5분 전 — 마지막 입찰 기회!', t: Date.now() },
        ])
      }
    }
    const interval = setInterval(tick, 2200 + Math.random() * 1800)
    return () => clearInterval(interval)
  }, [])

  // 자동 스크롤 to bottom
  const scrollRef = useRef(null)
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [items])

  return (
    <div
      className="relative overflow-hidden rounded-xl border-2 border-ink shadow-[0_4px_0_#1a1a1a]"
      style={{
        background: 'linear-gradient(180deg, #1a0307 0%, #2a040a 100%)',
      }}
    >
      <div className="px-4 py-2.5 border-b border-[#f4c64a]/25 flex items-center justify-between">
        <div className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff3344]"
            style={{ boxShadow: '0 0 8px #ff3344', animation: 'pulse-live 1.2s ease-in-out infinite' }} />
          <span className="font-display text-sm font-extrabold text-[#ffe89e]">실시간 입찰 피드</span>
        </div>
        <span className="font-mono text-[10px] font-bold text-[#ffe7a8]/70 tabular-nums uppercase tracking-wider">
          LIVE
        </span>
      </div>
      <div
        ref={scrollRef}
        className="h-72 overflow-y-auto px-3 py-2 scrollbar-none flex flex-col gap-1.5"
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
        className="px-2.5 py-1.5 rounded-md text-center font-mono text-[10.5px] font-bold text-[#ffe7a8] bg-black/40 border border-[#f4c64a]/20"
        style={{ animation: 'bid-pop 0.3s ease-out' }}
      >
        {item.msg}
      </div>
    )
  }
  if (item.kind === 'react') {
    return (
      <div className="inline-flex items-center gap-1.5 text-[11px] text-[#ffe7a8]/80"
        style={{ animation: 'bid-pop 0.3s ease-out' }}
      >
        <span className="font-bold text-[#ffd97a]">{item.who}</span>
        <span className="opacity-80">{item.r}</span>
      </div>
    )
  }
  // bid
  return (
    <div
      className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md"
      style={{
        background: 'linear-gradient(180deg, rgba(244,198,74,0.12), rgba(244,198,74,0.03))',
        boxShadow: 'inset 0 0 0 1px rgba(244,198,74,0.25)',
        animation: 'bid-pop 0.3s ease-out',
      }}
    >
      <span className="inline-flex items-center gap-1.5 min-w-0">
        <span className="w-5 h-5 rounded-full grid place-items-center font-mono text-[9px] font-extrabold text-[#3a1a00]"
          style={{ background: 'linear-gradient(180deg, #ffe89e, #f4c64a)' }}>
          ₩
        </span>
        <span className="text-[11.5px] font-extrabold text-[#ffe89e] truncate">{item.who}</span>
      </span>
      <span className="font-mono text-[12px] font-extrabold text-white tabular-nums">
        {formatKRWFull(item.amt)}
      </span>
    </div>
  )
}
