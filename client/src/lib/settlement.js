/**
 * Settlement — 위탁자 정산 계산.
 *
 * 도메인 흐름
 *   1) 위탁자가 카드를 vault에 입고
 *   2) POKÉVAULT가 카드를 판매 (즉시구매 또는 옥션)
 *   3) 주문이 출고된 후 N일(default 7) 경과하면 정산 의무 발생
 *      ─ 고객 반품·분쟁 윈도우가 지난 시점
 *   4) 운영자가 위탁자에게 송금 → status: paid
 *
 * 수수료 정책 (POKÉVAULT 표준)
 *   - 즉시구매: 10%
 *   - 옥션:     12% (라이브 송출 비용 반영)
 *   - VIP 위탁자(≥ Diamond): 일률 -2% 할인
 *
 * 데이터 소스
 *   주문(order.items) 중 product.consigned_by 또는 product.consignor 필드가 있는 라인.
 *   백엔드가 위탁자 메타를 항상 발급하지 않으면 위탁자 ID만으로 그룹화.
 *
 * 상태 (클라이언트 추론)
 *   pending — 출고 후 N일 경과 안 됨 (정산 대기)
 *   due     — 정산 가능 (출고 후 N일 경과)
 *   paid    — 운영자가 송금 완료 (localStorage 또는 백엔드 settlement.paid_at)
 */

const SETTLEMENT_DAYS = 7
const COMMISSION = {
  buynow:  0.10,
  auction: 0.12,
  vip_discount: 0.02,
}

// localStorage 키 — 백엔드 미구현이어도 정산 처리 추적 가능
const PAID_KEY = 'pokevault:settlement:paid'

/**
 * 주문 라인 → 위탁 라인으로 변환.
 * 위탁자 정보가 없는 라인은 null 반환.
 */
export function lineToSettlement(order, item, idx) {
  const product = item.product || {}
  const consignorId = product.consigned_by || product.consignor?._id || product.consignor?.id
  if (!consignorId) return null

  const grossPrice = (item.unitPrice || 0) * (item.qty || 1)
  const saleType = order.sale_type || product.sale_type || 'buynow'
  const isVip = product.consignor?.user_grade === 'diamond' || product.consignor?.is_vip
  const commissionRate = (COMMISSION[saleType] ?? COMMISSION.buynow) - (isVip ? COMMISSION.vip_discount : 0)
  const commission = Math.round(grossPrice * commissionRate)
  const netAmount = grossPrice - commission

  // 출고 시점 — 백엔드가 shipping.shippedAt 안 주면 status 변경 시점 추정
  const shippedAt = order.shipping?.shippedAt
    || (order.status === 'shipped' || order.status === 'delivered' ? order.updatedAt : null)

  const status = inferSettlementStatus(order, shippedAt, `${order._id}_${idx}`)
  const dueAt = shippedAt
    ? new Date(new Date(shippedAt).getTime() + SETTLEMENT_DAYS * 86_400_000).toISOString()
    : null

  return {
    id: `${order._id}_${idx}`,
    orderId: order._id,
    orderNumber: order.orderNumber,
    consignorId,
    consignorName: product.consignor?.name || product.consignor_name || `위탁자 ${String(consignorId).slice(-6)}`,
    consignorAccount: product.consignor?.bank_account || null, // 송금 계좌
    productName: product.nameKo || product.name || '카드',
    productSku: product.sku || '',
    grossPrice,
    commissionRate,
    commission,
    netAmount,
    saleType,
    isVip,
    orderedAt: order.createdAt,
    shippedAt,
    dueAt,
    status,
  }
}

/** 정산 라인의 현재 상태 추론 (paid > due > pending) */
function inferSettlementStatus(order, shippedAt, lineId) {
  if (isPaid(lineId)) return 'paid'
  if (order.status === 'cancelled' || order.status === 'refunded') return 'cancelled'
  if (!shippedAt) return 'pending'
  const elapsedDays = (Date.now() - new Date(shippedAt).getTime()) / 86_400_000
  return elapsedDays >= SETTLEMENT_DAYS ? 'due' : 'pending'
}

/** 여러 주문에서 모든 정산 라인 추출 */
export function extractSettlements(orders = []) {
  const lines = []
  for (const order of orders) {
    const items = order.items || []
    items.forEach((it, idx) => {
      const s = lineToSettlement(order, it, idx)
      if (s) lines.push(s)
    })
  }
  return lines
}

/** 위탁자별로 묶기 — { consignorId: { name, totalNet, lines[], dueCount } } */
export function groupByConsignor(settlements = []) {
  const groups = {}
  for (const s of settlements) {
    if (!groups[s.consignorId]) {
      groups[s.consignorId] = {
        consignorId: s.consignorId,
        consignorName: s.consignorName,
        consignorAccount: s.consignorAccount,
        lines: [],
        totalGross: 0,
        totalCommission: 0,
        totalNet: 0,
        dueCount: 0,
        dueAmount: 0,
        pendingCount: 0,
        paidCount: 0,
      }
    }
    const g = groups[s.consignorId]
    g.lines.push(s)
    g.totalGross += s.grossPrice
    g.totalCommission += s.commission
    g.totalNet += s.netAmount
    if (s.status === 'due')     { g.dueCount++;     g.dueAmount += s.netAmount }
    if (s.status === 'pending') { g.pendingCount++ }
    if (s.status === 'paid')    { g.paidCount++ }
  }
  return Object.values(groups).sort((a, b) => b.dueAmount - a.dueAmount)
}

// ─── localStorage 영속 (백엔드 동기화 전) ───────────────
function loadPaidMap() {
  try { return JSON.parse(localStorage.getItem(PAID_KEY) || '{}') } catch { return {} }
}
function savePaidMap(map) {
  try { localStorage.setItem(PAID_KEY, JSON.stringify(map)) } catch { /* noop */ }
}

export function isPaid(lineId) {
  return !!loadPaidMap()[lineId]
}

export function markPaid(lineIds, paidInfo = {}) {
  const map = loadPaidMap()
  const ts = new Date().toISOString()
  const ids = Array.isArray(lineIds) ? lineIds : [lineIds]
  for (const id of ids) {
    map[id] = { paidAt: ts, ...paidInfo }
  }
  savePaidMap(map)
}

export function unmarkPaid(lineIds) {
  const map = loadPaidMap()
  const ids = Array.isArray(lineIds) ? lineIds : [lineIds]
  for (const id of ids) delete map[id]
  savePaidMap(map)
}

// ─── 상태 라벨 (UI 표시) ────────────────────────────
export const STATUS_LABEL = {
  pending:   { label: '대기',     tone: 'amber',   desc: '출고 후 7일 미경과' },
  due:       { label: '정산 가능', tone: 'red',     desc: '7일 경과 — 송금 필요' },
  paid:      { label: '지급 완료', tone: 'emerald', desc: '운영자가 송금 완료' },
  cancelled: { label: '취소·환불', tone: 'gray',    desc: '주문 취소·환불 — 정산 의무 없음' },
}

export { SETTLEMENT_DAYS, COMMISSION }
