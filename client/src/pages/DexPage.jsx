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
      className="mt-3"
    >
      {/* === LCD 도시에 표시되는 도감 데이터 시트 === */}
      <div
        className="relative overflow-hidden rounded-xl"
        style={{
          background: 'rgba(7,23,10,0.55)',
          boxShadow: [
            'inset 0 0 0 1px rgba(142,194,90,0.25)',
            'inset 0 1px 0 rgba(255,255,255,0.04)',
            'inset 0 0 40px rgba(0,0,0,0.5)',
          ].join(', '),
        }}
      >
        {/* 상단 데이터 시트 헤더 — 그린 LCD 톤 */}
        <div
          className="flex items-center justify-between px-4 sm:px-5 py-2"
          style={{
            background: 'linear-gradient(180deg, rgba(142,194,90,0.18), rgba(142,194,90,0.06))',
            borderBottom: '1px dashed rgba(142,194,90,0.35)',
          }}
        >
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: '#8ec25a', boxShadow: '0 0 6px #8ec25a' }}
              aria-hidden="true"
            />
            <span className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase" style={{ color: '#8ec25a' }}>
              DOSSIER · TYPE.{ (info.slug || type).toString().toUpperCase()}
            </span>
          </div>
          <span className="font-mono text-[10px] font-bold tracking-wider tabular-nums" style={{ color: '#8ec25a' }}>
            REC {String(matchCount).padStart(3, '0')}
          </span>
        </div>

        <div className="p-4 sm:p-5 flex items-start gap-4 sm:gap-5 flex-wrap sm:flex-nowrap">
          {/* === 좌측: 보석 인서트 슬롯 (디바이스의 표본 윈도우) === */}
          <div className="shrink-0">
            <div
              className="relative w-24 h-28 sm:w-28 sm:h-32 rounded-lg flex items-center justify-center overflow-hidden"
              style={{
                background: `
                  radial-gradient(circle at 50% 35%, ${info.hex}26 0%, transparent 60%),
                  linear-gradient(180deg, #0d1f0d 0%, #07170a 100%)
                `,
                boxShadow: [
                  `inset 0 0 0 2px ${info.hex}55`,
                  'inset 0 0 24px rgba(0,0,0,0.7)',
                  `inset 0 0 8px ${info.hex}33`,
                ].join(', '),
              }}
            >
              {/* 표본 윈도우 코너 마커 */}
              {['top-1 left-1', 'top-1 right-1', 'bottom-1 left-1', 'bottom-1 right-1'].map((pos, i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className={`absolute ${pos} w-2 h-2`}
                  style={{
                    borderTop: i < 2 ? `2px solid ${info.hex}` : 'none',
                    borderBottom: i >= 2 ? `2px solid ${info.hex}` : 'none',
                    borderLeft: i % 2 === 0 ? `2px solid ${info.hex}` : 'none',
                    borderRight: i % 2 === 1 ? `2px solid ${info.hex}` : 'none',
                    opacity: 0.7,
                  }}
                />
              ))}
              <TypeSymbol type={type} size={56} variant="jewel" />
              {/* 스캔라인 — 작은 영역 */}
              <span
                aria-hidden="true"
                className="absolute inset-0 pointer-events-none opacity-25 mix-blend-overlay"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 3px)',
                }}
              />
            </div>
            <div className="mt-1.5 font-mono text-[9px] font-bold tracking-[0.2em] uppercase text-center" style={{ color: '#8ec25a' }}>
              SPEC #{String(Math.abs(type.charCodeAt(0)) % 999).padStart(3, '0')}
            </div>
          </div>

          {/* === 우측: 타입명 + 설명 + 상성 === */}
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl sm:text-3xl leading-none mb-2 inline-flex items-center gap-2.5"
                style={{ color: '#cfe9b0', textShadow: '0 0 8px rgba(142,194,90,0.4)' }}>
              {type}
              <TypeSymbol type={type} size={20} variant="solid" />
            </h2>
            <p className="text-sm font-medium leading-relaxed" style={{ color: 'rgba(207,233,176,0.85)' }}>
              {info.desc}
            </p>

            {/* 상성 — LCD 데이터 패널 두 줄 */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <EffectivenessRow label="효과적이에요" tone="strong" types={info.strong} />
              <EffectivenessRow label="약점이에요"   tone="weak"   types={info.weak} />
            </div>
          </div>
        </div>

        {/* 하단 시그니처 라인 */}
        <div
          className="flex items-center justify-between px-4 sm:px-5 py-1.5"
          style={{ borderTop: '1px dashed rgba(142,194,90,0.25)', background: 'rgba(0,0,0,0.25)' }}
        >
          <span className="font-mono text-[9px] font-bold tracking-[0.22em] uppercase" style={{ color: 'rgba(142,194,90,0.6)' }}>
            POKÉDEX SYS · v1.151
          </span>
          <span className="font-mono text-[9px] font-bold tracking-wider" style={{ color: 'rgba(142,194,90,0.5)' }}>
            ◉ LIVE FEED
          </span>
        </div>
      </div>
    </section>
  )
}

function EffectivenessRow({ label, tone, types }) {
  const accent = tone === 'strong' ? '#8ec25a' : '#ff6b6b'   // LCD 그린 / 경고 레드
  const glowColor = tone === 'strong' ? 'rgba(142,194,90,0.4)' : 'rgba(255,107,107,0.4)'
  return (
    <div
      className="rounded-lg p-2.5"
      style={{
        background: 'rgba(0,0,0,0.3)',
        boxShadow: `inset 0 0 0 1px ${accent}33, inset 0 0 12px rgba(0,0,0,0.5)`,
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
          style={{ backgroundColor: accent, boxShadow: `0 0 6px ${glowColor}` }}
          aria-hidden="true"
        />
        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: accent, textShadow: `0 0 4px ${glowColor}` }}>
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
      {/* === 상단 데이터 시트 헤더 (LED + №) === */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-ink/10 relative">
        <div className="flex items-center gap-1.5">
          {/* 상태 LED — 재고 있으면 그린 펄스, 없으면 그레이 */}
          <span
            className={`w-1.5 h-1.5 rounded-full ${hasSale ? 'animate-pulse' : ''}`}
            style={{
              backgroundColor: hasSale ? '#16a34a' : '#9ca3af',
              boxShadow: hasSale ? '0 0 5px #16a34a' : 'none',
            }}
            aria-hidden="true"
          />
          <CatalogueLabel id={poke.id} name={poke.name} />
        </div>
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

      {/* === 일러스트 — 표본 윈도우 (4코너 마커 + 살짝 입체) === */}
      <div className={`relative px-4 pt-4 pb-3 bg-gradient-to-b ${TYPE_BG_SOFT[primaryToken]} to-transparent min-h-[160px] flex items-center justify-center`}>
        {/* 4코너 마커 — 표본 슬롯 느낌 */}
        {['top-1.5 left-1.5', 'top-1.5 right-1.5', 'bottom-1.5 left-1.5', 'bottom-1.5 right-1.5'].map((pos, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={`absolute ${pos} w-2 h-2 pointer-events-none`}
            style={{
              borderTop:    i < 2  ? '1.5px solid rgba(13,23,48,0.35)' : 'none',
              borderBottom: i >= 2 ? '1.5px solid rgba(13,23,48,0.35)' : 'none',
              borderLeft:   i % 2 === 0 ? '1.5px solid rgba(13,23,48,0.35)' : 'none',
              borderRight:  i % 2 === 1 ? '1.5px solid rgba(13,23,48,0.35)' : 'none',
            }}
          />
        ))}

        {hasSale && (
          <span
            aria-hidden="true"
            className="absolute top-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold tracking-[0.18em] uppercase border-2 border-ink"
            style={{
              backgroundColor: '#16a34a',
              color: '#fff',
              boxShadow: '0 0 10px rgba(22,163,74,0.55), 0 2px 0 #1a1a1a',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
          </span>
        )}

        <img
          src={ARTWORK_URL(poke.id)}
          alt={`${poke.nameKo} 일러스트`}
          loading="lazy"
          className="w-24 h-24 object-contain drop-shadow-[0_8px_8px_rgba(0,0,0,0.18)] group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300"
        />

        {/* 미세 스캔라인 — 표본 윈도우 톤 */}
        <span
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-10 mix-blend-overlay"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(13,23,48,0.15) 0px, rgba(13,23,48,0.15) 1px, transparent 1px, transparent 4px)',
          }}
        />
      </div>

      {/* === 명패 + 디바이스 데이터 라인 === */}
      <div className="px-3.5 pb-3 pt-2.5 border-t border-ink/10 bg-paper">
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <div className="font-display text-[17px] font-bold text-ink leading-tight truncate">
            {poke.nameKo}
          </div>
          <div className="font-mono text-[9px] font-bold tracking-wider text-mute/50 tabular-nums shrink-0">
            GEN.{poke.gen}
          </div>
        </div>

        {/* 유리알 jewel 타입 칩 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {poke.types.map((t) => {
            const ti = TYPE_INFO[t] || {}
            return (
              <span
                key={t}
                className="inline-flex items-center gap-1 pl-0.5 pr-2 py-0.5 rounded-full text-[10px] font-bold border"
                style={{
                  backgroundColor: `${ti.hex}15`,
                  borderColor: `${ti.hex}55`,
                  color: ti.hex,
                }}
              >
                <TypeSymbol type={t} size={14} variant="solid" />
                {t}
              </span>
            )
          })}
        </div>

        {/* LCD 데이터 바 — 상태 인디케이터 */}
        <div
          className="mt-2.5 px-2 py-1.5 rounded-md flex items-center justify-between"
          style={{
            background: hasSale ? 'rgba(22,163,74,0.08)' : 'rgba(13,23,48,0.04)',
            boxShadow: `inset 0 0 0 1px ${hasSale ? 'rgba(22,163,74,0.3)' : 'rgba(13,23,48,0.12)'}`,
          }}
        >
          <span
            className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider"
            style={{ color: hasSale ? '#16a34a' : '#9ca3af' }}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${hasSale ? 'animate-pulse' : ''}`}
              style={{
                backgroundColor: hasSale ? '#16a34a' : '#9ca3af',
                boxShadow: hasSale ? '0 0 5px #16a34a' : 'none',
              }}
              aria-hidden="true"
            />
            {hasSale ? 'IN STOCK' : 'CATALOGUED'}
          </span>
          <span
            className="font-mono text-[11px] font-bold tabular-nums"
            style={{ color: hasSale ? '#1a1a1a' : '#9ca3af' }}
          >
            {hasSale ? String(poke.onSaleCount).padStart(2, '0') : '—'}
            <span className="text-mute/60 font-normal"> / {poke.cards.length}</span>
          </span>
        </div>
      </div>
    </SpecimenFrame>
  )
}

// LCD 스탯 표시 한 줄 — HEIGHT/WEIGHT/GEN 데이터
function DexStatLine({ label, value }) {
  return (
    <div
      className="rounded-md px-2 py-1.5"
      style={{
        background: 'rgba(0,0,0,0.35)',
        boxShadow: 'inset 0 0 0 1px rgba(142,194,90,0.25)',
      }}
    >
      <div className="font-mono text-[9px] font-bold tracking-[0.18em] uppercase" style={{ color: 'rgba(142,194,90,0.7)' }}>
        {label}
      </div>
      <div className="font-display text-base font-bold tabular-nums leading-tight" style={{ color: '#cfe9b0', textShadow: '0 0 6px rgba(142,194,90,0.4)' }}>
        {value}
      </div>
    </div>
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
        className="rounded-3xl border-2 border-ink shadow-[0_8px_0_#1a1a1a] max-w-4xl w-full overflow-hidden max-h-[94vh] flex flex-col bg-bone"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 도감 디바이스 헤더 (포켓몬 스캔 모드) ───────── */}
        <header
          className="relative shrink-0 overflow-hidden"
          style={{
            background: `linear-gradient(180deg, var(--pdx-shell-hl) 0%, var(--pdx-shell) 18%, var(--pdx-shell) 70%, var(--pdx-shell-d) 100%)`,
            boxShadow: [
              'inset 0 2px 0 rgba(255,255,255,0.4)',
              'inset 0 -3px 0 rgba(0,0,0,0.25)',
              'inset 0 0 0 2px var(--pdx-rim)',
            ].join(', '),
          }}
        >
          {/* 본체 상단 광택 줄 */}
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px] pointer-events-none"
                style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55) 50%, transparent)' }} />
          {/* 코너 4개 리벳/스크류 */}
          {[
            'top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3',
          ].map((pos, i) => (
            <span key={i} aria-hidden="true"
                  className={`absolute ${pos} w-2.5 h-2.5 rounded-full pointer-events-none z-10`}
                  style={{
                    background: 'radial-gradient(circle at 35% 30%, #4a4a4a, #1a1a1a 65%, #000)',
                    boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.25), 0 1px 2px rgba(0,0,0,0.5)',
                  }} />
          ))}

          {/* === 디바이스 컨트롤 패널 (LED + 닫기 + 라벨) === */}
          <div className="px-5 sm:px-7 pt-5 pb-3 flex items-center gap-3">
            {/* 큰 파란 LED */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full"
                   style={{
                     background: 'radial-gradient(circle at 32% 28%, var(--pdx-led-blue-hl) 0%, var(--pdx-led-blue) 40%, #0f7aa3 100%)',
                     boxShadow: [
                       'inset 0 2px 4px rgba(255,255,255,0.7)',
                       'inset 0 -3px 6px rgba(0,0,0,0.4)',
                       'inset 0 0 0 2px #0a1a1f',
                       '0 0 14px rgba(98,202,240,0.6)',
                       '0 2px 4px rgba(0,0,0,0.4)',
                     ].join(', '),
                   }} aria-hidden="true" />
              <span aria-hidden="true" className="absolute pointer-events-none rounded-full"
                    style={{ top: '15%', left: '20%', width: '40%', height: '30%',
                             background: 'radial-gradient(ellipse, rgba(255,255,255,0.85), transparent 65%)' }} />
            </div>
            {/* 작은 LED 3개 */}
            <div className="flex items-center gap-1.5 shrink-0">
              {['#dc2626', '#facc15', '#16a34a'].map((c, i) => (
                <div key={i} className="w-2.5 h-2.5 rounded-full"
                     style={{
                       background: `radial-gradient(circle at 35% 30%, ${c} 0%, ${c} 60%, rgba(0,0,0,0.6) 100%)`,
                       boxShadow: `inset 0 0.5px 0 rgba(255,255,255,0.7), 0 0 4px ${c}80`,
                     }} aria-hidden="true" />
              ))}
            </div>
            {/* 라벨 */}
            <div className="ml-auto mr-2 text-right">
              <div className="font-display text-base sm:text-lg leading-none tracking-wide"
                   style={{ color: '#fff', textShadow: '0 2px 0 rgba(0,0,0,0.45)', letterSpacing: '0.06em' }}>
                POKÉDEX
              </div>
              <div className="font-mono text-[9px] mt-0.5 font-bold tracking-[0.18em] uppercase"
                   style={{ color: 'rgba(255,255,255,0.85)' }}>
                ENTRY · 스캔
              </div>
            </div>
            {/* 닫기 버튼 */}
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="닫기"
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-electric"
              style={{
                background: 'radial-gradient(circle at 32% 28%, #5a5a5a, #1a1a1a 70%, #000)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -2px 3px rgba(0,0,0,0.6), 0 2px 0 #000',
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              <Icon name="close" size={14} strokeWidth={2.6} />
            </button>
          </div>

          {/* 본체 중앙 음각 라인 */}
          <div className="px-5 sm:px-7 -mt-1 mb-2" aria-hidden="true">
            <div className="h-[2px] rounded-full"
                 style={{ background: 'linear-gradient(90deg, transparent, rgba(0,0,0,0.35) 15%, rgba(0,0,0,0.35) 85%, transparent)' }} />
          </div>

          {/* === LCD 스크린: 포켓몬 스캔 화면 === */}
          <div
            className="mx-3 sm:mx-5 mb-4 rounded-2xl p-2 sm:p-2.5"
            style={{
              background: 'linear-gradient(180deg, #1c1c1c, #0a0a0a)',
              boxShadow: 'inset 0 2px 3px rgba(0,0,0,0.7), 0 1px 0 rgba(255,255,255,0.15)',
            }}
          >
            <div
              className="relative overflow-hidden rounded-xl px-4 sm:px-6 py-4 sm:py-5"
              style={{
                background: `
                  radial-gradient(ellipse at top, rgba(255,255,255,0.04), transparent 60%),
                  linear-gradient(180deg, #0e2410 0%, #07170a 100%)
                `,
                boxShadow: 'inset 0 0 30px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(142,194,90,0.12)',
              }}
            >
              {/* 스캔라인 */}
              <div aria-hidden="true" className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-30"
                   style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 1px, transparent 1px, transparent 3px)' }} />
              {/* 비네트 */}
              <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
                   style={{ boxShadow: 'inset 0 0 80px rgba(0,0,0,0.5)' }} />

              {/* 상단 LCD 헤더 */}
              <div className="relative flex items-center justify-between mb-3 pb-2"
                   style={{ borderBottom: '1px dashed rgba(142,194,90,0.35)' }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: '#8ec25a', boxShadow: '0 0 6px #8ec25a' }} aria-hidden="true" />
                  <span className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase"
                        style={{ color: '#8ec25a' }}>
                    DEX ENTRY · #{String(poke.id).padStart(3, '0')}
                  </span>
                </div>
                <span className="font-mono text-[10px] font-bold tracking-wider uppercase"
                      style={{ color: '#8ec25a' }}>
                  {poke.name}
                </span>
              </div>

              <div className="relative grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-4 sm:gap-5">
                {/* 좌측: 포켓몬 표본 윈도우 */}
                <div className="shrink-0">
                  <div
                    className="relative w-36 h-36 sm:w-40 sm:h-40 mx-auto rounded-lg flex items-center justify-center overflow-hidden"
                    style={{
                      background: `
                        radial-gradient(circle at 50% 35%, rgba(142,194,90,0.12) 0%, transparent 60%),
                        linear-gradient(180deg, #0d1f0d, #07170a)
                      `,
                      boxShadow: 'inset 0 0 0 2px rgba(142,194,90,0.35), inset 0 0 24px rgba(0,0,0,0.7), inset 0 0 12px rgba(142,194,90,0.15)',
                    }}
                  >
                    {/* 4코너 마커 */}
                    {['top-2 left-2', 'top-2 right-2', 'bottom-2 left-2', 'bottom-2 right-2'].map((pos, i) => (
                      <span key={i} aria-hidden="true" className={`absolute ${pos} w-2.5 h-2.5`}
                            style={{
                              borderTop: i < 2 ? '2px solid #8ec25a' : 'none',
                              borderBottom: i >= 2 ? '2px solid #8ec25a' : 'none',
                              borderLeft: i % 2 === 0 ? '2px solid #8ec25a' : 'none',
                              borderRight: i % 2 === 1 ? '2px solid #8ec25a' : 'none',
                              opacity: 0.75,
                            }} />
                    ))}
                    <img
                      src={ARTWORK_URL(poke.id)}
                      alt={`${poke.nameKo} 일러스트`}
                      className="relative w-28 h-28 sm:w-32 sm:h-32 object-contain"
                      style={{ filter: 'drop-shadow(0 0 12px rgba(142,194,90,0.25)) drop-shadow(0 4px 6px rgba(0,0,0,0.5))' }}
                    />
                    {/* 스캔 라인 */}
                    <span aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay"
                          style={{ backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 1px, transparent 1px, transparent 3px)' }} />
                  </div>
                  <div className="mt-1.5 font-mono text-[9px] font-bold tracking-[0.2em] uppercase text-center"
                       style={{ color: '#8ec25a' }}>
                    SPEC · {String(poke.id).padStart(3, '0')}
                  </div>
                </div>

                {/* 우측: 이름·타입·설명·스탯 */}
                <div className="min-w-0">
                  <h2 id="catalogue-title"
                      className="font-display text-3xl sm:text-4xl leading-none mb-2"
                      style={{ color: '#cfe9b0', textShadow: '0 0 10px rgba(142,194,90,0.5)' }}>
                    {poke.nameKo}
                  </h2>
                  {/* 타입 — 유리알 jewel */}
                  <div className="flex gap-2 flex-wrap mb-3">
                    {poke.types.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1.5 pl-1 pr-2.5 py-0.5 rounded-full"
                            style={{
                              background: 'rgba(0,0,0,0.4)',
                              boxShadow: `inset 0 0 0 1px ${(TYPE_INFO[t]?.hex || '#fff')}66`,
                              color: TYPE_INFO[t]?.hex || '#fff',
                            }}>
                        <TypeSymbol type={t} size={14} variant="solid" />
                        <span className="font-bold text-[11px]">{t}</span>
                      </span>
                    ))}
                  </div>

                  <p className="text-sm font-medium leading-relaxed italic mb-3"
                     style={{ color: 'rgba(207,233,176,0.85)' }}>
                    "{poke.desc}"
                  </p>

                  {/* 스탯 LCD 데이터 라인 */}
                  <div className="grid grid-cols-3 gap-2">
                    <DexStatLine label="HEIGHT" value={`${poke.height}m`} />
                    <DexStatLine label="WEIGHT" value={`${poke.weight}kg`} />
                    <DexStatLine label="GEN" value={poke.gen} />
                  </div>
                </div>
              </div>

              {/* 하단 LCD 액션 바 */}
              <div className="relative mt-4 pt-3 flex flex-wrap items-center justify-between gap-3"
                   style={{ borderTop: '1px dashed rgba(142,194,90,0.35)' }}>
                <button
                  onClick={onToggleOwned}
                  aria-pressed={owned}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all"
                  style={{
                    background: owned ? 'rgba(192,132,252,0.2)' : 'rgba(0,0,0,0.35)',
                    boxShadow: owned
                      ? 'inset 0 0 0 1px rgba(192,132,252,0.7), 0 0 8px rgba(192,132,252,0.3)'
                      : 'inset 0 0 0 1px rgba(142,194,90,0.35)',
                    color: owned ? '#e9d5ff' : '#8ec25a',
                  }}
                >
                  <span aria-hidden="true">{owned ? '★' : '☆'}</span>
                  {owned ? 'IN COLLECTION · 내 도감' : 'ADD TO DEX · 컬렉션에 담기'}
                </button>
                <div className="font-mono text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5"
                     style={{ color: '#8ec25a' }}>
                  {poke.onSaleCount > 0 ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                            style={{ backgroundColor: '#8ec25a', boxShadow: '0 0 6px #8ec25a' }} />
                      <span>IN STOCK {String(poke.onSaleCount).padStart(2, '0')} / {String(poke.cards.length).padStart(2, '0')}</span>
                    </>
                  ) : (
                    <span style={{ color: 'rgba(142,194,90,0.55)' }}>CATALOGUED · NO STOCK</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ── 카탈로그 본문: 카드 라인업 ────────────────── */}
        <div className="flex-1 overflow-y-auto bg-bone">
          <div className="px-5 sm:px-7 pt-5 pb-7">
            <div className="flex items-baseline justify-between mb-4">
              <div className="flex items-baseline gap-2">
                <h3 className="font-mono text-[11px] font-bold tracking-[0.22em] uppercase text-ink">
                  Card Lineup
                </h3>
                <span className="font-mono text-[10px] font-bold text-mute tabular-nums">
                  {String(sortedCards.length).padStart(2, '0')}
                </span>
              </div>
              {poke.onSaleCount > 0 && (
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: '#16a34a' }}>
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                        style={{ backgroundColor: '#16a34a', boxShadow: '0 0 6px #16a34a80' }} />
                  Live First
                </span>
              )}
            </div>

            {/* 카드 슬리브 리스트 — 가로 행 레이아웃 */}
            <div className="flex flex-col gap-2">
              {sortedCards.map((card) => (
                <SpecimenCard key={card.cardId} card={card} onClose={onClose} />
              ))}
            </div>

            {/* 신뢰 라인 */}
            <div className="mt-6 pt-4 border-t border-dashed border-ink/15">
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

// ─── 모달 안의 카드 한 장 — 카드 슬리브(가로 슬롯) 레이아웃 ─────
function SpecimenCard({ card, onClose }) {
  const hasSale = card.matched.length > 0
  const primary = card.primaryProduct
  const isAuction = primary?.sale_type === 'auction'

  // 상태별 강한 시각 차이 — 재고/경매/카탈로그
  const stateLabel = isAuction ? 'AUCTION · 경매' : hasSale ? 'IN STOCK · 재고있음' : 'CATALOGUED'
  const stateColor = isAuction ? '#dc2626' : hasSale ? '#16a34a' : '#9ca3af'
  const stateBg    = isAuction ? '#dc2626' : hasSale ? '#16a34a' : '#e5e7eb'
  const stateText  = (isAuction || hasSale) ? '#fff' : '#6b7280'

  const inner = (
    <>
      {/* 좌측: 카드 썸네일 (가로 슬리브 모양) */}
      <div className="shrink-0 w-[72px] sm:w-[84px] relative">
        <div
          className="rounded-lg overflow-hidden aspect-[63/88] bg-bone-2 relative"
          style={{
            boxShadow: 'inset 0 0 0 1.5px rgba(13,23,48,0.12), 0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          <img
            src={card.image}
            alt={`${card.setShort} ${card.number}`}
            loading="lazy"
            className={
              `w-full h-full object-contain transition-all duration-200 ` +
              (hasSale ? 'group-hover:scale-105' : 'grayscale-[60%] opacity-75')
            }
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.parentElement.innerHTML =
                '<div class="w-full h-full flex items-center justify-center text-xl text-mute/40" role="img">🃏</div>'
            }}
          />
          {!hasSale && (
            <div className="absolute inset-0 bg-gradient-to-t from-ink/20 to-transparent pointer-events-none" />
          )}
        </div>
      </div>

      {/* 우측: 메타 + 상태 + 가격 */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
        {/* 상단: 세트명 + 상태 배지 */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="min-w-0">
            <div className="font-display text-[14px] sm:text-[15px] font-bold text-ink leading-tight truncate">
              {card.setShort}
            </div>
            <div className="font-mono text-[10px] text-mute tracking-wider mt-0.5">
              {card.number} · {card.year}
              {card.rarity && <span className="ml-1.5 uppercase">· {card.rarity}</span>}
            </div>
          </div>
          {/* 상태 배지 — 강한 대비 */}
          <span
            className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[0.12em] border-2 border-ink"
            style={{
              backgroundColor: stateBg,
              color: stateText,
              boxShadow: hasSale ? `0 0 8px ${stateColor}66, 0 1px 0 #1a1a1a` : '0 1px 0 #1a1a1a',
            }}
          >
            {hasSale && (
              <span className={`w-1 h-1 rounded-full ${isAuction ? 'animate-pulse' : ''}`}
                    style={{ backgroundColor: stateText }} />
            )}
            {stateLabel}
          </span>
        </div>

        {/* 하단: 가격 + CTA */}
        <div className="flex items-end justify-between gap-2">
          {hasSale && primary ? (
            <div>
              <div className="font-mono text-[9px] font-bold uppercase tracking-wider text-mute">
                {isAuction ? '현재가' : '판매가'}
              </div>
              <div className="font-display text-lg sm:text-xl font-bold text-ink tabular-nums leading-none">
                ₩{primary.price.toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-mute/70">
              현재 매물 없음
            </div>
          )}
          {hasSale && (
            <span className="shrink-0 inline-flex items-center gap-1 font-mono text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: stateColor }}>
              {isAuction ? '입찰하기' : '구매하기'}
              <Icon name="arrow" size={10} strokeWidth={2.6} />
            </span>
          )}
        </div>
      </div>
    </>
  )

  const baseCls =
    'group flex items-stretch gap-3 sm:gap-4 p-2.5 sm:p-3 bg-paper rounded-xl ' +
    'transition-all duration-150 relative'

  return hasSale ? (
    <Link
      to={`/products/${primary._id}`}
      onClick={onClose}
      aria-label={`${card.setShort} ${card.number} ${isAuction ? '경매' : '판매'} 보기`}
      className={
        baseCls +
        ' border-2 border-ink hover:-translate-y-0.5 shadow-[0_3px_0_#1a1a1a] hover:shadow-[0_5px_0_#1a1a1a] ' +
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2'
      }
    >
      {inner}
    </Link>
  ) : (
    <div className={baseCls + ' border border-dashed border-ink/20 opacity-90'} aria-label={`${card.setShort} 매물 없음`}>
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
