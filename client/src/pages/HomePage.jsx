import { Link } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
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

export default function HomePage() {
  const [auctions, setAuctions] = useState([])
  const [buyNow, setBuyNow] = useState([])
  const [featuredPacks, setFeaturedPacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [auctRes, buyRes, packRes] = await Promise.all([
        api.get('/products', { params: { sale_type: 'auction', status: 'active', limit: 10 } }),
        api.get('/products', { params: { sale_type: 'buynow',  status: 'active', limit: 4 } }),
        api.get('/packs',    { params: { status: 'active', limit: 4 } }),
      ])
      setAuctions(auctRes.data.data.map(normalizeProduct))
      setBuyNow(buyRes.data.data.map(normalizeProduct))
      setFeaturedPacks(packRes.data.data.map(normalizePack))
    } catch (err) {
      setError(err?.message || '데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // 활성 경매 — 종료된 항목 제외
  const activeAuctions = auctions.filter((a) => !a.endsAt || a.endsAt - Date.now() > 0)
  const FEATURED_LIVE = activeAuctions[0]
  const TOP_LOT = auctions.find((a) => (a.id || a._id) !== (FEATURED_LIVE?.id || FEATURED_LIVE?._id)) || auctions[0]
  const usedIds = new Set([FEATURED_LIVE, TOP_LOT].filter(Boolean).map((c) => c.id || c._id))
  const LIVE_CARDS = activeAuctions.filter((c) => !usedIds.has(c.id || c._id)).slice(0, 3)

  // 동적 CTA 문구
  const heroPrimaryCta = activeAuctions.length > 0
    ? `지금 입찰하기 · ${activeAuctions.length}건 진행중`
    : '즉시구매 카드 보기'
  const heroPrimaryTo = activeAuctions.length > 0 ? '/auctions' : '/products?type=buynow'
  const heroSecondaryCta = activeAuctions.length > 0 ? '즉시구매 카탈로그' : '카드팩 · 박스 보기'
  const heroSecondaryTo = activeAuctions.length > 0 ? '/products?type=buynow' : '/packs'

  return (
    <main>
      <GreetingDropdown />

      {/* === 글로벌 에러 배너 === */}
      {error && !loading && (
        <div role="alert" className="bg-red-50 border-b border-red-200 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-red-800">
              <Icon name="close" size={14} strokeWidth={2.5} />
              <span className="font-bold">데이터를 불러오지 못했습니다.</span>
              <span className="text-red-700/80">네트워크를 확인하고 다시 시도해주세요.</span>
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

      {/* === HERO === */}
      <section aria-label="히어로" className="px-6 pt-10 pb-12 lg:pt-16 lg:pb-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-center">
          {/* LEFT — Value prop + CTAs */}
          <div>
            <div className="inline-flex items-center gap-2 pixel-label text-mute mb-5">
              <span className="led led-red led-pulse" style={{ width: 6, height: 6 }} aria-hidden="true" />
              한국 최초 컬렉터블 카드 옥션 플랫폼
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-ink leading-[1.05] tracking-tight mb-5">
              희귀 포켓몬 카드,<br />
              <span className="text-dex">검증된 가치</span>로 거래
            </h1>
            <p className="text-base lg:text-lg text-mute leading-relaxed max-w-xl mb-8">
              PSA · BGS · CGC 공식 인증 카드만 엄선. 투명한 시세, 보안 운송, 가품 시 전액 환불.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Link to={heroPrimaryTo} aria-label={heroPrimaryCta}>
                <Button variant="accent" size="lg">
                  {heroPrimaryCta} <Icon name="arrow" size={14} strokeWidth={2.2} />
                </Button>
              </Link>
              <Link to={heroSecondaryTo} aria-label={heroSecondaryCta}>
                <Button variant="secondary" size="lg">
                  {heroSecondaryCta}
                </Button>
              </Link>
            </div>
            {/* Inline trust strip */}
            <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-mute" aria-label="신뢰 보증 요약">
              <li className="inline-flex items-center gap-1.5">
                <Icon name="shield" size={14} strokeWidth={2} className="text-emerald-700" aria-hidden="true" />
                100% 정품 보증
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Icon name="trophy" size={14} strokeWidth={2} className="text-gold" aria-hidden="true" />
                PSA·BGS·CGC 인증
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Icon name="package" size={14} strokeWidth={2} className="text-dex" aria-hidden="true" />
                FedEx 보험 배송
              </li>
            </ul>
          </div>

          {/* RIGHT — Smart panel: live auction → buyNow fallback → onboarding */}
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

          {/* Mobile compact featured — only shown when there's something live */}
          {!loading && FEATURED_LIVE && (
            <div className="md:hidden">
              <FeaturedLivePanel card={FEATURED_LIVE} compact />
            </div>
          )}
        </div>
      </section>

      {/* === QUICK CATEGORIES === */}
      <section aria-label="카테고리 바로가기" className="px-6 pb-12">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <CategoryTile
            to="/auctions"
            icon="flame"
            label="경매"
            desc={activeAuctions.length > 0 ? `${activeAuctions.length}건 진행중` : '곧 오픈'}
            accent="text-dex"
            ledPulse={activeAuctions.length > 0}
            disabled={!loading && activeAuctions.length === 0}
          />
          <CategoryTile
            to="/products?type=buynow"
            icon="bolt"
            label="즉시구매"
            desc={buyNow.length > 0 ? `${buyNow.length}건 즉시 발송` : '준비 중'}
            accent="text-emerald-700"
          />
          <CategoryTile
            to="/packs"
            icon="package"
            label="카드팩 · 박스"
            desc={featuredPacks.length > 0 ? `${featuredPacks.length}건 미개봉` : '준비 중'}
            accent="text-blue"
          />
          <CategoryTile
            to="/products"
            icon="trophy"
            label="전체 카탈로그"
            desc="모든 등급 보기"
            accent="text-gold"
          />
        </div>
      </section>

      {/* === TOP LOT — only if a meaningful auction exists === */}
      {!loading && TOP_LOT && <section aria-label="오늘의 탑 로트" className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="dex-casing p-5 sm:p-6 reveal-up">
            <div className="flex items-center justify-between mb-5">
              <div className="inline-flex items-center gap-2.5">
                <span className="led led-red led-pulse" aria-hidden="true" />
                <span className="pixel-label text-paper">TODAY'S TOP LOT</span>
              </div>
              <span className="pixel-label text-paper/70">No.<span className="text-gold">001</span></span>
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
                  <h2 className="font-display text-5xl sm:text-6xl font-bold text-ink leading-[0.95] tracking-tight">
                    {TOP_LOT.nameKo}
                  </h2>
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

                <div className="bg-ink/[0.04] rounded-lg p-4 mb-5 border border-ink/10">
                  <div className="pixel-label text-ink/60 mb-3 inline-flex items-center gap-1.5">
                    <Icon name="shield" size={11} strokeWidth={2.5} className="text-emerald-700" aria-hidden="true" />
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
                  <span className="inline-flex items-center gap-1.5 pixel-label text-paper/70">
                    <span className="led led-red led-pulse" style={{ width: 6, height: 6 }} aria-hidden="true" />
                    PHOTO MODULE
                  </span>
                  <span className="pixel-label text-gold">360°</span>
                </div>
                <div className="relative flex justify-center items-center" style={{ height: 340, perspective: '1500px' }}>
                  <div className="spotlight" aria-hidden="true" />
                  <div className="turntable-disc" style={{ width: 280, height: 280, bottom: 10, left: '50%', marginLeft: -140 }} aria-hidden="true" />
                  <div className="card-sway relative z-10">
                    <Link to={`/products/${TOP_LOT.id}`} aria-label={`${TOP_LOT.nameKo} 상세 보기`} className="block">
                      <PokeCard card={TOP_LOT} size="md" />
                    </Link>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 relative z-10">
                  <span className="pixel-label text-paper/50">SLOT-A · {TOP_LOT.year}</span>
                  <span className="pixel-label text-paper/50">QTY 1 / 1</span>
                </div>
              </div>

              {(() => {
                const lotEnded = TOP_LOT.endsAt && timeUntil(TOP_LOT.endsAt).ended
                return (
                  <div className="surface-soft p-5 space-y-4 elev-2 order-3 lg:order-none lg:col-start-2 lg:row-start-2">
                    <div>
                      <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute mb-1">
                        {lotEnded ? '최종 입찰가' : '현재 입찰가'}
                      </div>
                      <div className="font-display text-4xl font-bold text-ink leading-none tabular-nums">
                        {formatKRW(TOP_LOT.currentBid)}
                      </div>
                      <div className="text-xs font-mono text-mute mt-1">입찰 {TOP_LOT.bidCount}회 · {TOP_LOT.watchers}명 관심</div>
                    </div>
                    <div className={`rounded-xl p-3.5 ${lotEnded ? 'bg-bone-2 text-mute' : 'bg-ink text-paper'}`}>
                      <div className={`text-[10px] font-bold tracking-[0.18em] uppercase mb-2 inline-flex items-center gap-1.5 ${lotEnded ? 'text-mute' : 'text-gold'}`}>
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
                        <Button variant="accent" size="lg" className="w-full">
                          지금 입찰하기 <Icon name="arrow" size={14} strokeWidth={2.2} />
                        </Button>
                      </Link>
                    )}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </section>}

      {/* === LIVE AUCTIONS === */}
      <section aria-label="진행중인 경매" className="max-w-7xl mx-auto px-6 py-16">
        <SectionHead
          chip={{ label: 'Live Auctions', color: 'text-dex', dot: 'red' }}
          title="진행중인 경매"
          desc="초희귀 카드만 엄선. 본인 인증 후 입찰 가능합니다."
          cta={LIVE_CARDS.length > 0 ? { label: '전체 경매', to: '/auctions' } : null}
        />
        <div className="mt-10">
          {loading ? (
            <GridSkeleton cols={3} count={3} />
          ) : LIVE_CARDS.length === 0 ? (
            <EmptyState
              icon="clock"
              title="진행중인 경매가 없습니다"
              desc="다음 경매 오픈 시 알림으로 알려드려요. 그동안 즉시구매 카드를 둘러보세요."
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
        </div>
      </section>

      {/* === TRUST === */}
      <section aria-label="신뢰 시스템" className="bg-paper border-y border-line py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10 max-w-2xl mx-auto">
            <div className="pixel-label text-gold mb-3">WHY POKÉVAULT</div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-ink mb-2 tracking-tight">
              한국 최고의 컬렉터블 인증 시스템
            </h2>
            <p className="text-sm text-mute">모든 카드는 공식 등급사 인증을 거치며, 보안 운송과 에스크로로 안전하게 거래됩니다.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Trust ledColor="blue"   icon="shield"  title="100% 정품 보증" desc="가품 시 전액 환불" />
            <Trust ledColor="yellow" icon="trophy"  title="공식 등급사 인증" desc="PSA · BGS · CGC" />
            <Trust ledColor="red"    icon="package" title="보안 운송"        desc="FedEx Insured" />
            <Trust ledColor="green"  icon="lock"    title="에스크로 결제"    desc="100만원↑ 자동" />
          </div>
        </div>
      </section>

      {/* === BUY NOW === */}
      <section aria-label="즉시구매 카드" className="max-w-7xl mx-auto px-6 py-16">
        <SectionHead
          chip={{ label: 'Buy Now', color: 'text-blue', dot: 'blue' }}
          title="즉시 구매 카드"
          desc="검수 완료된 카드를 정찰가로 바로 소유하세요."
          cta={buyNow.length > 0 ? { label: '전체 카탈로그', to: '/products' } : null}
        />
        <div className="mt-10">
          {loading ? (
            <GridSkeleton cols={4} count={4} />
          ) : buyNow.length === 0 ? (
            <EmptyState
              icon="bolt"
              title="즉시구매 카드 준비 중"
              desc="새로운 카드가 곧 입고됩니다. 전체 카탈로그에서 다른 카드를 둘러보세요."
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
        </div>
      </section>

      {/* === SEALED PACKS === */}
      <section aria-label="미개봉 카드팩" className="max-w-7xl mx-auto px-6 py-16">
        <SectionHead
          chip={{ label: 'Sealed Packs & Boxes', color: 'text-amber-700', dot: 'yellow' }}
          title="미개봉 카드팩 · 박스"
          desc="vintage 부스터팩부터 최신 ETB까지. 모든 상품 미개봉 인증."
          cta={featuredPacks.length > 0 ? { label: '전체 카드팩', to: '/packs' } : null}
        />
        <div className="mt-10">
          {loading ? (
            <GridSkeleton cols={4} count={4} />
          ) : featuredPacks.length === 0 ? (
            <EmptyState
              icon="package"
              title="카드팩 준비 중"
              desc="vintage 부스터팩 입고 알림을 신청해보세요."
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
        </div>
      </section>

      {/* === SELL CTA === */}
      <section aria-label="판매 · 회원가입" className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="dex-casing p-8 relative overflow-hidden text-paper">
            <div className="flex items-center gap-2 mb-3">
              <span className="led led-red led-pulse" aria-hidden="true" />
              <span className="pixel-label text-gold">SELL ON AUCTION</span>
            </div>
            <h3 className="font-display text-2xl lg:text-3xl font-bold mb-3 leading-tight">
              내 카드를<br/>경매에 올리세요
            </h3>
            <p className="text-sm text-paper/80 leading-relaxed mb-5 max-w-sm">
              초희귀 카드는 글로벌 컬렉터에게 노출됩니다. PSA·BGS 등급만 위탁 가능. 위탁수수료 10%.
            </p>
            <Link to="/sell" aria-label="경매 등록하기">
              <Button variant="gold" size="lg">경매 등록하기 <Icon name="arrow" size={14} strokeWidth={2.2} /></Button>
            </Link>
          </div>

          <div className="surface-soft p-8 elev-2 relative overflow-hidden">
            <Pokeball size={140} className="absolute -bottom-4 -right-4 opacity-10" aria-hidden="true" />
            <div className="relative">
              <div className="pixel-label text-dex mb-3">▸ BECOME A TRAINER</div>
              <h3 className="font-display text-2xl lg:text-3xl font-bold text-ink mb-3 leading-tight">
                트레이너로<br/>등록하세요
              </h3>
              <p className="text-sm text-mute leading-relaxed mb-5 max-w-sm">
                경매 참여, 자동 입찰, 시세 알림 등 전체 기능을 사용할 수 있습니다.
              </p>
              <Link to="/register" aria-label="회원가입 페이지로 이동">
                <Button variant="primary" size="lg">회원가입 <Icon name="arrow" size={14} strokeWidth={2.2} /></Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

/* ─── Featured panels ─────────────────────────────────────── */

function FeaturedLivePanel({ card, compact = false }) {
  const lotEnded = card.endsAt && timeUntil(card.endsAt).ended
  return (
    <div className="surface-card elev-2 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-line">
        <span className="inline-flex items-center gap-2">
          {lotEnded ? (
            <>
              <span className="led" style={{ width: 7, height: 7, background: '#9aa1a8' }} aria-hidden="true" />
              <span className="pixel-label text-mute">RECENTLY CLOSED</span>
            </>
          ) : (
            <>
              <span className="led led-red led-pulse" style={{ width: 7, height: 7 }} aria-hidden="true" />
              <span className="pixel-label text-dex">LIVE NOW</span>
            </>
          )}
        </span>
        {!lotEnded && <Countdown endsAt={card.endsAt} size="sm" label={false} />}
      </div>
      <Link to={`/products/${card.id}`} className="block group" aria-label={`${card.nameKo} 경매 상세`}>
        <div className="flex gap-4 p-5">
          <div className="shrink-0">
            <PokeCard card={card} size={compact ? 'xs' : 'sm'} />
          </div>
          <div className="min-w-0 flex flex-col justify-between">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-ink leading-tight mb-1 group-hover:text-dex transition-colors">
                {card.nameKo}
              </h2>
              <div className="text-xs text-mute mb-2 truncate">
                {card.name} · {card.setShort} · {card.year}
              </div>
              <GradeBadge grade={card.grade} size="sm" />
            </div>
            <div className="mt-3">
              <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute">
                {lotEnded ? '최종 입찰가' : '현재 입찰가'}
              </div>
              <div className="font-display text-2xl font-bold text-ink leading-none tabular-nums">
                {formatKRW(card.currentBid)}
              </div>
              <div className="text-[11px] font-mono text-mute mt-1">입찰 {card.bidCount}회</div>
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
            <Button variant="accent" size="md" className="w-full">
              입찰 참여 <Icon name="arrow" size={13} strokeWidth={2.2} />
            </Button>
          </Link>
        )}
      </div>
    </div>
  )
}

function FeaturedBuyNowPanel({ card }) {
  return (
    <div className="surface-card elev-2 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-line">
        <span className="inline-flex items-center gap-2">
          <span className="led led-blue" style={{ width: 7, height: 7 }} aria-hidden="true" />
          <span className="pixel-label text-blue">BUY NOW · 즉시 발송</span>
        </span>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold">
          <Icon name="check" size={10} strokeWidth={3} aria-hidden="true" /> 재고 있음
        </span>
      </div>
      <Link to={`/products/${card.id}`} className="block group" aria-label={`${card.nameKo} 상세`}>
        <div className="flex gap-4 p-5">
          <div className="shrink-0">
            <PokeCard card={card} size="sm" />
          </div>
          <div className="min-w-0 flex flex-col justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold text-ink leading-tight mb-1 group-hover:text-blue transition-colors">
                {card.nameKo}
              </h2>
              <div className="text-xs text-mute mb-2 truncate">
                {card.name} · {card.setShort} · {card.year}
              </div>
              <GradeBadge grade={card.grade} size="sm" />
            </div>
            <div className="mt-3">
              <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute">판매가</div>
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
          <Button variant="primary" size="md" className="w-full">
            즉시구매 하기 <Icon name="arrow" size={13} strokeWidth={2.2} />
          </Button>
        </Link>
      </div>
    </div>
  )
}

function ComingSoonPanel() {
  return (
    <div className="surface-card elev-2 overflow-hidden p-8 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-bone-2 text-dex mb-4">
        <Icon name="bell" size={22} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div className="pixel-label text-mute mb-2">COMING SOON</div>
      <h2 className="font-display text-2xl font-bold text-ink mb-2">다음 경매를 준비 중입니다</h2>
      <p className="text-sm text-mute mb-5 leading-relaxed">
        오픈 즉시 알림으로 알려드릴게요.<br />지금 회원가입하고 우선 입찰권을 받아보세요.
      </p>
      <Link to="/register" aria-label="회원가입 페이지로 이동">
        <Button variant="accent" size="md" className="w-full">
          오픈 알림 신청 <Icon name="arrow" size={13} strokeWidth={2.2} />
        </Button>
      </Link>
    </div>
  )
}

function HeroPanelSkeleton() {
  return (
    <div className="surface-card elev-2 overflow-hidden animate-pulse" aria-busy="true" aria-label="콘텐츠 로딩 중">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-line">
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
    <div className="surface-card p-10 text-center max-w-lg mx-auto">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-bone-2 text-mute mb-4">
        <Icon name={icon} size={22} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <h3 className="font-display text-xl font-bold text-ink mb-2">{title}</h3>
      <p className="text-sm text-mute mb-5 leading-relaxed">{desc}</p>
      {cta && (
        <Link to={cta.to} aria-label={cta.label}>
          <Button variant="secondary" size="md">
            {cta.label} <Icon name="arrow" size={13} strokeWidth={2.2} />
          </Button>
        </Link>
      )}
    </div>
  )
}

/* ─── Building blocks ─────────────────────────────────────── */

function SectionHead({ chip, title, desc, cta }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <div className={`inline-flex items-center gap-2 mb-3 ${chip.color}`}>
          {chip.dot && <span className={`led led-${chip.dot} led-pulse`} style={{ width: 7, height: 7 }} aria-hidden="true" />}
          <span className="pixel-label">{chip.label}</span>
        </div>
        <h2 className="font-display text-3xl lg:text-4xl font-bold text-ink tracking-tight">{title}</h2>
        {desc && <p className="text-sm text-mute mt-2 max-w-2xl">{desc}</p>}
      </div>
      {cta && (
        <Link to={cta.to} className="text-sm font-bold text-ink hover:text-dex inline-flex items-center gap-1.5 transition-colors" aria-label={cta.label}>
          {cta.label} <Icon name="arrow" size={14} strokeWidth={2} />
        </Link>
      )}
    </div>
  )
}

function CategoryTile({ to, icon, label, desc, accent = 'text-ink', ledPulse = false, disabled = false }) {
  const baseCls = 'surface-card transition-all p-4 lg:p-5 flex items-center gap-3 lg:gap-4 group min-w-0'
  const interactiveCls = disabled
    ? 'opacity-60 cursor-default'
    : 'hover:-translate-y-0.5 hover:elev-2'
  return (
    <Link
      to={to}
      className={`${baseCls} ${interactiveCls}`}
      aria-label={`${label} ${desc}`}
      aria-disabled={disabled || undefined}
    >
      <div className={`shrink-0 inline-flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-bone-2 ${accent}`}>
        <Icon name={icon} size={20} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-base lg:text-lg font-bold text-ink leading-tight inline-flex items-center gap-2 whitespace-nowrap">
          {label}
          {ledPulse && <span className="led led-red led-pulse" style={{ width: 6, height: 6 }} aria-hidden="true" />}
        </div>
        <div className="text-[11px] lg:text-xs text-mute font-medium mt-0.5 truncate">{desc}</div>
      </div>
      <Icon name="arrow" size={14} strokeWidth={2.2} className="hidden sm:block shrink-0 text-mute group-hover:text-ink transition-colors" aria-hidden="true" />
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
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-500 text-paper text-[8px] font-bold" aria-hidden="true">✓</span>
      <span className="font-medium">{label}</span>
    </div>
  )
}

function Trust({ ledColor, icon, title, desc }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-bone-2 text-ink">
        <Icon name={icon} size={18} strokeWidth={1.8} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="inline-flex items-center gap-1.5 mb-0.5">
          <span className={`led led-${ledColor}`} style={{ width: 6, height: 6 }} aria-hidden="true" />
          <span className="font-display text-base font-bold text-ink leading-tight">{title}</span>
        </div>
        <div className="text-xs text-mute leading-snug">{desc}</div>
      </div>
    </div>
  )
}
