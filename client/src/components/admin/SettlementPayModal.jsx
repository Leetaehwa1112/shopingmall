/**
 * SettlementPayModal — 위탁자에게 송금 처리 모달.
 *
 * 운영 의도
 *   "송금하기" 클릭 → 라인 선택 → 송금 방법(계좌이체/PG) → 메모 → 확정.
 *   audit log 기록 + localStorage paid 표시 → 다음 렌더에 자동 status=paid.
 *
 *   백엔드 /admin/settlements/pay 엔드포인트가 있으면 그쪽으로,
 *   없으면 클라이언트 영속만으로 운영자 작업 흐름 보장.
 */
import { useState, useMemo } from 'react'
import Icon from '@/components/common/Icon'
import { formatKRWFull } from '@/utils/format'

const METHODS = [
  { id: 'bank',     label: '계좌이체', desc: '위탁자 등록 계좌로' },
  { id: 'paypal',   label: 'PayPal',  desc: '국제 위탁자' },
  { id: 'manual',   label: '수동',    desc: '오프라인 처리 (기록만)' },
]

export default function SettlementPayModal({ consignor, lines = [], onClose, onConfirm }) {
  const dueLines = useMemo(() => lines.filter((l) => l.status === 'due'), [lines])
  const [selectedIds, setSelectedIds] = useState(() => dueLines.map((l) => l.id))
  const [method, setMethod] = useState('bank')
  const [memo, setMemo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const total = useMemo(() =>
    dueLines.filter((l) => selectedIds.includes(l.id))
      .reduce((s, l) => s + l.netAmount, 0)
  , [dueLines, selectedIds])

  const canConfirm = selectedIds.length > 0 && total > 0

  function toggle(id) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  function toggleAll() {
    if (selectedIds.length === dueLines.length) setSelectedIds([])
    else setSelectedIds(dueLines.map((l) => l.id))
  }

  async function handleConfirm() {
    if (!canConfirm) return
    setSubmitting(true)
    try {
      await onConfirm({
        consignorId: consignor.consignorId,
        consignorName: consignor.consignorName,
        lineIds: selectedIds,
        amount: total,
        method,
        memo: memo.trim(),
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
        <header className="px-5 py-3.5 border-b-2 border-ink/10 flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center shrink-0">
            <Icon name="bolt" size={15} strokeWidth={2.4} className="text-emerald-700" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-ink">위탁자 정산</div>
            <div className="text-xs text-mute font-medium">
              {consignor.consignorName}
              {consignor.consignorAccount && (
                <span className="ml-2 font-mono text-[10px] text-emerald-700">· {consignor.consignorAccount}</span>
              )}
            </div>
          </div>
          <button onClick={onClose} aria-label="닫기"
            className="w-7 h-7 rounded-md text-mute hover:text-ink hover:bg-bone-2">
            <Icon name="close" size={13} strokeWidth={2.4} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* 정산 라인 — 다중 선택 */}
          <section>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold tracking-wide text-ink">정산 라인 (출고 7일 경과)</label>
              {dueLines.length > 0 && (
                <button onClick={toggleAll} className="text-[10px] font-mono text-mute hover:text-ink font-bold">
                  {selectedIds.length === dueLines.length ? '전체 해제' : '전체 선택'}
                </button>
              )}
            </div>
            {dueLines.length === 0 ? (
              <div className="bg-bone-2/40 border border-ink/10 rounded-lg px-3 py-4 text-center text-[11px] text-mute font-medium">
                정산 가능 라인이 없어요.
              </div>
            ) : (
              <div className="border-2 border-ink/10 rounded-lg divide-y divide-ink/5 max-h-60 overflow-y-auto">
                {dueLines.map((l) => {
                  const checked = selectedIds.includes(l.id)
                  return (
                    <label key={l.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-bone-2/40">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(l.id)}
                        className="w-4 h-4 accent-ink shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-ink truncate">{l.productName}</div>
                        <div className="text-[10px] text-mute font-mono">
                          {l.orderNumber} · 출고 {l.shippedAt ? new Date(l.shippedAt).toLocaleDateString('ko-KR') : '-'}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-mono text-xs font-bold tabular-nums text-ink">{formatKRWFull(l.netAmount)}</div>
                        <div className="text-[9px] text-mute font-mono">
                          {formatKRWFull(l.grossPrice)} − {Math.round(l.commissionRate * 100)}%
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </section>

          {/* 송금 방법 */}
          <section>
            <label className="text-[11px] font-bold tracking-wide text-ink mb-1.5 block">송금 방법</label>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMethod(m.id)}
                  className={`px-3 py-2.5 rounded-lg border-2 text-left transition-all ${
                    method === m.id
                      ? 'bg-ink text-paper border-ink shadow-[0_3px_0_#1a1a1a] -translate-y-0.5'
                      : 'bg-paper text-ink border-ink/15 hover:border-ink'
                  }`}
                >
                  <div className="text-sm font-bold">{m.label}</div>
                  <div className={`text-[10px] mt-0.5 ${method === m.id ? 'text-paper/70' : 'text-mute'}`}>{m.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* 메모 */}
          <section>
            <label className="text-[11px] font-bold tracking-wide text-ink mb-1.5 block">메모 (audit log)</label>
            <input
              type="text"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="예: 2026-05 정산 1차 · 거래내역 사진 첨부 완료"
              maxLength={120}
              className="w-full bg-bone-2 border-2 border-ink/20 rounded-lg px-3 py-2 text-sm text-ink focus:border-ink focus:bg-paper outline-none"
            />
          </section>

          {/* 요약 */}
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <span className="text-emerald-800 font-bold">선택 라인</span>
            <span className="font-mono tabular-nums text-emerald-900 text-right">{selectedIds.length}건</span>
            <span className="text-emerald-800 font-bold">송금 방법</span>
            <span className="text-emerald-900 text-right">{METHODS.find((m) => m.id === method)?.label}</span>
            <span className="text-emerald-800 font-bold text-base">송금 총액</span>
            <span className="font-display font-bold text-base tabular-nums text-emerald-900 text-right">{formatKRWFull(total)}</span>
          </div>
        </div>

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
            className="px-4 py-2 rounded-lg border-2 border-ink bg-emerald-600 text-sm font-bold text-paper hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            {submitting ? '처리 중…' : <>
              <Icon name="bolt" size={12} strokeWidth={2.4} />
              {formatKRWFull(total)} 송금 처리
            </>}
          </button>
        </footer>
      </div>
    </div>
  )
}
