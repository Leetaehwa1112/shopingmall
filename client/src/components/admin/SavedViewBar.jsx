/**
 * SavedViewBar — 리스트 위에 떠 있는 saved view 가로 스트립.
 *
 * 운영 효율 의도
 *   상품/주문/고객 모든 리스트 페이지에서 동일한 패턴.
 *   시스템 기본 뷰(재고 0, SLA 임박 등) + 사용자 저장 뷰를 한 줄로.
 *   클릭 1번에 자주 보는 조건으로 점프.
 *
 *   리스트 페이지의 기존 setState 흐름과 호환되도록 callback 기반 설계.
 *   useSavedView hook의 URL 패턴과 분리해서 점진적 마이그레이션 가능.
 *
 * Props
 *   views: [{ id, label, tone?, count?, apply: () => void }]
 *   activeId: 현재 활성 view id (없으면 null)
 *   onSaveCurrentView?: () => void — "현재 조건 저장" 클릭 핸들러
 *   onClearView?: () => void — "필터 초기화" 클릭 핸들러
 */
import Icon from '@/components/common/Icon'

const TONE = {
  red:     'bg-rose-50 text-rose-700 border-rose-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  violet:  'bg-violet-50 text-violet-700 border-violet-200',
  ink:     'bg-bone-2 text-ink border-ink/15',
}

export default function SavedViewBar({ views = [], activeId = null, onSaveCurrentView, onClearView }) {
  if (!views.length) return null

  return (
    <div
      role="toolbar"
      aria-label="저장된 뷰"
      className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide"
    >
      <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-mute shrink-0 pr-1">
        뷰
      </span>

      {views.map((v) => {
        const active = v.id === activeId
        const tone = TONE[v.tone] || TONE.ink
        return (
          <button
            key={v.id}
            type="button"
            onClick={v.apply}
            aria-pressed={active}
            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold whitespace-nowrap transition-all ${
              active
                ? 'bg-ink text-paper border-ink shadow-[0_2px_0_#1a1a1a] -translate-y-0.5'
                : `${tone} hover:-translate-y-0.5 hover:shadow-[0_2px_0_#1a1a1a]`
            }`}
          >
            <span>{v.label}</span>
            {typeof v.count === 'number' && (
              <span className={`text-[9px] font-mono tabular-nums px-1 py-0 rounded ${
                active ? 'bg-paper/20 text-paper' : 'bg-paper/60 text-mute'
              }`}>
                {v.count > 999 ? '999+' : v.count}
              </span>
            )}
          </button>
        )
      })}

      {/* 우측: 저장 / 초기화 */}
      <div className="ml-auto flex items-center gap-1 shrink-0">
        {onSaveCurrentView && (
          <button
            type="button"
            onClick={onSaveCurrentView}
            title="현재 조건을 새 뷰로 저장"
            className="inline-flex items-center gap-1 text-[10px] font-bold text-mute hover:text-ink px-2 py-1 rounded-md hover:bg-bone-2 transition-colors"
          >
            <Icon name="plus" size={10} strokeWidth={2.4} />
            현재 저장
          </button>
        )}
        {activeId && onClearView && (
          <button
            type="button"
            onClick={onClearView}
            title="필터 초기화"
            className="inline-flex items-center gap-1 text-[10px] font-bold text-mute hover:text-ink px-2 py-1 rounded-md hover:bg-bone-2 transition-colors"
          >
            <Icon name="close" size={10} strokeWidth={2.4} />
            해제
          </button>
        )}
      </div>
    </div>
  )
}
