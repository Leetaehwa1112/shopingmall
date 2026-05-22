/**
 * CarrierTrackingCard — 캐리어 + 운송장 + 추적 링크 카드.
 *
 * 운영 의도
 *   배송 단계에서 운영자가 자주 묻는 두 질문:
 *     1) 지금 어디까지 갔어? → 캐리어 사이트 한 클릭으로 점프
 *     2) 평균 며칠 걸려? → avgDays 즉시 표시
 *
 *   고객 응대 시에도 같은 카드를 그대로 공유 가능 (URL 복사 버튼).
 *
 * Props
 *   order: { shipping: { carrier, trackingNumber, shippedAt } }
 *   showRecommendation: 권장 캐리어 안내 (운송장 미입력 시)
 */
import { useMemo } from 'react'
import Icon from '@/components/common/Icon'
import useToastStore from '@/store/toastStore'
import { carrierMeta, trackingUrl, recommendCarrier } from '@/lib/carriers'

export default function CarrierTrackingCard({ order, showRecommendation = false }) {
  const toast = useToastStore((s) => s.push)
  const tracking = order.shipping?.trackingNumber
  const carrier = order.shipping?.carrier
  const meta = useMemo(() => carrierMeta(carrier), [carrier])
  const url = useMemo(() => trackingUrl(carrier, tracking), [carrier, tracking])
  const recommended = useMemo(() => recommendCarrier(order.totalAmount), [order.totalAmount])

  // 운송장 미입력 — 권장 캐리어 안내
  if (!tracking) {
    if (!showRecommendation) return null
    return (
      <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-3.5">
        <div className="flex items-start gap-2.5">
          <Icon name="package" size={14} strokeWidth={2.4} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-amber-900">아직 운송장 미등록</div>
            <div className="text-[11px] text-amber-800 font-medium mt-0.5">
              이 주문(₩{(order.totalAmount || 0).toLocaleString()})에는 <span className="font-bold">{recommended}</span> 권장.
              <br />
              <span className="text-[10px] text-amber-700">{carrierMeta(recommended).notes}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function copyUrl() {
    navigator.clipboard?.writeText(url).then(() => {
      toast?.({ type: 'success', title: '추적 URL 복사됨', message: '고객 응대 시 그대로 붙여넣기' })
    }, () => {
      toast?.({ type: 'error', title: '복사 실패' })
    })
  }

  return (
    <div className="bg-paper border-2 border-ink/10 rounded-xl overflow-hidden">
      {/* 헤더 — 캐리어 정보 */}
      <header className="px-3.5 py-2.5 border-b border-ink/10 bg-bone-2/40 flex items-center gap-3">
        <span className="text-2xl shrink-0" aria-hidden>{meta.logo}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-ink">{meta.name}</div>
          <div className="text-[10px] text-mute font-mono mt-0.5">{meta.coverage} · 평균 {meta.avgDays}</div>
        </div>
        <span className="text-[9px] font-bold tracking-wider uppercase text-mute font-mono bg-paper border border-ink/10 px-1.5 py-0.5 rounded">
          {meta.short}
        </span>
      </header>

      {/* 운송장 번호 */}
      <div className="px-3.5 py-3">
        <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute mb-1">운송장 번호</div>
        <div className="font-mono text-base font-bold text-ink tabular-nums break-all">{tracking}</div>
        {order.shipping?.shippedAt && (
          <div className="text-[10px] text-mute font-mono mt-1">
            출고: {new Date(order.shipping.shippedAt).toLocaleString('ko-KR')}
          </div>
        )}
      </div>

      {/* 추적 액션 — 외부 사이트 + URL 복사 */}
      <div className="px-3.5 pb-3 flex items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 border-ink bg-ink text-paper text-xs font-bold shadow-[0_2px_0_#1a1a1a] hover:-translate-y-0.5 hover:shadow-[0_4px_0_#1a1a1a] active:translate-y-0.5 active:shadow-[0_1px_0_#1a1a1a] transition-all"
        >
          <Icon name="arrow" size={11} strokeWidth={2.6} />
          {meta.name}에서 추적
        </a>
        <button
          type="button"
          onClick={copyUrl}
          title="추적 URL 복사 (고객 응대용)"
          className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border-2 border-ink/15 bg-paper text-xs font-bold text-mute hover:text-ink hover:border-ink"
        >
          <Icon name="package" size={11} strokeWidth={2.2} />
          URL 복사
        </button>
      </div>

      {meta.notes && (
        <div className="px-3.5 py-2 bg-bone-2/30 border-t border-ink/5 text-[10px] text-mute font-medium leading-relaxed">
          💡 {meta.notes}
        </div>
      )}
    </div>
  )
}
