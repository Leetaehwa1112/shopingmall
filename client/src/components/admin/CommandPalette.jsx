/**
 * CommandPalette — 글로벌 ⌘K 검색 + 점프 + 액션.
 *
 * 운영 효율 의도
 *   "어떤 화면에서든 ⌘K → 입력 → ⏎" 으로 도착.
 *   주문번호/시리얼/Cert#/이메일/카드명 — 입력만 보고 자동 라우팅.
 *
 *   페이지를 탐색하지 않게 만든다. 컨텍스트 전환 비용 = 0.
 *
 * 도메인 매칭
 *   - 주문번호 (8+ alphanumeric)        → /admin/orders + drawer open
 *   - 시리얼 / Cert#                    → /admin/products + drawer open
 *   - 이메일 (포함된 @)                  → /admin/users + drawer open
 *   - 그 외 자유 텍스트                  → 4개 도메인 병렬 검색 + 카테고리별 리스트
 *
 * 검색 결과 외에 항상 노출
 *   - 최근 본 항목 (localStorage)
 *   - 즐겨찾기 (localStorage)
 *   - 빠른 액션 ("새 상품 등록", "오늘 출고 큐", "VIP 휴면 뷰") — 1클릭 라우팅
 *
 * 키보드
 *   ↑↓ — 결과 이동 / ⏎ — 선택 / ESC — 닫기 / ⌘K — 토글
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import api from '@/api/axios'
import Icon from '@/components/common/Icon'

const RECENT_KEY = 'pokevault:admin:recent'
const FAVORITES_KEY = 'pokevault:admin:favorites'

// ─── 빠른 액션 (도메인 고려) ───────────────────────────
const QUICK_ACTIONS = [
  { id: 'qa:new-product', label: '새 카드 등록',          to: '/admin/products/new',      hint: 'N',     scope: 'product' },
  { id: 'qa:new-pack',    label: '새 카드팩 등록',        to: '/admin/packs/new',         hint: 'N',     scope: 'pack' },
  { id: 'qa:orders-sla',  label: '주문 — SLA 임박',       to: '/admin/orders?view=sla',   hint: '',      scope: 'order' },
  { id: 'qa:orders-pend', label: '주문 — 결제 대기',      to: '/admin/orders?view=pending', hint: '',    scope: 'order' },
  { id: 'qa:products-oos',label: '상품 — 재고 0',         to: '/admin/products?view=oos', hint: '',      scope: 'product' },
  { id: 'qa:users-vip',   label: '고객 — VIP 휴면',       to: '/admin/users?view=vip-dormant', hint: '', scope: 'user' },
  { id: 'qa:audit',       label: '감사 로그',             to: '/admin/audit',             hint: '',      scope: 'audit' },
  { id: 'qa:auctions',    label: '경매 검수 인박스',      to: '/admin/auctions/review',   hint: '',      scope: 'auction' },
]

// ─── 입력 자동 분류 — 어떤 도메인 검색이 가장 유효한가? ─
function detectScope(q) {
  const s = (q || '').trim()
  if (!s) return null
  if (s.includes('@'))                      return 'user'      // 이메일
  if (/^\+?\d[\d\-\s]{7,}$/.test(s))        return 'user'      // 전화
  if (/^[A-Z]{2,}\d{3,}/i.test(s))          return 'product'   // Cert/시리얼 풍 (ABC123)
  if (/^[A-Z0-9]{8,}$/i.test(s.replace(/-/g, ''))) return 'order' // 주문번호 풍
  return null // 멀티 도메인 검색
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState({ products: [], packs: [], orders: [], users: [] })
  const [loading, setLoading] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // ⌘K / Ctrl+K 글로벌 토글
  useEffect(() => {
    const onKey = (e) => {
      const meta = e.metaKey || e.ctrlKey
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // 열림 시 입력 포커스 & 검색어 초기화
  useEffect(() => {
    if (open) {
      setQ('')
      setActiveIdx(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  // 디바운스 + 도메인 자동 분류 + 병렬 검색
  useEffect(() => {
    if (!open || !q.trim()) {
      setResults({ products: [], packs: [], orders: [], users: [] })
      return
    }
    setLoading(true)
    const scope = detectScope(q)
    const t = setTimeout(async () => {
      try {
        // scope가 분명하면 해당 도메인만 검색 (네트워크 절약 + 빠른 응답)
        const calls = scope
          ? [searchByScope(scope, q)]
          : ['products', 'packs', 'orders', 'users'].map((s) => searchByScope(s, q))
        const settled = await Promise.allSettled(calls)
        const merged = { products: [], packs: [], orders: [], users: [] }
        settled.forEach((r, i) => {
          if (r.status !== 'fulfilled') return
          const s = scope || ['products', 'packs', 'orders', 'users'][i]
          merged[s] = r.value
        })
        setResults(merged)
        setActiveIdx(0)
      } finally {
        setLoading(false)
      }
    }, 180)
    return () => clearTimeout(t)
  }, [q, open])

  // 평탄화된 결과 리스트 (키보드 네비용)
  const flatItems = useMemo(() => flattenForKeyboard(q, results), [q, results])

  // 키보드 ↑↓⏎
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => Math.min(i + 1, flatItems.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const it = flatItems[activeIdx]
        if (it) select(it)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, flatItems, activeIdx])

  function select(item) {
    pushRecent(item)
    setOpen(false)
    if (item.to) navigate(item.to)
  }

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-[12vh]">
      <button
        type="button"
        aria-label="팔레트 닫기"
        tabIndex={-1}
        onClick={() => setOpen(false)}
        className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="명령 팔레트"
        className="relative w-full max-w-2xl mx-4 bg-paper border-2 border-ink rounded-xl shadow-[0_24px_0_rgba(0,0,0,0.06),0_4px_0_#1a1a1a] overflow-hidden"
      >
        {/* 입력 */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-ink/10">
          <Icon name="search" size={14} strokeWidth={2.2} className="text-mute shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="주문번호 · 시리얼 · 이메일 · 카드명 · Cert# 검색"
            className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-mute font-medium"
            aria-label="명령 팔레트 검색"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="text-[10px] font-mono text-mute bg-bone-2 border border-ink/15 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>

        {/* 결과 */}
        <div className="max-h-[58vh] overflow-y-auto" role="listbox">
          {q.trim() === '' ? (
            <DefaultPalette
              activeIdx={activeIdx}
              flatItems={flatItems}
              onSelect={select}
            />
          ) : loading && flatItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-mute font-bold">검색 중…</div>
          ) : flatItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-mute font-bold">결과 없음</div>
          ) : (
            <SearchResults
              activeIdx={activeIdx}
              flatItems={flatItems}
              onSelect={select}
            />
          )}
        </div>

        {/* 푸터 단축키 힌트 */}
        <div className="flex items-center justify-between px-4 py-2 bg-bone-2/60 border-t border-ink/10 text-[10px] text-mute font-mono">
          <span>↑↓ 이동 · ⏎ 선택</span>
          <span>⌘K 토글</span>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ─── 도메인별 검색 호출 ────────────────────────────────
async function searchByScope(scope, q) {
  const url = {
    products: '/admin/products',
    packs:    '/admin/packs',
    orders:   '/admin/orders',
    users:    '/admin/users',
  }[scope]
  if (!url) return []
  try {
    const { data } = await api.get(url, { params: { q, limit: 5 } })
    return (data?.data || []).map((row) => normalizeRow(scope, row))
  } catch {
    return []
  }
}

function normalizeRow(scope, row) {
  const id = row.id || row._id
  switch (scope) {
    case 'products': return { id, scope, label: row.name || row.nameKo, sub: row.sku || row.cert_number, to: `/admin/products/${id}/edit`, icon: 'package' }
    case 'packs':    return { id, scope, label: row.name || row.nameKo, sub: row.sku || row.setShort,     to: `/admin/packs/${id}/edit`,    icon: 'star' }
    case 'orders':   return { id, scope, label: row.order_number || `주문 ${id}`, sub: row.user_name || row.user_email, to: `/admin/orders?id=${id}`, icon: 'cart' }
    case 'users':    return { id, scope, label: row.name || row.email, sub: row.email,                    to: `/admin/users?id=${id}`,     icon: 'shield' }
    default: return { id, scope, label: String(id), to: '/admin' }
  }
}

// ─── 키보드용 평탄화 ───────────────────────────────────
function flattenForKeyboard(q, results) {
  if (q.trim() === '') {
    // 기본 화면: 최근 + 즐겨찾기 + 빠른 액션
    return [
      ...getRecent().map((r) => ({ ...r, group: '최근' })),
      ...getFavorites().map((r) => ({ ...r, group: '즐겨찾기' })),
      ...QUICK_ACTIONS.map((a) => ({ ...a, group: '빠른 액션' })),
    ]
  }
  // 검색 결과: 카테고리 순서 (orders → products → packs → users)
  const groups = [
    ['주문',  results.orders],
    ['카드',  results.products],
    ['카드팩', results.packs],
    ['고객',  results.users],
  ]
  return groups.flatMap(([group, items]) => items.map((it) => ({ ...it, group })))
}

// ─── 기본 화면 (검색어 없을 때) ─────────────────────
function DefaultPalette({ activeIdx, flatItems, onSelect }) {
  return (
    <PaletteRows
      activeIdx={activeIdx}
      flatItems={flatItems}
      onSelect={onSelect}
      emptyHint="자주 쓰는 액션과 최근 항목을 보여드려요."
    />
  )
}

function SearchResults({ activeIdx, flatItems, onSelect }) {
  return <PaletteRows activeIdx={activeIdx} flatItems={flatItems} onSelect={onSelect} />
}

function PaletteRows({ activeIdx, flatItems, onSelect, emptyHint }) {
  if (!flatItems.length) {
    return <div className="px-4 py-8 text-center text-xs text-mute font-bold">{emptyHint || '결과 없음'}</div>
  }
  let lastGroup = null
  return (
    <div className="py-1.5">
      {flatItems.map((it, i) => {
        const showGroup = it.group !== lastGroup
        lastGroup = it.group
        const active = i === activeIdx
        return (
          <div key={`${it.scope || it.id}-${i}`}>
            {showGroup && (
              <div className="px-4 pt-3 pb-1 text-[9px] font-bold tracking-[0.18em] uppercase text-mute">
                {it.group}
              </div>
            )}
            <button
              type="button"
              role="option"
              aria-selected={active}
              onClick={() => onSelect(it)}
              onMouseEnter={() => {/* 호버 시 active 변경은 의도적으로 안 함 — 키보드 사용성 우선 */}}
              className={`w-full flex items-center gap-3 px-4 py-2 text-left transition-colors ${
                active ? 'bg-ink text-paper' : 'hover:bg-bone-2 text-ink'
              }`}
            >
              <Icon
                name={it.icon || 'arrow'}
                size={13}
                strokeWidth={2}
                className={active ? 'text-paper/80' : 'text-mute'}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">{it.label}</div>
                {it.sub && (
                  <div className={`text-[10px] font-mono mt-0.5 truncate ${active ? 'text-paper/60' : 'text-mute'}`}>
                    {it.sub}
                  </div>
                )}
              </div>
              {it.hint && (
                <kbd className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                  active ? 'border-paper/30 text-paper/80' : 'border-ink/15 text-mute bg-bone-2'
                }`}>
                  {it.hint}
                </kbd>
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── 최근 / 즐겨찾기 (localStorage) ────────────────────
function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]') } catch { return [] }
}

function pushRecent(item) {
  try {
    const cur = getRecent()
    const next = [item, ...cur.filter((r) => r.id !== item.id || r.scope !== item.scope)].slice(0, 8)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch { /* noop */ }
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]') } catch { return [] }
}
