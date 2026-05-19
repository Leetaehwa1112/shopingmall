// ──────────────────────────────────────────────────────────────
// Pokédex DEVICE — 재사용 비주얼 프리미티브
// 컨셉: 90s 빨간 도감 디바이스 + 박물관 카탈로그
// ──────────────────────────────────────────────────────────────
import { forwardRef } from 'react'

// ─── DexLed ─────────────────────────────────────────────────
// 도감 본체 LED. 사이즈/색/펄스 옵션
const LED_COLOR = {
  blue:     'bg-sky shadow-[0_0_8px_rgba(56,189,248,0.9)]',
  red:      'bg-dex shadow-[0_0_8px_rgba(220,38,38,0.85)]',
  yellow:   'bg-electric shadow-[0_0_8px_rgba(250,204,21,0.85)]',
  green:    'bg-grass shadow-[0_0_8px_rgba(132,204,22,0.85)]',
  psychic:  'bg-psychic shadow-[0_0_8px_rgba(168,85,247,0.85)]',
}
export function DexLed({ color = 'blue', size = 10, pulse = false, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block rounded-full ring-2 ring-ink/40 ${LED_COLOR[color]} ${pulse ? 'animate-pulse' : ''} ${className}`}
      style={{ width: size, height: size }}
    />
  )
}

// ─── LcdScreen ──────────────────────────────────────────────
// 도감 액정 패널. 검은 배경 + 녹색 발광 텍스트
export function LcdScreen({ children, className = '', as: Tag = 'div' }) {
  return (
    <Tag
      className={
        `relative rounded-xl bg-ink/95 border-2 border-ink ` +
        `shadow-[inset_0_2px_8px_rgba(0,0,0,0.6),inset_0_-1px_0_rgba(132,204,22,0.15)] ` +
        `overflow-hidden ${className}`
      }
    >
      {/* scanlines */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, rgba(132,204,22,1) 0 1px, transparent 1px 3px)',
        }}
      />
      {/* glare */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-3 top-1 h-1/3 rounded-full bg-grass/5 blur-md"
      />
      <div className="relative">{children}</div>
    </Tag>
  )
}

// ─── LcdCounter ─────────────────────────────────────────────
// LCD 7-segment 느낌 카운터
export function LcdCounter({ value, label, size = 'md' }) {
  const sz = size === 'lg'
    ? 'text-[56px] sm:text-[64px] leading-none'
    : 'text-[28px] leading-none'
  return (
    <div className="flex flex-col items-start gap-1.5">
      {label && (
        <span className="text-[9px] font-bold tracking-[0.22em] uppercase text-grass/70">
          {label}
        </span>
      )}
      <span
        className={`font-mono font-bold tabular-nums text-grass ${sz}`}
        style={{ textShadow: '0 0 12px rgba(132,204,22,0.55)' }}
      >
        {value}
      </span>
    </div>
  )
}

// ─── DexButton ──────────────────────────────────────────────
// 디바이스 D-pad 느낌 둥근 버튼. variant: primary / ghost / device
const BTN_VARIANT = {
  primary:
    'bg-electric text-ink border-ink ' +
    'shadow-[0_4px_0_#1a1a1a] hover:shadow-[0_2px_0_#1a1a1a] hover:translate-y-[2px] ' +
    'active:shadow-[0_0_0_#1a1a1a] active:translate-y-[4px]',
  ghost:
    'bg-paper text-ink border-ink ' +
    'shadow-[0_3px_0_#1a1a1a] hover:shadow-[0_1px_0_#1a1a1a] hover:translate-y-[2px]',
  device:
    'bg-dex text-white border-ink ' +
    'shadow-[0_4px_0_#1a1a1a] hover:shadow-[0_2px_0_#1a1a1a] hover:translate-y-[2px] ' +
    'active:shadow-[0_0_0_#1a1a1a] active:translate-y-[4px]',
}
export const DexButton = forwardRef(function DexButton(
  { variant = 'primary', size = 'md', className = '', children, ...props },
  ref
) {
  const sz = size === 'sm' ? 'h-9 px-4 text-xs' : size === 'lg' ? 'h-12 px-6 text-sm' : 'h-10 px-5 text-[13px]'
  return (
    <button
      ref={ref}
      {...props}
      className={
        `inline-flex items-center gap-2 rounded-full border-2 font-bold tracking-wide ` +
        `transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 ` +
        `${BTN_VARIANT[variant]} ${sz} ${className}`
      }
    >
      {children}
    </button>
  )
})

// ─── ControlChip ────────────────────────────────────────────
// 필터 키패드용 칩
export function ControlChip({ active, children, ...props }) {
  return (
    <button
      {...props}
      className={
        `shrink-0 h-8 px-3 rounded-md border-2 text-xs font-bold tracking-wide uppercase ` +
        `transition-all duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-electric ` +
        (active
          ? 'bg-ink border-ink text-grass shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]'
          : 'bg-paper border-ink/20 text-ink hover:border-ink/50 hover:bg-bone-2 shadow-[0_2px_0_rgba(0,0,0,0.15)]')
      }
    >
      {children}
    </button>
  )
}

// ─── SpecimenFrame ──────────────────────────────────────────
// 박물관 표본 카드 프레임
export function SpecimenFrame({ children, owned, hasSale, onClick, onKeyDown, ariaLabel }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={
        `group relative flex flex-col cursor-pointer select-none overflow-hidden ` +
        `rounded-2xl bg-paper border-2 border-ink ` +
        `shadow-[0_4px_0_#1a1a1a] hover:shadow-[0_6px_0_#1a1a1a] hover:-translate-y-1 ` +
        `transition-all duration-150 ` +
        `focus:outline-none focus-visible:ring-2 focus-visible:ring-electric focus-visible:ring-offset-2 ` +
        (owned ? 'ring-2 ring-psychic ring-offset-2 ' : '') +
        (!hasSale ? 'saturate-[0.85] ' : '')
      }
    >
      {children}
    </div>
  )
}

// ─── CatalogueLabel ─────────────────────────────────────────
// 표본 라벨 (#001 · BULBASAUR)
export function CatalogueLabel({ id, name, className = '' }) {
  const num = String(id).padStart(3, '0')
  return (
    <div className={`inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-[0.18em] uppercase ${className}`}>
      <span className="text-mute">№</span>
      <span className="text-ink">{num}</span>
      <span className="text-mute/40">·</span>
      <span className="text-ink/80">{name}</span>
    </div>
  )
}

// ─── TypeChip ───────────────────────────────────────────────
import { TYPE_TOKEN, TYPE_CHIP } from '@/constants/pokedex'
export function TypeChip({ type, size = 'md' }) {
  const tok = TYPE_TOKEN[type] || 'mute'
  const sz = size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5'
  return (
    <span className={`font-bold uppercase tracking-wider border rounded-full ${sz} ${TYPE_CHIP[tok]}`}>
      {type}
    </span>
  )
}

// ─── StateBlock ─────────────────────────────────────────────
// 빈/에러 상태 공용 패널
export function StateBlock({ icon, title, desc, action, tone = 'neutral' }) {
  const toneCls = tone === 'alert' ? 'border-dex/30 bg-dex/5' : 'border-ink/10 bg-paper'
  return (
    <div
      role={tone === 'alert' ? 'alert' : 'status'}
      className={`mx-auto max-w-md text-center rounded-2xl border-2 ${toneCls} px-8 py-12 shadow-[0_4px_0_#1a1a1a]`}
    >
      <div className="text-5xl mb-4">{icon}</div>
      <div className="font-display text-lg font-bold text-ink mb-1.5">{title}</div>
      {desc && <div className="text-mute text-sm font-medium mb-5">{desc}</div>}
      {action}
    </div>
  )
}
