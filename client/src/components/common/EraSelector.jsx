import { useMemo } from 'react'
import SetSymbol from './SetSymbol'

/**
 * EraSelector — 시대별 그룹화된 카테고리 셀렉터.
 *
 *   - ARIA: Radix ToggleGroup 패턴 (role="group" + 각 아이템 aria-pressed).
 *           시대 선택은 "토글"이지 탭 패널 전환이 아님 → tabs 부적절.
 *   - 모바일: 가로 스크롤 + scroll-snap-type: x mandatory + snap-start.
 *            -webkit-overflow-scrolling: touch 명시 (구형 iOS Safari 모멘텀).
 *            overscroll-behavior-x: contain (부모 스크롤 침범 방지).
 *   - 데스크탑: 시대 그룹(Vintage / Modern / Current / Special)을 시각적으로 분리.
 *   - 칩 크기: 최소 폭 92px, 높이 132px+ (44px 터치 타깃 × 3 행).
 *   - 활성: 시대 컬러로 채운 후 검정 외곽선 강조 + LED 점.
 *
 * Props:
 *   items: [{ id, label, count, era, period, tone }]  — flat 리스트
 *   groups: [{ id, title, period, eras: [id, ...] }]  — 그룹 정의 (선택)
 *   value: 현재 활성 id
 *   onChange: (id) => void
 *   ariaLabel: 그룹 ARIA 라벨
 */

const TONE_BG = {
  ink:      'bg-ink/10 text-ink',
  fire:     'bg-fire/15 text-fire',
  electric: 'bg-electric/30 text-ink',
  water:    'bg-water/15 text-water',
  psychic:  'bg-psychic/15 text-psychic',
  grass:    'bg-grass/15 text-grass',
  gold:     'bg-electric/25 text-ink',
}

const TONE_ACTIVE = {
  ink:      { bg: 'bg-ink',      text: 'text-electric', led: 'yellow' },
  fire:     { bg: 'bg-fire',     text: 'text-paper',    led: 'red'    },
  electric: { bg: 'bg-electric', text: 'text-ink',      led: 'yellow' },
  water:    { bg: 'bg-water',    text: 'text-paper',    led: 'blue'   },
  psychic:  { bg: 'bg-psychic',  text: 'text-paper',    led: 'red'    },
  grass:    { bg: 'bg-grass',    text: 'text-paper',    led: 'green'  },
  gold:     { bg: 'bg-electric', text: 'text-ink',      led: 'yellow' },
}

export default function EraSelector({
  items = [],
  groups = null,
  value,
  onChange,
  ariaLabel = '카테고리 선택',
}) {
  // React Hooks 규칙: 조건부 return 전에 모든 hook 호출 완료
  const itemsById = useMemo(
    () => Object.fromEntries(items.map((it) => [it.id, it])),
    [items]
  )

  // 그룹 미지정 시 flat 모드 — items 그대로 가로 스크롤
  if (!groups) {
    return (
      <ScrollRail ariaLabel={ariaLabel}>
        {items.map((it) => (
          <EraChip
            key={it.id}
            item={it}
            active={value === it.id}
            onClick={() => onChange?.(it.id)}
          />
        ))}
      </ScrollRail>
    )
  }

  // "전체" 칩 — 그룹 외부 좌측에 별도 배치 (CTA 강조)
  const allItem = itemsById.all

  return (
    <div className="space-y-5 sm:space-y-6" role="group" aria-label={ariaLabel}>
      {/* 데스크탑: 시대 그룹별 wrap / 모바일: 통합 가로 스크롤 */}

      {/* ── 모바일: 그룹 헤더 + 칩 통합 가로 스크롤 ─────────── */}
      <div className="sm:hidden -mx-4 px-4 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scrollbar-hide [-webkit-overflow-scrolling:touch]">
        <div className="flex gap-3 pb-2 w-max">
          {allItem && (
            <div className="snap-start shrink-0">
              <EraChip
                item={allItem}
                active={value === 'all'}
                onClick={() => onChange?.('all')}
                featured
              />
            </div>
          )}
          {groups.map((g) => (
            <div key={g.id} className="snap-start shrink-0 flex flex-col gap-2">
              <GroupHeader title={g.title} period={g.period} compact />
              <div className="flex gap-2.5">
                {g.eras.map((eraId) => {
                  const it = itemsById[eraId]
                  if (!it) return null
                  return (
                    <EraChip
                      key={it.id}
                      item={it}
                      active={value === it.id}
                      onClick={() => onChange?.(it.id)}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 데스크탑: 그룹별 풍성한 레이아웃 ───────────────── */}
      <div className="hidden sm:block space-y-5">
        {/* 첫 줄: 전체 (있으면) + Vintage / Modern */}
        <div className="flex items-start gap-6 flex-wrap">
          {allItem && (
            <div className="shrink-0">
              <GroupHeader title="전체" period="모든 시대" />
              <div className="mt-2">
                <EraChip
                  item={allItem}
                  active={value === 'all'}
                  onClick={() => onChange?.('all')}
                  featured
                />
              </div>
            </div>
          )}
          {groups.slice(0, 2).map((g) => (
            <GroupSection
              key={g.id}
              group={g}
              itemsById={itemsById}
              value={value}
              onChange={onChange}
            />
          ))}
        </div>
        {/* 둘째 줄: Current / Special */}
        {groups.length > 2 && (
          <div className="flex items-start gap-6 flex-wrap">
            {groups.slice(2).map((g) => (
              <GroupSection
                key={g.id}
                group={g}
                itemsById={itemsById}
                value={value}
                onChange={onChange}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── 그룹 헤더 (eyebrow + 기간) ─────────────────────────────
function GroupHeader({ title, period, compact = false }) {
  return (
    <div className={`inline-flex items-center gap-2 ${compact ? 'pl-1' : ''}`}>
      <span
        className="font-mono text-[10px] font-extrabold uppercase text-ink/90"
        style={{ letterSpacing: '0.22em' }}
      >
        {title}
      </span>
      {period && (
        <>
          <span aria-hidden className="h-px w-4 bg-ink/30" />
          <span className="font-mono text-[10px] font-bold tabular-nums text-mute">
            {period}
          </span>
        </>
      )}
    </div>
  )
}

// ─── 데스크탑 그룹 섹션 ─────────────────────────────────────
function GroupSection({ group, itemsById, value, onChange }) {
  const chips = group.eras
    .map((eraId) => itemsById[eraId])
    .filter(Boolean)
  if (chips.length === 0) return null
  return (
    <div className="shrink-0">
      <GroupHeader title={group.title} period={group.period} />
      <div className="mt-2 flex gap-3 flex-wrap">
        {chips.map((it) => (
          <EraChip
            key={it.id}
            item={it}
            active={value === it.id}
            onClick={() => onChange?.(it.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ─── flat 모바일 스크롤 컨테이너 ────────────────────────────
function ScrollRail({ children, ariaLabel }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto sm:overflow-visible overscroll-x-contain snap-x snap-mandatory scrollbar-hide [-webkit-overflow-scrolling:touch]"
    >
      <div className="flex sm:flex-wrap gap-3 sm:gap-3.5 pb-2 sm:pb-0">
        {Array.isArray(children)
          ? children.map((c, i) => (
              <div key={i} className="snap-start shrink-0">
                {c}
              </div>
            ))
          : children}
      </div>
    </div>
  )
}

// ─── 시대 칩 — TCG 카드 시각 메타포 ─────────────────────────
//   - inactive: 따뜻한 종이 톤 + 얇은 외곽선, hover 시 카드가 살짝 들림
//   - active:   시대 컬러로 채움 + LED 점 + 도장 찍힌 듯한 box-shadow
//   - 셋 심볼은 원형 배지 안에 — IP 안전한 추상 도형
//   - 카운트: 우상단 노치 ribbon (TCG 카드 박힌 카운트 느낌)
function EraChip({ item, active, onClick, featured = false }) {
  const tone = active ? TONE_ACTIVE[item.tone] || TONE_ACTIVE.ink : null
  const badgeCls = active ? 'bg-paper/22 text-paper' : TONE_BG[item.tone] || TONE_BG.ink

  // 크기: featured(전체)는 더 크게, 일반은 표준
  const wCls = featured ? 'w-[104px] sm:w-[108px]' : 'w-[92px] sm:w-[96px]'

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${item.label}${typeof item.count === 'number' ? `, ${item.count}건` : ''}`}
      className={`group relative ${wCls} flex flex-col items-center gap-2 px-2 pt-3 pb-2.5 rounded-2xl border-2 transition-all duration-200 will-change-transform ${
        active
          ? `${tone.bg} ${tone.text} border-ink shadow-[0_4px_0_#1a1a1a,inset_0_-2px_0_rgba(0,0,0,0.18)] -translate-y-0.5`
          : 'bg-paper border-ink/12 text-ink hover:border-ink hover:-translate-y-1 hover:shadow-[0_5px_0_#1a1a1a] hover:rotate-[-0.6deg] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2'
      }`}
      style={{ minHeight: 132 }}
    >
      {/* 활성 시 우상단 LED 점 — 도장 인증 느낌 */}
      {active && (
        <span
          className={`absolute top-2 right-2 led led-${tone.led} led-pulse`}
          style={{ width: 7, height: 7 }}
          aria-hidden="true"
        />
      )}

      {/* 셋 심볼 배지 — IP 안전한 추상 도형. 활성시 안쪽 그림자로 도장 효과 */}
      <span
        className={`relative inline-flex items-center justify-center w-11 h-11 rounded-full border-2 border-ink ${badgeCls}`}
        aria-hidden="true"
        style={
          active
            ? { boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.25)' }
            : undefined
        }
      >
        <SetSymbol era={item.id} size={featured ? 24 : 22} />
      </span>

      {/* 라벨 */}
      <span
        className="text-[12px] font-extrabold text-center [word-break:keep-all] whitespace-nowrap"
        style={{ letterSpacing: '-0.01em', lineHeight: 1.15 }}
      >
        {item.label}
      </span>

      {/* 연도 범위 (선택적) — featured는 생략 */}
      {!featured && item.years && (
        <span
          className={`font-mono text-[9.5px] font-bold tabular-nums ${
            active ? 'text-paper/75' : 'text-mute'
          }`}
          style={{ letterSpacing: '0.04em' }}
        >
          {item.years}
        </span>
      )}

      {/* 카운트 — 검색 결과 수. 활성 시 페이퍼 컬러로 invert */}
      {typeof item.count === 'number' && (
        <span
          className={`text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded ${
            active ? 'bg-paper/20 text-paper' : 'bg-bone-2 text-mute'
          }`}
        >
          {item.count}
        </span>
      )}
    </button>
  )
}
