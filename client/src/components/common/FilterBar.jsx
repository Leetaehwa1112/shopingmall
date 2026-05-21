import Icon from './Icon'

/**
 * FilterBar — 활성 필터 칩 + 정렬 셀렉트 통합.
 *
 *   왼쪽: 액티브 필터 칩 (예: "WotC ·  ×") — 클릭 시 해당 필터 해제.
 *         "전체" 또는 빈 필터일 땐 안내 텍스트만 표시.
 *   오른쪽: 정렬 드롭다운 (네이티브 select — iOS/Android 모두 안전한 네이티브 UI).
 *
 *   sticky 옵션: 스크롤 시 상단에 고정 (반투명 + backdrop-blur).
 *
 *   ARIA:
 *     - 칩 ×: aria-label="[라벨] 필터 해제"
 *     - select: aria-label="정렬 기준"
 *
 * Props:
 *   activeLabel: 현재 활성 필터의 라벨 ("전체" 또는 "WotC" 등)
 *   isAllOrEmpty: 전체/빈 상태 여부 — true면 ×버튼 숨김
 *   onClearFilter: × 클릭 핸들러
 *   resultCount: 결과 카운트 ("N건 검색됨")
 *   sortValue, onSortChange, sortOptions: 정렬 props
 *   sticky: 상단 고정 여부
 */
export default function FilterBar({
  activeLabel,
  isAllOrEmpty = false,
  onClearFilter,
  resultCount,
  sortValue,
  onSortChange,
  sortOptions = [],
  sticky = false,
}) {
  return (
    <div
      className={`${
        sticky
          ? 'sticky top-[60px] lg:top-[76px] z-30 bg-paper/92 backdrop-blur-sm border-y-2 border-ink/8 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2.5'
          : ''
      } flex items-center justify-between gap-3 flex-wrap`}
    >
      {/* ─ 좌: 활성 필터 + 결과 카운트 ───────────────────── */}
      <div className="inline-flex items-center gap-2 min-w-0 flex-wrap">
        {isAllOrEmpty ? (
          <span className="text-[12px] font-bold text-mute inline-flex items-center gap-1.5">
            <Icon name="search" size={12} strokeWidth={2.4} />
            전체 카테고리
          </span>
        ) : (
          <span
            className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-ink text-electric border-2 border-ink shadow-[0_2px_0_rgba(0,0,0,0.35)]"
            aria-label={`활성 필터: ${activeLabel}`}
          >
            <span className="font-mono text-[11px] font-extrabold uppercase" style={{ letterSpacing: '0.14em' }}>
              {activeLabel}
            </span>
            <button
              type="button"
              onClick={onClearFilter}
              aria-label={`${activeLabel} 필터 해제`}
              className="ml-0.5 w-5 h-5 rounded-full bg-electric/20 hover:bg-electric/40 text-electric inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-1 focus-visible:ring-offset-ink"
            >
              <Icon name="close" size={10} strokeWidth={3} />
            </button>
          </span>
        )}
        {typeof resultCount === 'number' && (
          <span className="font-mono text-[11px] font-bold text-mute tabular-nums">
            · {resultCount.toLocaleString()}건
          </span>
        )}
      </div>

      {/* ─ 우: 정렬 셀렉트 (네이티브) ──────────────────────── */}
      {sortOptions.length > 0 && (
        <label className="relative inline-flex items-center">
          <span className="sr-only">정렬 기준</span>
          <Icon
            name="arrow"
            size={12}
            strokeWidth={2.6}
            className="absolute right-3 pointer-events-none text-ink rotate-90"
            aria-hidden="true"
          />
          <select
            value={sortValue}
            onChange={(e) => onSortChange?.(e.target.value)}
            aria-label="정렬 기준"
            className="appearance-none bg-paper border-2 border-ink rounded-full text-[13px] font-bold text-ink shadow-[0_2px_0_#1a1a1a] cursor-pointer hover:bg-electric/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            style={{ height: 40, padding: '0 32px 0 16px' }}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  )
}
