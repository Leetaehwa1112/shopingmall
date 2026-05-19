/**
 * Admin UI primitives — dense, scan-first operations console.
 *
 * Philosophy:
 *  - Information density over decoration. Tight padding, small text, tabular nums.
 *  - Status colors only used for status; numbers/labels stay ink.
 *  - Consistent FilterBar / DataTable / StatusPill across every admin page.
 *  - States: loading / empty / error / forbidden are always handled.
 *
 * Tokens follow the existing palette: bone, paper, ink, mute, electric, dex, grass, water, fire.
 */
import { useState, useRef, useEffect } from 'react'
import Icon from '@/components/common/Icon'

/* ─────────────────────────────────────────────────────────────
   PAGE HEADER — title + breadcrumb + right-side actions
   ───────────────────────────────────────────────────────────── */
export function PageHeader({ title, subtitle, breadcrumb, actions, kicker, ledTone = 'blue' }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap pb-4 border-b border-gray-900/10">
      <div className="min-w-0">
        {breadcrumb && (
          <div className="text-[11px] font-bold text-mute tracking-wide mb-1.5 flex items-center gap-1.5">
            {breadcrumb.map((b, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                {i > 0 && <span className="text-mute/40">/</span>}
                <span className={i === breadcrumb.length - 1 ? 'text-ink' : ''}>{b}</span>
              </span>
            ))}
          </div>
        )}
        {kicker && (
          <div className="inline-flex items-center gap-1.5 mb-1.5">
            <span className={`led led-${ledTone} led-pulse`} style={{ width: 6, height: 6 }} />
            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute">{kicker}</span>
          </div>
        )}
        <h1 className="font-display text-2xl font-bold text-ink tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-mute mt-1 font-medium">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   STAT CARDS — compact KPI tiles. Multiple variants for density.
   ───────────────────────────────────────────────────────────── */
export function StatGrid({ children, cols = 4 }) {
  const map = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-2 lg:grid-cols-4', 5: 'sm:grid-cols-2 lg:grid-cols-5', 6: 'sm:grid-cols-3 lg:grid-cols-6' }
  return <div className={`grid grid-cols-1 ${map[cols] || map[4]} gap-3`}>{children}</div>
}

export function StatCard({ label, value, sub, delta, tone = 'ink', icon, href, onClick, urgent }) {
  const toneClass = {
    ink: 'text-ink',
    red: 'text-red-600',
    amber: 'text-amber-600',
    emerald: 'text-emerald-600',
    blue: 'text-blue-600',
  }[tone] || 'text-ink'

  const inner = (
    <div className={`bg-paper border ${urgent ? 'border-red-400' : 'border-gray-900/15'} rounded-xl p-4 ${onClick || href ? 'hover:border-gray-900/40 hover:shadow-[0_2px_0_#1a1a1a] cursor-pointer transition-all' : ''} relative`}>
      {urgent && <span className="absolute top-2 right-2 led led-red led-pulse" style={{ width: 6, height: 6 }} />}
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon && <Icon name={icon} size={11} strokeWidth={2} className="text-mute" />}
        <div className="text-[10px] font-bold tracking-[0.14em] uppercase text-mute">{label}</div>
      </div>
      <div className={`font-display text-2xl font-bold tabular-nums leading-tight ${toneClass}`}>{value}</div>
      <div className="flex items-center gap-2 mt-1.5">
        {sub && <span className="text-[11px] text-mute font-medium">{sub}</span>}
        {delta != null && (
          <span className={`text-[11px] font-bold tabular-nums ${delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  )
  if (onClick) return <button type="button" onClick={onClick} className="text-left">{inner}</button>
  return inner
}

/* ─────────────────────────────────────────────────────────────
   FILTER BAR — sticky, single row: search + date range + status + sort
   ───────────────────────────────────────────────────────────── */
export function FilterBar({ children }) {
  return (
    <div className="bg-paper border border-gray-900/15 rounded-xl p-3 flex items-center gap-2 flex-wrap">
      {children}
    </div>
  )
}

export function SearchInput({ value, onChange, onSubmit, placeholder = '검색', width = 240 }) {
  const [v, setV] = useState(value || '')
  useEffect(() => { setV(value || '') }, [value])
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit?.(v); onChange?.(v) }}
      className="relative"
      style={{ width }}
    >
      <Icon name="search" size={13} strokeWidth={2} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mute pointer-events-none" />
      <input
        value={v}
        onChange={(e) => { setV(e.target.value); if (!onSubmit) onChange?.(e.target.value) }}
        placeholder={placeholder}
        className="w-full bg-bone-2/50 border border-gray-900/15 rounded-lg pl-8 pr-3 py-1.5 text-xs text-ink placeholder:text-mute focus:border-gray-900 focus:bg-paper outline-none transition-colors"
      />
    </form>
  )
}

export function Select({ value, onChange, options, label, width }) {
  return (
    <label className="inline-flex items-center gap-1.5" style={width ? { width } : undefined}>
      {label && <span className="text-[10px] font-bold uppercase text-mute tracking-[0.14em] whitespace-nowrap">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-bone-2/50 border border-gray-900/15 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink focus:border-gray-900 focus:bg-paper outline-none cursor-pointer flex-1"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

export function DateRange({ from, to, onChange }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-[10px] font-bold uppercase text-mute tracking-[0.14em]">기간</span>
      <input
        type="date"
        value={from || ''}
        onChange={(e) => onChange?.({ from: e.target.value, to })}
        className="bg-bone-2/50 border border-gray-900/15 rounded-lg px-2 py-1.5 text-xs font-mono text-ink focus:border-gray-900 outline-none"
      />
      <span className="text-mute text-xs">~</span>
      <input
        type="date"
        value={to || ''}
        onChange={(e) => onChange?.({ from, to: e.target.value })}
        className="bg-bone-2/50 border border-gray-900/15 rounded-lg px-2 py-1.5 text-xs font-mono text-ink focus:border-gray-900 outline-none"
      />
    </div>
  )
}

export function QuickRanges({ value, onChange }) {
  const opts = [
    { v: 'today', label: '오늘' },
    { v: '7d', label: '7일' },
    { v: '30d', label: '30일' },
    { v: '90d', label: '90일' },
    { v: 'all', label: '전체' },
  ]
  return (
    <div className="inline-flex bg-bone-2/50 border border-gray-900/15 rounded-lg p-0.5">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors ${
            value === o.v ? 'bg-gray-900 text-white' : 'text-mute hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function FilterChips({ value, onChange, options }) {
  return (
    <div className="inline-flex flex-wrap gap-1">
      {options.map((o) => {
        const active = value === o.value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold rounded-md border transition-colors ${
              active
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-paper border-gray-900/15 text-mute hover:text-ink hover:border-gray-900/30'
            }`}
          >
            {o.led && <span className={`led led-${o.led}`} style={{ width: 5, height: 5, opacity: active ? 1 : 0.5 }} />}
            {o.label}
            {o.count != null && (
              <span className={`text-[10px] font-mono tabular-nums ${active ? 'text-paper/70' : 'text-mute/70'}`}>{o.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Spacer() { return <div className="flex-1" /> }

/* ─────────────────────────────────────────────────────────────
   STATUS PILL — minimal, color-coded
   ───────────────────────────────────────────────────────────── */
export const STATUS_TONE = {
  red:     'bg-red-50 text-red-700 border-red-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  gray:    'bg-bone-2 text-mute border-gray-900/15',
  ink:     'bg-ink/5 text-ink border-gray-900/20',
}

export function StatusPill({ tone = 'gray', led, children, dot }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${STATUS_TONE[tone]}`}>
      {led && <span className={`led led-${led}`} style={{ width: 5, height: 5 }} />}
      {dot && <span className={`w-1.5 h-1.5 rounded-full bg-current opacity-70`} />}
      {children}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────
   DATA TABLE — sortable headers, dense rows, hover, selectable
   ───────────────────────────────────────────────────────────── */
export function DataTable({ columns, rows, rowKey, sort, onSort, loading, empty, selected, onSelect, density = 'cozy', onRowClick }) {
  const pad = density === 'compact' ? 'px-3 py-2' : 'px-3 py-2.5'
  const allKeys = rows.map((r) => rowKey(r))
  const allSelected = selected && selected.length > 0 && allKeys.every((k) => selected.includes(k))
  const someSelected = selected && selected.length > 0 && !allSelected

  const handleHeadSel = (e) => {
    if (e.target.checked) onSelect?.(allKeys)
    else onSelect?.([])
  }
  const handleRowSel = (key) => {
    if (!selected) return
    if (selected.includes(key)) onSelect?.(selected.filter((k) => k !== key))
    else onSelect?.([...selected, key])
  }

  return (
    <div className="bg-paper border border-gray-900/15 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-bone-2/60 border-b border-gray-900/15 sticky top-0">
            <tr className="text-[10px] font-bold tracking-[0.14em] uppercase text-mute">
              {onSelect && (
                <th className={`${pad} w-8`}>
                  <input
                    type="checkbox"
                    checked={!!allSelected}
                    ref={(el) => { if (el) el.indeterminate = !!someSelected }}
                    onChange={handleHeadSel}
                    className="accent-ink cursor-pointer"
                  />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`${pad} ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'} ${c.sortable ? 'cursor-pointer select-none hover:text-ink' : ''} ${c.width || ''}`}
                  style={c.style}
                  onClick={c.sortable ? () => onSort?.(c.key) : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    {c.sortable && (
                      <span className={`text-[8px] ${sort?.key === c.key ? 'text-ink' : 'text-mute/30'}`}>
                        {sort?.key === c.key ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows cols={columns.length + (onSelect ? 1 : 0)} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (onSelect ? 1 : 0)}>
                  {empty || <EmptyState />}
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const key = rowKey(r)
                const isSel = selected?.includes(key)
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                    className={`border-b border-gray-900/10 last:border-0 transition-colors ${isSel ? 'bg-electric/10' : 'hover:bg-bone-2/40'} ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {onSelect && (
                      <td className={pad} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={!!isSel}
                          onChange={() => handleRowSel(key)}
                          className="accent-ink cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`${pad} ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'} ${c.cellClass || ''}`}
                      >
                        {c.render ? c.render(r) : r[c.key]}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SkeletonRows({ cols, count = 6 }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i} className="border-b border-gray-900/10 last:border-0">
      {Array.from({ length: cols }).map((_, j) => (
        <td key={j} className="px-3 py-3">
          <div className="h-3 bg-bone-2 rounded animate-pulse" style={{ width: `${50 + ((i + j) * 7) % 40}%` }} />
        </td>
      ))}
    </tr>
  ))
}

/* ─────────────────────────────────────────────────────────────
   BULK ACTION BAR — floats above table when rows selected
   ───────────────────────────────────────────────────────────── */
export function BulkBar({ count, actions, onClear }) {
  if (!count) return null
  return (
    <div className="sticky top-0 z-20 bg-gray-900 text-white rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-[0_4px_0_rgba(0,0,0,0.2)]">
      <div className="text-xs font-bold flex items-center gap-3">
        <span className="led led-yellow led-pulse" style={{ width: 6, height: 6 }} />
        <span className="tabular-nums">{count}건 선택됨</span>
        <button onClick={onClear} className="text-paper/60 hover:text-paper font-medium underline">선택 해제</button>
      </div>
      <div className="flex items-center gap-1.5">{actions}</div>
    </div>
  )
}

export function BulkButton({ children, onClick, tone = 'default', disabled }) {
  const map = {
    default: 'bg-paper/10 text-paper hover:bg-paper/20',
    danger:  'bg-red-500/90 text-paper hover:bg-red-500',
    success: 'bg-emerald-500/90 text-paper hover:bg-emerald-500',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${map[tone]}`}
    >
      {children}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   STATES
   ───────────────────────────────────────────────────────────── */
export function EmptyState({ icon = 'package', title = '결과가 없습니다', desc, action }) {
  return (
    <div className="py-14 text-center">
      <Icon name={icon} size={32} strokeWidth={1.4} className="text-mute/50 mx-auto mb-3" />
      <p className="font-bold text-ink text-sm mb-1">{title}</p>
      {desc && <p className="text-xs text-mute font-medium">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ message = '데이터를 불러오지 못했어요', onRetry }) {
  return (
    <div className="py-14 text-center">
      <Icon name="flame" size={32} strokeWidth={1.4} className="text-red-500/70 mx-auto mb-3" />
      <p className="font-bold text-ink text-sm mb-1">에러가 발생했어요</p>
      <p className="text-xs text-mute font-medium mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-xs font-bold text-ink underline hover:text-dex">
          다시 시도
        </button>
      )}
    </div>
  )
}

export function ForbiddenState({ message = '이 작업을 수행할 권한이 없습니다' }) {
  return (
    <div className="py-14 text-center">
      <Icon name="lock" size={32} strokeWidth={1.4} className="text-mute mx-auto mb-3" />
      <p className="font-bold text-ink text-sm mb-1">권한이 필요해요</p>
      <p className="text-xs text-mute font-medium">{message}</p>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   PAGINATION
   ───────────────────────────────────────────────────────────── */
export function Pagination({ page, totalPages, total, pageSize, onPage }) {
  if (!totalPages || totalPages < 1) return null
  const start = total > 0 ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, total)
  return (
    <div className="flex items-center justify-between gap-2 px-1">
      <span className="text-[11px] text-mute font-mono tabular-nums">
        {start}–{end} <span className="text-mute/50">/</span> {total}건
      </span>
      <div className="flex gap-1">
        <PageBtn onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1}>‹</PageBtn>
        {pageRange(page, totalPages).map((n, i) =>
          n === '…' ? (
            <span key={`e${i}`} className="px-1 text-mute">…</span>
          ) : (
            <PageBtn key={n} active={n === page} onClick={() => onPage(n)}>{n}</PageBtn>
          )
        )}
        <PageBtn onClick={() => onPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}>›</PageBtn>
      </div>
    </div>
  )
}

function PageBtn({ children, onClick, active, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-7 h-7 rounded-md border text-[11px] font-bold transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        active ? 'bg-gray-900 text-white border-gray-900' : 'bg-paper border-gray-900/15 text-ink hover:bg-bone-2'
      }`}
    >
      {children}
    </button>
  )
}

function pageRange(p, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (p <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (p >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', p - 1, p, p + 1, '…', total]
}

/* ─────────────────────────────────────────────────────────────
   ROW HELPERS — small composables for inside cells
   ───────────────────────────────────────────────────────────── */
export function Cell({ primary, secondary, mono }) {
  return (
    <div className="min-w-0">
      <div className={`text-ink font-bold truncate ${mono ? 'font-mono tabular-nums' : ''}`}>{primary}</div>
      {secondary && <div className="text-[10px] text-mute font-medium truncate">{secondary}</div>}
    </div>
  )
}

export function Avatar({ name, size = 28 }) {
  const letter = (name || '?')[0]?.toUpperCase()
  return (
    <div
      className="rounded-full bg-gray-900 text-white flex items-center justify-center font-bold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      {letter}
    </div>
  )
}

export function ImgThumb({ src, alt, size = 32 }) {
  return (
    <div className="rounded-md overflow-hidden bg-bone-2 flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
      ) : (
        <span className="text-mute text-[10px]">—</span>
      )}
    </div>
  )
}

export function RowActions({ children }) {
  return <div className="inline-flex items-center gap-1">{children}</div>
}

export function IconBtn({ icon, label, onClick, tone = 'default', disabled }) {
  const map = {
    default: 'text-mute hover:text-ink hover:bg-bone-2',
    danger:  'text-mute hover:text-red-600 hover:bg-red-50',
    primary: 'text-ink hover:text-dex hover:bg-bone-2',
  }
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(e) }}
      disabled={disabled}
      title={label}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${map[tone]}`}
    >
      <Icon name={icon} size={13} strokeWidth={2} />
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   INLINE NUMBER CELL — click → input; Enter saves, Esc cancels.
   onSave returns a promise; on reject we revert + flash error.
   ───────────────────────────────────────────────────────────── */
export function InlineNumberCell({ value, onSave, format = (v) => v, suffix, lowThreshold, soldOutLabel = 'SOLD OUT' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value ?? 0))
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => { setDraft(String(value ?? 0)) }, [value])
  useEffect(() => { if (editing) inputRef.current?.select() }, [editing])

  const commit = async () => {
    const n = Number(draft)
    if (Number.isNaN(n) || n < 0) { setErr(true); setTimeout(() => setErr(false), 800); return }
    if (n === Number(value)) { setEditing(false); return }
    setSaving(true)
    try {
      await onSave(n)
      setEditing(false)
    } catch {
      setErr(true)
      setTimeout(() => setErr(false), 1200)
      setDraft(String(value ?? 0))
    } finally { setSaving(false) }
  }

  const cancel = () => { setDraft(String(value ?? 0)); setEditing(false) }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter')  { e.preventDefault(); commit() }
          if (e.key === 'Escape') { e.preventDefault(); cancel() }
        }}
        disabled={saving}
        onClick={(e) => e.stopPropagation()}
        className={`w-20 bg-paper border ${err ? 'border-red-500 animate-pulse' : 'border-gray-900'} rounded px-1.5 py-0.5 text-xs font-mono font-bold text-ink tabular-nums text-right outline-none`}
      />
    )
  }

  const n = Number(value || 0)
  const low = lowThreshold != null && n > 0 && n <= lowThreshold
  const out = n <= 0
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); setEditing(true) }}
      className={`font-mono text-xs font-bold tabular-nums px-1.5 py-0.5 rounded hover:bg-electric/20 hover:ring-1 hover:ring-ink/30 transition-colors ${
        out ? 'text-red-600' : low ? 'text-amber-600' : 'text-ink'
      } ${err ? 'bg-red-100' : ''}`}
      title="클릭해서 편집"
    >
      {out && soldOutLabel ? soldOutLabel : format(value)}{suffix && <span className="text-[9px] ml-0.5 opacity-70">{suffix}</span>}
    </button>
  )
}

/* ─────────────────────────────────────────────────────────────
   INLINE DROPDOWN — for quick status change in row
   ───────────────────────────────────────────────────────────── */
export function InlineSelect({ value, onChange, options, tone = 'gray' }) {
  return (
    <select
      value={value}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => { e.stopPropagation(); onChange(e.target.value) }}
      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border cursor-pointer outline-none ${STATUS_TONE[tone]}`}
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

/* ─────────────────────────────────────────────────────────────
   DETAIL DRAWER — slide-in from right; replaces modal for ops
   ───────────────────────────────────────────────────────────── */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = 560 }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-ink/40 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} className="bg-paper border-l border-gray-900/15 shadow-2xl overflow-y-auto flex flex-col" style={{ width }}>
        <div className="px-5 py-4 border-b border-gray-900/15 flex items-start justify-between gap-3 sticky top-0 bg-paper z-10">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold text-ink leading-tight truncate">{title}</h3>
            {subtitle && <div className="text-xs text-mute mt-0.5 font-medium truncate">{subtitle}</div>}
          </div>
          <button onClick={onClose} className="text-mute hover:text-ink p-1 -m-1">
            <Icon name="close" size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="px-5 py-4 flex-1">{children}</div>
        {footer && <div className="px-5 py-3 border-t border-gray-900/15 bg-bone-2/40 flex items-center justify-end gap-2 sticky bottom-0">{footer}</div>}
      </div>
    </div>
  )
}

export function DSection({ title, action, children }) {
  return (
    <section className="mb-5 last:mb-0">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] font-bold uppercase tracking-[0.16em] text-mute">{title}</h4>
        {action}
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  )
}

export function KV({ k, v, mono, highlight }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-900/8 last:border-0 text-xs">
      <span className="text-mute font-bold flex-shrink-0">{k}</span>
      <span className={`text-right break-all ${mono ? 'font-mono tabular-nums' : ''} ${highlight ? 'text-dex font-bold text-sm' : 'text-ink font-bold'}`}>{v}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   AUDIT LOG helper — write to localStorage so any admin action
   is recorded; the AdminAuditLog page reads from the same key.
   ───────────────────────────────────────────────────────────── */
const AUDIT_KEY = 'vault-admin-audit'
export function logAudit({ actor, action, entity, entityId, summary, meta }) {
  try {
    const raw = localStorage.getItem(AUDIT_KEY)
    const arr = raw ? JSON.parse(raw) : []
    arr.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      actor: actor || 'unknown',
      action, entity, entityId,
      summary: summary || '',
      meta: meta || {},
    })
    localStorage.setItem(AUDIT_KEY, JSON.stringify(arr.slice(0, 500)))
  } catch { /* ignore quota */ }
}
export function readAudit() {
  try {
    return JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]')
  } catch { return [] }
}
