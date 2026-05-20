import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '@/api/axios'
import useCollectionStore from '@/store/collectionStore'
import { POKEDEX, ARTWORK_URL, TYPE_TOKEN, TYPE_BG_SOFT, TYPE_INFO } from '@/constants/pokedex'
import TypeSymbol from '@/components/common/TypeSymbol'
import PokedexShell from '@/components/dex/PokedexShell'
import Icon from '@/components/common/Icon'
import {
  DexLed,
  LcdScreen,
  LcdCounter,
  DexButton,
  ControlChip,
  SpecimenFrame,
  CatalogueLabel,
  TypeChip,
  StateBlock,
} from '@/components/dex/primitives'

// ─── 카드 ↔ 상품 매칭 (LOGIC — 변경 없음) ───────────────────
function findProductsForCard(products, card, pokemon) {
  if (!products?.length) return []
  const setLow = card.setShort.toLowerCase()
  const pokoEn = pokemon.name.toLowerCase()
  const pokoKo = pokemon.nameKo

  return products.filter((p) => {
    const n = (p.name || '').toLowerCase()
    const nk = p.nameKo || ''
    const s = (p.set || p.setShort || '').toLowerCase()
    const c = (p.category || '').toLowerCase()

    const hasPoke = n.includes(pokoEn) || nk.includes(pokoKo) || c.includes(pokoEn) || c.includes(pokoKo)
    if (!hasPoke) return false

    const setMatch = s.includes(setLow.toLowerCase()) || setLow.includes(s)
    const kwMatch = card.keywords?.some((kw) => {
      const k = kw.toLowerCase()
      return n.includes(k) || s.includes(k) || c.includes(k)
    })
    return setMatch || kwMatch
  })
}

function enrichPokemon(poke, products) {
  const cardsWithMatches = poke.cards.map((card) => {
    const matched = findProductsForCard(products, card, poke)
    const auction = matched.find((m) => m.sale_type === 'auction')
    const buynow = matched.find((m) => m.sale_type === 'buynow')
    return { ...card, matched, primaryProduct: auction || buynow || matched[0] || null }
  })
  const onSaleCount = cardsWithMatches.filter((c) => c.matched.length > 0).length
  return { ...poke, cards: cardsWithMatches, onSaleCount }
}

// ─── 메인 페이지 ─────────────────────────────────────────────
export default function DexPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('전체')
  const [saleOnly, setSaleOnly] = useState(false)
  const [selected, setSelected] = useState(null)

  const collectionIds = useCollectionStore((s) => s.ids)
  const toggleCollection = useCollectionStore((s) => s.toggle)

  const fetchData = useCallback(() => {
    setLoading(true)
    setError(false)
    api.get('/products', { params: { status: '', limit: 200 } })
      .then(({ data }) => setProducts(data.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const enriched = useMemo(
    () => POKEDEX.map((p) => enrichPokemon(p, products)),
    [products]
  )

  const allTypes = useMemo(() => {
    const t = new Set(POKEDEX.flatMap((p) => p.types))
    return ['전체', ...Array.from(t)]
  }, [])

  const filtered = useMemo(() => {
    let list = enriched
    if (query) {
      const q = query.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.nameKo.includes(q))
    }
    if (typeFilter !== '전체') list = list.filter((p) => p.types.includes(typeFilter))
    if (saleOnly) list = list.filter((p) => p.onSaleCount > 0)
    return [...list].sort((a, b) => {
      if ((b.onSaleCount > 0) - (a.onSaleCount > 0)) return (b.onSaleCount > 0) - (a.onSaleCount > 0)
      const ownedA = collectionIds.includes(a.id) ? 1 : 0
      const ownedB = collectionIds.includes(b.id) ? 1 : 0
      if (ownedB - ownedA) return ownedB - ownedA
      return a.id - b.id
    })
  }, [enriched, query, typeFilter, saleOnly, collectionIds])

  const stats = useMemo(() => ({
    pokemons: POKEDEX.length,
    totalCards: POKEDEX.reduce((s, p) => s + p.cards.length, 0),
    onSaleCards: enriched.reduce((s, p) => s + p.onSaleCount, 0),
    owned: POKEDEX.filter((p) => collectionIds.includes(p.id)).length,
  }), [enriched, collectionIds])

  const selectedEnriched = selected ? enriched.find((p) => p.id === selected.id) : null
  const hasActiveFilter = query || typeFilter !== '전체' || saleOnly
  const resetFilters = () => { setQuery(''); setTypeFilter('전체'); setSaleOnly(false) }

  return (
    <div className="min-h-screen bg-bone">
      {/*
        도감 디바이스로 전체 재포장 — 빨간 셸 안에 LCD(필터/상태) + 카탈로그 인서트.
        모든 상태·핸들러는 그대로, 표현 계층만 새 디자인 시스템으로 치환.
      */}
      <PokedexShell
        title="POKÉDEX"
        subtitle={`NAT'L · ${String(stats.total).padStart(3, '0')} · OWNED ${String(stats.owned).padStart(3, '0')}`}
        children={
          <>
            <DexControlPanel
              query={query}
              onQuery={setQuery}
              typeFilter={typeFilter}
              onType={setTypeFilter}
              allTypes={allTypes}
              filteredCount={filtered.length}
              totalCount={POKEDEX.length}
              hasActiveFilter={hasActiveFilter}
              onReset={resetFilters}
            />
            {typeFilter !== '전체' && <TypeDetailCard type={typeFilter} matchCount={filtered.length} />}
          </>
        }
        catalogue={
          <DexCatalogueBody
            loading={loading}
            error={error}
            saleOnly={saleOnly}
            filtered={filtered}
            collectionIds={collectionIds}
            toggleCollection={toggleCollection}
            setSelected={setSelected}
            hasActiveFilter={hasActiveFilter}
            resetFilters={resetFilters}
            fetchData={fetchData}
          />
        }
      />

      {/* 기존 DexHero는 디바이스 위쪽 인트로 — 토글 가능. 현재는 숨김. */}
      <div className="hidden">
        <DexHero
          stats={stats}
          loading={loading}
          saleOnly={saleOnly}
          onToggleSale={() => setSaleOnly((v) => !v)}
        />
      </div>

      {/* ── (이전 main 영역은 PokedexShell.catalogue로 이동) ── */}

      {selectedEnriched && (
        <CatalogueModal
          poke={selectedEnriched}
          owned={collectionIds.includes(selectedEnriched.id)}
          onToggleOwned={() => toggleCollection(selectedEnriched.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// HERO  ── "도감 디바이스 상단 패널"
// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// DEX CATALOGUE BODY ── PokedexShell.catalogue 슬롯에 들어가는 본문
// (기존 main 영역의 그리드/스켈레톤/에러/빈 상태 처리를 그대로 옮김)
// ═══════════════════════════════════════════════════════════
function DexCatalogueBody({
  loading, error, saleOnly, filtered, collectionIds, toggleCollection, setSelected,
  hasActiveFilter, resetFilters, fetchData,
}) {
  if (loading) return <SkeletonGrid />
  if (error) return (
    <StateBlock
      tone="alert"
      icon="⚡️"
      title="도감 신호가 끊어졌어요"
      desc="네트워크를 확인하고 다시 시도해주세요."
      action={<DexButton variant="device" onClick={fetchData}>다시 연결</DexButton>}
    />
  )
  if (filtered.length === 0) return (
    <StateBlock
      icon={saleOnly ? '🛒' : '🔍'}
      title={saleOnly ? '지금 막 매진이에요' : '조건에 맞는 포켓몬이 없어요'}
      desc={saleOnly ? '아직 등록된 매물이 없어요. 곧 새 매물이 올라옵니다.' : '검색어나 타입을 바꿔보세요.'}
      action={hasActiveFilter ? <DexButton variant="ghost" onClick={resetFilters}>전체 도감 보기</DexButton> : null}
    />
  )
  return (
    <>
      <div className="flex items-baseline justify-between mb-5 px-1">
        <div className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-mute">
          {saleOnly ? 'IN STOCK' : 'NATIONAL DEX'}
          <span className="ml-2 text-ink tabular-nums">{String(filtered.length).padStart(3, '0')}</span>
        </div>
        <div className="hidden sm:block font-mono text-[10px] text-mute/70 tracking-wider uppercase">
          Sale · Owned · #ID
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
        {filtered.map((poke) => (
          <SpecimenEntry
            key={poke.id}
            poke={poke}
            owned={collectionIds.includes(poke.id)}
            onToggleOwned={() => toggleCollection(poke.id)}
            onSelect={() => setSelected(poke)}
          />
        ))}
      </div>

      <p className="mt-10 text-center text-[11px] font-bold tracking-wider uppercase text-mute/70">
        ✦ Authentic Trainer's Catalogue · 1996—{new Date().getFullYear()} ✦
      </p>
    </>
  )
}

function DexHero({ stats, loading, saleOnly, onToggleSale }) {
  return (
    <section
      aria-labelledby="dex-title"
      className="relative overflow-hidden bg-dex"
      style={{
        backgroundImage:
          'radial-gradient(circle at 18% 30%, rgba(255,255,255,0.10) 0%, transparent 45%),' +
          'radial-gradient(circle at 100% 100%, rgba(0,0,0,0.35) 0%, transparent 55%)',
      }}
    >
      {/* 디바이스 가로 음각 라인 */}
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-paper/25" />
      <span aria-hidden="true" className="absolute inset-x-0 top-[3px] h-px bg-ink/30" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-ink/40" />

      <div className="max-w-7xl mx-auto px-6 pt-10 pb-12 relative">
        {/* ── 디바이스 상단 LED row ────────────────────────── */}
        <div className="flex items-center gap-3 mb-7">
          {/* 큰 파랑 LED */}
          <span className="relative inline-flex items-center justify-center">
            <span aria-hidden="true" className="absolute inset-0 rounded-full bg-paper/15 blur-md scale-150" />
            <DexLed color="blue" size={42} pulse className="ring-4 ring-paper/60" />
          </span>
          {/* 작은 LED 3개 */}
          <div className="flex gap-1.5">
            <DexLed color="red" size={9} />
            <DexLed color="yellow" size={9} />
            <DexLed color="green" size={9} pulse />
          </div>
          {/* 시리얼 — 신뢰 요소 */}
          <div className="ml-auto hidden sm:block font-mono text-[10px] tracking-[0.22em] uppercase text-white/55">
            DEVICE Nº POKÉVAULT-{new Date().getFullYear().toString().slice(-2)}
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_auto] gap-8 items-end">
          {/* ── 왼쪽: 카피 + LCD ───────────────────────────── */}
          <div>
            <div className="inline-flex items-center gap-2 mb-4 px-2.5 py-1 rounded-full bg-ink/90 border border-paper/15">
              <DexLed color="green" size={6} pulse />
              <span className="font-mono text-[10px] font-bold tracking-[0.22em] text-grass uppercase">
                Pokédex · Live Sync
              </span>
            </div>

            <h1
              id="dex-title"
              className="font-display text-4xl sm:text-5xl lg:text-[56px] font-bold tracking-tight text-white leading-[1.05] mb-7"
              style={{ textShadow: '0 2px 0 rgba(0,0,0,0.35)' }}
            >
              포켓몬 도감
            </h1>

            {/* ── LCD 패널: 메인 stat + CTA ───────────────── */}
            <LcdScreen className="inline-flex flex-wrap items-center gap-6 sm:gap-8 px-5 sm:px-7 py-4 sm:py-5">
              <LcdCounter
                size="lg"
                label="In Stock Now"
                value={loading ? '— —' : String(stats.onSaleCards).padStart(2, '0')}
              />
              <div className="h-12 w-px bg-grass/20 hidden sm:block" />
              <DexButton
                variant="primary"
                size="lg"
                onClick={onToggleSale}
                aria-pressed={saleOnly}
                className="uppercase tracking-[0.12em]"
              >
                {saleOnly ? '✓ Filtered' : 'Show Available'}
                {!saleOnly && <span aria-hidden="true">→</span>}
              </DexButton>
            </LcdScreen>
          </div>

          {/* ── 오른쪽: 보조 stat (수직) ─────────────────── */}
          <aside aria-label="요약 통계" className="lg:pl-6 lg:border-l-2 lg:border-paper/15">
            <ul className="grid grid-cols-3 lg:grid-cols-1 gap-3 lg:gap-3 lg:min-w-[180px]">
              <MetaStat label="수록" val={`${stats.pokemons}종`} />
              <MetaStat label="등록 카드" val={`${stats.totalCards}장`} />
              <MetaStat label="내 소장" val={`${stats.owned}종`} accent={stats.owned > 0} />
            </ul>
          </aside>
        </div>
      </div>
    </section>
  )
}

function MetaStat({ label, val, accent = false }) {
  return (
    <li
      className={
        `flex flex-col gap-0.5 px-3 py-2 rounded-lg border ` +
        (accent
          ? 'bg-psychic/25 border-psychic/50'
          : 'bg-ink/30 border-paper/10')
      }
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/55">{label}</span>
      <span className="font-mono font-bold tabular-nums text-white text-[15px] leading-none">{val}</span>
    </li>
  )
}

// ═══════════════════════════════════════════════════════════
// CONTROL PANEL ── 키패드 느낌 필터
// ═══════════════════════════════════════════════════════════
function DexControlPanel({
  query, onQuery, typeFilter, onType, allTypes,
  filteredCount, totalCount, hasActiveFilter, onReset,
}) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 sm:px-4 sm:py-3"
      style={{
        background: 'rgba(0,0,0,0.25)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), inset 0 0 0 1px rgba(142,194,90,0.15)',
      }}
    >
      <div className="flex items-center gap-2.5">
        {/* LCD 미니 검색 */}
        <label className="relative shrink-0">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-grass/80 pointer-events-none">
            <Icon name="search" size={14} strokeWidth={2.2} />
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="SEARCH…"
            aria-label="포켓몬 이름으로 검색"
            className={
              'h-9 pl-8 pr-3 w-36 sm:w-52 rounded-md bg-ink/95 border-2 border-ink ' +
              'shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] ' +
              'font-mono text-xs font-bold tracking-wider text-grass placeholder:text-grass/30 ' +
              'focus:outline-none focus:border-grass/60 caret-grass'
            }
          />
        </label>

        {/* 타입 칩 — 가로 스크롤 */}
        {/*
          포켓몬 디바이스 — 심볼 전용 버튼 행.
          전체(✦)는 텍스트 라벨, 나머지는 SVG 심볼만 (이모지 X).
          gap을 늘려 손가락 타깃 사이 호흡 확보.
        */}
        <div
          className="flex gap-3 overflow-x-auto scrollbar-none flex-1 min-w-0 -my-1 py-1 items-center"
          role="radiogroup"
          aria-label="타입 필터"
        >
          {allTypes.map((t) => {
            const info = TYPE_INFO[t] || TYPE_INFO['전체']
            const isActive = typeFilter === t
            const isAll = t === '전체'
            // ALL은 라벨 버튼, 나머지는 유리알 jewel 자체가 버튼.
            if (isAll) {
              return (
                <button
                  key={t}
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => onType(t)}
                  style={{
                    backgroundColor: isActive ? '#facc15' : 'rgba(0,0,0,0.45)',
                    color: isActive ? '#1a1a1a' : '#8ec25a',
                    borderColor: isActive ? '#1a1a1a' : 'rgba(142,194,90,0.4)',
                  }}
                  className={`shrink-0 inline-flex items-center justify-center rounded-full border-2 h-10 px-4 text-[11px] font-bold tracking-wider uppercase transition-all ${
                    isActive ? 'shadow-[0_3px_0_#1a1a1a] -translate-y-0.5' : 'hover:-translate-y-0.5'
                  }`}
                >
                  ALL · 전체
                </button>
              )
            }
            return (
              <button
                key={t}
                role="radio"
                aria-checked={isActive}
                aria-label={t}
                title={t}
                onClick={() => onType(t)}
                className={`shrink-0 inline-flex items-center justify-center rounded-full transition-all ${
                  isActive
                    ? '-translate-y-0.5'
                    : 'opacity-70 hover:opacity-100 hover:-translate-y-0.5'
                }`}
                style={{
                  // 활성: 황금 글로우 / 비활성: 살짝 그림자만
                  filter: isActive
                    ? `drop-shadow(0 0 8px ${info.hex}cc) drop-shadow(0 2px 4px rgba(0,0,0,0.5))`
                    : 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))',
                }}
              >
                <TypeSymbol type={t} size={26} variant="jewel" />
              </button>
            )
          })}
        </div>

        <span className="hidden sm:inline-flex shrink-0 font-mono text-[10px] font-bold tracking-wider uppercase text-mute tabular-nums">
          {String(filteredCount).padStart(2, '0')} / {String(totalCount).padStart(2, '0')}
        </span>

        {hasActiveFilter && (
          <button
            onClick={onReset}
            className="shrink-0 font-mono text-[10px] font-bold uppercase tracking-wider text-mute hover:text-dex underline underline-offset-2"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// TYPE DETAIL CARD ── 선택된 타입의 심볼·설명·상성을 한 카드에
// ═══════════════════════════════════════════════════════════
function TypeDetailCard({ type, matchCount }) {
  const info = TYPE_INFO[type]
  if (!info) return null
  return (
    <section
      aria-label={`${type} 타입 상세`}
      className="max-w-7xl mx-auto px-4 sm:px-6 -mt-2 mb-6"
    >
      <div
        className="relative overflow-hidden rounded-2xl border-2 border-ink shadow-[0_4px_0_#1a1a1a] p-6 sm:p-7"
        style={{ background: `linear-gradient(135deg, ${info.hex}22 0%, transparent 60%), #fffaf2` }}
      >
        <div className="flex items-start gap-5 flex-wrap sm:flex-nowrap">
          {/* 큰 심볼 — 실제 타입 심볼 (SVG) */}
          <div
            className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-ink flex items-center justify-center shadow-[0_3px_0_#1a1a1a]"
            style={{
              backgroundColor: info.hex,
              boxShadow: '0 4px 0 #1a1a1a, inset 0 2px 0 rgba(255,255,255,0.25)',
            }}
            aria-hidden="true"
          >
            <TypeSymbol type={type} size={56} variant="plain" className="text-white" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-mute">TYPE · 속성</span>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-ink/60 tabular-nums">
                {String(matchCount).padStart(2, '0')}마리
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-ink leading-none mb-2 inline-flex items-center gap-2.5">
              {type}
              <TypeSymbol type={type} size={20} variant="solid" />
            </h2>
            <p className="text-sm text-ink/80 font-medium leading-relaxed">{info.desc}</p>

            {/* 상성 */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <EffectivenessRow label="효과적이에요" tone="strong" types={info.strong} />
              <EffectivenessRow label="약점이에요"   tone="weak"   types={info.weak} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function EffectivenessRow({ label, tone, types }) {
  const accent = tone === 'strong' ? '#16a34a' : '#dc2626'
  const bgTone = tone === 'strong' ? 'rgba(22,163,74,0.10)' : 'rgba(220,38,38,0.08)'
  return (
    <div className="rounded-xl p-3 border-2 border-ink/15" style={{ backgroundColor: bgTone }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: accent }} aria-hidden="true" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider" style={{ color: accent }}>
          {tone === 'strong' ? 'STRONG VS' : 'WEAK TO'} · {label}
        </span>
      </div>
      {types.length === 0 ? (
        <span className="text-xs text-mute font-bold">없음</span>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {types.map((t) => {
            const ti = TYPE_INFO[t] || {}
            return (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full text-[11px] font-bold border border-ink/30"
                style={{ backgroundColor: `${ti.hex}22`, color: ti.hex }}
              >
                <TypeSymbol type={t} size={14} variant="solid" />
                {t}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// SPECIMEN ENTRY ── 박물관 표본 카드
// ═══════════════════════════════════════════════════════════
function SpecimenEntry({ poke, owned, onToggleOwned, onSelect }) {
  const primaryToken = TYPE_TOKEN[poke.types[0]] || 'mute'
  const hasSale = poke.onSaleCount > 0
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect() }
  }

  return (
    <SpecimenFrame
      owned={owned}
      hasSale={hasSale}
      onClick={onSelect}
      onKeyDown={onKey}
      ariaLabel={`${poke.nameKo} 카드 도감 열기${hasSale ? `, 판매중 ${poke.onSaleCount}장` : ''}`}
    >
      {/* 상단 표본 라벨 띠 */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-ink/10">
        <CatalogueLabel id={poke.id} name={poke.name} />
        <button
          onClick={(e) => { e.stopPropagation(); onToggleOwned() }}
          aria-label={owned ? `${poke.nameKo} 소장 해제` : `${poke.nameKo} 도감에 추가`}
          aria-pressed={owned}
          className={
            `w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ` +
            `focus:outline-none focus-visible:ring-2 focus-visible:ring-electric ` +
            (owned
              ? 'bg-psychic border-psychic text-white shadow-[0_0_8px_rgba(168,85,247,0.5)]'
              : 'bg-paper border-ink/20 text-mute/40 hover:border-psychic hover:text-psychic')
          }
        >
          <span className="text-[11px] leading-none" aria-hidden="true">{owned ? '★' : '☆'}</span>
        </button>
      </div>

      {/* 일러스트 — 진열장 */}
      <div className={`relative px-4 pt-4 pb-3 bg-gradient-to-b ${TYPE_BG_SOFT[primaryToken]} to-transparent min-h-[150px] flex items-center justify-center`}>
        {hasSale && (
          <span
            aria-hidden="true"
            className="absolute top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-grass/95 text-white text-[9px] font-bold tracking-[0.15em] uppercase shadow-sm"
          >
            <span className="w-1 h-1 rounded-full bg-paper animate-pulse" /> Live
          </span>
        )}
        <img
          src={ARTWORK_URL(poke.id)}
          alt={`${poke.nameKo} 일러스트`}
          loading="lazy"
          className="w-24 h-24 object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,0.15)] group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300"
        />
      </div>

      {/* 명패 */}
      <div className="px-3.5 pb-3 pt-2.5 border-t border-ink/5">
        <div className="font-display text-[17px] font-bold text-ink leading-tight">
          {poke.nameKo}
        </div>
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
          {poke.types.map((t) => <TypeChip key={t} type={t} size="sm" />)}
        </div>

        {/* 상태 인디케이터 */}
        <div className="mt-2.5 pt-2 border-t border-dashed border-ink/10">
          {hasSale ? (
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-grass">
                In Stock
              </span>
              <span className="font-mono text-[12px] font-bold text-ink tabular-nums">
                {String(poke.onSaleCount).padStart(2, '0')} <span className="text-mute font-normal">/ {poke.cards.length}</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-mute/60">
                Catalogued
              </span>
              <span className="font-mono text-[12px] font-bold text-mute/70 tabular-nums">
                — / {poke.cards.length}
              </span>
            </div>
          )}
        </div>
      </div>
    </SpecimenFrame>
  )
}

// ═══════════════════════════════════════════════════════════
// CATALOGUE MODAL ── 박물관 카탈로그 페이지
// ═══════════════════════════════════════════════════════════
function CatalogueModal({ poke, owned, onToggleOwned, onClose }) {
  const closeRef = useRef(null)

  const sortedCards = useMemo(
    () => [...poke.cards].sort((a, b) => (b.matched.length > 0) - (a.matched.length > 0)),
    [poke.cards]
  )

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-ink/75 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalogue-title"
    >
      <div
        className="bg-bone rounded-3xl border-2 border-ink shadow-[0_8px_0_#1a1a1a] max-w-4xl w-full overflow-hidden max-h-[94vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 카탈로그 헤더 (디바이스 상단 모티프) ───────── */}
        <header
          className="relative bg-dex text-white px-6 sm:px-8 pt-6 pb-5 shrink-0 overflow-hidden"
          style={{
            backgroundImage:
              'radial-gradient(circle at 12% 30%, rgba(255,255,255,0.10) 0%, transparent 45%)',
          }}
        >
          <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-1 bg-ink/40" />

          {/* LED row */}
          <div className="flex items-center gap-2.5 mb-4">
            <DexLed color="blue" size={22} pulse className="ring-2 ring-paper/50" />
            <DexLed color="red" size={7} />
            <DexLed color="yellow" size={7} />
            <DexLed color="green" size={7} pulse />
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="닫기"
              className="ml-auto w-9 h-9 rounded-full bg-ink/50 hover:bg-ink/75 text-white flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-electric"
            >
              <Icon name="close" size={16} strokeWidth={2.4} />
            </button>
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-5 items-start">
            {/* 좌: 메타 */}
            <div className="min-w-0">
              <CatalogueLabel id={poke.id} name={poke.name} className="!text-white/70 mb-2" />
              <h2 id="catalogue-title" className="font-display text-3xl sm:text-4xl font-bold text-white leading-tight mb-2">
                {poke.nameKo}
              </h2>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {poke.types.map((t) => <TypeChip key={t} type={t} />)}
              </div>
              <p className="text-[13px] text-white/85 font-medium leading-relaxed max-w-md italic">
                "{poke.desc}"
              </p>
            </div>
            {/* 우: 일러스트 + spec */}
            <div className="flex sm:flex-col items-center sm:items-end gap-3">
              <img
                src={ARTWORK_URL(poke.id)}
                alt={`${poke.nameKo} 일러스트`}
                className="w-24 h-24 sm:w-32 sm:h-32 object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,0.35)] shrink-0"
              />
              <dl className="font-mono text-[10px] text-white/60 grid grid-cols-3 sm:grid-cols-1 gap-x-3 gap-y-0.5 tracking-wider uppercase">
                <div><dt className="inline">키 </dt><dd className="inline text-white/90 font-bold">{poke.height}m</dd></div>
                <div><dt className="inline">무게 </dt><dd className="inline text-white/90 font-bold">{poke.weight}kg</dd></div>
                <div><dt className="inline">세대 </dt><dd className="inline text-white/90 font-bold">{poke.gen}</dd></div>
              </dl>
            </div>
          </div>

          {/* 액션 바: 소장 + 판매 요약 */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-paper/20">
            <DexButton
              variant={owned ? 'primary' : 'ghost'}
              size="sm"
              onClick={onToggleOwned}
              aria-pressed={owned}
              className={owned ? '' : '!bg-transparent !text-white !border-paper/40 hover:!bg-paper/10'}
            >
              <span aria-hidden="true">{owned ? '★' : '☆'}</span>
              {owned ? '내 컬렉션' : '컬렉션에 담기'}
            </DexButton>
            <div className="font-mono text-[11px] font-bold uppercase tracking-wider text-white/70">
              {poke.onSaleCount > 0 ? (
                <span className="inline-flex items-center gap-1.5">
                  <DexLed color="green" size={8} pulse />
                  <span className="text-grass">In Stock {String(poke.onSaleCount).padStart(2, '0')}</span>
                  <span className="text-white/40">/ {String(poke.cards.length).padStart(2, '0')}</span>
                </span>
              ) : (
                <span className="text-white/45">Catalogued · No Stock</span>
              )}
            </div>
          </div>
        </header>

        {/* ── 카탈로그 본문: 카드 라인업 ────────────────── */}
        <div className="flex-1 overflow-y-auto bg-bone">
          <div className="px-5 sm:px-8 pt-6 pb-8">
            <div className="flex items-baseline justify-between mb-4">
              <h3 className="font-mono text-[11px] font-bold tracking-[0.22em] uppercase text-ink">
                Card Lineup
              </h3>
              {poke.onSaleCount > 0 && (
                <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-grass">
                  ✦ Live first
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {sortedCards.map((card) => (
                <SpecimenCard key={card.cardId} card={card} onClose={onClose} />
              ))}
            </div>

            {/* 신뢰 라인 */}
            <div className="mt-8 pt-5 border-t border-dashed border-ink/15">
              <p className="text-center font-mono text-[10px] font-bold tracking-wider uppercase text-mute/70">
                ✦ All listings verified by POKÉVAULT · PSA / BGS / CGC ✦
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── 모달 안의 카드 한 장 ───────────────────────────────────
function SpecimenCard({ card, onClose }) {
  const hasSale = card.matched.length > 0
  const primary = card.primaryProduct
  const isAuction = primary?.sale_type === 'auction'

  const inner = (
    <>
      {hasSale && (
        <span
          className={
            `absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full ` +
            `text-[9px] font-bold uppercase tracking-[0.15em] border-2 ` +
            (isAuction
              ? 'bg-dex border-ink text-white'
              : 'bg-grass border-ink text-white')
          }
        >
          <span className={`w-1 h-1 rounded-full bg-paper ${isAuction ? 'animate-pulse' : ''}`} />
          {isAuction ? 'Live' : 'Stock'}
        </span>
      )}

      <div className="aspect-[3/4] bg-bone-2 overflow-hidden relative">
        <img
          src={card.image}
          alt={`${card.setShort} ${card.number}`}
          loading="lazy"
          className={
            `w-full h-full object-contain transition-all duration-300 ` +
            (hasSale
              ? 'group-hover:scale-105'
              : 'grayscale-[55%] opacity-70 group-hover:grayscale-0 group-hover:opacity-100')
          }
          onError={(e) => {
            e.target.style.display = 'none'
            e.target.parentElement.innerHTML =
              '<div class="w-full h-full flex items-center justify-center text-3xl text-mute/40" role="img" aria-label="이미지 없음">🃏</div>'
          }}
        />
        {!hasSale && (
          <div className="absolute inset-0 bg-gradient-to-t from-ink/15 to-transparent pointer-events-none" />
        )}
      </div>

      <div className="p-2.5 border-t border-ink/10">
        <div className="font-display text-[12px] font-bold text-ink leading-tight truncate">
          {card.setShort}
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <div className="font-mono text-[9px] text-mute tracking-wider">
            {card.number} · {card.year}
          </div>
          {hasSale && primary && (
            <div className="font-mono text-[11px] font-bold text-ink tabular-nums">
              ₩{Math.round(primary.price / 10000)}만
            </div>
          )}
        </div>
        {card.rarity && (
          <div className="font-mono text-[9px] text-mute/70 mt-0.5 truncate uppercase tracking-wider">
            {card.rarity}
          </div>
        )}
      </div>
    </>
  )

  const baseCls =
    'group block bg-paper rounded-xl border-2 border-ink/15 overflow-hidden relative ' +
    'transition-all duration-150'

  return hasSale ? (
    <Link
      to={`/products/${primary._id}`}
      onClick={onClose}
      aria-label={`${card.setShort} ${card.number} ${isAuction ? '경매' : '판매'} 보기`}
      className={
        baseCls +
        ' border-ink hover:-translate-y-0.5 shadow-[0_3px_0_#1a1a1a] hover:shadow-[0_5px_0_#1a1a1a] ' +
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2'
      }
    >
      {inner}
    </Link>
  ) : (
    <div className={baseCls + ' shadow-[0_2px_0_rgba(0,0,0,0.1)]'} aria-label={`${card.setShort} 매물 없음`}>
      {inner}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════
// SKELETON
// ═══════════════════════════════════════════════════════════
function SkeletonGrid() {
  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">도감을 불러오는 중입니다</span>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-paper border-2 border-ink/15 shadow-[0_3px_0_rgba(0,0,0,0.1)] overflow-hidden"
        >
          <div className="h-7 bg-bone-2 animate-pulse" />
          <div className="min-h-[150px] bg-bone-2/60 animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-4 w-20 bg-bone-2 rounded animate-pulse" />
            <div className="h-2.5 w-12 bg-bone-2 rounded animate-pulse" />
            <div className="h-3 w-full bg-bone-2 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
