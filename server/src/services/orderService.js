const Order = require('../models/Order')
const Cart = require('../models/Cart')
const Product = require('../models/Product')

// ─── 도메인 상수 ────────────────────────────────────────────
const SHIPPING_FEES = { standard: 0, fedex: 30000, quick: 50000, brinks: 1500000, pickup: 0 }
const VALID_ADMIN_STATUSES = ['paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded']

// ─── 커스텀 에러 ────────────────────────────────────────────
class AppError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

// ─── 내부 헬퍼 ─────────────────────────────────────────────

/** 주문 아이템 검증 (재고/판매상태) */
const validateOrderItems = (items) => {
  for (const item of items) {
    if (!item.product || item.product.status !== 'active') {
      throw new AppError(`"${item.product?.name || '상품'}"은 현재 판매 중이 아닙니다.`)
    }
    if (item.product.stock < item.qty) {
      throw new AppError(`"${item.product.name}" 재고가 부족합니다. (남은 재고: ${item.product.stock})`)
    }
  }
}

/** 카트 → 주문아이템 / 프론트아이템 → 주문아이템 (폴백) */
const resolveOrderItems = async (userId, clientItems) => {
  const cart = await Cart.findOne({ user: userId })
    .populate('items.product', 'name nameKo price stock status')

  if (cart && cart.items.length > 0) {
    validateOrderItems(cart.items)
    return cart.items
  }
  if (!clientItems?.length) {
    throw new AppError('장바구니가 비어있습니다.')
  }
  const populated = await Promise.all(
    clientItems.map(async (ci) => {
      const product = await Product.findById(ci.id || ci._id)
        .select('name nameKo price stock status')
      return {
        product,
        qty: ci.qty || 1,
        priceSnapshot: ci.priceSnapshot || ci.price,
        shippingOption: ci.shippingOption,
      }
    })
  )
  validateOrderItems(populated)
  return populated
}

/** 금액 계산 */
const calculateAmount = (orderItems, shippingMethod, insuranceEnabled) => {
  const subtotal = orderItems.reduce(
    (sum, item) => sum + (item.priceSnapshot || item.product.price) * item.qty, 0
  )
  const shippingFee  = SHIPPING_FEES[shippingMethod] ?? 0
  const insuranceFee = insuranceEnabled ? Math.floor(subtotal * 0.005) : 0
  const totalAmount  = subtotal + shippingFee + insuranceFee
  return { subtotal, shippingFee, insuranceFee, totalAmount }
}

/** 재고 일괄 차감/복구 */
const adjustStock = (items, delta) =>
  Promise.all(items.map((item) =>
    Product.findByIdAndUpdate(item.product._id || item.product, { $inc: { stock: delta * item.qty } })
  ))

// ─── 공개 서비스 함수 ──────────────────────────────────────

/** 주문 생성 */
const createOrder = async (userId, payload) => {
  const {
    shippingMethod, recipient, phone, address,
    requireSignature = true, insuranceEnabled = false, memo = '',
    paymentMethod, paymentId, clientItems,
  } = payload

  const orderItems = await resolveOrderItems(userId, clientItems)
  const amount = calculateAmount(orderItems, shippingMethod, insuranceEnabled)

  const order = await Order.create({
    user: userId,
    items: orderItems.map((item) => ({
      product:        item.product._id,
      qty:            item.qty,
      unitPrice:      item.priceSnapshot || item.product.price,
      shippingOption: item.shippingOption || 'standard',
    })),
    ...amount,
    shipping: { method: shippingMethod, recipient, phone, address, requireSignature, memo },
    payment: {
      method: paymentMethod,
      status: paymentId ? 'paid' : 'pending',
      paidAt: paymentId ? new Date() : null,
      pgTxId: paymentId || null,
    },
  })

  // 부수 효과 — 재고 차감, 카트 비우기
  await adjustStock(orderItems, -1)
  await Cart.findOneAndDelete({ user: userId })

  await order.populate('items.product', 'name nameKo images sku')
  return order
}

/** 페이지네이션 헬퍼 */
const paginate = async (filter, { page = 1, limit = 10, populates = [] } = {}) => {
  const skip = (Number(page) - 1) * Number(limit)
  let query = Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
  for (const p of populates) query = query.populate(...p)
  const [data, total] = await Promise.all([query, Order.countDocuments(filter)])
  return {
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    data,
  }
}

/** 내 주문 목록 */
const getMyOrders = (userId, { page, limit, status }) => {
  const filter = { user: userId }
  if (status) filter.status = status
  return paginate(filter, {
    page, limit,
    populates: [['items.product', 'name nameKo images']],
  })
}

/** 전체 주문 목록 (관리자) */
const getAllOrders = ({ page, limit, status }) => {
  const filter = {}
  if (status) filter.status = status
  return paginate(filter, {
    page, limit,
    populates: [
      ['user', 'name email'],
      ['items.product', 'name nameKo images'],
    ],
  })
}

/** 주문 단건 조회 (권한 체크) */
const getOrderById = async (orderId, requester) => {
  const order = await Order.findById(orderId)
    .populate('items.product', 'name nameKo images sku category')
    .populate('user', 'name email phone')

  if (!order) throw new AppError('주문을 찾을 수 없습니다.', 404)

  const isOwner = order.user._id.toString() === requester._id.toString()
  const isAdmin = requester.user_type === 'admin'
  if (!isOwner && !isAdmin) throw new AppError('접근 권한이 없습니다.', 403)

  return order
}

/** 주문 취소 (고객 본인) */
const cancelOrder = async (orderId, userId, reason = '') => {
  const order = await Order.findOne({ _id: orderId, user: userId })
  if (!order) throw new AppError('주문을 찾을 수 없습니다.', 404)
  if (!order.isCancellable) {
    throw new AppError(`${order.status} 상태에서는 취소할 수 없습니다.`)
  }

  order.status       = 'cancelled'
  order.cancelledAt  = new Date()
  order.cancelReason = reason
  await order.save()

  await adjustStock(order.items, +1)
  return order
}

/** 주문 상태 변경 (관리자) — 부수효과 자동 처리 */
const updateOrderStatus = async (orderId, status) => {
  if (!VALID_ADMIN_STATUSES.includes(status)) {
    throw new AppError('유효하지 않은 상태값입니다.')
  }

  const order = await Order.findById(orderId)
  if (!order) throw new AppError('주문을 찾을 수 없습니다.', 404)

  order.status = status

  // 상태별 자동 부수효과
  if (status === 'paid') {
    order.payment.status = 'paid'
    order.payment.paidAt = new Date()
  }
  if (status === 'cancelled') order.cancelledAt = new Date()
  if (status === 'refunded') {
    order.refundedAt = new Date()
    order.payment.status = 'refunded'
  }
  if (status === 'delivered' && order.escrow.status === 'held') {
    order.escrow.status     = 'released'
    order.escrow.releasedAt = new Date()
  }

  await order.save()
  return order
}

/** 송장 등록 (관리자) — 상태도 shipped로 전이 */
const updateTracking = async (orderId, { trackingNumber, carrier }) => {
  const order = await Order.findByIdAndUpdate(
    orderId,
    {
      'shipping.trackingNumber': trackingNumber,
      'shipping.carrier':        carrier,
      'shipping.shippedAt':      new Date(),
      status:                    'shipped',
    },
    { new: true }
  )
  if (!order) throw new AppError('주문을 찾을 수 없습니다.', 404)
  return order
}

module.exports = {
  AppError,
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrderById,
  cancelOrder,
  updateOrderStatus,
  updateTracking,
}
