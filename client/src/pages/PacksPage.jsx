import { useMemo, useState, useEffect } from 'react'
import { normalizePack } from '@/api/normalize'
import api from '@/api/axios'
import PackTile from '@/components/common/PackTile'
import Icon from '@/components/common/Icon'
import Sparkles from '@/components/common/Sparkles'
import Eyebrow from '@/components/common/Eyebrow'
import EraSelector from '@/components/common/EraSelector'
import FilterBar from '@/components/common/FilterBar'

// ─── 팩 포맷 메타 ─────────────────────────────────────────────
// 기존 type(pack/box)을 7종으로 세분화: 부스터팩 / 부스터박스 / ETB /
// 프리미엄 컬렉션 / 틴 / 테마덱 / 번들. SetSymbol(추상 심볼) IP 안전.
const FORMAT_META = {
  all:    { tone: 'ink',      short: '전체',          years: null,      symbol: 'all'   },
  pack:   { tone: 'water',    short: '부스터팩',      years: '단일 팩', symbol: 'pack'  },
  box:    { tone: 'psychic',  short: '부스터박스',    years: '36팩',    symbol: 'box'   },
  etb:    { tone: 'fire',     short: 'ETB',           years: '8—10팩',  symbol: 'etb'   },
  bundle: { tone: 'electric', short: 'Premium',       years: '컬렉션',  symbol: 'bundle' },
  tin:    { tone: 'grass',    short: 'Tin',           years: '한정',    symbol: 'tin'   },
  theme:  { tone: 'electric', short: 'Theme Deck',    years: '시작 덱', symbol: 'theme' },
}

const FORMAT_GROUPS = [
  { id: 'single',  title: '낱장',   period: '한 팩씩', eras: ['pack']                  },
  { id: 'multi',   title: '박스',   period: '대용량',  eras: ['box', 'etb']            },
  { id: 'special', title: '특별판', period: '한정·컬렉션', eras: ['bundle', 'tin', 'theme'] },
]

// 시대 메타 — ProductsPage와 시각 일관성. SetSymbol 그대로.
const ERA_META = {
  all:     { tone: 'ink',      short: '모든 시대', years: null         },
  base:    { tone: 'fire',     short: 'WotC',     years: '1999—2003'  },
  neo:     { tone: 'electric', short: 'Neo',      years: '2000—2001'  },
  ex:      { tone: 'psychic',  short: 'EX·DP·BW', years: '2003—2010'  },
  xy:      { tone: 'electric', short: 'XY·SM',    years: '2013—2018'  },
  swsh:    { tone: 'water',    short: 'SwSh',     years: '2019—2022'  },
  sv:      { tone: 'fire',     short: 'S·V',      years: '2022—'      },
}

const ERA_GROUPS = [
  { id: 'vintage', title: '빈티지', period: '1999—2003', eras: ['base', 'neo'] },
  { id: 'modern',  title: '모던',   period: '2003—2018', eras: ['ex', 'xy']    },
  { id: 'current', title: '현행',   period: '2019—',     eras: ['swsh', 'sv']  },
]

// ─── 팩 → 포맷 분류 (이름/SKU 기반) ────────────────────────
function getPackFormat(p) {
  const name = (p.name || '').toLowerCase()
  const sku = (p.sku || '').toUpperCase()
  if (name.includes('etb') || name.includes('elite trainer') || sku.includes('ETB')) return 'etb'
  if (name.includes('premium collection') || name.includes('booster bundle') || name.includes('v-box') || sku.includes('PREMIUM')) return 'bundle'
  if (name.includes('tin') || sku.includes('TIN')) return 'tin'
  if (name.includes('theme deck') || name.includes('starter') || name.includes('battle deck') || sku.includes('THEME')) return 'theme'
  if (p.type === 'box') return 'box'
  return 'pack'
}

// ─── 팩 → 시대 분류 (year 기반) ────────────────────────────
function getPackEra(p) {
  const year = Number(p.year) || 0
  if (year <= 2003) return 'base'
  if (year <= 2010) return 'ex'
  if (year <= 2018) return 'xy'
  if (year <= 2022) return 'swsh'
  return 'sv'
}

export default function PacksPage() {
  const [format, setFormat] = useState('all')
  const [era, setEra] = useState('all')
  const [sort, setSort] = useState('default')
  const [packs, setPacks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/packs', { params: { status: 'active', limit: 100 } })
      .then(({ data }) => setPacks(data.data.map(normalizePack)))
      .finally(() => setLoading(false))
  }, [])

  // 각 팩에 derived format/era 부착 (메모이즈)
  const enriched = useMemo(
    () => packs.map((p) => ({ ...p, _format: getPackFormat(p), _era: getPackEra(p) })),
    [packs]
  )

  const list = useMemo(() => {
    let arr = enriched
    if (format !== 'all') arr = arr.filter((p) => p._format === format)
    if (era !== 'all')    arr = arr.filter((p) => p._era === era)
    if (sort === 'price-asc')  arr = [...arr].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') arr = [...arr].sort((a, b) => b.price - a.price)
    if (sort === 'year-old')   arr = [...arr].sort((a, b) => (a.year || 0) - (b.year || 0))
    if (sort === 'year-new')   arr = [...arr].sort((a, b) => (b.year || 0) - (a.year || 0))
    return arr
  }, [enriched, format, era, sort])

  // 포맷 카운트 — era 필터 반영
  const eraFiltered = era === 'all' ? enriched : enriched.filter((p) => p._era === era)
  const formatItems = Object.keys(FORMAT_META).map((id) => {
    const meta = FORMAT_META[id]
    const count = id === 'all'
      ? eraFiltered.length
      : eraFiltered.filter((p) => p._format === id).length
    return {
      id,
      label: meta.short,
      tone: meta.tone,
      years: meta.years,
      symbolKey: meta.symbol,
      count,
    }
  })

  // 시대 카운트 — format 필터 반영
  const fmtFiltered = format === 'all' ? enriched : enriched.filter((p) => p._format === format)
  const eraItems = Object.keys(ERA_META).map((id) => {
    const meta = ERA_META[id]
    const count = id === 'all'
      ? fmtFiltered.length
      : fmtFiltered.filter((p) => p._era === id).length
    return {
      id,
      label: meta.short,
      tone: meta.tone,
      years: meta.years,
      count,
    }
  })

  const activeFilterLabel = format !== 'all'
    ? FORMAT_META[format]?.short
    : era !== 'all'
      ? ERA_META[era]?.short
      : '전체'
  const isAllOrEmpty = format === 'all' && era === 'all'

  const clearAllFilters = () => { setFormat('all'); setEra('all') }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 lg:py-14">
      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="relative sparkle-host mb-10">
        <Sparkles always />
        <Eyebrow tone="electric" dot dotColor="yellow" className="mb-4">
          SEALED PACKS · 두근두근 개봉
        </Eyebrow>
        <h1
          className="font-display font-bold text-ink [word-break:keep-all]"
          style={{
            fontSize: 'clamp(28px, 5vw, 46px)',
            lineHeight: 1.15,
            letterSpacing: '-0.025em',
          }}
        >
          미개봉 카드팩 · 박스
        </h1>
        <p
          className="text-[15px] text-ink/60 mt-3 max-w-2xl font-medium [word-break:keep-all]"
          style={{ lineHeight: 1.6 }}
        >
          1세대 빈티지 부스터부터 25주년 한정판, 최신 ETB · Premium Collection까지.
          미개봉 인증을 마친 팩들이 당신의 개봉을 기다려요.
        </p>
      </div>

      {/* ── 1차: 포맷 셀렉터 (가장 큰 의사결정 축) ─────── */}
      <section aria-label="포맷별 필터" className="mb-5 lg:mb-6">
        <EraSelector
          ariaLabel="팩 포맷 선택"
          groups={FORMAT_GROUPS}
          items={formatItems}
          value={format}
          onChange={setFormat}
        />
      </section>

      {/* ── 2차: 시대 핀스트라이프 (선택적, 세컨더리 톤) ── */}
      <section aria-label="시대별 필터" className="mb-5 lg:mb-6">
        <details className="group bg-bone-2 border-2 border-ink/12 rounded-2xl overflow-hidden">
          <summary
            className="list-none cursor-pointer px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-electric/15 transition-colors select-none"
          >
            <span className="inline-flex items-center gap-2 text-[13px] font-extrabold text-ink">
              <Icon name="clock" size={14} strokeWidth={2.4} />
              시대로 좁히기
              {era !== 'all' && (
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-ink text-electric tabular-nums">
                  {ERA_META[era]?.short}
                </span>
              )}
            </span>
            <Icon
              name="arrow"
              size={12}
              strokeWidth={2.6}
              className="text-mute group-open:rotate-90 transition-transform rotate-90"
            />
          </summary>
          <div className="px-4 pt-3 pb-4 border-t-2 border-ink/10">
            <EraSelector
              ariaLabel="시대 선택"
              groups={ERA_GROUPS}
              items={eraItems}
              value={era}
              onChange={setEra}
            />
          </div>
        </details>
      </section>

      {/* ── 활성 필터 + 정렬 통합 바 ──────────────────────── */}
      <div className="mb-6 lg:mb-8">
        <FilterBar
          activeLabel={activeFilterLabel}
          isAllOrEmpty={isAllOrEmpty}
          onClearFilter={clearAllFilters}
          resultCount={list.length}
          sortValue={sort}
          onSortChange={setSort}
          sortOptions={[
            { value: 'default',    label: '추천순' },
            { value: 'price-asc',  label: '가격 낮은순' },
            { value: 'price-desc', label: '가격 높은순' },
            { value: 'year-old',   label: '연식 오래된순' },
            { value: 'year-new',   label: '최신순' },
          ]}
        />
      </div>

      {/* ── 결과 그리드 ───────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-24">
          <div className="inline-flex items-center gap-3 text-mute font-bold">
            <span className="led led-yellow led-pulse" style={{ width: 8, height: 8 }} />
            팩을 꺼내는 중...
          </div>
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-24 relative sparkle-host">
          <Sparkles always />
          <div className="inline-flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-electric/30 border-2 border-ink flex items-center justify-center shadow-[0_4px_0_#1a1a1a]">
              <Icon name="search" size={28} strokeWidth={2.2} className="text-ink" />
            </div>
            <div className="font-display text-xl font-bold text-ink">이 조건의 팩은 아직 없어요</div>
            <div className="text-sm text-mute font-medium">다른 포맷·시대로 골라보세요.</div>
            {!isAllOrEmpty && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-ink text-electric border-2 border-ink shadow-[0_3px_0_rgba(0,0,0,0.35)] hover:-translate-y-0.5 transition-all font-bold text-[13px]"
              >
                <Icon name="close" size={12} strokeWidth={2.6} />
                필터 모두 해제
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 lg:gap-6">
          {list.map((p, i) => (
            <div key={p.id} className="reveal-up min-w-0" style={{ animationDelay: `${i * 0.04}s` }}>
              <PackTile pack={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
