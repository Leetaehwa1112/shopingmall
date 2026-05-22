/**
 * BulkPriceModal — 선택된 상품 N건의 가격을 일괄 변경.
 *
 * 운영 효율 의도
 *   시세 급변 시 같은 카드 50개를 일일이 수정하던 작업을
 *   "선택 → ⇧+P → 변경식 입력 → 미리보기 → 확정" 으로 압축.
 *
 *   세 가지 변경 모드:
 *     1) 절대값 — 전체를 같은 가격으로 (예: 250,000원)
 *     2) 백분율 — ±N% 적용 (예: +5% 인상)
 *     3) 가산/차감 — ±N원 (예: -10,000원)
 *
 *   각 행에 대해 변경 후 가격을 미리보기로 보여줘 실수 방지.
 *   "현재 가격 0원" 같은 비정상 케이스는 자동 제외 + 경고.
 *
 *   완료 시 audit log에 batch로 기록.
 */
import { useState, useMemo } from 'react'
import Icon from '@/components/common/Icon'
import { formatKRWFull } from '@/api/cards'

const MODES = [
  { id: 'absolute',  label: '절대값',   hint: '모두 같은 가격으로' },
  { id: 'percent',   label: '백분율',   hint: '±N%' },
  { id: 'delta',     label: '가산/차감', hint: '±N원' },
]

export default function BulkPriceModal({ rows = [], onClose, onConfirm }) {
  const [mode, setMode] = useState('percent')
  const [value, setValue] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // 미리보기 — 각 행의 새 가격 계산
  const preview = useMemo(() => {
    const v = Number(value)
    if (Number.isNaN(v)) return rows.map((r) => ({ ...r, newPrice: r.price, error: null }))
    return rows.map((r) => {
      const cur = Number(r.price) || 0
      let newPrice = cur
      let error = null
      if (cur <= 0 && mode !== 'absolute') {
        error = '현재 가격 0 — 절대값 모드만 가능'
      } else if (mode === 'absolute') {
        newPrice = v
      } else if (mode === 'percent') {
        newPrice = Math.round(cur * (1 + v / 100))
      } else if (mode === 'delta') {
        newPrice = cur + v
      }
      if (newPrice < 0) { newPrice = 0; error = '음수 결과 — 0으로 보정' }
      return { ...r, newPrice, delta: newPrice - cur, error }
    })
  }, [rows, mode, value])

  const validCount = preview.filter((p) => !p.error && p.newPrice !== p.price).length
  const totalDelta = preview.reduce((acc, p) => acc + (p.delta || 0), 0)

  async function handleConfirm() {
    if (!validCount) return
    if (!reason.trim()) {
      // 사유 입력 강제 — audit log 추적성
      const ok = confirm('변경 사유 없이 진행할까요? (audit log 추적이 어려워집니다)')
      if (!ok) return
    }
    setSubmitting(true)
    try {
      await onConfirm({
        changes: preview.filter((p) => !p.error && p.newPrice !== p.price)
          .map((p) => ({ id: p._id || p.id, from: p.price, to: p.newPrice })),
        mode,
        value,
        reason: reason.trim() || '(미입력)',
      })
      onClose?.()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-ink/65 backdrop-blur-sm z-[55] flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-paper border-2 border-ink rounded-2xl w-full max-w-2xl shadow-[0_6px_0_#1a1a1a] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-5 py-3.5 border-b-2 border-ink/10 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-electric/30 border-2 border-ink flex items-center justify-center">
            <Icon name="bolt" size={14} strokeWidth={2.4} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-ink">일괄 가격 변경</div>
            <div className="text-xs text-mute font-medium">{rows.length}개 카드 선택됨</div>
          </div>
          <button onClick={onClose} aria-label="닫기"
            className="w-7 h-7 rounded-md text-mute hover:text-ink hover:bg-bone-2">
            <Icon name="close" size={13} strokeWidth={2.4} />
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* 모드 선택 */}
          <div>
            <label className="text-[11px] font-bold tracking-wide text-ink mb-1.5 block">변경 방식</label>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`px-3 py-2.5 rounded-lg border-2 text-left transition-all ${
                    mode === m.id
                      ? 'bg-ink text-paper border-ink shadow-[0_3px_0_#1a1a1a] -translate-y-0.5'
                      : 'bg-paper text-ink border-ink/15 hover:border-ink'
                  }`}
                >
                  <div className="text-sm font-bold">{m.label}</div>
                  <div className={`text-[10px] mt-0.5 ${mode === m.id ? 'text-paper/70' : 'text-mute'}`}>{m.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 값 입력 */}
          <div>
            <label className="text-[11px] font-bold tracking-wide text-ink mb-1.5 block">
              {mode === 'absolute' ? '새 가격 (원)' : mode === 'percent' ? '변동률 (%, 음수 가능)' : '가산/차감 (원, 음수 가능)'}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
              placeholder={mode === 'absolute' ? '예: 250000' : mode === 'percent' ? '예: 5 또는 -10' : '예: 10000 또는 -5000'}
              inputMode="numeric"
              className="w-full bg-bone-2 border-2 border-ink/20 rounded-lg px-4 py-2.5 font-mono text-base font-bold text-ink focus:border-ink focus:bg-paper outline-none"
            />
          </div>

          {/* 사유 */}
          <div>
            <label className="text-[11px] font-bold tracking-wide text-ink mb-1.5 block">변경 사유 <span className="text-mute font-medium">(audit log)</span></label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: 시세 +8% 반영 / 시즌 마감 할인"
              maxLength={120}
              className="w-full bg-bone-2 border-2 border-ink/20 rounded-lg px-3 py-2 text-sm text-ink focus:border-ink focus:bg-paper outline-none"
            />
          </div>

          {/* 미리보기 */}
          {value !== '' && (
            <div className="border-2 border-ink/10 rounded-lg bg-bone-2/40 max-h-60 overflow-y-auto">
              <div className="px-3 py-2 border-b border-ink/10 flex items-center justify-between text-[10px] font-bold tracking-wider uppercase">
                <span className="text-mute">미리보기 ({validCount}건 변경)</span>
                <span className={`tabular-nums ${totalDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  합계 {totalDelta >= 0 ? '+' : ''}{formatKRWFull(totalDelta)}
                </span>
              </div>
              <ul className="divide-y divide-ink/5">
                {preview.slice(0, 30).map((p) => (
                  <li key={p._id || p.id} className="px-3 py-1.5 flex items-center gap-3 text-xs">
                    <span className="flex-1 truncate font-medium text-ink">{p.name}</span>
                    <span className="text-mute font-mono tabular-nums">{formatKRWFull(p.price)}</span>
                    <Icon name="arrow" size={9} strokeWidth={2.4} className="text-mute" />
                    <span className={`font-mono tabular-nums font-bold ${
                      p.error ? 'text-rose-600' : p.newPrice > p.price ? 'text-emerald-700' : p.newPrice < p.price ? 'text-rose-700' : 'text-ink'
                    }`}>
                      {p.error ? p.error : formatKRWFull(p.newPrice)}
                    </span>
                  </li>
                ))}
                {preview.length > 30 && (
                  <li className="px-3 py-1.5 text-[10px] text-mute italic text-center">...외 {preview.length - 30}건</li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="px-5 py-3 border-t-2 border-ink/10 bg-bone-2/40 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border-2 border-ink bg-paper text-sm font-bold text-ink hover:bg-bone-2"
          >
            취소
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!validCount || submitting}
            className="px-4 py-2 rounded-lg border-2 border-ink bg-ink text-sm font-bold text-paper hover:bg-ink/90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {submitting ? '처리 중…' : <>
              <Icon name="bolt" size={12} strokeWidth={2.4} />
              {validCount}건 변경 적용
            </>}
          </button>
        </footer>
      </div>
    </div>
  )
}
