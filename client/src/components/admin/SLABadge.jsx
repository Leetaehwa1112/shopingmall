/**
 * SLABadge — 주문 결제 후 경과 시간 + SLA 위험도 색상.
 *
 * 운영 효율 의도
 *   주문 리스트를 스캔만 해도 "어떤 건이 곧 지연되나"를 즉시 인식.
 *   각 row의 SLA 컬럼에서 빨간 dot만 보면 → 우선 처리.
 *
 *   기준 (포케볼트 정책 — 외부 설정 가능):
 *     - paid → shipped 까지: 24시간 SLA
 *       0~12h:   green ("여유")
 *       12~18h:  yellow ("주의")
 *       18~24h:  amber ("임박")
 *       24h+:    red ("위반")
 *     - 이미 출고/완료된 건은 컬러 없는 회색 배지
 *     - 취소/환불은 회색
 */
import { useEffect, useState } from 'react'

const SLA_HOURS = 24
const SLA_TIERS = [
  { until: 12, tone: 'emerald', label: '여유' },
  { until: 18, tone: 'amber',   label: '주의' },
  { until: 24, tone: 'orange',  label: '임박' },
  { until: Infinity, tone: 'red', label: '위반' },
]

const TONE_CLASS = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  orange:  'bg-orange-50 text-orange-700 border-orange-300',
  red:     'bg-rose-50 text-rose-700 border-rose-300 animate-sla-pulse',
  gray:    'bg-bone-2 text-mute border-ink/10',
}

/**
 * @param {object} order — 주문 객체 (createdAt + status)
 * @param {string} [paidAtField] — 결제 완료 timestamp 필드명 (default: createdAt)
 */
export default function SLABadge({ order, paidAtField = 'createdAt' }) {
  // 현재 시간을 1분마다 업데이트하여 SLA 카운트다운이 살아있는 것처럼
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])

  // 출고 완료/취소된 건은 SLA 표시 의미 없음
  const completed = ['shipped', 'delivered', 'cancelled', 'refunded'].includes(order.status)
  if (completed) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${TONE_CLASS.gray}`}>
        —
      </span>
    )
  }

  // 결제 완료가 아닌 건도 표시 안 함 (결제 대기 등)
  if (order.status !== 'paid' && order.status !== 'preparing') {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${TONE_CLASS.gray}`}>
        대기
      </span>
    )
  }

  const paidAt = new Date(order[paidAtField]).getTime()
  if (!paidAt) return null
  const elapsedH = (now - paidAt) / 3_600_000

  const tier = SLA_TIERS.find((t) => elapsedH < t.until) || SLA_TIERS[SLA_TIERS.length - 1]
  const remainingH = SLA_HOURS - elapsedH

  return (
    <>
      <span
        title={`결제 후 ${formatHours(elapsedH)} 경과 · SLA ${SLA_HOURS}h 기준 ${remainingH >= 0 ? `${formatHours(remainingH)} 남음` : `${formatHours(-remainingH)} 초과`}`}
        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums border ${TONE_CLASS[tier.tone]}`}
      >
        {remainingH >= 0 ? (
          <>{formatHours(elapsedH)}<span className="opacity-60">/24h</span></>
        ) : (
          <>+{formatHours(-remainingH)}</>
        )}
      </span>
      {/* pulse keyframe — 위반(red)일 때만 사용 */}
      <style>{`
        @keyframes sla-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(244, 63, 94, 0.35); }
          50%      { box-shadow: 0 0 0 3px rgba(244, 63, 94, 0); }
        }
        .animate-sla-pulse { animation: sla-pulse 2s ease-in-out infinite; }
      `}</style>
    </>
  )
}

function formatHours(h) {
  if (h < 1) return `${Math.round(h * 60)}m`
  if (h < 24) return `${h.toFixed(1)}h`
  return `${Math.floor(h / 24)}d${Math.round(h % 24)}h`
}

/**
 * isOrderSLAExpiring(order) — saved view 필터링용 헬퍼.
 *   결제 후 18h+ 미출고 → true (임박/위반)
 */
export function isOrderSLAExpiring(order) {
  if (!['paid', 'preparing'].includes(order.status)) return false
  const paidAt = new Date(order.createdAt).getTime()
  if (!paidAt) return false
  const elapsedH = (Date.now() - paidAt) / 3_600_000
  return elapsedH >= 18
}

/** isOrderSLAViolated — 24h+ 위반된 건만 */
export function isOrderSLAViolated(order) {
  if (!['paid', 'preparing'].includes(order.status)) return false
  const paidAt = new Date(order.createdAt).getTime()
  if (!paidAt) return false
  return (Date.now() - paidAt) / 3_600_000 >= 24
}
