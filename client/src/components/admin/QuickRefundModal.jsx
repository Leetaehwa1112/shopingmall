/**
 * QuickRefundModal — 주문 환불 1클릭 처리.
 *
 * 운영 효율 의도
 *   현재 환불 처리는 다단계 (상태 변경 → 환불 API → 알림톡 → 메모).
 *   ⌘+R or 행 우클릭 → 모달 → 사유 선택 → ⏎ 로 압축.
 *
 *   세 가지 환불 모드:
 *     1) 전액 환불 (default) — 결제 금액 전체
 *     2) 부분 환불 — 금액 직접 입력
 *     3) 라인별 환불 — 주문 라인 중 일부만
 *
 *   사유 코드는 사전 정의 (audit log + 통계 분석용):
 *     - customer_change (단순 변심)
 *     - product_damaged (상품 파손)
 *     - product_wrong   (오배송)
 *     - shipping_delay  (배송 지연)
 *     - duplicate       (중복 결제)
 *     - other           (기타 — 자유 입력)
 *
 *   처리 흐름:
 *     1) UI: 옵티미스틱 상태 → refunded
 *     2) API: PATCH /orders/:id/refund
 *     3) Audit: order.refund + before/after 기록
 *     4) Toast: 성공/실패 + 환불 금액
 */
import { useState, useMemo } from 'react'
import Icon from '@/components/common/Icon'
import { formatKRWFull } from '@/utils/format'

const REFUND_REASONS = [
  { code: 'customer_change',  label: '고객 변심',     tone: 'gray' },
  { code: 'product_damaged',  label: '상품 파손',     tone: 'red' },
  { code: 'product_wrong',    label: '오배송',        tone: 'red' },
  { code: 'shipping_delay',   label: '배송 지연',     tone: 'amber' },
  { code: 'duplicate',        label: '중복 결제',     tone: 'blue' },
  { code: 'other',            label: '기타 (직접 입력)', tone: 'gray' },
]

const MODES = [
  { id: 'full',    label: '전액 환불' },
  { id: 'partial', label: '부분 환불' },
  { id: 'lines',   label: '라인별' },
]

export default function QuickRefundModal({ order, onClose, onConfirm }) {
  const [mode, setMode] = useState('full')
  const [amount, setAmount] = useState(order.totalAmount || 0)
  const [reasonCode, setReasonCode] = useState('customer_change')
  const [reasonText, setReasonText] = useState('')
  const [selectedLines, setSelectedLines] = useState({})  // { itemIdx: true }
  const [submitting, setSubmitting] = useState(false)

  const lineSubtotal = useMemo(() => {
    if (mode !== 'lines') return 0
    return (order.items || []).reduce((s, it, i) => {
      if (!selectedLines[i]) return s
      return s + (Number(it.unitPrice) || 0) * (Number(it.qty) || 1)
    }, 0)
  }, [mode, order.items, selectedLines])

  const finalAmount = mode === 'full' ? order.totalAmount
    : mode === 'partial' ? Number(amount) || 0
    : lineSubtotal

  const reasonLabel = useMemo(() => {
    const r = REFUND_REASONS.find((x) => x.code === reasonCode)
    return reasonCode === 'other' ? (reasonText.trim() || '(미입력)') : r?.label || '-'
  }, [reasonCode, reasonText])

  const canConfirm = finalAmount > 0 && finalAmount <= (order.totalAmount || 0)
    && (reasonCode !== 'other' || reasonText.trim().length >= 4)

  async function handleConfirm() {
    if (!canConfirm) return
    setSubmitting(true)
    try {
      await onConfirm({
        amount: finalAmount,
        reasonCode,
        reasonText: reasonCode === 'other' ? reasonText.trim() : '',
        reasonLabel,
        mode,
        items: mode === 'lines'
          ? Object.keys(selectedLines).filter((k) => selectedLines[k]).map(Number)
          : null,
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
        className="bg-paper border-2 border-ink rounded-2xl w-full max-w-xl shadow-[0_6px_0_#1a1a1a] flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="px-5 py-3.5 border-b-2 border-ink/10 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-rose-100 border-2 border-rose-500 flex items-center justify-center">
            <Icon name="arrow" size={13} strokeWidth={2.4} className="text-rose-700" style={{ transform: 'rotate(180deg)' }} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-ink">빠른 환불</div>
            <div className="text-xs text-mute font-medium font-mono">
              {order.orderNumber} · {order.shipping?.recipient || '—'}
            </div>
          </div>
          <button onClick={onClose} aria-label="닫기"
            className="w-7 h-7 rounded-md text-mute hover:text-ink hover:bg-bone-2">
            <Icon name="close" size={13} strokeWidth={2.4} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* 모드 */}
          <div>
            <label className="text-[11px] font-bold tracking-wide text-ink mb-1.5 block">환불 범위</label>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`px-3 py-2.5 rounded-lg border-2 text-sm font-bold transition-all ${
                    mode === m.id
                      ? 'bg-ink text-paper border-ink shadow-[0_3px_0_#1a1a1a] -translate-y-0.5'
                      : 'bg-paper text-ink border-ink/15 hover:border-ink'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 금액 (모드별) */}
          {mode === 'partial' && (
            <div>
              <label className="text-[11px] font-bold tracking-wide text-ink mb-1.5 block">환불 금액 (원)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                max={order.totalAmount}
                min={1}
                autoFocus
                inputMode="numeric"
                className="w-full bg-bone-2 border-2 border-ink/20 rounded-lg px-4 py-2.5 font-mono text-base font-bold text-ink focus:border-ink focus:bg-paper outline-none"
              />
              <div className="text-[10px] text-mute mt-1 font-medium">
                결제 금액 {formatKRWFull(order.totalAmount)} 이하
              </div>
            </div>
          )}

          {mode === 'lines' && (
            <div>
              <label className="text-[11px] font-bold tracking-wide text-ink mb-1.5 block">환불할 라인</label>
              <div className="border-2 border-ink/10 rounded-lg divide-y divide-ink/5 max-h-48 overflow-y-auto">
                {(order.items || []).map((it, i) => {
                  const checked = !!selectedLines[i]
                  const lineTotal = (Number(it.unitPrice) || 0) * (Number(it.qty) || 1)
                  const label = it.product?.nameKo || it.product?.name || it.pack?.nameKo || it.pack?.name || '—'
                  return (
                    <label key={i} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-bone-2/50">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setSelectedLines((s) => ({ ...s, [i]: !s[i] }))}
                        className="w-4 h-4 accent-ink"
                      />
                      <span className="flex-1 text-sm font-medium truncate">{label}</span>
                      <span className="text-xs font-mono tabular-nums text-mute">×{it.qty}</span>
                      <span className="text-xs font-mono tabular-nums font-bold text-ink">{formatKRWFull(lineTotal)}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          {/* 사유 코드 */}
          <div>
            <label className="text-[11px] font-bold tracking-wide text-ink mb-1.5 block">사유 (audit log)</label>
            <div className="flex flex-wrap gap-1.5">
              {REFUND_REASONS.map((r) => (
                <button
                  key={r.code}
                  type="button"
                  onClick={() => setReasonCode(r.code)}
                  className={`px-2.5 py-1 rounded-md border text-[11px] font-bold transition-all ${
                    reasonCode === r.code
                      ? 'bg-ink text-paper border-ink shadow-[0_2px_0_#1a1a1a]'
                      : 'bg-paper text-ink border-ink/15 hover:border-ink'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            {reasonCode === 'other' && (
              <input
                type="text"
                value={reasonText}
                onChange={(e) => setReasonText(e.target.value)}
                placeholder="환불 사유를 자세히 적어주세요 (최소 4글자)"
                maxLength={200}
                className="w-full mt-2 bg-bone-2 border-2 border-ink/20 rounded-lg px-3 py-2 text-sm text-ink focus:border-ink focus:bg-paper outline-none"
              />
            )}
          </div>

          {/* 요약 */}
          <div className="bg-bone-2/60 border-2 border-ink/10 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-mute font-bold">결제 금액</span>
            <span className="font-mono tabular-nums text-ink text-right">{formatKRWFull(order.totalAmount)}</span>
            <span className="text-mute font-bold">환불 금액</span>
            <span className="font-mono tabular-nums text-rose-700 font-bold text-right">{formatKRWFull(finalAmount || 0)}</span>
            <span className="text-mute font-bold">사유</span>
            <span className="text-ink text-right truncate">{reasonLabel}</span>
          </div>
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
            disabled={!canConfirm || submitting}
            className="px-4 py-2 rounded-lg border-2 border-ink bg-rose-600 text-sm font-bold text-paper hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {submitting ? '처리 중…' : <>
              <Icon name="arrow" size={12} strokeWidth={2.4} style={{ transform: 'rotate(180deg)' }} />
              {formatKRWFull(finalAmount || 0)} 환불 확정
            </>}
          </button>
        </footer>
      </div>
    </div>
  )
}
