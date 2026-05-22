import api from './axios'

// ─── 고객 ─────────────────────────────────────────────────
/** 주문 생성 (결제 완료 후 호출) */
export const createOrder = (payload) => api.post('/orders', payload)

/** 내 주문 목록 (페이지네이션 + 필터) */
export const getMyOrders = ({ page = 1, limit = 5, status } = {}) => {
  const params = { page, limit }
  if (status && status !== 'all') params.status = status
  return api.get('/orders/me', { params })
}

/** 주문 단건 조회 */
export const getOrderById = (id) => api.get(`/orders/${id}`)

/** 주문 취소 (고객) */
export const cancelOrder = (id, reason = '사용자 요청') =>
  api.patch(`/orders/${id}/cancel`, { reason })

// ─── 관리자 ───────────────────────────────────────────────
/** 전체 주문 조회 */
export const getAllOrders = ({ page = 1, limit = 10, status, search } = {}) => {
  const params = { page, limit }
  if (status && status !== 'all') params.status = status
  if (search) params.search = search
  return api.get('/orders', { params })
}

/** 주문 상태 변경 (관리자) */
export const updateOrderStatus = (id, status) =>
  api.patch(`/orders/${id}/status`, { status })

/** 송장 등록 (관리자) */
export const updateOrderTracking = (id, { trackingNumber, carrier }) =>
  api.patch(`/orders/${id}/tracking`, { trackingNumber, carrier })

/** 환불 처리 (관리자) — amount 미지정 시 전액 환불 */
export const refundOrder = (id, { reason, amount } = {}) =>
  api.patch(`/orders/${id}/refund`, { reason, amount })
