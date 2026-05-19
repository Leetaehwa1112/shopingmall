import { useMemo, useState, useEffect } from 'react'
import { normalizePack } from '@/api/normalize'
import api from '@/api/axios'
import PackTile from '@/components/common/PackTile'
import Icon from '@/components/common/Icon'
import Sparkles from '@/components/common/Sparkles'
import Eyebrow from '@/components/common/Eyebrow'

const FILTERS = [
  { id: 'all',  label: '전체' },
  { id: 'pack', label: '부스터팩' },
  { id: 'box',  label: '박스 / ETB' },
]

export default function PacksPage() {
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('default')
  const [packs, setPacks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/packs', { params: { status: 'active', limit: 100 } })
      .then(({ data }) => setPacks(data.data.map(normalizePack)))
      .finally(() => setLoading(false))
  }, [])

  const list = useMemo(() => {
    let arr = filter === 'all' ? packs : packs.filter((p) => p.type === filter)
    if (sort === 'price-asc')  arr = [...arr].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') arr = [...arr].sort((a, b) => b.price - a.price)
    if (sort === 'year-old')   arr = [...arr].sort((a, b) => (a.year || 0) - (b.year || 0))
    return arr
  }, [filter, sort, packs])

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      {/* ── Hero ────────────────────────────────────────────── */}
      <div className="relative sparkle-host mb-10">
        <Sparkles always />
        <Eyebrow tone="electric" led="yellow" pulse>
          SEALED PACKS · 두근두근 개봉
        </Eyebrow>
        <h1 className="mt-4 font-display text-4xl lg:text-5xl font-bold text-ink tracking-tight leading-[1.1]">
          미개봉 카드팩
          <span className="relative inline-block ml-3">
            <span className="relative z-10 text-fire">뜯기 직전!</span>
            <span className="absolute left-0 right-0 bottom-1 h-3 bg-electric/60 -z-0 rounded-sm" aria-hidden />
          </span>
        </h1>
        <p className="text-sm text-mute mt-4 max-w-2xl leading-relaxed font-medium">
          1세대 빈티지 부스터부터 25주년 한정판, 최신 ETB까지. 미개봉 인증을 마친 팩들이 당신의 개봉을 기다려요.
        </p>
      </div>

      {/* ── Filters bar ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 mb-10 border-b-2 border-ink/15">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.id
            const count = f.id === 'all' ? packs.length : packs.filter((p) => p.type === f.id).length
            return (
              <button key={f.id} onClick={() => setFilter(f.id)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-full border-2 transition-all ${
                  active
                    ? 'bg-ink text-electric border-ink shadow-[0_3px_0_#1a1a1a] -translate-y-0.5'
                    : 'bg-paper border-ink/20 text-ink hover:border-ink hover:-translate-y-0.5 hover:shadow-[0_3px_0_#1a1a1a]'
                }`}>
                <span>{f.label}</span>
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
          <option value="year-old">연식 오래된순</option>
        </select>
      </div>

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
            <div className="text-sm text-mute font-medium">다른 필터로 골라보세요.</div>
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {list.map((p, i) => (
            <div key={p.id} className="reveal-up" style={{ animationDelay: `${i * 0.04}s` }}>
              <PackTile pack={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
