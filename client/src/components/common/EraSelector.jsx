import { Fragment, useMemo } from 'react'
import SetSymbol from './SetSymbol'

/**
 * EraSelector — 시대별 그룹화된 카테고리 셀렉터.
 *
 *   레이아웃 철학 (UX 검증 결과):
 *   - 모바일/데스크탑 통합: 단일 가로 스크롤 (데스크탑 wrap 폐기 — 세로 공간 절약).
 *     상품 카탈로그에서 시대 칩이 페이지 절반을 먹는 건 과함.
 *   - 그룹 사이 구분: TCG 카드 바인더 페이지 모티프(3구멍).
 *     단순 hairline보다 개성 있으면서 동일한 정보 전달.
 *
 *   ARIA: Radix ToggleGroup 패턴 (role="group" + 각 아이템 aria-pressed).
 *
 *   모바일/iOS Safari 대응:
 *     scroll-snap-type: x mandatory + snap-start
 *     -webkit-overflow-scrolling: touch (구형 iOS 모멘텀)
 *     overscroll-behavior-x: contain (부모 스크롤 침범 차단)
 *
 *   터치 타깃: 80×108 = 충분 (Apple HIG 44pt × 2.4↑).
 *
 * Props:
 *   items: [{ id, label, count, tone, years }]
 *   groups: [{ id, title, period, eras: [id, ...] }]  — 미지정 시 flat 모드
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

  // 그룹 모드 — 단일 가로 스트립
  //   [전체 컬럼] | [그룹1] | [그룹2] | ...
  //   각 그룹은 헤더(시대명+기간) + 칩들의 작은 세로 묶음.
  //   사이엔 바인더 3구멍 구분자.
  const allItem = itemsById.all

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scrollbar-hide [-webkit-overflow-scrolling:touch]"
    >
      <div className="inline-flex items-stretch gap-3 sm:gap-3.5 pb-1 min-w-full">
        {allItem && (
          <GroupColumn
            title="전체"
            period="모든 카드"
            chips={[allItem]}
            value={value}
            onChange={onChange}
          />
        )}
        {groups.map((g, gIdx) => {
          const chips = g.eras
            .map((id) => itemsById[id])
            .filter(Boolean)
          if (chips.length === 0) return null
          return (
            <Fragment key={g.id}>
              {(gIdx > 0 || allItem) && <BinderDivider />}
              <GroupColumn
                title={g.title}
                period={g.period}
                chips={chips}
                value={value}
                onChange={onChange}
              />
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

// ─── 그룹 컬럼: 헤더 + 가로 칩 묶음 ─────────────────────────
function GroupColumn({ title, period, chips, value, onChange }) {
  return (
    <div className="snap-start shrink-0 flex flex-col gap-1.5">
      <GroupHeader title={title} period={period} />
      <div className="flex gap-2">
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

// ─── 그룹 헤더 — 시대명 + 점선 + 기간 ──────────────────────
function GroupHeader({ title, period }) {
  return (
    <div className="inline-flex items-center gap-1.5 pl-1">
      <span
        className="font-mono text-[10px] font-extrabold uppercase text-ink/85"
        style={{ letterSpacing: '0.2em' }}
      >
        {title}
      </span>
      {period && (
        <>
          <span aria-hidden className="h-px w-3 bg-ink/25" />
          <span
            className="font-mono text-[9.5px] font-bold tabular-nums text-mute"
            style={{ letterSpacing: '0.04em' }}
          >
            {period}
          </span>
        </>
      )}
    </div>
  )
}

// ─── TCG 바인더 3구멍 구분자 ───────────────────────────────
// 평범한 vertical hairline 대신 TCG 카드 바인더 페이지 모티프.
// 카드 좋아하는 사람들의 정서 자극 + 개성 + 정보 손실 없음.
function BinderDivider() {
  return (
    <div
      aria-hidden
      className="shrink-0 self-stretch flex flex-col items-center justify-center gap-2 px-0.5 pt-5"
    >
      <span className="block w-1.5 h-1.5 rounded-full bg-ink/20 ring-2 ring-bone/40" />
      <span className="block w-1.5 h-1.5 rounded-full bg-ink/20 ring-2 ring-bone/40" />
      <span className="block w-1.5 h-1.5 rounded-full bg-ink/20 ring-2 ring-bone/40" />
    </div>
  )
}

// ─── flat 모바일 스크롤 컨테이너 (groups=null 시) ───────────
function ScrollRail({ children, ariaLabel }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto overscroll-x-contain snap-x snap-mandatory scrollbar-hide [-webkit-overflow-scrolling:touch]"
    >
      <div className="flex gap-2.5 pb-1">
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

// ─── 시대 칩 — TCG 카드 메타포, 컴팩트 ──────────────────────
//   - inactive: 페이퍼 톤 + 얇은 외곽선, hover 시 카드가 살짝 들리며 -0.6deg 기울기
//   - active:   시대 컬러로 채움 + LED 점 펄스 + 도장 inset shadow
//   - 셋 심볼은 IP 안전한 SetSymbol(추상 도형)
//   - 80×108 — Apple HIG 44pt × 2.4 (충분한 터치 타깃)
function EraChip({ item, active, onClick }) {
  const tone = active ? TONE_ACTIVE[item.tone] || TONE_ACTIVE.ink : null
  const badgeCls = active
    ? 'bg-paper/22 text-paper'
    : TONE_BG[item.tone] || TONE_BG.ink

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={`${item.label}${typeof item.count === 'number' ? `, ${item.count}건` : ''}`}
      className={`group relative w-[80px] flex flex-col items-center gap-1.5 px-1.5 pt-2.5 pb-2 rounded-2xl border-2 transition-all duration-200 will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 ${
        active
          ? `${tone.bg} ${tone.text} border-ink shadow-[0_3px_0_#1a1a1a,inset_0_-2px_0_rgba(0,0,0,0.18)] -translate-y-0.5`
          : 'bg-paper border-ink/12 text-ink hover:border-ink hover:-translate-y-1 hover:shadow-[0_4px_0_#1a1a1a] hover:rotate-[-0.6deg]'
      }`}
      style={{ minHeight: 108 }}
    >
      {/* 활성 LED 점 — 인증/현재 송출 중 시그널 */}
      {active && (
        <span
          className={`absolute top-1.5 right-1.5 led led-${tone.led} led-pulse`}
          style={{ width: 6, height: 6 }}
          aria-hidden="true"
        />
      )}

      {/* 셋 심볼 배지 — IP 안전 추상 도형 */}
      <span
        className={`relative inline-flex items-center justify-center w-9 h-9 rounded-full border-2 border-ink ${badgeCls}`}
        aria-hidden="true"
        style={
          active
            ? { boxShadow: 'inset 0 -2px 0 rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.25)' }
            : undefined
        }
      >
        <SetSymbol era={item.id} size={20} />
      </span>

      {/* 라벨 */}
      <span
        className="text-[11.5px] font-extrabold text-center [word-break:keep-all] whitespace-nowrap"
        style={{ letterSpacing: '-0.01em', lineHeight: 1.15 }}
      >
        {item.label}
      </span>

      {/* 연도 범위 (선택적) */}
      {item.years && (
        <span
          className={`font-mono text-[9px] font-bold tabular-nums leading-none ${
            active ? 'text-paper/75' : 'text-mute'
          }`}
          style={{ letterSpacing: '0.04em' }}
        >
          {item.years}
        </span>
      )}

      {/* 카운트 */}
      {typeof item.count === 'number' && (
        <span
          className={`text-[9.5px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded leading-none ${
            active ? 'bg-paper/20 text-paper' : 'bg-bone-2 text-mute'
          }`}
        >
          {item.count}
        </span>
      )}
    </button>
  )
}
