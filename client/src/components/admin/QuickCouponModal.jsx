/**
 * QuickCouponModal — 쿠폰을 빠르게 발급 (단일 / 다중 고객).
 *
 * 운영 효율 의도
 *   - 단일: VIP 휴면 고객에게 1:1 케어 쿠폰
 *   - 다중: 세그먼트 캠페인 (saved view에서 선택한 N명)
 *
 *   템플릿 5종 사전 정의:
 *     - WELCOME_5K   첫 가입 환영 5,000원
 *     - VIP_50K      VIP 케어 50,000원
 *     - DORMANT_10K  휴면 깨우기 10,000원
 *     - APOLOGY_20K  클레임 보상 20,000원
 *     - CUSTOM       자유 입력 (금액·만료일 직접)
 *
 *   감사 추적: 발급자, 수령자(들), 템플릿, 금액, 만료일, 사유 모두 audit log에.
 *   알림: 자동 알림톡 옵션 (기본 ON).
 */
import { useState, useMemo } from 'react'
import Icon from '@/components/common/Icon'
import { formatKRWFull } from '@/utils/format'

const TEMPLATES = [
  { id: 'WELCOME_5K',   label: '환영 5천원',   amount: 5_000,   days: 30, reason: '신규 가입 환영' },
  { id: 'VIP_50K',      label: 'VIP 케어 5만원', amount: 50_000,  days: 60, reason: 'VIP 케어' },
  { id: 'DORMANT_10K',  label: '휴면 1만원',   amount: 10_000,  days: 14, reason: '휴면 고객 재방문 유도' },
  { id: 'APOLOGY_20K',  label: '보상 2만원',   amount: 20_000,  days: 30, reason: '서비스 보상' },
  { id: 'CUSTOM',       label: '직접 입력',     amount: 0,       days: 30, reason: '' },
]

export default function QuickCouponModal({ recipients = [], onClose, onConfirm }) {
  const [tplId, setTplId] = useState('VIP_50K')
  const tpl = TEMPLATES.find((t) => t.id === tplId)
  const [amount, setAmount] = useState(tpl?.amount || 0)
  const [days, setDays] = useState(tpl?.days || 30)
  const [reason, setReason] = useState(tpl?.reason || '')
  const [notify, setNotify] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // 템플릿 변경 시 값 재설정 (CUSTOM이면 유지)
  function pickTemplate(id) {
    setTplId(id)
    const t = TEMPLATES.find((x) => x.id === id)
    if (t && t.id !== 'CUSTOM') {
      setAmount(t.amount)
      setDays(t.days)
      setReason(t.reason)
    }
  }

  const expiry = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + Number(days || 0))
    return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
  }, [days])

  const canConfirm = recipients.length > 0 && Number(amount) > 0 && reason.trim().length >= 2
  const totalValue = recipients.length * Number(amount || 0)

  async function handleConfirm() {
    if (!canConfirm) return
    setSubmitting(true)
    try {
      await onConfirm({
        recipients: recipients.map((u) => u._id || u.id),
        templateId: tplId,
        amount: Number(amount),
        days: Number(days),
        reason: reason.trim(),
        notify,
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
        <header className="px-5 py-3.5 border-b-2 border-ink/10 flex items-center gap-3">
          <span className="w-8 h-8 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center">
            <Icon name="star" size={14} strokeWidth={2.4} className="text-emerald-700" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-ink">쿠폰 발급</div>
            <div className="text-xs text-mute font-medium">
              {recipients.length === 1
                ? recipients[0]?.name || recipients[0]?.email
                : `${recipients.length}명 일괄 발급`}
            </div>
          </div>
          <button onClick={onClose} aria-label="닫기"
            className="w-7 h-7 rounded-md text-mute hover:text-ink hover:bg-bone-2">
            <Icon name="close" size={13} strokeWidth={2.4} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* 템플릿 */}
          <div>
            <label className="text-[11px] font-bold tracking-wide text-ink mb-1.5 block">템플릿</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pickTemplate(t.id)}
                  className={`px-2.5 py-2 rounded-lg border-2 text-left transition-all ${
                    tplId === t.id
                      ? 'bg-ink text-paper border-ink shadow-[0_2px_0_#1a1a1a] -translate-y-0.5'
                      : 'bg-paper text-ink border-ink/15 hover:border-ink'
                  }`}
                >
                  <div className="text-xs font-bold">{t.label}</div>
                  {t.id !== 'CUSTOM' && (
                    <div className={`text-[9px] mt-0.5 font-mono ${tplId === t.id ? 'text-paper/70' : 'text-mute'}`}>
                      {t.days}일
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* 금액 + 유효 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold tracking-wide text-ink mb-1.5 block">금액 (원)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={1000}
                step={1000}
                inputMode="numeric"
                className="w-full bg-bone-2 border-2 border-ink/20 rounded-lg px-3 py-2 font-mono text-sm font-bold text-ink focus:border-ink focus:bg-paper outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold tracking-wide text-ink mb-1.5 block">유효 (일)</label>
              <input
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                min={1}
                max={365}
                inputMode="numeric"
                className="w-full bg-bone-2 border-2 border-ink/20 rounded-lg px-3 py-2 font-mono text-sm font-bold text-ink focus:border-ink focus:bg-paper outline-none"
              />
              <div className="text-[10px] text-mute font-mono mt-1">만료: {expiry}</div>
            </div>
          </div>

          {/* 사유 */}
          <div>
            <label className="text-[11px] font-bold tracking-wide text-ink mb-1.5 block">사유 (audit log)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="예: VIP Diamond 14일 휴면 케어"
              maxLength={120}
              className="w-full bg-bone-2 border-2 border-ink/20 rounded-lg px-3 py-2 text-sm text-ink focus:border-ink focus:bg-paper outline-none"
            />
          </div>

          {/* 알림 옵션 */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="w-4 h-4 accent-ink"
            />
            <span className="text-sm font-bold text-ink">발급 후 알림톡 자동 발송</span>
          </label>

          {/* 요약 */}
          {recipients.length > 0 && Number(amount) > 0 && (
            <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <span className="text-emerald-800 font-bold">발급 대상</span>
              <span className="text-emerald-900 font-bold text-right tabular-nums">{recipients.length}명</span>
              <span className="text-emerald-800 font-bold">건당 금액</span>
              <span className="text-emerald-900 font-mono tabular-nums text-right">{formatKRWFull(amount)}</span>
              <span className="text-emerald-800 font-bold">총 가치</span>
              <span className="text-emerald-900 font-mono tabular-nums text-right font-bold">{formatKRWFull(totalValue)}</span>
            </div>
          )}
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
            {submitting ? '발급 중…' : <>
              <Icon name="star" size={12} strokeWidth={2.4} />
              {recipients.length}명에게 발급
            </>}
          </button>
        </footer>
      </div>
    </div>
  )
}
