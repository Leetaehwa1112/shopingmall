// ─── 주문 / 결제 / 배송 공통 상수 ─────────────────────────────
// Order 모델의 enum과 1:1로 대응. 추가 시 모델도 함께 업데이트해야 함.

export const ORDER_STATUS = {
  pending_payment: { label: '입금 전',    led: 'yellow', color: 'text-amber-700   bg-amber-50    border-amber-200',  step: 0  },
  paid:            { label: '결제 완료',  led: 'green',  color: 'text-emerald-700 bg-emerald-50  border-emerald-200', step: 1  },
  preparing:       { label: '배송 준비',  led: 'blue',   color: 'text-blue-700    bg-blue-50     border-blue-200',    step: 2  },
  ready_to_ship:   { label: '배송 대기',  led: 'amber',  color: 'text-amber-700   bg-amber-50    border-amber-200',   step: 3  },
  shipped:         { label: '배송중',     led: 'blue',   color: 'text-indigo-700  bg-indigo-50   border-indigo-200',  step: 4  },
  delivered:       { label: '배송 완료',  led: 'green',  color: 'text-emerald-700 bg-emerald-50  border-emerald-200', step: 5  },
  cancelled:       { label: '취소',       led: 'red',    color: 'text-rose-700    bg-rose-50     border-rose-200',    step: -1 },
  refunded:        { label: '환불 완료',  led: 'red',    color: 'text-rose-700    bg-rose-50     border-rose-200',    step: -1 },
  unknown:         { label: '알 수 없음', led: 'red',    color: 'text-mute        bg-bone-2      border-gray-900/15',  step: -1 },
}

// 6단계 진행 라벨 (HP-bar 등 진행 표시용)
export const ORDER_PROGRESS_STEPS = ['주문 확정', '결제 완료', '배송 준비', '배송 대기', '배송중', '배송 완료']

// 취소 가능 / 환불 가능 상태
export const CANCELLABLE_STATUSES = ['pending_payment', 'paid', 'preparing', 'ready_to_ship']
export const REFUNDABLE_STATUSES  = ['paid', 'delivered']

// 필터 탭 (전체 + 모든 상태)
export const ORDER_FILTERS = [
  { value: 'all',             label: '전체',      led: null     },
  { value: 'pending_payment', label: '입금 전',   led: 'yellow' },
  { value: 'paid',            label: '결제 완료', led: 'green'  },
  { value: 'preparing',       label: '배송 준비', led: 'blue'   },
  { value: 'ready_to_ship',   label: '배송 대기', led: 'amber'  },
  { value: 'shipped',         label: '배송중',    led: 'blue'   },
  { value: 'delivered',       label: '배송 완료', led: 'green'  },
  { value: 'cancelled',       label: '취소',      led: 'red'    },
  { value: 'refunded',        label: '환불 완료', led: 'red'    },
]

// ─── 결제 수단 ─────────────────────────────────────────────
export const PAYMENT_METHOD = {
  card:   { label: '신용카드',  v2: 'CARD' },
  toss:   { label: '토스페이',  v2: 'EASY_PAY' },
  kakao:  { label: '카카오페이', v2: 'EASY_PAY' },
  bank:   { label: '가상계좌',  v2: 'VIRTUAL_ACCOUNT' },
  escrow: { label: '에스크로',  v2: 'CARD' },
}

export const PAYMENT_LABEL = Object.fromEntries(
  Object.entries(PAYMENT_METHOD).map(([k, v]) => [k, v.label])
)

// ─── 배송 수단 ─────────────────────────────────────────────
export const SHIPPING_METHOD = {
  standard: { label: '일반 배송',         fee: 0      },
  fedex:    { label: 'FedEx Priority',   fee: 30000  },
  quick:    { label: '퀵 배송',           fee: 15000  },
  brinks:   { label: "Brink's 무장 호송", fee: 100000 },
  pickup:   { label: '직접 수령',         fee: 0      },
}

export const SHIPPING_LABEL = Object.fromEntries(
  Object.entries(SHIPPING_METHOD).map(([k, v]) => [k, v.label])
)

export const SHIPPING_FEE = Object.fromEntries(
  Object.entries(SHIPPING_METHOD).map(([k, v]) => [k, v.fee])
)

// 에스크로 자동 적용 임계금액 (Order 모델과 동일)
export const ESCROW_THRESHOLD = 1_000_000

// ─── 헬퍼 ──────────────────────────────────────────────────
export const getOrderStatus = (status) => ORDER_STATUS[status] || ORDER_STATUS.unknown
export const getPaymentLabel = (method) => PAYMENT_LABEL[method] || method
export const getShippingLabel = (method) => SHIPPING_LABEL[method] || method
export const isOrderCancellable = (status) => CANCELLABLE_STATUSES.includes(status)
export const isOrderRefundable  = (status) => REFUNDABLE_STATUSES.includes(status)
