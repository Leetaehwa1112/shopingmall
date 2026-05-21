import { Link } from 'react-router-dom'
import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { formatKRW, timeUntil } from '@/api/cards'
import { normalizeProduct, normalizePack } from '@/api/normalize'
import api from '@/api/axios'
import PokeCard from '@/components/common/PokeCard'
import CardTile from '@/components/common/CardTile'
import PackTile from '@/components/common/PackTile'
import Countdown from '@/components/common/Countdown'
import GradeBadge from '@/components/common/GradeBadge'
import Button from '@/components/common/Button'
import Pokeball from '@/components/common/Pokeball'
import Icon from '@/components/common/Icon'
import Eyebrow from '@/components/common/Eyebrow'
import Sparkles from '@/components/common/Sparkles'
import SectionHead from '@/components/common/SectionHead'

// React Query fetchers — 페이지 unmount 후에도 5분 staleTime 캐시 유지 (queryClient default)
// 경매는 LIVE(active) 1건 + 예정(upcoming) 다건을 함께 가져옴 — lotOrder 정렬 적용됨(서버).
// 반환은 { list, total } 형태로 통일 — 카테고리 타일이 실제 전체 카운트(서버 total)를
// 보여줄 수 있도록. list는 limit 제한된 표시용, total은 페이지네이션 전체 수.
const fetchAuctions = () =>
  api.get('/products', { params: { sale_type: 'auction', status: 'active,upcoming', limit: 10 } })
    .then((r) => ({ list: r.data.data.map(normalizeProduct), total: r.data.total ?? 0 }))
const fetchBuynow = () =>
  api.get('/products', { params: { sale_type: 'buynow', status: 'active', limit: 4 } })
    .then((r) => ({ list: r.data.data.map(normalizeProduct), total: r.data.total ?? 0 }))
const fetchFeaturedPacks = () =>
  api.get('/packs', { params: { status: 'active', limit: 4 } })
    .then((r) => ({ list: r.data.data.map(normalizePack), total: r.data.total ?? 0 }))

export default function HomePage() {
  const auctionsQ = useQuery({ queryKey: ['home-auctions'], queryFn: fetchAuctions })
  const buyNowQ   = useQuery({ queryKey: ['home-buynow'],   queryFn: fetchBuynow })
  const packsQ    = useQuery({ queryKey: ['home-packs'],    queryFn: fetchFeaturedPacks })

  const auctions = auctionsQ.data?.list ?? []
  const buyNow = buyNowQ.data?.list ?? []
  const featuredPacks = packsQ.data?.list ?? []
  // 서버 전체 카운트(limit과 무관) — 카테고리 타일 부제에 노출.
  const auctionsTotal = auctionsQ.data?.total ?? 0
  const buyNowTotal = buyNowQ.data?.total ?? 0
  const packsTotal = packsQ.data?.total ?? 0
  const loading = auctionsQ.isLoading || buyNowQ.isLoading || packsQ.isLoading
  const error = auctionsQ.error || buyNowQ.error || packsQ.error
  const fetchAll = () => {
    auctionsQ.refetch(); buyNowQ.refetch(); packsQ.refetch()
  }

  // 파생값 memoize — auctions 참조 변경 시에만 재계산.
  // 정책: 동시 LIVE 1건. 나머지는 'upcoming' (시작 전 예고).
  const { liveAuctions, upcomingAuctions, FEATURED_LIVE, TOP_LOT } = useMemo(() => {
    const live = auctions.filter(
      (a) => a.status === 'active' && (!a.endsAt || a.endsAt - Date.now() > 0)
    )
    const upcoming = auctions
      .filter((a) => a.status === 'upcoming')
      .sort((a, b) => (a.lotOrder || 0) - (b.lotOrder || 0) || (a.startsAt || Infinity) - (b.startsAt || Infinity))
    // featured = 현재 무대 위 LOT (LIVE 1건). LIVE가 없으면 다음 예정 LOT을 카드로 보여줌.
    const featured = live[0] || null
    const topLot = featured || upcoming[0] || null
    return { liveAuctions: live, upcomingAuctions: upcoming, FEATURED_LIVE: featured, TOP_LOT: topLot }
  }, [auctions])

  // CTA — 라이브가 있으면 LIVE 카드 이름을 직접 노출 (5초 컷, 정체성 강조)
  const heroPrimaryCta = FEATURED_LIVE
    ? `🔴 지금 ${FEATURED_LIVE.nameKo || FEATURED_LIVE.name} 입찰 중!`
    : upcomingAuctions.length > 0
      ? `다음 경매 일정 보기 · ${upcomingAuctions.length}건 예정`
      : '즉시구매 카드 보기'
  const heroPrimaryTo = FEATURED_LIVE ? `/products/${FEATURED_LIVE.id}` : '/auctions'
  // 보조 CTA — LIVE 유무와 상관없이 카드팩 바로 구매 진입점으로 통일.
  const heroSecondaryCta = '카드팩 바로구매'
  const heroSecondaryTo = '/packs'

  return (
    <main className="bg-bone">
      {/* === 가상계좌 입금 대기 배너 (최상단 고정) === */}
      <PendingDepositBanner />

      {/* === 글로벌 에러 배너 === */}
      {error && !loading && (
        <div role="alert" className="bg-red-50 border-b-2 border-red-300 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-red-800">
              <Icon name="close" size={14} strokeWidth={2.5} />
              <span className="font-bold">데이터를 불러오지 못했어요.</span>
              <span className="text-red-700/80">잠깐 네트워크 확인하고 다시 시도해주세요.</span>
            </div>
            <button
              type="button"
              onClick={fetchAll}
              className="text-sm font-bold text-red-700 hover:text-red-900 underline underline-offset-2"
            >
              다시 시도
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          HERO — 두근거림과 욕망
          ════════════════════════════════════════════════ */}
      <section aria-label="히어로" className="relative px-6 pt-12 pb-16 lg:pt-16 lg:pb-20 overflow-hidden">
        {/* ambient confetti + polka dot wash */}
        <div className="absolute inset-0 bg-polka opacity-40 pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 bg-confetti pointer-events-none" aria-hidden="true" />
        {/* floating decoration */}
        <div className="absolute -top-6 -right-10 hidden lg:block opacity-20 float-bob" aria-hidden="true">
          <Pokeball size={180} />
        </div>

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-start">
          {/* LEFT */}
          <div className="sparkle-host relative">
            <Sparkles always className="hidden lg:block" />

            <Eyebrow tone="ink" dot dotColor="red" className="mb-5">
              지금 두근거리는 옥션
            </Eyebrow>

            <h1 className="font-display text-[42px] sm:text-5xl lg:text-[68px] font-bold text-ink leading-[1.02] tracking-tight mb-5">
              어릴 적<br className="hidden sm:inline" />
              <span className="relative inline-block">
                <span className="relative z-10">갖고 싶었던</span>
                <span className="absolute -bottom-1 left-0 right-0 h-4 bg-electric -z-0 rounded-full" aria-hidden="true" />
              </span>{' '}
              그 카드,
              <br />
              <span className="text-dex">오늘 우리</span> 컬렉션으로
            </h1>

            <p className="text-base lg:text-[18px] text-mute leading-relaxed max-w-xl mb-8 font-medium">
              PSA·BGS·CGC 인증 카드만 모았어요. 100% 정품 보증, 가품이면 전액 환불.<br />
              <span className="text-ink font-bold">트레이너의 마당에 오신 걸 환영해요.</span>
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              <Link to={heroPrimaryTo} aria-label={heroPrimaryCta}>
                <Button variant="spark" size="lg">
                  {heroPrimaryCta} <Icon name="arrow" size={14} strokeWidth={2.5} />
                </Button>
              </Link>
              <Link to={heroSecondaryTo} aria-label={heroSecondaryCta}>
                <Button variant="secondary" size="lg">
                  {heroSecondaryCta}
                </Button>
              </Link>
            </div>

            {/* fun trust chips */}
            <ul className="flex flex-wrap items-center gap-2" aria-label="신뢰 보증 요약">
              <li className="chip-type chip-type-grass">정품 100%</li>
              <li className="chip-type chip-type-electric">PSA·BGS·CGC</li>
              <li className="chip-type chip-type-water">안심 배송</li>
            </ul>
          </div>

          {/* RIGHT — smart panel. 다음 LOT 정보는 패널 내부 한 줄 힌트로 통합(좌우 높이 정렬). */}
          <div className="hidden md:block">
            {loading ? (
              <HeroPanelSkeleton />
            ) : FEATURED_LIVE ? (
              <FeaturedLivePanel card={FEATURED_LIVE} nextLot={upcomingAuctions[0]} />
            ) : upcomingAuctions[0] ? (
              <NextAuctionPanel card={upcomingAuctions[0]} queueCount={upcomingAuctions.length} />
            ) : buyNow[0] ? (
              <FeaturedBuyNowPanel card={buyNow[0]} />
            ) : (
              <ComingSoonPanel />
            )}
          </div>

          {!loading && FEATURED_LIVE && (
            <div className="md:hidden">
              <FeaturedLivePanel card={FEATURED_LIVE} compact />
            </div>
          )}
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          QUICK CATEGORIES
          ════════════════════════════════════════════════ */}
      <section aria-label="카테고리 바로가기" className="px-6 pb-14">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <CategoryTile
            to="/auctions"
            icon="flame"
            label="경매"
            desc={
              FEATURED_LIVE
                ? `🔴 LIVE · ${FEATURED_LIVE.nameKo || FEATURED_LIVE.name}`
                : upcomingAuctions.length > 0
                  ? `🕒 ${upcomingAuctions.length}건 예정`
                  : '곧 오픈!'
            }
            tone="fire"
            ledPulse={!!FEATURED_LIVE}
            disabled={!loading && !FEATURED_LIVE && upcomingAuctions.length === 0}
          />
          <CategoryTile
            to="/products?type=buynow"
            icon="bolt"
            label="즉시구매"
            desc={buyNowTotal > 0 ? `⚡ ${buyNowTotal}건 즉시 발송` : '준비 중'}
            tone="electric"
            disabled={!loading && buyNowTotal === 0}
          />
          <CategoryTile
            to="/packs"
            icon="package"
            label="카드팩 · 박스"
            desc={packsTotal > 0 ? `🎁 ${packsTotal}건 미개봉` : '준비 중'}
            tone="water"
            disabled={!loading && packsTotal === 0}
          />
          <CategoryTile
            to="/products"
            icon="trophy"
            label="전체 카탈로그"
            desc={
              auctionsTotal + buyNowTotal > 0
                ? `🌟 ${(auctionsTotal + buyNowTotal).toLocaleString()}종 카드`
                : '🌟 모든 카드'
            }
            tone="psychic"
          />
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          SEALED PACKS — 카테고리 바로 아래 위치 (TOP LOT 자리 대체).
          PackTile에 hover 시 팩 상단 뜯어지며 카드 peek 효과(카드깡 심리).
          ════════════════════════════════════════════════ */}
      <section aria-label="미개봉 카드팩" className="max-w-7xl mx-auto px-6 py-14">
        <SectionHead
          eyebrow="미개봉 팩"
          eyebrowTone="electric"
          eyebrowIcon="package"
          title="포장 그대로,"
          accent={<span className="text-electric">🎁</span>}
          desc="vintage 부스터팩부터 최신 ETB까지. 직접 뜯어보는 두근거림. 마우스 올리면 살짝 열려요."
          cta={featuredPacks.length > 0 ? { label: '전체 카드팩', to: '/packs' } : null}
        />
        {loading ? (
          <GridSkeleton cols={4} count={4} />
        ) : featuredPacks.length === 0 ? (
          <EmptyState
            icon="package"
            title="카드팩 채우는 중"
            desc="vintage 부스터팩 입고 알림 받아보실래요?"
            cta={{ label: '회원가입', to: '/register' }}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredPacks.map((p, i) => (
              <div key={p.id || p._id} className="reveal-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <PackTile pack={p} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════
          TODAY'S TOP LOT — 현재 LIVE 경매 1건만 노출 (예정만 있을 땐 숨김)
          ════════════════════════════════════════════════ */}
      {!loading && FEATURED_LIVE && TOP_LOT && (
        <section aria-label="오늘의 탑 로트" className="py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <Eyebrow tone="fire" dot dotColor="red" className="mb-3">
                  오늘의 메인 카드
                </Eyebrow>
                <h2 className="font-display text-3xl lg:text-[42px] font-bold text-ink tracking-tight leading-[1.05]">
                  하루 단 한 점, <span className="text-dex">놓치면 끝!</span>
                </h2>
                <p className="text-[15px] text-mute mt-2 font-medium">
                  포켓덱스가 오늘 봉인한 가장 특별한 카드를 만나보세요.
                </p>
              </div>
            </div>

            <div className="dex-casing p-5 sm:p-6 reveal-up holo-shine sparkle-host relative">
              <Sparkles always />
              <div className="flex items-center justify-between mb-5">
                <div className="inline-flex items-center gap-2.5">
                  <span className="led led-red led-pulse" aria-hidden="true" />
                  <span className="pixel-label text-white">TODAY'S TOP LOT</span>
                </div>
                <span className="pixel-label text-white/70">No.<span className="text-electric">001</span></span>
                <div className="hidden sm:flex gap-1.5" aria-hidden="true">
                  <span className="led led-blue" />
                  <span className="led led-yellow" />
                  <span className="led led-green" />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
                <div className="lcd p-6 scan flex flex-col min-h-[520px] order-2 lg:order-none lg:col-start-1 lg:row-start-1 lg:row-span-2">
                  <div className="border-b border-dashed border-ink/15 pb-4 mb-4">
                    <div className="pixel-label text-ink/50 mb-2">AUCTION CATALOG · LOT #001</div>
                    <h3 className="font-display text-5xl sm:text-6xl font-bold text-ink leading-[0.95] tracking-tight">
                      {TOP_LOT.nameKo}
                    </h3>
                    <div className="text-lg italic text-ink/60 mt-2 font-medium">
                      {TOP_LOT.name} <span className="text-ink/40">·</span> #{TOP_LOT.number}
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4 mb-5">
                    <GradeBadge grade={TOP_LOT.grade} size="lg" />
                    {TOP_LOT.grade?.cert && (
                      <div className="text-right">
                        <div className="pixel-label text-ink/50 mb-1">CERT NO.</div>
                        <div className="font-mono text-sm font-bold text-ink">#{TOP_LOT.grade.cert}</div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-5 gap-y-2 mb-5 text-sm font-mono">
                    <SpecRow k="Year" v={TOP_LOT.year ?? '—'} />
                    <SpecRow k="Set" v={TOP_LOT.set || TOP_LOT.setShort || '—'} />
                    <SpecRow k="Number" v={TOP_LOT.number ?? '—'} />
                    <SpecRow k="Rarity" v={TOP_LOT.rarity || '—'} />
                    {TOP_LOT.population && (
                      <SpecRow k="Pop. (PSA 10)" v={`${TOP_LOT.population.psa10 ?? '—'} / ${TOP_LOT.population.total ?? '—'}`} />
                    )}
                    <SpecRow k="Watchers" v={TOP_LOT.watchers ?? '—'} />
                  </div>

                  <div className="bg-electric/10 rounded-xl p-4 mb-5 border-2 border-ink/15">
                    <div className="pixel-label text-ink/70 mb-3 inline-flex items-center gap-1.5">
                      <Icon name="shield" size={11} strokeWidth={2.5} className="text-grass" aria-hidden="true" />
                      AUTHENTICATION
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                      <Check label="인쇄 결함 없음" />
                      <Check label="모서리 완벽" />
                      <Check label="센터링 55/45" />
                      <Check label="Vault 보관" />
                      <Check label="1st Edition 인증" />
                      <Check label="단일 소유주" />
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="pixel-label text-ink/70">BID PROGRESS</span>
                      <span className="pixel-label text-ink/50">{TOP_LOT.bidCount}회</span>
                    </div>
                    <div className="hp-bar" role="progressbar" aria-valuenow={77} aria-valuemin={0} aria-valuemax={100}>
                      <div className="hp-bar-fill" style={{ width: '77%' }} />
                    </div>
                    <div className="flex justify-between mt-2 text-xs font-mono text-ink/60">
                      <span>시작가 {formatKRW(TOP_LOT.startPrice)}</span>
                      <span className="text-ink font-bold">현재 {formatKRW(TOP_LOT.currentBid)}</span>
                    </div>
                  </div>
                </div>

                <div className="dex-casing-inset p-5 relative overflow-hidden order-1 lg:order-none lg:col-start-2 lg:row-start-1">
                  <div className="flex items-center justify-between mb-2 relative z-10">
                    <span className="inline-flex items-center gap-1.5 pixel-label text-white/70">
                      <span className="led led-red led-pulse" style={{ width: 6, height: 6 }} aria-hidden="true" />
                      PHOTO MODULE
                    </span>
                    <span className="pixel-label text-electric">360°</span>
                  </div>
                  <div className="relative flex justify-center items-center sparkle-host" style={{ height: 340, perspective: '1500px' }}>
                    <Sparkles always />
                    <div className="spotlight" aria-hidden="true" />
                    <div className="turntable-disc" style={{ width: 280, height: 280, bottom: 10, left: '50%', marginLeft: -140 }} aria-hidden="true" />
                    <div className="card-sway relative z-10">
                      <Link to={`/products/${TOP_LOT.id}`} aria-label={`${TOP_LOT.nameKo} 상세 보기`} className="block">
                        <PokeCard card={TOP_LOT} size="md" />
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 relative z-10">
                    <span className="pixel-label text-white/50">SLOT-A · {TOP_LOT.year}</span>
                    <span className="pixel-label text-white/50">QTY 1 / 1</span>
                  </div>
                </div>

                {(() => {
                  const lotEnded = TOP_LOT.endsAt && timeUntil(TOP_LOT.endsAt).ended
                  return (
                    <div className="bg-paper border-2 border-ink rounded-2xl p-5 space-y-4 order-3 lg:order-none lg:col-start-2 lg:row-start-2 shadow-[0_4px_0_#1a1a1a]">
                      <div>
                        <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-dex mb-1">
                          {lotEnded ? '최종 입찰가' : '🔥 현재 입찰가'}
                        </div>
                        <div className="font-display text-[40px] font-bold text-ink leading-none tabular-nums">
                          {formatKRW(TOP_LOT.currentBid)}
                        </div>
                        <div className="text-xs font-mono text-mute mt-1.5">
                          입찰 {TOP_LOT.bidCount}회 · {TOP_LOT.watchers}명이 노리는 중
                        </div>
                      </div>
                      <div className={`rounded-xl p-3.5 border-2 ${lotEnded ? 'bg-bone-2 text-mute border-line' : 'bg-ink text-white border-ink'}`}>
                        <div className={`text-[10px] font-bold tracking-[0.18em] uppercase mb-2 inline-flex items-center gap-1.5 ${lotEnded ? 'text-mute' : 'text-electric'}`}>
                          <Icon name="clock" size={10} strokeWidth={2.5} aria-hidden="true" />
                          {lotEnded ? '경매 종료' : '마감까지'}
                        </div>
                        {lotEnded ? (
                          <div className="font-mono text-sm font-bold tracking-wider">CLOSED</div>
                        ) : (
                          <Countdown endsAt={TOP_LOT.endsAt} size="sm" label={false} />
                        )}
                      </div>
                      {lotEnded ? (
                        <Button variant="secondary" size="lg" className="w-full" disabled aria-disabled="true">
                          입찰 종료
                        </Button>
                      ) : (
                        <Link to={`/products/${TOP_LOT.id}`} className="block" aria-label={`${TOP_LOT.nameKo} 입찰 페이지로 이동`}>
                          <Button variant="pop" size="lg" className="w-full">
                            지금 두근두근 입찰! <Icon name="arrow" size={14} strokeWidth={2.5} />
                          </Button>
                        </Link>
                      )}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ════════════════════════════════════════════════
          UP NEXT — 다음 경매 일정 (LIVE 1건 정책 — 큐가 보여야 신뢰)
          ════════════════════════════════════════════════ */}
      {!loading && upcomingAuctions.length > 0 && (
        <UpcomingScheduleSection cards={upcomingAuctions} hasLive={!!FEATURED_LIVE} />
      )}

      {/* ════════════════════════════════════════════════
          TRUST — playful pop block
          ════════════════════════════════════════════════ */}
      <section aria-label="신뢰 시스템" className="bg-paper border-y-2 border-ink py-16 my-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-polka opacity-30 pointer-events-none" aria-hidden="true" />
        <div className="max-w-7xl mx-auto px-6 relative">
          <div className="text-center mb-10 max-w-2xl mx-auto">
            <Eyebrow tone="ink" className="mb-4">왜 포케볼트인가요?</Eyebrow>
            <h2 className="font-display text-3xl lg:text-[42px] font-bold text-ink mb-3 tracking-tight leading-[1.05]">
              안심하고 <span className="text-dex">즐기세요</span>
            </h2>
            <p className="text-[15px] text-mute font-medium">
              모든 카드는 공식 등급사 인증을 거쳐요. 안심 배송과 에스크로로 안전하게 거래해요.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TrustPillar tone="grass"    icon="shield"  title="100% 정품 보증" desc="가품이면 전액 환불" />
            <TrustPillar tone="electric" icon="trophy"  title="공식 등급 인증" desc="PSA · BGS · CGC" />
            <TrustPillar tone="water"    icon="package" title="안심 배송"       desc="FedEx 보험 포함" />
            <TrustPillar tone="psychic"  icon="lock"    title="에스크로 결제"   desc="100만원↑ 자동" />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          BUY NOW
          ════════════════════════════════════════════════ */}
      <section aria-label="즉시구매 카드" className="max-w-7xl mx-auto px-6 py-14">
        <SectionHead
          eyebrow="즉시구매"
          eyebrowTone="water"
          eyebrowIcon="bolt"
          title="바로 데려갈 수 있어요"
          accent={<span className="text-water">⚡</span>}
          desc="검수 완료된 카드를 정찰가로 바로 소장하세요. 24시간 안에 발송돼요."
          cta={buyNow.length > 0 ? { label: '전체 카탈로그', to: '/products' } : null}
        />
        {loading ? (
          <GridSkeleton cols={4} count={4} />
        ) : buyNow.length === 0 ? (
          <EmptyState
            icon="bolt"
            title="즉시구매 카드 채우는 중"
            desc="새 카드 곧 입고돼요. 전체 카탈로그에서 다른 카드 어때요?"
            cta={{ label: '전체 카탈로그', to: '/products' }}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {buyNow.map((c, i) => (
              // card-pop-wrap이 idle breathe + hover lift 담당 (reveal-up은 첫 진입 fade,
              // 둘이 충돌하지 않게 wrapper 분리)
              <div key={c.id || c._id} className="reveal-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <div
                  className="card-pop-wrap sparkle-host is-on"
                  style={{ animationDelay: `${i * 0.4}s` }}
                >
                  <CardTile card={c} stage />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════
          SELL / JOIN CTA
          ════════════════════════════════════════════════ */}
      <section aria-label="판매 · 회원가입" className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Sell — 위탁(노란 electric 톤) */}
          <div className="dex-casing p-8 relative overflow-hidden text-white holo-shine sparkle-host">
            <Sparkles always />
            <div className="flex items-center gap-2 mb-3">
              <span className="led led-yellow led-pulse" aria-hidden="true" />
              <span className="pixel-label text-electric">CONSIGN</span>
            </div>
            <h3 className="font-display text-[28px] lg:text-[36px] font-bold mb-3 leading-[1.05]">
              <span className="text-electric">내 카드 위탁하기</span>
            </h3>
            <p className="text-[15px] text-white/85 leading-relaxed mb-6 max-w-sm font-medium">
              PSA·BGS 등급 카드를 위탁하면 트레이너들 사이에서 두근거림이 시작돼요. 수수료 10%.
            </p>
            <Link to="/sell" aria-label="카드 위탁하기">
              <Button variant="electric" size="lg">내 카드 위탁하기 <Icon name="arrow" size={14} strokeWidth={2.5} /></Button>
            </Link>
          </div>

          {/* Join — 트레이너 등록 (보라 psychic 톤) */}
          <div className="surface-pop p-8 relative overflow-hidden">
            <Pokeball size={160} className="absolute -bottom-6 -right-6 opacity-15 float-bob" aria-hidden="true" />
            <div className="relative sparkle-host">
              <Sparkles />
              <Eyebrow tone="psychic" className="mb-4">Become a Trainer</Eyebrow>
              <h3 className="font-display text-[28px] lg:text-[36px] font-bold text-ink mb-3 leading-[1.05]">
                <span className="text-psychic">트레이너 등록하기</span>
              </h3>
              <p className="text-[15px] text-mute leading-relaxed mb-6 max-w-sm font-medium">
                경매 참여, 자동 입찰, 시세 알림까지. 무료로 시작할 수 있어요.
              </p>
              <Link to="/register" aria-label="트레이너 등록 페이지로 이동">
                <Button variant="psychic" size="lg">트레이너 등록하기 <Icon name="arrow" size={14} strokeWidth={2.5} /></Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

/* ─── 가상계좌 입금 대기 배너 ─────────────────────────────── */
// sessionStorage의 last-order에 method='bank'인 미입금 주문이 있으면 상단 배너로 알림.
// 사용자가 닫으면 localStorage에 dismiss 플래그 저장 (해당 orderId 한정).
const PENDING_DISMISS_KEY = 'pokevault:pendingDepositDismissed'

function PendingDepositBanner() {
  const [order, setOrder] = useState(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('last-order')
      if (!raw) return
      const o = JSON.parse(raw)
      if (o?.method !== 'bank') return
      const orderId = o.serverOrder?.orderNumber || o.orderId
      const dismissed = localStorage.getItem(PENDING_DISMISS_KEY) === orderId
      if (!dismissed) setOrder(o)
    } catch { /* 무시 */ }
  }, [])

  if (!order) return null
  const orderId = order.serverOrder?.orderNumber || order.orderId

  const onDismiss = () => {
    try { localStorage.setItem(PENDING_DISMISS_KEY, orderId) } catch {}
    setOrder(null)
  }

  return (
    <div className="bg-electric/20 border-b-2 border-ink/20 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className="led led-yellow led-pulse" aria-hidden="true" />
          <div className="text-sm text-ink leading-snug">
            <strong className="font-bold">가상계좌 입금 대기 중</strong>
            <span className="text-ink/70 font-medium"> · 발급된 계좌로 24시간 내 입금해 주세요.</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/order-complete"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ink text-paper text-xs font-bold border-2 border-ink shadow-[0_2px_0_#1a1a1a] hover:-translate-y-0.5 transition-all"
          >
            입금 정보 보기 <Icon name="arrow" size={12} strokeWidth={2.5} />
          </Link>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="배너 닫기"
            className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink/60 hover:text-ink hover:bg-ink/10 transition-colors"
          >
            <Icon name="close" size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Featured panels ─────────────────────────────────────── */

// 5초 컷 임팩트 패널 — 빨간 LIVE 헤더 + 카드 + 현재가 + 거대 CTA.
// 정책: 동시 LIVE 1건 → 이 패널은 "지금 무대 위" 그 자체.
function FeaturedLivePanel({ card, compact = false, nextLot = null }) {
  const lotEnded = card.endsAt && timeUntil(card.endsAt).ended
  // 가짜 시청자 수 — LOT _id 기반 결정적 의사난수 (리렌더 마다 흔들리지 않게)
  const viewers = useMemo(() => {
    const id = String(card.id || card._id || '')
    const seed = id ? id.charCodeAt(id.length - 1) + id.length * 7 : 73
    return 180 + (seed % 240)
  }, [card.id, card._id])

  // compact (모바일) — 단순 좌우 배치 유지
  if (compact) {
    return (
      <div className="rounded-2xl border-2 border-ink overflow-hidden relative shadow-[0_6px_0_#1a1a1a,0_12px_30px_rgba(220,38,38,0.18)]">
        <div
          className="relative px-4 py-3 border-b-2 border-ink overflow-hidden"
          style={{
            background: lotEnded
              ? 'linear-gradient(180deg, #6b7280 0%, #4b5563 100%)'
              : 'linear-gradient(180deg, var(--color-dex) 0%, var(--color-dex-d) 100%)',
          }}
        >
          {!lotEnded && (
            <span aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-50"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', animation: 'shine-sweep 3.2s ease-in-out infinite' }} />
          )}
          <div className="relative flex items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2">
              {!lotEnded && (
                <span aria-hidden="true" className="relative inline-flex items-center justify-center" style={{ width: 12, height: 12 }}>
                  <span className="absolute inset-0 rounded-full bg-white opacity-70" style={{ animation: 'live-ring 1.4s ease-out infinite' }} />
                  <span className="relative rounded-full bg-white" style={{ width: 10, height: 10 }} />
                </span>
              )}
              <span className="font-display font-extrabold text-white text-lg tracking-tight">{lotEnded ? 'CLOSED' : 'LIVE'}</span>
              <span className="text-[10px] font-bold text-white/85 uppercase tracking-widest">· LOT #{card.lotOrder || 1}</span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/30 border border-white/30 text-white text-[11px] font-bold tabular-nums">
              <Icon name="eye" size={11} strokeWidth={2.4} aria-hidden="true" />
              {viewers.toLocaleString()}
            </span>
          </div>
        </div>
        <Link to={`/products/${card.id}`} className="block group bg-paper" aria-label={`${card.nameKo} 경매 상세`}>
          <div className="flex gap-4 p-5">
            <div className="shrink-0 holo-sheen rounded-lg">
              <PokeCard card={card} size="xs" />
            </div>
            <div className="min-w-0 flex flex-col justify-between flex-1">
              <div>
                <h2 className="font-display text-xl font-bold text-ink leading-tight mb-1 group-hover:text-dex transition-colors">{card.nameKo}</h2>
                <div className="text-xs text-mute mb-2 truncate font-medium">{card.name} · {card.setShort || card.set} · {card.year}</div>
                <GradeBadge grade={card.grade} size="sm" />
              </div>
              <div className="mt-3">
                <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-dex">{lotEnded ? '최종 입찰가' : '현재 입찰가'}</div>
                <div className="font-display text-2xl font-bold text-ink leading-none tabular-nums">{formatKRW(card.currentBid || card.startPrice)}</div>
                <div className="text-[11px] font-mono text-mute mt-1">{card.bidCount || 0}회 입찰</div>
              </div>
            </div>
          </div>
        </Link>
        <div className="px-5 pb-5 bg-paper">
          {lotEnded ? (
            <Button variant="secondary" size="lg" className="w-full" disabled aria-disabled="true">입찰 종료</Button>
          ) : (
            <Link to="/auctions" className="block" aria-label="경매장 둘러보기">
              <button type="button" className="btn btn-pop btn-lg relative overflow-hidden w-full">
                <Icon name="gavel" size={16} strokeWidth={2.6} />
                두근두근 경매 보러가기
                <Icon name="arrow" size={14} strokeWidth={2.6} />
              </button>
            </Link>
          )}
        </div>
        <style>{`
          @keyframes live-ring { 0%{transform:scale(1);opacity:.85} 80%{transform:scale(2.4);opacity:0} 100%{transform:scale(2.4);opacity:0} }
          @keyframes shine-sweep { 0%{transform:translateX(-120%)} 100%{transform:translateX(260%)} }
        `}</style>
      </div>
    )
  }

  // 데스크탑 — 카드만 노출. 오스카 트로피처럼 Y축 360° 자동 회전, 뒷면은 1세대 카드 백.
  // 클릭 시 상품 상세로 이동.
  return (
    <div className="text-center px-2">
      <Link
        to={`/products/${card.id}`}
        className="inline-block group/card oscar-stage"
        aria-label={`${card.nameKo} 경매 상세`}
        style={{
          perspective: '1600px',
          filter: 'drop-shadow(0 22px 36px rgba(0,0,0,0.34)) drop-shadow(0 8px 14px rgba(220,38,38,0.22))',
        }}
      >
        <div className="oscar-inner">
          {/* Front — 실제 카드 */}
          <div className="oscar-face oscar-front">
            <PokeCard card={card} size="lg" interactive={false} />
          </div>
          {/* Back — 1세대 포켓몬 카드 백 원본 (Bulbapedia) */}
          <div className="oscar-face oscar-back" aria-hidden="true">
            <img
              src="/card-back.jpg"
              alt=""
              draggable={false}
              style={{ width: 300, height: 420, borderRadius: 12, display: 'block', objectFit: 'cover' }}
            />
          </div>
        </div>
      </Link>
      <style>{`
        @keyframes oscar-spin {
          0%   { transform: rotateY(0deg); }
          100% { transform: rotateY(360deg); }
        }
        .oscar-stage { position: relative; }
        .oscar-inner {
          position: relative;
          width: 300px;
          height: 420px;
          transform-style: preserve-3d;
          animation: oscar-spin 7s linear infinite;
        }
        .oscar-face {
          position: absolute;
          inset: 0;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          border-radius: 12px;
        }
        .oscar-front { transform: rotateY(0deg); }
        .oscar-back  { transform: rotateY(180deg); }
      `}</style>
    </div>
  )
}

// LIVE가 없을 때만 노출되는 다음 경매 카운트다운 패널
function NextAuctionPanel({ card, queueCount }) {
  return (
    <div className="rounded-2xl border-2 border-ink bg-paper overflow-hidden shadow-[0_4px_0_#1a1a1a]">
      <div className="px-4 py-3 border-b-2 border-ink bg-bone-2 flex items-center justify-between">
        <span className="inline-flex items-center gap-2">
          <span className="led led-yellow led-pulse" style={{ width: 8, height: 8 }} aria-hidden="true" />
          <span className="font-display font-extrabold text-ink text-base">곧 시작</span>
          <span className="text-[10px] font-bold text-mute uppercase tracking-widest">· LOT #{card.lotOrder || '-'}</span>
        </span>
        <span className="text-[10px] font-bold text-mute">{queueCount}건 대기열</span>
      </div>
      <Link to={`/products/${card.id}`} className="block group" aria-label={`예정 경매: ${card.nameKo}`}>
        <div className="flex gap-4 p-5">
          <div className="shrink-0 holo-sheen rounded-lg opacity-90">
            <PokeCard card={card} size="sm" />
          </div>
          <div className="min-w-0 flex flex-col justify-between flex-1">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-ink leading-tight mb-1 group-hover:text-dex transition-colors">
                {card.nameKo}
              </h2>
              <div className="text-xs text-mute mb-2 truncate font-medium">
                {card.name} · {card.setShort || card.set} · {card.year}
              </div>
              <GradeBadge grade={card.grade} size="sm" />
            </div>
            <div className="mt-3">
              <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute">시작가</div>
              <div className="font-display text-2xl font-bold text-ink leading-none tabular-nums">
                {formatKRW(card.startPrice)}
              </div>
            </div>
          </div>
        </div>
        {card.startsAt && (
          <div className="px-5 pb-3">
            <div className="rounded-lg bg-ink text-white px-3 py-2 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.18em] uppercase text-electric">
                <Icon name="clock" size={11} strokeWidth={2.6} aria-hidden="true" />
                시작까지
              </span>
              <Countdown endsAt={card.startsAt} size="sm" label={false} />
            </div>
          </div>
        )}
      </Link>
      <div className="px-5 pb-5">
        <Link to="/auctions" className="block" aria-label="경매 일정 전체 보기">
          <Button variant="pop" size="md" className="w-full">
            경매 일정 전체 보기 <Icon name="arrow" size={13} strokeWidth={2.5} />
          </Button>
        </Link>
      </div>
    </div>
  )
}

// 상대 시간 포맷 — "2시간 후", "1일 후" 등 짧게
function formatRelativeStart(ts) {
  const diff = ts - Date.now()
  if (diff <= 0) return '진행 중'
  const mins = Math.round(diff / 60000)
  if (mins < 60) return `${mins}분 후`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}시간 후`
  const days = Math.round(hrs / 24)
  return `${days}일 후`
}

// "오늘의 경매 일정" 풀 와이드 섹션 — 카드형 큐
function UpcomingScheduleSection({ cards, hasLive }) {
  return (
    <section aria-label="다음 경매 일정" className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
        <div>
          <Eyebrow tone="ink" dot dotColor="yellow" className="mb-3">
            오늘의 경매 큐
          </Eyebrow>
          <h2 className="font-display text-3xl lg:text-[36px] font-bold text-ink tracking-tight leading-[1.1]">
            {hasLive ? (
              <>다음은 <span className="text-dex">{cards[0]?.nameKo || cards[0]?.name}</span>!</>
            ) : (
              <>곧 무대에 오를 카드들</>
            )}
          </h2>
          <p className="text-[14px] text-mute mt-2 font-medium">
            한 번에 하나씩, 차분히 진행해요. 알람을 켜두면 시작 직전에 콕 찔러드릴게요.
          </p>
        </div>
        <Link
          to="/auctions"
          className="focus-ring inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-paper text-ink border-2 border-ink shadow-[0_3px_0_#1a1a1a] hover:-translate-y-0.5 hover:shadow-[0_4px_0_#1a1a1a] hover:bg-electric/20 transition-all font-extrabold text-xs"
          aria-label="경매장 전체 보기"
        >
          <Icon name="layers" size={12} strokeWidth={2.4} />
          경매장으로
        </Link>
      </div>
      <ol className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.slice(0, 6).map((c) => (
          <li key={c.id || c._id}>
            <UpcomingLotCard card={c} />
          </li>
        ))}
      </ol>
    </section>
  )
}

function UpcomingLotCard({ card }) {
  return (
    <Link
      to={`/products/${card.id}`}
      className="surface-pop block p-4 hover:-translate-y-0.5 transition-all group"
      aria-label={`예정 경매: ${card.nameKo || card.name}`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-ink text-electric text-[10px] font-mono font-extrabold tabular-nums border-2 border-ink">
          LOT #{card.lotOrder || '-'}
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-mute">
          <span className="led led-yellow" style={{ width: 6, height: 6 }} aria-hidden="true" />
          예정
        </span>
      </div>
      <div className="flex gap-3 mb-3">
        <div className="shrink-0">
          <PokeCard card={card} size="xs" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display text-base font-bold text-ink leading-tight mb-1 group-hover:text-dex transition-colors truncate">
            {card.nameKo || card.name}
          </div>
          <div className="text-[11px] text-mute font-medium truncate">
            {card.setShort || card.set} · {card.year}
          </div>
          <div className="mt-1.5">
            <GradeBadge grade={card.grade} size="sm" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-bone-2 px-2 py-1.5">
          <div className="text-[9px] font-bold uppercase tracking-wider text-mute mb-0.5">시작가</div>
          <div className="font-mono text-[12px] font-extrabold text-ink tabular-nums">
            {formatKRW(card.startPrice)}
          </div>
        </div>
        <div className="rounded-lg bg-ink text-white px-2 py-1.5">
          <div className="text-[9px] font-bold uppercase tracking-wider text-electric mb-0.5">시작까지</div>
          <div className="font-mono text-[12px] font-extrabold tabular-nums">
            {card.startsAt ? formatRelativeStart(card.startsAt) : '곧'}
          </div>
        </div>
      </div>
    </Link>
  )
}

function FeaturedBuyNowPanel({ card }) {
  return (
    <div className="surface-pop holo-shine sparkle-host overflow-hidden relative">
      <Sparkles />
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b-2 border-ink">
        <span className="inline-flex items-center gap-2">
          <span className="led led-blue" style={{ width: 8, height: 8 }} aria-hidden="true" />
          <span className="pixel-label text-water">⚡ BUY NOW</span>
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-grass/15 text-grass rounded-md text-[10px] font-bold border border-grass/40">
          <Icon name="check" size={10} strokeWidth={3} aria-hidden="true" /> 재고 있음
        </span>
      </div>
      <Link to={`/products/${card.id}`} className="block group" aria-label={`${card.nameKo} 상세`}>
        <div className="flex gap-4 p-5">
          <div className="shrink-0 holo-sheen rounded-lg">
            <PokeCard card={card} size="sm" />
          </div>
          <div className="min-w-0 flex flex-col justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink leading-tight mb-1 group-hover:text-water transition-colors">
                {card.nameKo}
              </h2>
              <div className="text-xs text-mute mb-2 truncate font-medium">
                {card.name} · {card.setShort} · {card.year}
              </div>
              <GradeBadge grade={card.grade} size="sm" />
            </div>
            <div className="mt-3">
              <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-water">판매가</div>
              <div className="font-display text-2xl font-bold text-ink leading-none tabular-nums">
                {formatKRW(card.price)}
              </div>
              <div className="text-[11px] font-mono text-mute mt-1">검수 완료 · 24시간 내 발송</div>
            </div>
          </div>
        </div>
      </Link>
      <div className="px-5 pb-5">
        <Link to={`/products/${card.id}`} className="block" aria-label="즉시구매 하기">
          <Button variant="electric" size="md" className="w-full">
            바로 데려가기 <Icon name="arrow" size={13} strokeWidth={2.5} />
          </Button>
        </Link>
      </div>
    </div>
  )
}

function ComingSoonPanel() {
  return (
    <div className="surface-pop p-8 text-center relative overflow-hidden sparkle-host holo-shine">
      <Sparkles always />
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-electric border-2 border-ink mb-4 float-bob">
        <Icon name="bell" size={24} strokeWidth={2} className="text-ink" aria-hidden="true" />
      </div>
      <div className="pixel-label text-dex mb-2">COMING SOON</div>
      <h2 className="font-display text-2xl font-bold text-ink mb-2">다음 경매를 준비 중이에요</h2>
      <p className="text-[14px] text-mute mb-5 leading-relaxed font-medium">
        오픈 즉시 알림으로 콕 찔러드릴게요.<br />지금 가입하면 우선 입찰권을 받아요.
      </p>
      <Link to="/register" aria-label="회원가입 페이지로 이동">
        <Button variant="spark" size="md" className="w-full">
          오픈 알림 받기 <Icon name="arrow" size={13} strokeWidth={2.5} />
        </Button>
      </Link>
    </div>
  )
}

// 스켈레톤 — FeaturedLivePanel의 골격을 그대로 모사해 layout shift 0에 가깝게.
//   ① 빨간 LIVE 헤더 ② 카드+정보 ③ 카운트다운 띠 ④ 거대 CTA ⑤ 시청자 ⑥ 다음 LOT 힌트
function HeroPanelSkeleton() {
  return (
    <div
      className="rounded-2xl border-2 border-ink overflow-hidden relative shadow-[0_6px_0_#1a1a1a,0_12px_30px_rgba(220,38,38,0.18)]"
      aria-busy="true"
      aria-label="콘텐츠 로딩 중"
    >
      {/* ① 빨간 헤더 (실제 패널과 동일 톤·높이) */}
      <div
        className="relative px-4 py-3 border-b-2 border-ink"
        style={{ background: 'linear-gradient(180deg, var(--color-dex) 0%, var(--color-dex-d) 100%)' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-full bg-white/80" />
            <span className="inline-block h-5 w-12 rounded bg-white/40" />
            <span className="inline-block h-3 w-16 rounded bg-white/25" />
          </div>
          <span className="inline-block h-5 w-12 rounded-md bg-black/25" />
        </div>
      </div>

      {/* ② 카드 + 정보 — 카드 placeholder 사이즈는 PokeCard 'sm'과 동일 (160×224) */}
      <div className="bg-paper animate-pulse">
        <div className="flex gap-4 p-5">
          <div className="shrink-0 w-[160px] h-[224px] bg-bone-2 rounded-lg" />
          <div className="flex-1 min-w-0 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="h-7 w-32 bg-bone-2 rounded" />
              <div className="h-3 w-44 bg-bone-2 rounded" />
              <div className="h-5 w-20 bg-bone-2 rounded-full mt-1" />
            </div>
            <div className="space-y-1.5">
              <div className="h-2.5 w-16 bg-bone-2 rounded" />
              <div className="h-7 w-28 bg-bone-2 rounded" />
              <div className="h-2.5 w-20 bg-bone-2 rounded" />
            </div>
          </div>
        </div>

        {/* ③ 카운트다운 띠 — bg-ink (실제 패널과 동일) */}
        <div className="px-5 pb-2 -mt-1">
          <div className="rounded-lg bg-ink px-3 py-2 flex items-center justify-between gap-2">
            <span className="inline-block h-3 w-16 rounded bg-electric/40" />
            <span className="inline-block h-4 w-20 rounded bg-white/30" />
          </div>
        </div>

        {/* ④ 거대 CTA */}
        <div className="px-5 pb-5">
          <div className="h-12 w-full rounded-md bg-bone-2" />
          {/* ⑤ 시청자 카운트 라인 */}
          <div className="mt-2 flex justify-center">
            <div className="h-3 w-40 rounded bg-bone-2" />
          </div>
          {/* ⑥ 다음 LOT 힌트 한 줄 */}
          <div className="mt-2 h-9 w-full rounded-lg bg-bone-2/70" />
        </div>
      </div>
    </div>
  )
}

/* ─── Grid skeletons / empty state ────────────────────────── */

function GridSkeleton({ cols = 3, count = 3 }) {
  const gridCls = cols === 4
    ? 'grid sm:grid-cols-2 lg:grid-cols-4 gap-6'
    : 'grid sm:grid-cols-2 lg:grid-cols-3 gap-6'
  return (
    <div className={gridCls} aria-busy="true" aria-label="콘텐츠 로딩 중">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface-card overflow-hidden animate-pulse">
          <div className="px-4 pt-4 flex justify-between">
            <div className="h-3 w-20 bg-bone-2 rounded" />
            <div className="h-3 w-3 bg-bone-2 rounded-full" />
          </div>
          <div className="px-6 py-5 flex justify-center">
            <div className="w-[160px] h-[224px] bg-bone-2 rounded-lg" />
          </div>
          <div className="px-5 pb-5 border-t border-line pt-4 space-y-3">
            <div className="h-5 w-32 bg-bone-2 rounded" />
            <div className="h-3 w-48 bg-bone-2 rounded" />
            <div className="h-8 w-24 bg-bone-2 rounded mt-3" />
          </div>
        </div>
      ))}
    </div>
  )
}

function EmptyState({ icon, title, desc, cta }) {
  return (
    <div className="surface-pop p-10 text-center max-w-lg mx-auto">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-electric border-2 border-ink text-ink mb-4 float-bob">
        <Icon name={icon} size={22} strokeWidth={2} aria-hidden="true" />
      </div>
      <h3 className="font-display text-xl font-bold text-ink mb-2">{title}</h3>
      <p className="text-sm text-mute mb-5 leading-relaxed font-medium">{desc}</p>
      {cta && (
        <Link to={cta.to} aria-label={cta.label}>
          <Button variant="pop" size="md">
            {cta.label} <Icon name="arrow" size={13} strokeWidth={2.5} />
          </Button>
        </Link>
      )}
    </div>
  )
}

/* ─── Building blocks ─────────────────────────────────────── */

const toneBg = {
  fire:     'bg-fire/15 text-fire',
  electric: 'bg-electric/30 text-ink',
  water:    'bg-water/15 text-water',
  psychic:  'bg-psychic/15 text-psychic',
  grass:    'bg-grass/15 text-grass',
}

function CategoryTile({ to, icon, label, desc, tone = 'fire', ledPulse = false, disabled = false }) {
  const baseCls = 'group surface-pop transition-all p-4 lg:p-5 flex items-center gap-3 lg:gap-4 min-w-0 relative overflow-hidden sparkle-host'
  const interactiveCls = disabled ? 'opacity-60 cursor-default' : ''
  return (
    <Link
      to={to}
      className={`${baseCls} ${interactiveCls}`}
      aria-label={`${label} ${desc}`}
      aria-disabled={disabled || undefined}
    >
      {!disabled && <Sparkles />}
      <div className={`shrink-0 inline-flex items-center justify-center w-11 h-11 lg:w-12 lg:h-12 rounded-xl border-2 border-ink ${toneBg[tone]}`}>
        <Icon name={icon} size={20} strokeWidth={2} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-base lg:text-lg font-bold text-ink leading-tight inline-flex items-center gap-2 whitespace-nowrap">
          {label}
          {ledPulse && <span className="led led-red led-pulse" style={{ width: 6, height: 6 }} aria-hidden="true" />}
        </div>
        <div className="text-[11px] lg:text-xs text-mute font-bold mt-0.5 truncate">{desc}</div>
      </div>
      <Icon name="arrow" size={14} strokeWidth={2.5} className="hidden sm:block shrink-0 text-mute group-hover:text-ink group-hover:translate-x-1 transition-all" aria-hidden="true" />
    </Link>
  )
}

function SpecRow({ k, v }) {
  return (
    <div className="flex justify-between items-baseline border-b border-dotted border-ink/15 pb-1.5">
      <span className="text-ink/55 text-[11px] tracking-wide uppercase">{k}</span>
      <span className="text-ink font-bold tabular-nums">{v}</span>
    </div>
  )
}

function Check({ label }) {
  return (
    <div className="flex items-center gap-1.5 text-ink/85">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-grass text-white text-[9px] font-bold border border-ink" aria-hidden="true">✓</span>
      <span className="font-bold">{label}</span>
    </div>
  )
}

const trustToneBg = {
  fire:     'bg-fire',
  electric: 'bg-electric',
  water:    'bg-water',
  psychic:  'bg-psychic',
  grass:    'bg-grass',
}
const trustToneText = {
  fire:     'text-white',
  electric: 'text-ink',
  water:    'text-white',
  psychic:  'text-white',
  grass:    'text-white',
}

function TrustPillar({ tone, icon, title, desc }) {
  return (
    <div className="surface-pop p-5 relative overflow-hidden group hover:wobble-pop sparkle-host">
      <Sparkles />
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full border-2 border-ink mb-3 ${trustToneBg[tone]} ${trustToneText[tone]}`}>
        <Icon name={icon} size={20} strokeWidth={2.2} aria-hidden="true" />
      </div>
      <div className="font-display text-base font-bold text-ink leading-tight mb-1">{title}</div>
      <div className="text-[12px] text-mute font-bold leading-snug">{desc}</div>
    </div>
  )
}
