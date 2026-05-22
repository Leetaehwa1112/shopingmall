/**
 * CustomerOrderTracking — 고객이 자기 주문 진행을 확인하는 컴포넌트.
 *
 * 운영 의도
 *   고객의 "어디까지 갔어요?" 문의를 0건으로.
 *   admin의 풀필먼트 진행을 고객 perspective로 변환:
 *     - 내부 체크리스트는 숨김 (검수 사진/Cert 등 내부 정보)
 *     - 도메인 alert(운영자용)은 숨김
 *     - 단순 timeline + 현재 상태 + 캐리어 추적 + 문의 채널
 *
 *   비회원도 주문번호 + 휴대폰 매칭으로 접근 가능 (TrackOrderPage에서 가드).
 *
 * Props
 *   order: 주문 객체
 */
import { useMemo } from 'react'
import OrderFulfillmentTimeline from '@/components/admin/OrderFulfillmentTimeline'
import CarrierTrackingCard from '@/components/admin/CarrierTrackingCard'
import { STAGES, inferStage } from '@/lib/fulfillment'
import { carrierMeta } from '@/lib/carriers'
import Icon from './Icon'

// 고객용 단계 메시지 — 친절·따뜻한 톤 (운영자용 stage.operatorAction과 별개)
const CUSTOMER_TONE = {
  paid_received: {
    headline: '주문이 접수되었어요! 🎉',
    body: '24시간 안에 카드 검수 후 발송 준비를 시작합니다.',
  },
  inspection: {
    headline: '카드 검수 중이에요',
    body: '저희 검수팀이 카드 상태와 인증서를 꼼꼼히 확인하고 있어요.',
  },
  packing: {
    headline: '안전하게 포장 중이에요 📦',
    body: '슬리브 → 톱로더 → 버블랩 → 박스. 5겹 안전 포장으로 발송됩니다.',
  },
  tracking_input: {
    headline: '운송장 등록 중',
    body: '잠시 후 발송되며, 운송장 번호가 부여되면 알림톡으로 알려드려요.',
  },
  shipped: {
    headline: '발송됐어요! ✈️',
    body: '카드가 출고되어 배송 중입니다. 캐리어 사이트에서 실시간 추적 가능해요.',
  },
  in_transit: {
    headline: '운송 중',
    body: '카드가 안전하게 이동하고 있어요. 보통 1~3일 안에 도착합니다.',
  },
  out_for_delivery: {
    headline: '오늘 도착 예정! 🚚',
    body: '오늘 안에 도착할 예정이에요. 부재 시 안전한 곳에 보관해 주세요.',
  },
  delivered: {
    headline: '카드가 도착했어요! 🎴',
    body: '상태 확인 후 수령 확인을 부탁드려요. 문제가 있으면 24시간 안에 알려주세요.',
  },
  received: {
    headline: '거래가 완료되었어요 ✨',
    body: '저희와 함께해 주셔서 감사합니다. 다음에도 멋진 카드로 모실게요!',
  },
}

export default function CustomerOrderTracking({ order }) {
  const stage = useMemo(() => inferStage(order), [order])
  const tone = stage && CUSTOMER_TONE[stage.id]

  if (!order) return null

  if (order.status === 'cancelled' || order.status === 'refunded') {
    return (
      <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-6 text-center">
        <Icon name="close" size={28} strokeWidth={2.4} className="text-rose-700 mx-auto mb-2" />
        <div className="font-display text-lg font-bold text-rose-900">
          {order.status === 'cancelled' ? '주문이 취소되었어요' : '환불 완료'}
        </div>
        <p className="text-sm text-rose-800 mt-1">
          문의 사항은 고객센터(1588-0420)로 연락 부탁드려요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Hero — 현재 단계 메시지 (가장 친절한 한마디) */}
      {tone && (
        <section className="bg-paper border-2 border-ink rounded-2xl p-5 shadow-[0_4px_0_#1a1a1a]">
          <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute mb-1.5">
            주문 #{order.orderNumber}
          </div>
          <h1 className="font-display text-2xl font-bold text-ink leading-tight">
            {tone.headline}
          </h1>
          <p className="text-sm text-mute font-medium mt-2 leading-relaxed">
            {tone.body}
          </p>
        </section>
      )}

      {/* 9-step Timeline */}
      {stage && (
        <section className="bg-paper border border-ink/10 rounded-2xl p-5">
          <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute mb-3">
            진행 상황
          </div>
          <OrderFulfillmentTimeline stages={STAGES} currentStageId={stage.id} />
        </section>
      )}

      {/* 캐리어 추적 카드 — 운송장 있을 때만 */}
      {order.shipping?.trackingNumber && (
        <section>
          <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute mb-2 px-1">
            실시간 추적
          </div>
          <CarrierTrackingCard order={order} />
        </section>
      )}

      {/* 예상 도착 — 캐리어 평균 일수 기반 */}
      {order.shipping?.trackingNumber && stage && ['shipped', 'in_transit', 'out_for_delivery'].includes(stage.id) && (
        <section className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-3.5 flex items-start gap-2.5">
          <Icon name="bolt" size={14} strokeWidth={2.4} className="text-emerald-700 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-emerald-900">
              예상 도착: {carrierMeta(order.shipping.carrier).avgDays}
            </div>
            <div className="text-[11px] text-emerald-800 font-medium mt-0.5">
              {carrierMeta(order.shipping.carrier).coverage}
            </div>
          </div>
        </section>
      )}

      {/* 주문 내역 요약 */}
      <section className="bg-paper border border-ink/10 rounded-2xl p-5">
        <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-mute mb-3">
          주문 내역
        </div>
        <ul className="space-y-2 mb-4">
          {(order.items || []).map((it, i) => {
            const label = it.product?.nameKo || it.product?.name || it.pack?.nameKo || it.pack?.name || '—'
            return (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="flex-1 text-ink font-medium truncate">{label}</span>
                <span className="text-mute font-mono tabular-nums">×{it.qty}</span>
                <span className="text-ink font-mono tabular-nums font-bold w-20 text-right">
                  ₩{((it.unitPrice || 0) * (it.qty || 1)).toLocaleString()}
                </span>
              </li>
            )
          })}
        </ul>
        <div className="border-t border-ink/10 pt-3 flex items-center justify-between text-sm">
          <span className="text-mute font-bold">총 결제 금액</span>
          <span className="font-display font-bold text-lg text-ink tabular-nums">
            ₩{(order.totalAmount || 0).toLocaleString()}
          </span>
        </div>
      </section>

      {/* 문의 CTA — 어디서든 도움 요청 가능 */}
      <section className="bg-bone-2/60 border border-ink/10 rounded-xl p-4 text-center">
        <div className="text-xs text-mute font-medium mb-2">도움이 필요하신가요?</div>
        <a href="tel:1588-0420" className="inline-flex items-center gap-1.5 text-sm font-bold text-ink hover:text-dex transition-colors">
          <Icon name="bolt" size={12} strokeWidth={2.4} />
          고객센터 1588-0420
        </a>
        <div className="text-[10px] text-mute font-mono mt-1">평일 10:00~18:00 · 카드 거래 전문 상담</div>
      </section>
    </div>
  )
}
