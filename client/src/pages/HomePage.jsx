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
import GreetingDropdown from '@/components/common/GreetingDropdown'
import Eyebrow from '@/components/common/Eyebrow'
import Sparkles from '@/components/common/Sparkles'
import SectionHead from '@/components/common/SectionHead'

// React Query fetchers — 페이지 unmount 후에도 5분 staleTime 캐시 유지 (queryClient default)
const fetchAuctions = () =>
  api.get('/products', { params: { sale_type: 'auction', status: 'active', limit: 10 } })
    .then((r) => r.data.data.map(normalizeProduct))
const fetchBuynow = () =>
  api.get('/products', { params: { sale_type: 'buynow', status: 'active', limit: 4 } })
    .then((r) => r.data.data.map(normalizeProduct))
const fetchFeaturedPacks = () =>
  api.get('/packs', { params: { status: 'active', limit: 4 } })
    .then((r) => r.data.data.map(normalizePack))

export default function HomePage() {
  const auctionsQ = useQuery({ queryKey: ['home-auctions'], queryFn: fetchAuctions })
  const buyNowQ   = useQuery({ queryKey: ['home-buynow'],   queryFn: fetchBuynow })
  const packsQ    = useQuery({ queryKey: ['home-packs'],    queryFn: fetchFeaturedPacks })

  const auctions = auctionsQ.data ?? []
  const buyNow = buyNowQ.data ?? []
  const featuredPacks = packsQ.data ?? []
  const loading = auctionsQ.isLoading || buyNowQ.isLoading || packsQ.isLoading
  const error = auctionsQ.error || buyNowQ.error || packsQ.error
  const fetchAll = () => {
    auctionsQ.refetch(); buyNowQ.refetch(); packsQ.refetch()
  }

  // 파생값 memoize — auctions 참조 변경 시에만 재계산
  const { activeAuctions, FEATURED_LIVE, TOP_LOT, LIVE_CARDS } = useMemo(() => {
    const active = auctions.filter((a) => !a.endsAt || a.endsAt - Date.now() > 0)
    const featured = active[0]
    const topLot = auctions.find((a) => (a.id || a._id) !== (featured?.id || featured?._id)) || auctions[0]
    const usedIds = new Set([featured, topLot].filter(Boolean).map((c) => c.id || c._id))
    const live = active.filter((c) => !usedIds.has(c.id || c._id)).slice(0, 3)
    return { activeAuctions: active, FEATURED_LIVE: featured, TOP_LOT: topLot, LIVE_CARDS: live }
  }, [auctions])

  const heroPrimaryCta = activeAuctions.length > 0
    ? `두근두근 입찰 · ${activeAuctions.length}건 LIVE`
    : '즉시구매 카드 보기'
  const heroPrimaryTo = activeAuctions.length > 0 ? '/auctions' : '/products?type=buynow'
  const heroSecondaryCta = activeAuctions.length > 0 ? '즉시구매 둘러보기' : '카드팩 · 박스 보기'
  const heroSecondaryTo = activeAuctions.length > 0 ? '/products?type=buynow' : '/packs'

  return (
    <main className="bg-bone">
      <GreetingDropdown />

      {/* === 가상계좌 입금 대기 배너 === */}
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

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-center">
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

          {/* RIGHT — smart panel */}
          <div className="hidden md:block">
            {loading ? (
              <HeroPanelSkeleton />
            ) : FEATURED_LIVE ? (
              <FeaturedLivePanel card={FEATURED_LIVE} />
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
            desc={activeAuctions.length > 0 ? `🔥 ${activeAuctions.length}건 진행중` : '곧 오픈!'}
            tone="fire"
            ledPulse={activeAuctions.length > 0}
            disabled={!loading && activeAuctions.length === 0}
          />
          <CategoryTile
            to="/products?type=buynow"
            icon="bolt"
            label="즉시구매"
            desc={buyNow.length > 0 ? `⚡ ${buyNow.length}건 즉시 발송` : '준비 중'}
            tone="electric"
          />
          <CategoryTile
            to="/packs"
            icon="package"
            label="카드팩 · 박스"
            desc={featuredPacks.length > 0 ? `🎁 ${featuredPacks.length}건 미개봉` : '준비 중'}
            tone="water"
          />
          <CategoryTile
            to="/products"
            icon="trophy"
            label="전체 카탈로그"
            desc="🌟 모든 카드"
            tone="psychic"
          />
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          TODAY'S TOP LOT — Pokédex casing preserved & enhanced
          ════════════════════════════════════════════════ */}
      {!loading && TOP_LOT && (
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
          LIVE AUCTIONS
          ════════════════════════════════════════════════ */}
      <section aria-label="진행중인 경매" className="max-w-7xl mx-auto px-6 py-14">
        <SectionHead
          eyebrow="LIVE 경매"
          eyebrowTone="ink"
          eyebrowDot
          eyebrowIcon="flame"
          title="지금 진행 중인 카드"
          accent={<span className="text-dex">🔥</span>}
          desc="입찰 한 번이면 컬렉션이 채워져요. 본인 인증 후 참여하실 수 있어요."
          cta={LIVE_CARDS.length > 0 ? { label: '전체 경매', to: '/auctions' } : null}
        />
        {loading ? (
          <GridSkeleton cols={3} count={3} />
        ) : LIVE_CARDS.length === 0 ? (
          <EmptyState
            icon="clock"
            title="지금은 잠시 쉬어가는 중이에요"
            desc="다음 경매 오픈 때 알림으로 콕 찔러드릴게요. 그동안 즉시구매 카드 어때요?"
            cta={{ label: '즉시구매 보기', to: '/products?type=buynow' }}
          />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {LIVE_CARDS.map((c, i) => (
              <div key={c.id || c._id} className="reveal-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <CardTile card={c} />
              </div>
            ))}
          </div>
        )}
      </section>

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
              <div key={c.id || c._id} className="reveal-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <CardTile card={c} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ════════════════════════════════════════════════
          SEALED PACKS
          ════════════════════════════════════════════════ */}
      <section aria-label="미개봉 카드팩" className="max-w-7xl mx-auto px-6 py-14">
        <SectionHead
          eyebrow="미개봉 팩"
          eyebrowTone="electric"
          eyebrowIcon="package"
          title="포장 그대로,"
          accent={<span className="text-electric">🎁</span>}
          desc="vintage 부스터팩부터 최신 ETB까지. 직접 뜯어보는 두근거림."
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
          SELL / JOIN CTA
          ════════════════════════════════════════════════ */}
      <section aria-label="판매 · 회원가입" className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Sell — Pokédex playful */}
          <div className="dex-casing p-8 relative overflow-hidden text-white holo-shine sparkle-host">
            <Sparkles always />
            <div className="flex items-center gap-2 mb-3">
              <span className="led led-red led-pulse" aria-hidden="true" />
              <span className="pixel-label text-electric">SELL ON AUCTION</span>
            </div>
            <h3 className="font-display text-[28px] lg:text-[36px] font-bold mb-3 leading-[1.05]">
              내 카드도 누군가의<br/>
              <span className="text-electric">갖고 싶은</span> 카드예요
            </h3>
            <p className="text-[15px] text-white/85 leading-relaxed mb-6 max-w-sm font-medium">
              PSA·BGS 등급 카드를 출품하면 트레이너들 사이에서 두근거림이 시작돼요. 수수료 10%.
            </p>
            <Link to="/sell" aria-label="경매 등록하기">
              <Button variant="electric" size="lg">내 카드 출품하기 <Icon name="arrow" size={14} strokeWidth={2.5} /></Button>
            </Link>
          </div>

          {/* Join — friendly cream */}
          <div className="surface-pop p-8 relative overflow-hidden">
            <Pokeball size={160} className="absolute -bottom-6 -right-6 opacity-15 float-bob" aria-hidden="true" />
            <div className="relative sparkle-host">
              <Sparkles />
              <Eyebrow tone="psychic" className="mb-4">Become a Trainer</Eyebrow>
              <h3 className="font-display text-[28px] lg:text-[36px] font-bold text-ink mb-3 leading-[1.05]">
                트레이너로 등록하고<br/>
                <span className="text-psychic">모든 카드</span>에 닿기
              </h3>
              <p className="text-[15px] text-mute leading-relaxed mb-6 max-w-sm font-medium">
                경매 참여, 자동 입찰, 시세 알림까지. 무료로 시작할 수 있어요.
              </p>
              <Link to="/register" aria-label="회원가입 페이지로 이동">
                <Button variant="spark" size="lg">트레이너 되기 <Icon name="arrow" size={14} strokeWidth={2.5} /></Button>
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
            <span className="text-ink/70 font-medium"> · 발급된 계좌로 24시간 내 입금해 주세요. </span>
            <span className="font-mono text-xs text-ink/60">#{orderId}</span>
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

function FeaturedLivePanel({ card, compact = false }) {
  const lotEnded = card.endsAt && timeUntil(card.endsAt).ended
  return (
    <div className="surface-pop holo-shine sparkle-host overflow-hidden relative">
      <Sparkles />
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b-2 border-ink">
        <span className="inline-flex items-center gap-2">
          {lotEnded ? (
            <>
              <span className="led" style={{ width: 8, height: 8, background: '#9aa1a8' }} aria-hidden="true" />
              <span className="pixel-label text-mute">RECENTLY CLOSED</span>
            </>
          ) : (
            <>
              <span className="led led-red led-pulse" style={{ width: 8, height: 8 }} aria-hidden="true" />
              <span className="pixel-label text-dex">LIVE NOW · 🔥</span>
            </>
          )}
        </span>
        {!lotEnded && <Countdown endsAt={card.endsAt} size="sm" label={false} />}
      </div>
      <Link to={`/products/${card.id}`} className="block group" aria-label={`${card.nameKo} 경매 상세`}>
        <div className="flex gap-4 p-5">
          <div className="shrink-0 holo-sheen rounded-lg">
            <PokeCard card={card} size={compact ? 'xs' : 'sm'} />
          </div>
          <div className="min-w-0 flex flex-col justify-between">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-ink leading-tight mb-1 group-hover:text-dex transition-colors">
                {card.nameKo}
              </h2>
              <div className="text-xs text-mute mb-2 truncate font-medium">
                {card.name} · {card.setShort} · {card.year}
              </div>
              <GradeBadge grade={card.grade} size="sm" />
            </div>
            <div className="mt-3">
              <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-dex">
                {lotEnded ? '최종 입찰가' : '현재 입찰가'}
              </div>
              <div className="font-display text-2xl font-bold text-ink leading-none tabular-nums">
                {formatKRW(card.currentBid)}
              </div>
              <div className="text-[11px] font-mono text-mute mt-1">{card.bidCount}회 · {card.watchers ?? 0}명이 보는 중</div>
            </div>
          </div>
        </div>
      </Link>
      <div className="px-5 pb-5">
        {lotEnded ? (
          <Button variant="secondary" size="md" className="w-full" disabled aria-disabled="true">
            입찰 종료
          </Button>
        ) : (
          <Link to={`/products/${card.id}`} className="block" aria-label="입찰 참여">
            <Button variant="pop" size="md" className="w-full">
              두근두근 입찰! <Icon name="arrow" size={13} strokeWidth={2.5} />
            </Button>
          </Link>
        )}
      </div>
    </div>
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

function HeroPanelSkeleton() {
  return (
    <div className="surface-pop overflow-hidden animate-pulse" aria-busy="true" aria-label="콘텐츠 로딩 중">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b-2 border-line">
        <div className="h-3 w-24 bg-bone-2 rounded" />
        <div className="h-3 w-16 bg-bone-2 rounded" />
      </div>
      <div className="flex gap-4 p-5">
        <div className="shrink-0 w-[120px] h-[168px] bg-bone-2 rounded-lg" />
        <div className="flex-1 space-y-3">
          <div className="h-6 w-32 bg-bone-2 rounded" />
          <div className="h-3 w-40 bg-bone-2 rounded" />
          <div className="h-5 w-20 bg-bone-2 rounded-full mt-2" />
          <div className="h-8 w-28 bg-bone-2 rounded mt-6" />
        </div>
      </div>
      <div className="px-5 pb-5">
        <div className="h-10 w-full bg-bone-2 rounded-lg" />
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
