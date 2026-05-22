/**
 * useSavedView — 리스트 화면의 필터+정렬+컬럼 상태를 이름 붙여 저장.
 *
 * 운영 효율 의도
 *   - "VIP 휴면", "재고 0 긴급" 같은 반복 사용 필터 → 1클릭 점프
 *   - URL 인코딩으로 슬랙 공유 가능 (동료가 클릭하면 동일 뷰)
 *   - 페이지(scope)별로 독립 저장소 (orders / products / users)
 *
 * 데이터 모델
 *   { id, name, filters: {...}, sort: 'created_at:desc', columns: ['name','price',...], pinned: bool }
 *
 * URL 인코딩
 *   ?view=재고0  → localStorage에서 이름 lookup
 *   ?filters=eyJzdGF0dXMiOiJvb3MifQ==&sort=stock:asc → 직접 인코딩 (ephemeral)
 *
 * 충돌 정책
 *   URL 파라미터가 saved view보다 우선 (사용자가 명시적으로 수정한 상태)
 *   "현재 뷰 저장" 클릭 시 URL 상태를 새 view로 영구화
 */
import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

const KEY = (scope) => `pokevault:admin:savedviews:${scope}`

// ─── 기본 제공 시스템 뷰 (각 scope의 default 옵션) ───
// 페이지 컴포넌트에서 import 후 useSavedView({ defaults: ORDER_DEFAULTS })로 주입
export const SYSTEM_VIEW_FLAG = '__system__'

export function useSavedView({ scope, defaults = [], initialFilters = {} }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [savedViews, setSavedViews] = useState(() => loadViews(scope))

  // URL → 현재 적용된 필터/정렬 추출
  const currentFilters = useMemo(() => {
    const params = Object.fromEntries(searchParams.entries())
    const { view, ...rest } = params
    // 빈 값 정리
    Object.keys(rest).forEach((k) => { if (rest[k] === '') delete rest[k] })
    return rest
  }, [searchParams])

  // 활성 뷰 (URL의 view=name과 매칭되는 saved view)
  const activeView = useMemo(() => {
    const name = searchParams.get('view')
    if (!name) return null
    return (
      defaults.find((v) => v.id === name) ||
      savedViews.find((v) => v.id === name) ||
      null
    )
  }, [searchParams, defaults, savedViews])

  // 효과: view 이름만 URL에 있고 다른 파라미터 없으면 → defaults에서 필터 채워줌
  useEffect(() => {
    const name = searchParams.get('view')
    if (!name) return
    const def = defaults.find((v) => v.id === name)
    if (!def) return
    // 이미 다른 필터가 채워져 있으면 사용자가 customize 중 — 건드리지 않음
    const otherParams = [...searchParams.keys()].filter((k) => k !== 'view')
    if (otherParams.length > 0) return
    const next = new URLSearchParams()
    next.set('view', name)
    Object.entries(def.filters || {}).forEach(([k, v]) => {
      if (v !== '' && v != null) next.set(k, String(v))
    })
    if (def.sort) next.set('sort', def.sort)
    setSearchParams(next, { replace: true })
  }, [searchParams, defaults, setSearchParams])

  // ─── 액션 ─────────────────────────────────────────
  const applyView = useCallback((view) => {
    const next = new URLSearchParams()
    if (view?.id) next.set('view', view.id)
    Object.entries(view?.filters || {}).forEach(([k, v]) => {
      if (v !== '' && v != null) next.set(k, String(v))
    })
    if (view?.sort) next.set('sort', view.sort)
    setSearchParams(next)
  }, [setSearchParams])

  const setFilter = useCallback((key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value === '' || value == null) next.delete(key)
    else next.set(key, String(value))
    // 명시적 변경은 활성 view를 끊는다 (사용자가 커스터마이즈)
    if (searchParams.get('view') && key !== 'view') {
      // saved view에 정의되지 않은 키 변경이면 view 이름은 유지 (자식 필터)
      // → 사용자가 명확히 떠나려면 clearView 사용
    }
    setSearchParams(next)
  }, [searchParams, setSearchParams])

  const clearFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(initialFilters))
  }, [setSearchParams, initialFilters])

  const saveCurrentAs = useCallback((name, opts = {}) => {
    const id = name.toLowerCase().replace(/\s+/g, '-')
    const view = {
      id,
      name,
      filters: { ...currentFilters },
      sort: currentFilters.sort,
      pinned: !!opts.pinned,
      createdAt: Date.now(),
    }
    setSavedViews((prev) => {
      const next = [...prev.filter((v) => v.id !== id), view]
      saveViews(scope, next)
      return next
    })
    applyView(view)
    return view
  }, [currentFilters, scope, applyView])

  const deleteView = useCallback((id) => {
    setSavedViews((prev) => {
      const next = prev.filter((v) => v.id !== id)
      saveViews(scope, next)
      return next
    })
    if (searchParams.get('view') === id) {
      const next = new URLSearchParams(searchParams)
      next.delete('view')
      setSearchParams(next)
    }
  }, [scope, searchParams, setSearchParams])

  const renameView = useCallback((id, newName) => {
    setSavedViews((prev) => {
      const next = prev.map((v) => v.id === id ? { ...v, name: newName } : v)
      saveViews(scope, next)
      return next
    })
  }, [scope])

  return {
    /** 시스템 + 사용자 저장 뷰 통합 리스트 */
    allViews: useMemo(() => [
      ...defaults.map((v) => ({ ...v, [SYSTEM_VIEW_FLAG]: true })),
      ...savedViews,
    ], [defaults, savedViews]),
    activeView,
    currentFilters,
    applyView,
    setFilter,
    clearFilters,
    saveCurrentAs,
    deleteView,
    renameView,
  }
}

// ─── persistence ──────────────────────────────────────
function loadViews(scope) {
  try { return JSON.parse(localStorage.getItem(KEY(scope)) || '[]') } catch { return [] }
}

function saveViews(scope, views) {
  try { localStorage.setItem(KEY(scope), JSON.stringify(views)) } catch { /* noop */ }
}
