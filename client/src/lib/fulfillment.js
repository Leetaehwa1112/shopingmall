/**
 * Order Fulfillment Pipeline — 9 stages.
 *
 * 운영 의도
 *   백엔드 status 5종(pending_payment/paid/preparing/shipped/delivered)을
 *   운영자 워크플로우 9 micro-step으로 확장.
 *   매 단계에서 "지금 할 일이 무엇이고, 무엇을 확인해야 하며, 어떤 위험이 있는지"가
 *   한 화면에 친절하게 보이도록 — 신규 운영자도 매뉴얼 없이 처리 가능.
 *
 *   micro-step은 백엔드 모델 변경 없이 클라이언트가 추적:
 *     - server status (paid/preparing/shipped/delivered)
 *     - shipping.trackingNumber 존재 여부
 *     - localStorage `fulfillment:${orderId}` 체크리스트 — 운영자가 체크한 진행 상황
 *
 *   백엔드 확장 시 order.fulfillment_stage / inspected_at / packed_at 필드 추가로 마이그.
 */

// ─── 9 단계 ────────────────────────────────────────────
export const STAGES = [
  {
    id: 'paid_received',
    step: 1,
    label: '결제 접수',
    short: '결제',
    tone: 'emerald',
    customerMsg: '주문해주셔서 감사합니다! 24시간 이내 검수 후 발송됩니다.',
  },
  {
    id: 'inspection',
    step: 2,
    label: '카드 검수',
    short: '검수',
    tone: 'amber',
    operatorAction: '카드 실물 검수',
    cta: '검수 완료',
    checklist: [
      { id: 'cert_match',   label: 'Cert # 와 실물 인증서 라벨 일치', critical: true },
      { id: 'card_intact',  label: '카드 표면 손상 없음 (앞/뒤 확인)', critical: true },
      { id: 'sleeve_ok',    label: '슬리브·톱로더에 들어있는 상태' },
      { id: 'photo_taken',  label: '검수 사진 촬영 (분쟁 대비)', critical: true },
    ],
    nextHint: '검수 통과 후 → 포장 단계',
    customerNotify: false, // 검수는 내부 작업, 고객 알림 없음
  },
  {
    id: 'packing',
    step: 3,
    label: '안전 포장',
    short: '포장',
    tone: 'amber',
    operatorAction: '포장 진행',
    cta: '포장 완료',
    checklist: [
      { id: 'sleeve',     label: '카드 슬리브 (페니 슬리브)' },
      { id: 'toploader',  label: '톱로더 또는 카드 세이버' },
      { id: 'tape',       label: '톱로더 입구 테이핑' },
      { id: 'bubble',     label: '버블랩 2겹 이상' },
      { id: 'box',        label: '안전 박스 또는 패딩 봉투' },
      { id: 'thanks_card', label: '감사 카드 동봉 (선택)' },
    ],
    nextHint: '포장 후 → 운송장 등록',
    customerNotify: false,
  },
  {
    id: 'tracking_input',
    step: 4,
    label: '운송장 등록',
    short: '운송장',
    tone: 'blue',
    operatorAction: '캐리어 + 운송장 번호 입력',
    cta: '운송장 저장',
    checklist: [
      { id: 'carrier_picked', label: '캐리어 선택 (FedEx · Brink\'s · CJ · 우체국)', critical: true },
      { id: 'tracking_no',    label: '운송장 번호 입력 또는 바코드 스캔', critical: true },
      { id: 'recipient_chk',  label: '수령인 이름·연락처 라벨 확인' },
      { id: 'address_chk',    label: '도착지 주소 정확 (우편번호 포함)', critical: true },
    ],
    nextHint: '운송장 저장 → 자동 알림톡 발송 → 출고 처리',
    customerNotify: true,
    customerMsg: '발송이 완료되었어요. 운송장 {tracking}으로 추적 가능합니다.',
  },
  {
    id: 'shipped',
    step: 5,
    label: '출고 완료',
    short: '출고',
    tone: 'blue',
    operatorAction: '출고 처리',
    cta: '출고 확정',
    checklist: [
      { id: 'handed_carrier', label: '캐리어에 인계 완료' },
      { id: 'tracking_active', label: '운송장 추적이 시작됨 (캐리어 사이트 확인)' },
    ],
    nextHint: '캐리어가 배송 — 다음 액션은 도착 후',
    customerNotify: true,
    customerMsg: '카드가 출고되었습니다! 보통 1~3일 내에 도착해요.',
  },
  {
    id: 'in_transit',
    step: 6,
    label: '운송 중',
    short: '운송중',
    tone: 'blue',
    automatic: true,                    // 운영자 액션 없음 — 캐리어가 처리
    operatorAction: '자동 (캐리어가 배송 중)',
    nextHint: '배송 출발 또는 도착 안내가 오면 자동 진행',
    customerNotify: false,
  },
  {
    id: 'out_for_delivery',
    step: 7,
    label: '배송 출발',
    short: '배송출발',
    tone: 'blue',
    automatic: true,
    operatorAction: '자동 (당일 배송 출발)',
    nextHint: '오늘 도착 예정 — 자동 알림톡 발송',
    customerNotify: true,
    customerMsg: '오늘 도착 예정입니다! 부재 시 안전한 곳에 보관 부탁드려요.',
  },
  {
    id: 'delivered',
    step: 8,
    label: '도착 완료',
    short: '도착',
    tone: 'emerald',
    operatorAction: '고객 수령 확인 대기',
    cta: '수령 확인 처리',
    checklist: [
      { id: 'tracking_delivered', label: '캐리어 추적이 "배달 완료"로 갱신' },
      { id: 'signature_ok',       label: '서명 영수증 확보 (고가 카드 필수)', critical: true },
      { id: 'no_complaint_24h',   label: '24시간 내 고객 클레임 없음' },
    ],
    nextHint: '7일 자동 확정 또는 고객 수령 확인 시 완료',
    customerNotify: true,
    customerMsg: '카드가 도착했어요! 상태 확인 후 수령 확인 부탁드립니다.',
  },
  {
    id: 'received',
    step: 9,
    label: '거래 완료',
    short: '완료',
    tone: 'emerald',
    final: true,
    operatorAction: '거래 완료 — 정산 진행',
    customerNotify: false,
    nextHint: '위탁자 정산 (위탁 주문인 경우) · 후기 요청 알림',
  },
]

// ─── 단계 추론 — 주문 객체 + localStorage 진행 상태로 ──
//
// 우선순위:
//   server status가 진실의 원천 (paid/preparing/shipped/delivered)
//   그 안에서 클라이언트 체크리스트로 micro-step 추론.
//
//   paid + 검수 체크 안 됨            → inspection
//   paid + 검수 체크됨 + 포장 안 됨    → packing
//   paid + 포장됨 + 운송장 없음        → tracking_input
//   preparing + 운송장 있음            → shipped (= 4단계 운송장 저장은 끝났고 출고 확정만)
//   shipped + (≤24h)                  → shipped
//   shipped + (>24h, <delivered)       → in_transit
//   shipped + (~same day delivered)    → out_for_delivery (백엔드가 자동 갱신해줘야 정확)
//   delivered                         → delivered
//   delivered + customer_confirmed    → received

const KEY = (orderId) => `fulfillment:${orderId}`

export function loadChecklist(orderId) {
  try { return JSON.parse(localStorage.getItem(KEY(orderId)) || '{}') } catch { return {} }
}

export function saveChecklist(orderId, checklist) {
  try { localStorage.setItem(KEY(orderId), JSON.stringify(checklist)) } catch { /* noop */ }
}

export function inferStage(order) {
  if (!order) return STAGES[0]
  const status = order.status
  const tracking = order.shipping?.trackingNumber
  const cl = loadChecklist(order._id || order.id)

  if (status === 'cancelled' || status === 'refunded') return null
  if (status === 'pending_payment') return STAGES[0] // 결제 대기는 사실 결제 전이라 별도지만 단순화

  if (status === 'paid') {
    if (!isStageComplete(cl, 'inspection')) return STAGES[1]   // 검수
    if (!isStageComplete(cl, 'packing'))    return STAGES[2]   // 포장
    if (!tracking)                          return STAGES[3]   // 운송장 등록
    return STAGES[4] // 운송장 저장됐는데 아직 shipped 안 됨 → 출고 확정 대기
  }

  if (status === 'preparing') {
    if (!tracking) return STAGES[3]    // preparing인데 운송장 없는 비정상 케이스
    return STAGES[4]                   // 출고 확정 대기
  }

  if (status === 'shipped') {
    const shippedAt = order.shipping?.shippedAt || order.updatedAt
    const hours = shippedAt ? (Date.now() - new Date(shippedAt).getTime()) / 3_600_000 : 0
    if (hours >= 24) return STAGES[5]  // in_transit
    return STAGES[4]                    // shipped (방금 출고)
  }

  if (status === 'delivered') {
    if (cl.customer_confirmed) return STAGES[8] // received
    return STAGES[7]                            // delivered
  }

  return STAGES[0]
}

/** 각 stage의 체크리스트가 모두 critical 항목 완료됐는지 (운영자가 체크한 진행 상태) */
export function isStageComplete(checklist, stageId) {
  const stage = STAGES.find((s) => s.id === stageId)
  if (!stage?.checklist) return true
  return stage.checklist
    .filter((c) => c.critical !== false) // critical 만 필수
    .every((c) => checklist[`${stageId}.${c.id}`])
}

/** 단계의 critical 체크 완료 비율 (0-1) */
export function stageProgress(checklist, stageId) {
  const stage = STAGES.find((s) => s.id === stageId)
  if (!stage?.checklist?.length) return 1
  const total = stage.checklist.length
  const done = stage.checklist.filter((c) => checklist[`${stageId}.${c.id}`]).length
  return done / total
}

/** 체크 토글 헬퍼 */
export function toggleCheck(orderId, stageId, checkId) {
  const cl = loadChecklist(orderId)
  const key = `${stageId}.${checkId}`
  const next = { ...cl, [key]: !cl[key] }
  saveChecklist(orderId, next)
  return next
}

// ─── 도메인 주의사항 (alert) ─────────────────────────
//
// 주문 객체를 보고 운영자에게 노출할 alert 배열을 반환.
// 예: 고가 카드, 도서산간, Cert # 미입력, 위탁자 직배송 등.
export function getDomainAlerts(order) {
  if (!order) return []
  const alerts = []
  const total = order.totalAmount || 0
  const items = order.items || []

  if (total >= 1_000_000) {
    alerts.push({
      level: 'critical',
      icon: 'lock',
      title: `고가 주문 — ${(total / 10_000).toFixed(0)}만원`,
      desc: 'Brink\'s 무장 호송 또는 보험 배송 필수. 서명 수령 강제.',
    })
  } else if (total >= 500_000) {
    alerts.push({
      level: 'warning',
      icon: 'flame',
      title: '고가 주문 — 보험 권장',
      desc: '50만원 이상 — 보험 옵션 + 서명 수령 권장.',
    })
  }

  // PSA 인증 카드 — Cert # 매칭 필수
  const hasPsaCard = items.some((it) => it.product?.cert_number || it.product?.grade)
  if (hasPsaCard) {
    alerts.push({
      level: 'info',
      icon: 'shield',
      title: '인증 등급 카드 포함',
      desc: 'Cert # 라벨과 실물 인증서 사진 매칭 필수. 검수 단계에서 확인.',
    })
  }

  // 도서산간 주소
  const addr = order.shipping?.address || {}
  const remote = /제주|울릉|독도|백령/.test(addr.address1 || addr.full || '')
  if (remote) {
    alerts.push({
      level: 'warning',
      icon: 'arrow',
      title: '도서산간 배송',
      desc: '추가 배송비 + 도착 1~2일 추가 소요. 알림톡에 명시 권장.',
    })
  }

  // 위탁 주문 — items에 위탁자 정보가 있으면
  const hasConsign = items.some((it) => it.product?.consigned_by || it.product?.consignor)
  if (hasConsign) {
    alerts.push({
      level: 'info',
      icon: 'shield',
      title: '위탁 판매 카드 포함',
      desc: '위탁자 vault에서 출고 또는 직배송 가능. 정산은 출고 후 7일.',
    })
  }

  return alerts
}

/** 단순한 알림톡 메시지 렌더 (템플릿 placeholders 치환) */
export function renderCustomerMessage(stage, order) {
  if (!stage?.customerMsg) return null
  return stage.customerMsg
    .replace('{tracking}', order.shipping?.trackingNumber || '(곧 등록)')
    .replace('{name}',     order.shipping?.recipient || '고객님')
    .replace('{orderNo}',  order.orderNumber || '')
}
