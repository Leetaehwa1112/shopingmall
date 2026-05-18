import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
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

  useEffect(() => {
    api.get('/products', { params: { sale_type: 'auction', status: 'active', limit: 10 } })
      .then(({ data }) => setAuctions(data.data.map(normalizeProduct)))
    api.get('/products', { params: { sale_type: 'buynow', status: 'active', limit: 4 } })
      .then(({ data }) => setBuyNow(data.data.map(normalizeProduct)))
    api.get('/packs', { params: { status: 'active', limit: 4 } })
      .then(({ data }) => setFeaturedPacks(data.data.map(normalizePack)))
  }, [])

  // 활성 경매만 골라서 "지금 입찰 가능한" 카드를 히어로에 노출
  const activeAuctions = auctions.filter((a) => !a.endsAt || a.endsAt - Date.now() > 0)
  const FEATURED_LIVE = activeAuctions[0] || auctions[0]
  // TOP LOT = FEATURED와 다른 카드여야 의미 있음. FEATURED와 같으면 두 번째 경매를 TOP LOT으로
  const TOP_LOT = auctions.find((a) => (a.id || a._id) !== (FEATURED_LIVE?.id || FEATURED_LIVE?._id)) || auctions[0]
  // 라이브 옥션 그리드: 히어로와 TOP LOT에 이미 노출된 카드는 제외
  const usedIds = new Set([FEATURED_LIVE, TOP_LOT].filter(Boolean).map((c) => c.id || c._id))
  const LIVE_CARDS = auctions.filter((c) => !usedIds.has(c.id || c._id)).slice(0, 3)

  return (
    <div>
      <GreetingDropdown />

      {/* === HERO — Value Proposition + Featured Live Auction === */}
      <section className="px-6 pt-10 pb-12 lg:pt-16 lg:pb-20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-center">
          {/* LEFT — Value prop + CTAs */}
          <div>
            <div className="inline-flex items-center gap-2 pixel-label text-mute mb-5">
              <span className="led led-red led-pulse" style={{ width: 6, height: 6 }} />
              한국 최초 컬렉터블 카드 옥션 플랫폼
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-ink leading-[1.05] tracking-tight mb-5">
              희귀 포켓몬 카드,<br />
              <span className="text-dex">검증된 가치</span>로 거래
            </h1>
            <p className="text-base lg:text-lg text-mute leading-relaxed max-w-xl mb-8">
              PSA · BGS · CGC 공식 인증 카드만 엄선. 모든 거래는 정품 보증 및 보안 배송으로 보호됩니다.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Link to="/auctions">
                <Button variant="accent" size="lg">
                  경매 둘러보기 <Icon name="arrow" size={14} strokeWidth={2.2} />
                </Button>
              </Link>
              <Link to="/products?type=buynow">
                <Button variant="secondary" size="lg">
                  즉시구매 카탈로그
                </Button>
              </Link>
            </div>
            {/* Inline trust strip */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-bold text-mute">
              <span className="inline-flex items-center gap-1.5">
                <Icon name="shield" size={13} strokeWidth={2} className="text-emerald-700" /> 100% 정품 보증
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="trophy" size={13} strokeWidth={2} className="text-gold" /> PSA·BGS·CGC 인증
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Icon name="package" size={13} strokeWidth={2} className="text-dex" /> FedEx 보험 배송
              </span>
            </div>
          </div>

          {/* RIGHT — Featured live auction (mini) */}
          {FEATURED_LIVE && (() => {
            const lotEnded = FEATURED_LIVE.endsAt && timeUntil(FEATURED_LIVE.endsAt).ended
            return (
              <div className="surface-card elev-2 overflow-hidden">
                <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-line">
                  <span className="inline-flex items-center gap-2">
                    {lotEnded ? (
                      <>
                        <span className="led" style={{ width: 7, height: 7, background: '#9aa1a8' }} />
                        <span className="pixel-label text-mute">RECENTLY CLOSED</span>
                      </>
                    ) : (
                      <>
                        <span className="led led-red led-pulse" style={{ width: 7, height: 7 }} />
                        <span className="pixel-label text-dex">LIVE NOW</span>
                      </>
                    )}
                  </span>
                  {!lotEnded && (
                    <Countdown endsAt={FEATURED_LIVE.endsAt} size="sm" label={false} />
                  )}
                </div>
                <Link to={`/products/${FEATURED_LIVE.id}`} className="block group">
                  <div className="flex gap-4 p-5">
                    <div className="shrink-0">
                      <PokeCard card={FEATURED_LIVE} size="sm" />
                    </div>
                    <div className="min-w-0 flex flex-col justify-between">
                      <div>
                        <h2 className="font-display text-2xl font-bold text-ink leading-tight mb-1 group-hover:text-dex transition-colors">
                          {FEATURED_LIVE.nameKo}
                        </h2>
                        <div className="text-xs text-mute mb-2 truncate">
                          {FEATURED_LIVE.name} · {FEATURED_LIVE.setShort} · {FEATURED_LIVE.year}
                        </div>
                        <GradeBadge grade={FEATURED_LIVE.grade} size="sm" />
                      </div>
                      <div className="mt-3">
                        <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute">
                          {lotEnded ? '최종 입찰가' : '현재 입찰가'}
                        </div>
                        <div className="font-display text-2xl font-bold text-ink leading-none tabular-nums">
                          {formatKRW(FEATURED_LIVE.currentBid)}
                        </div>
                        <div className="text-[11px] font-mono text-mute mt-1">
                          입찰 {FEATURED_LIVE.bidCount}회
                        </div>
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
                    <Link to={`/products/${FEATURED_LIVE.id}`} className="block">
                      <Button variant="accent" size="md" className="w-full">
                        입찰 참여 <Icon name="arrow" size={13} strokeWidth={2.2} />
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      </section>

      {/* === QUICK CATEGORIES === */}
      <section className="px-6 pb-12">
        <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          <CategoryTile to="/auctions"             icon="flame"   label="경매"          desc={`${activeAuctions.length}건 진행중`} accent="text-dex" />
          <CategoryTile to="/products?type=buynow" icon="bolt"    label="즉시구매"      desc={`${buyNow.length}건`} accent="text-emerald-700" />
          <CategoryTile to="/packs"                icon="package" label="카드팩 · 박스" desc={`${featuredPacks.length}건`} accent="text-blue" />
          <CategoryTile to="/products"             icon="trophy"  label="전체 카탈로그" desc="모든 등급 보기" accent="text-gold" />
        </div>
      </section>

      {/* === TOP LOT (kept as below-the-fold feature) === */}
      {TOP_LOT && <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="dex-casing p-5 sm:p-6 reveal-up">
            <div className="flex items-center justify-between mb-5">
              <div className="inline-flex items-center gap-2.5">
                <span className="led led-red led-pulse" />
                <span className="pixel-label text-paper">TODAY'S TOP LOT</span>
              </div>
              <span className="pixel-label text-paper/70">No.<span className="text-gold">001</span></span>
              <div className="hidden sm:flex gap-1.5">
                <span className="led led-blue" />
                <span className="led led-yellow" />
                <span className="led led-green" />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5">
              {/* LCD SPEC */}
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
                    <Icon name="shield" size={11} strokeWidth={2.5} className="text-emerald-700" />
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
                  <div className="hp-bar">
                    <div className="hp-bar-fill" style={{ width: '77%' }} />
                  </div>
                  <div className="flex justify-between mt-2 text-xs font-mono text-ink/60">
                    <span>시작가 {formatKRW(TOP_LOT.startPrice)}</span>
                    <span className="text-ink font-bold">현재 {formatKRW(TOP_LOT.currentBid)}</span>
                  </div>
                </div>
              </div>

              {/* TURNTABLE */}
              <div className="dex-casing-inset p-5 relative overflow-hidden order-1 lg:order-none lg:col-start-2 lg:row-start-1">
                <div className="flex items-center justify-between mb-2 relative z-10">
                  <span className="inline-flex items-center gap-1.5 pixel-label text-paper/70">
                    <span className="led led-red led-pulse" style={{ width: 6, height: 6 }} />
                    PHOTO MODULE
                  </span>
                  <span className="pixel-label text-gold">360°</span>
                </div>
                <div className="relative flex justify-center items-center" style={{ height: 340, perspective: '1500px' }}>
                  <div className="spotlight" />
                  <div className="turntable-disc" style={{ width: 280, height: 280, bottom: 10, left: '50%', marginLeft: -140 }} />
                  <div className="card-sway relative z-10">
                    <Link to={`/products/${TOP_LOT.id}`} className="block">
                      <PokeCard card={TOP_LOT} size="md" />
                    </Link>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 relative z-10">
                  <span className="pixel-label text-paper/50">SLOT-A · {TOP_LOT.year}</span>
                  <span className="pixel-label text-paper/50">QTY 1 / 1</span>
                </div>
              </div>

              {/* BID PANEL */}
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
                        <Icon name="clock" size={10} strokeWidth={2.5} />
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
                      <Link to={`/products/${TOP_LOT.id}`} className="block">
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
      <section className="max-w-7xl mx-auto px-6 py-16">
        <SectionHead
          chip={{ label: 'Live Auctions', color: 'text-dex', dot: 'red' }}
          title="진행중인 경매"
          desc="초희귀 카드만 엄선. 본인 인증 후 입찰 가능합니다."
          cta={{ label: '전체 경매', to: '/auctions' }}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
          {LIVE_CARDS.map((c, i) => (
            <div key={c.id || c._id} className="reveal-up" style={{ animationDelay: `${i * 0.06}s` }}>
              <CardTile card={c} />
            </div>
          ))}
        </div>
      </section>

      {/* === TRUST === */}
      <section className="bg-paper border-y border-line py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10 max-w-2xl mx-auto">
            <div className="pixel-label text-gold mb-3">WHY POKÉVAULT</div>
            <h2 className="font-display text-3xl lg:text-4xl font-bold text-ink mb-2 tracking-tight">
              한국 최고의 컬렉터블 인증 시스템
            </h2>
            <p className="text-sm text-mute">모든 카드는 공식 등급사 인증을 거치며, 보안 운송과 에스크로로 안전하게 거래됩니다.</p>
          </div>
          <div className="grid md:grid-cols-4 gap-4">
            <Trust ledColor="blue"   icon="shield"  title="100% 정품 보증" desc="가품 시 전액 환불" />
            <Trust ledColor="yellow" icon="trophy"  title="공식 등급사 인증" desc="PSA · BGS · CGC" />
            <Trust ledColor="red"    icon="package" title="보안 운송"        desc="FedEx Insured" />
            <Trust ledColor="green"  icon="lock"    title="에스크로 결제"    desc="100만원↑ 자동" />
          </div>
        </div>
      </section>

      {/* === BUY NOW === */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <SectionHead
          chip={{ label: 'Buy Now', color: 'text-blue', dot: 'blue' }}
          title="즉시 구매 카드"
          desc="검수 완료된 카드를 정찰가로 바로 소유하세요."
          cta={{ label: '전체 카탈로그', to: '/products' }}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {buyNow.map((c, i) => (
            <div key={c.id || c._id} className="reveal-up" style={{ animationDelay: `${i * 0.06}s` }}>
              <CardTile card={c} />
            </div>
          ))}
        </div>
      </section>

      {/* === SEALED PACKS === */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <SectionHead
          chip={{ label: 'Sealed Packs & Boxes', color: 'text-amber-700', dot: 'yellow' }}
          title="미개봉 카드팩 · 박스"
          desc="vintage 부스터팩부터 최신 ETB까지. 모든 상품 미개봉 인증."
          cta={{ label: '전체 카드팩', to: '/packs' }}
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-10">
          {featuredPacks.map((p, i) => (
            <div key={p.id || p._id} className="reveal-up" style={{ animationDelay: `${i * 0.06}s` }}>
              <PackTile pack={p} />
            </div>
          ))}
        </div>
      </section>

      {/* === SELL CTA === */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="dex-casing p-8 relative overflow-hidden text-paper">
            <div className="flex items-center gap-2 mb-3">
              <span className="led led-red led-pulse" />
              <span className="pixel-label text-gold">SELL ON AUCTION</span>
            </div>
            <h3 className="font-display text-2xl lg:text-3xl font-bold mb-3 leading-tight">
              내 카드를<br/>경매에 올리세요
            </h3>
            <p className="text-sm text-paper/80 leading-relaxed mb-5 max-w-sm">
              초희귀 카드는 글로벌 컬렉터에게 노출됩니다. PSA·BGS 등급만 위탁 가능. 위탁수수료 10%.
            </p>
            <Link to="/sell"><Button variant="gold" size="lg">경매 등록하기 <Icon name="arrow" size={14} strokeWidth={2.2} /></Button></Link>
          </div>

          <div className="surface-soft p-8 elev-2 relative overflow-hidden">
            <Pokeball size={140} className="absolute -bottom-4 -right-4 opacity-10" />
            <div className="relative">
              <div className="pixel-label text-dex mb-3">▸ BECOME A TRAINER</div>
              <h3 className="font-display text-2xl lg:text-3xl font-bold text-ink mb-3 leading-tight">
                트레이너로<br/>등록하세요
              </h3>
              <p className="text-sm text-mute leading-relaxed mb-5 max-w-sm">
                경매 참여, 자동 입찰, 시세 알림 등 전체 기능을 사용할 수 있습니다.
              </p>
              <Link to="/register"><Button variant="primary" size="lg">회원가입 <Icon name="arrow" size={14} strokeWidth={2.2} /></Button></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function SectionHead({ chip, title, desc, cta }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
      <div>
        <div className={`inline-flex items-center gap-2 mb-3 ${chip.color}`}>
          {chip.dot && <span className={`led led-${chip.dot} led-pulse`} style={{ width: 7, height: 7 }} />}
          <span className="pixel-label">{chip.label}</span>
        </div>
        <h2 className="font-display text-3xl lg:text-4xl font-bold text-ink tracking-tight">{title}</h2>
        {desc && <p className="text-sm text-mute mt-2 max-w-2xl">{desc}</p>}
      </div>
      {cta && (
        <Link to={cta.to} className="text-sm font-bold text-ink hover:text-dex inline-flex items-center gap-1.5 transition-colors">
          {cta.label} <Icon name="arrow" size={14} strokeWidth={2} />
        </Link>
      )}
    </div>
  )
}

function CategoryTile({ to, icon, label, desc, accent = 'text-ink' }) {
  return (
    <Link to={to} className="surface-card hover:-translate-y-0.5 hover:elev-2 transition-all p-5 flex items-center gap-4 group">
      <div className={`shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-bone-2 ${accent}`}>
        <Icon name={icon} size={22} strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-display text-lg font-bold text-ink leading-tight">{label}</div>
        <div className="text-xs text-mute font-medium mt-0.5">{desc}</div>
      </div>
      <Icon name="arrow" size={14} strokeWidth={2.2} className="shrink-0 text-mute group-hover:text-ink transition-colors" />
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
      <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-emerald-500 text-paper text-[8px] font-bold">✓</span>
      <span className="font-medium">{label}</span>
    </div>
  )
}

function Trust({ ledColor, icon, title, desc }) {
  // 정적 인포 — 클릭 어포던스(카드 그림자/hover 테두리) 제거하고 inline-row 형태로
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-bone-2 text-ink">
        <Icon name={icon} size={18} strokeWidth={1.8} />
      </div>
      <div className="min-w-0">
        <div className="inline-flex items-center gap-1.5 mb-0.5">
          <span className={`led led-${ledColor}`} style={{ width: 6, height: 6 }} />
          <span className="font-display text-base font-bold text-ink leading-tight">{title}</span>
        </div>
        <div className="text-xs text-mute leading-snug">{desc}</div>
      </div>
    </div>
  )
}
