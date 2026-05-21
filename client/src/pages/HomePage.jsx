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
import MiniBroadcastPlayer from '@/components/common/MiniBroadcastPlayer'
import { useT } from '@/i18n'
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
  const t = useT()
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

  // CTA — 회전 카드가 이미 LIVE 카드명/입찰 상태를 보여주므로 hero CTA는 단순 진입점만.
  // (이전 "🔴 지금 ○○○ 입찰 중!" 라이브 입찰 배너 제거 — 카드와 정보 중복)
  const heroPrimaryCta = t('hero.cta.primary.buynow')
  const heroPrimaryTo = '/products?type=buynow'
  // 보조 CTA — LIVE 유무와 상관없이 카드팩 바로 구매 진입점.
  const heroSecondaryCta = t('hero.cta.secondary.packs')
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
          모바일: 텍스트 + CTA 먼저, 카드 패널 작게 뒤따라옴
          데스크탑(lg+): 좌 텍스트 / 우 카드 grid
          ════════════════════════════════════════════════ */}
      <section aria-label="히어로" className="relative px-4 sm:px-6 pt-6 pb-10 lg:pt-16 lg:pb-20 overflow-hidden">
        {/* ambient confetti + polka dot wash */}
        <div className="absolute inset-0 bg-polka opacity-40 pointer-events-none" aria-hidden="true" />
        <div className="absolute inset-0 bg-confetti pointer-events-none" aria-hidden="true" />
        {/* floating decoration */}
        <div className="absolute -top-6 -right-10 hidden lg:block opacity-20 float-bob" aria-hidden="true">
          <Pokeball size={180} />
        </div>

        <div className="relative max-w-7xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-6 lg:gap-14 items-start">
          {/* LEFT — 모바일/데스크탑 모두 첫 번째.
              모바일 above-the-fold: Eyebrow + 헤드라인 + 핵심 CTA 즉시 노출 */}
          <div className="sparkle-host relative">
            <Sparkles always className="hidden lg:block" />

            <Eyebrow tone="ink" dot dotColor="red" className="mb-3 lg:mb-5">
              {t('hero.eyebrow')}
            </Eyebrow>

            <h1 className="font-display text-[32px] sm:text-5xl lg:text-[68px] font-bold text-ink leading-[1.05] tracking-tight mb-3 lg:mb-5">
              {t('hero.headline.line1')}<br />
              <span className="relative inline-block">
                <span className="relative z-10">{t('hero.headline.line2.before')}</span>
                <span className="absolute -bottom-1 left-0 right-0 h-3 lg:h-4 bg-electric -z-0 rounded-full" aria-hidden="true" />
              </span>{' '}
              {t('hero.headline.line2.after')}
              <br />
              <span className="text-dex">{t('hero.headline.line3.before')}</span> {t('hero.headline.line3.after')}
            </h1>

            <p className="text-[15px] lg:text-[18px] text-mute leading-relaxed max-w-xl mb-5 lg:mb-8 font-medium">
              {t('hero.paragraph.line1')}<br className="hidden sm:inline" />
              <span className="text-ink font-bold">{t('hero.paragraph.line2')}</span>
            </p>

            {/* CTA — 모바일에서 풀폭, 우선순위 명확. 엄지로 누르기 쉬운 위치 */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 sm:gap-3 mb-5 lg:mb-8">
              <Link to={heroPrimaryTo} aria-label={heroPrimaryCta} className="sm:inline-block">
                <Button variant="spark" size="lg" className="w-full sm:w-auto">
                  {heroPrimaryCta} <Icon name="arrow" size={14} strokeWidth={2.5} />
                </Button>
              </Link>
              <Link to={heroSecondaryTo} aria-label={heroSecondaryCta} className="sm:inline-block">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                  {heroSecondaryCta}
                </Button>
              </Link>
            </div>

            {/* fun trust chips — 모바일에선 숨김 (인지부하 감소, 핵심 액션에 집중) */}
            <ul className="hidden sm:flex flex-wrap items-center gap-2" aria-label="trust chips">
              <li className="chip-type chip-type-grass">{t('hero.chip.authentic')}</li>
              <li className="chip-type chip-type-electric">{t('hero.chip.certs')}</li>
              <li className="chip-type chip-type-water">{t('hero.chip.delivery')}</li>
            </ul>
          </div>

          {/* RIGHT — 회전 카드 (모바일에선 텍스트 다음, 콤팩트하게 둠) */}
          <div>
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
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          QUICK CATEGORIES
          ════════════════════════════════════════════════ */}
      <section aria-label="카테고리 바로가기" className="px-4 sm:px-6 pb-8 lg:pb-14">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <CategoryTile
            to="/auctions"
            icon="flame"
            label={t('cat.auctions')}
            desc={
              FEATURED_LIVE
                ? t('cat.auctions.desc.live', { n: liveAuctions.length + upcomingAuctions.length })
                : upcomingAuctions.length > 0
                  ? t('cat.auctions.desc.live', { n: upcomingAuctions.length })
                  : t('cat.auctions.desc.soon')
            }
            tone="fire"
            ledPulse={!!FEATURED_LIVE}
            disabled={!loading && !FEATURED_LIVE && upcomingAuctions.length === 0}
          />
          <CategoryTile
            to="/products?type=buynow"
            icon="bolt"
            label={t('cat.buynow')}
            desc={buyNowTotal > 0 ? `⚡ ${t('cat.buynow.desc.live', { n: buyNowTotal })}` : t('cat.buynow.desc.soon')}
            tone="electric"
            disabled={!loading && buyNowTotal === 0}
          />
          <CategoryTile
            to="/packs"
            icon="package"
            label={t('cat.packs')}
            desc={packsTotal > 0 ? `🎁 ${t('cat.packs.desc.live', { n: packsTotal })}` : t('cat.packs.desc.soon')}
            tone="water"
            disabled={!loading && packsTotal === 0}
          />
          <CategoryTile
            to="/products"
            icon="trophy"
            label={t('cat.all')}
            desc={
              auctionsTotal + buyNowTotal > 0
                ? `🌟 ${(auctionsTotal + buyNowTotal).toLocaleString()}`
                : `🌟 ${t('cat.all.desc')}`
            }
            tone="psychic"
          />
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          SEALED PACKS — 카테고리 바로 아래 위치 (TOP LOT 자리 대체).
          PackTile에 hover 시 팩 상단 뜯어지며 카드 peek 효과(카드깡 심리).
          ════════════════════════════════════════════════ */}
      <section aria-label="미개봉 카드팩" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-14">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {featuredPacks.map((p, i) => (
              <div key={p.id || p._id} className="reveal-up min-w-0" style={{ animationDelay: `${i * 0.06}s` }}>
                <PackTile pack={p} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* TOP LOT 패널 + UP NEXT 패널 제거 — 회전 카드 + 미니방송으로 통합됨 */}

      {/* ════════════════════════════════════════════════
          TRUST — playful pop block
          ════════════════════════════════════════════════ */}
      <section aria-label="신뢰 시스템" className="bg-paper border-y-2 border-ink py-10 lg:py-16 my-4 lg:my-8 relative overflow-hidden">
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
      <section aria-label="즉시구매 카드" className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-14">
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {buyNow.map((c, i) => (
              // card-pop-wrap이 idle breathe + hover lift 담당 (reveal-up은 첫 진입 fade,
              // 둘이 충돌하지 않게 wrapper 분리)
              <div key={c.id || c._id} className="reveal-up min-w-0" style={{ animationDelay: `${i * 0.06}s` }}>
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
      <section aria-label="판매 · 회원가입" className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-16">
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

          {/* Join — 트레이너 등록 (보라 psychic 톤 + holo-shine 호버 레인보우) */}
          <div className="surface-pop p-8 relative overflow-hidden holo-shine sparkle-host">
            <Pokeball size={160} className="absolute -bottom-6 -right-6 opacity-15 float-bob" aria-hidden="true" />
            <div className="relative">
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
// 모바일 판단 — viewport < sm(640) 일 때 true. 회전 카드 크기 분기에 사용.
function useIsNarrow() {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 640
  )
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 640)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return narrow
}

function FeaturedLivePanel({ card, compact = false, nextLot = null }) {
  const lotEnded = card.endsAt && timeUntil(card.endsAt).ended
  // 카드 호버 시 우하단 미니방송 토글
  const [broadcastVisible, setBroadcastVisible] = useState(false)
  const isNarrow = useIsNarrow()
  // 모바일 viewport(<640)에선 카드 lg(300x420) 너무 커서 3D 회전 시 좌우 삐져나옴 → md(220x308)
  const cardSize = isNarrow ? 'md' : 'lg'
  const cardW = isNarrow ? 220 : 300
  const cardH = isNarrow ? 308 : 420
  // 가짜 시청자 수 — LOT _id 기반 결정적 의사난수 (리렌더 마다 흔들리지 않게)
  const viewers = useMemo(() => {
    const id = String(card.id || card._id || '')
    const seed = id ? id.charCodeAt(id.length - 1) + id.length * 7 : 73
    return 180 + (seed % 240)
  }, [card.id, card._id])

  // compact 분기 제거 — 모바일도 동일한 회전 카드 사용 (미니방송은 lg+ 에서만 표시).

  // 데스크탑 — "옥션 카탈로그" 무드. 시네마틱 회전 + 미세 부유 + 사선 축.
  // 인터랙션:
  //   - 카드 클릭 → /auctions 경매장으로 바로 진입
  //   - 카드 호버 → 우하단 MiniBroadcastPlayer (라이브 미니방송) 등장
  //   - 호버 해제 → 미니방송 사라짐 (visible 토글)
  // 카드 데이터는 FEATURED_LIVE — 서버의 status=active 첫 경매 (현재 실제 LIVE 진행 중인 카드)
  const t = card.endsAt ? timeUntil(card.endsAt) : null
  const isCritical = t && !t.ended && t.totalMs < 1000 * 60 * 10
  const isUrgent = t && !t.ended && t.totalMs < 1000 * 60 * 60
  const clockText = !t
    ? '상시 진행'
    : t.ended
    ? '방송 종료'
    : `${t.d > 0 ? `${t.d}D ` : ''}${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}:${String(t.s).padStart(2, '0')}`

  return (
    <div className="text-center px-2" style={{ marginTop: 28 }}>
      <div
        className="inline-block group/card oscar-stage"
        role="img"
        aria-label={`현재 LIVE 경매 카드: ${card.nameKo}`}
        onMouseEnter={() => setBroadcastVisible(true)}
        onMouseLeave={() => setBroadcastVisible(false)}
        style={{
          perspective: '1800px',
          filter: 'drop-shadow(0 24px 40px rgba(0,0,0,0.38)) drop-shadow(0 10px 16px rgba(220,38,38,0.22))',
        }}
      >
        <div className="oscar-tilt">
          <div className="oscar-bob">
            <div className="oscar-inner">
              {/* Front — 실제 LIVE 경매 카드 (모바일 md / 데스크탑 lg) */}
              <div className="oscar-face oscar-front">
                <PokeCard card={card} size={cardSize} interactive={false} />
              </div>
              {/* Back — 1세대 Pokémon TCG 카드 백 (Cloudinary) */}
              <div className="oscar-face oscar-back" aria-hidden="true">
                <img
                  src="https://res.cloudinary.com/dhk87y1nb/image/upload/v1779339181/pokevault/card-back-1st-gen.jpg"
                  alt=""
                  draggable={false}
                  style={{ width: cardW, height: cardH, borderRadius: 12, display: 'block', objectFit: 'cover' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 카드 호버 시 우하단에 라이브 미니방송 */}
      <MiniBroadcastPlayer
        visible={broadcastVisible}
        lot={card}
        viewers={viewers}
        current={card.currentBid || card.startPrice}
        clockText={clockText}
        isCritical={isCritical}
        isUrgent={isUrgent}
      />
      <style>{`
        @keyframes oscar-spin-cinema {
          0%, 6%    { transform: rotateY(0deg); }       /* hold front */
          44%, 56%  { transform: rotateY(180deg); }     /* hold back */
          94%, 100% { transform: rotateY(360deg); }     /* hold front (loop) */
        }
        @keyframes oscar-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-10px); }
        }
        .oscar-stage { position: relative; display: inline-block; }
        .oscar-tilt {
          transform: rotateX(10deg) rotateZ(-4deg);
          transform-style: preserve-3d;
          display: inline-block;
        }
        .oscar-bob {
          display: inline-block;
          transform-style: preserve-3d;
          animation: oscar-bob 5s ease-in-out infinite;
        }
        .oscar-inner {
          position: relative;
          width: ${cardW}px;
          height: ${cardH}px;
          transform-style: preserve-3d;
          animation: oscar-spin-cinema 10s cubic-bezier(0.65, 0, 0.35, 1) infinite;
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
