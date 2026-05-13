import { useMemo, useState } from 'react'
import { PACKS } from '@/api/cards'
import PackTile from '@/components/common/PackTile'

const FILTERS = [
  { id: 'all',  label: '전체' },
  { id: 'pack', label: '부스터팩' },
  { id: 'box',  label: '박스 / ETB' },
]

export default function PacksPage() {
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('default')

  const list = useMemo(() => {
    let arr = filter === 'all' ? PACKS : PACKS.filter((p) => p.type === filter)
    if (sort === 'price-asc')  arr = [...arr].sort((a, b) => a.price - b.price)
    if (sort === 'price-desc') arr = [...arr].sort((a, b) => b.price - a.price)
    if (sort === 'year-old')   arr = [...arr].sort((a, b) => a.year - b.year)
    return arr
  }, [filter, sort])

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 text-amber-700 mb-3">
          <span className="led led-yellow" style={{ width: 7, height: 7 }} />
          <span className="pixel-label">Sealed Packs & Boxes</span>
        </div>
        <h1 className="font-display text-4xl lg:text-5xl font-bold text-ink tracking-tight">미개봉 카드팩 · 박스</h1>
        <p className="text-sm text-mute mt-3 max-w-2xl leading-relaxed">
          vintage 1세대 부스터팩부터 25주년 한정판, 최신 ETB까지. 모든 상품은 미개봉 인증을 거쳤습니다.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pb-6 mb-10 border-b border-line">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f.id} onClick={() => setFilter(f.id)}
              className={`px-4 py-2 text-sm font-bold rounded-full border transition-all ${
                filter === f.id ? 'bg-ink text-paper border-ink elev-1' : 'bg-paper border-line text-ink hover:border-ink/40'
              }`}>
              {f.label}
              <span className="ml-1.5 opacity-60 text-xs font-mono">
                {f.id === 'all' ? PACKS.length : PACKS.filter((p) => p.type === f.id).length}
              </span>
            </button>
          ))}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)}
          className="bg-paper border border-line rounded-full px-4 py-2 text-sm font-bold text-ink">
          <option value="default">추천순</option>
          <option value="price-asc">가격 낮은순</option>
          <option value="price-desc">가격 높은순</option>
          <option value="year-old">연식 오래된순</option>
        </select>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {list.map((p, i) => (
          <div key={p.id} className="reveal-up" style={{ animationDelay: `${i * 0.04}s` }}>
            <PackTile pack={p} />
          </div>
        ))}
      </div>
    </div>
  )
}
