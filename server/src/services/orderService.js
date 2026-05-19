const Order = require('../models/Order')
const Cart = require('../models/Cart')
const Product = require('../models/Product')
const Pack = require('../models/Pack')

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

/** 카트/Order 아이템 공통 정규화: { itemType, entity, qty, priceSnapshot, shippingOption } */
const itemEntity = (item) => item.itemType === 'pack' ? item.pack : item.product

/** 주문 아이템 검증 (재고/판매상태) */
const validateOrderItems = (items) => {
  for (const item of items) {
    const ent = itemEntity(item)
    if (!ent || ent.status !== 'active') {
      throw new AppError(`"${ent?.name || ent?.nameKo || '상품'}"은 현재 판매 중이 아닙니다.`)
    }
    if (ent.stock !== undefined && ent.stock < item.qty) {
      throw new AppError(`"${ent.name || ent.nameKo}" 재고가 부족합니다. (남은 재고: ${ent.stock})`)
    }
  }
}

/** 카트 → 주문아이템 / 프론트아이템 → 주문아이템 (폴백) */
const resolveOrderItems = async (userId, clientItems) => {
  const cart = await Cart.findOne({ user: userId })
    .populate('items.product', 'name nameKo price stock status')
    .populate('items.pack',    'name nameKo price stock status')

  if (cart && cart.items.length > 0) {
    validateOrderItems(cart.items)
    return cart.items
  }
  if (!clientItems?.length) {
    throw new AppError('장바구니가 비어있습니다.')
  }
  const populated = await Promise.all(
    clientItems.map(async (ci) => {
      const id = ci.id || ci._id
      const itemType = ci.itemType === 'pack' ? 'pack' : 'product'
      const Model = itemType === 'pack' ? Pack : Product
      const ent = await Model.findById(id).select('name nameKo price stock status')
      return {
        itemType,
        product: itemType === 'product' ? ent : null,
        pack:    itemType === 'pack'    ? ent : null,
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
  const subtotal = orderItems.reduce((sum, item) => {
    const ent = itemEntity(item)
    return sum + (item.priceSnapshot || ent?.price || 0) * item.qty
  }, 0)
  const shippingFee  = SHIPPING_FEES[shippingMethod] ?? 0
  const insuranceFee = insuranceEnabled ? Math.floor(subtotal * 0.005) : 0
  const totalAmount  = subtotal + shippingFee + insuranceFee
  return { subtotal, shippingFee, insuranceFee, totalAmount }
}

/** 재고 일괄 차감/복구 (Product / Pack 모두)
 *  delta < 0 (차감) — 원자적 조건부 update로 race 방어:
 *    {stock: {$gte: qty}} 만족 시에만 $inc, 실패하면 AppError throw + 이전 항목 롤백.
 *  delta > 0 (복구) — 무조건 $inc (취소/환불 복원). */
const adjustStock = async (items, delta) => {
  const Models = items.map((it) => it.itemType === 'pack' ? Pack : Product)
  const ids = items.map((it) => {
    const ent = itemEntity(it)
    return ent?._id || ent
  })

  if (delta >= 0) {
    // 복구 — 단순 일괄 $inc
    await Promise.all(items.map((it, i) => {
      if (!ids[i]) return null
      return Models[i].findByIdAndUpdate(ids[i], { $inc: { stock: delta * it.qty } })
    }))
    return
  }

  // 차감 — 조건부 atomic update, 실패 시 롤백 후 throw
  const applied = []
  for (let i = 0; i < items.length; i++) {
    const id = ids[i]
    const qty = items[i].qty
    if (!id) continue
    const Model = Models[i]
    const result = await Model.findOneAndUpdate(
      { _id: id, stock: { $gte: qty } },
      { $inc: { stock: -qty } },
      { new: true },
    )
    if (!result) {
      // 이미 차감된 것 롤백
      await Promise.all(applied.map(({ Model: M, id: aid, qty: aqty }) =>
        M.findByIdAndUpdate(aid, { $inc: { stock: aqty } })
      ))
      const ent = itemEntity(items[i])
      throw new AppError(`"${ent?.name || ent?.nameKo || '상품'}" 재고가 부족합니다. (다른 주문이 먼저 처리된 것 같아요)`)
    }
    applied.push({ Model, id, qty })
  }
}

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
    items: orderItems.map((item) => {
      const ent = itemEntity(item)
      return {
        itemType:       item.itemType || 'product',
        product:        item.itemType === 'pack' ? null : (ent?._id || item.product),
        pack:           item.itemType === 'pack' ? (ent?._id || item.pack) : null,
        qty:            item.qty,
        unitPrice:      item.priceSnapshot || ent?.price || 0,
        shippingOption: item.shippingOption || 'standard',
      }
    }),
    ...amount,
    // 결제 완료(paymentId 있음) → 'paid', 아니면 default('pending_payment')
    status: paymentId ? 'paid' : 'pending_payment',
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

  await order.populate([
    { path: 'items.product', select: 'name nameKo images sku' },
    { path: 'items.pack',    select: 'name nameKo heroArt sku' },
  ])
  return order
}

/** 페이지네이션 헬퍼
 *  - lean() — list 응답은 JSON 직렬화만 필요. populate된 sub-doc도 plain object로 함께 lean됨.
 *  - 인덱스: { user:1, createdAt:-1 }, { status:1, createdAt:-1 } (Order model 정의) 활용. */
const paginate = async (filter, { page = 1, limit = 10, populates = [] } = {}) => {
  const skip = (Number(page) - 1) * Number(limit)
  let query = Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
  for (const p of populates) query = query.populate(...p)
  const [data, total] = await Promise.all([query.lean(), Order.countDocuments(filter)])
  return {
    data,
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
  }
}

const ORDER_POPULATES = [
  ['items.product', 'name nameKo images sku price'],
  ['items.pack',    'name nameKo heroArt sku price'],
  ['user', 'name email phone'],
]

/** 내 주문 목록 */
const getMyOrders = async (userId, query) => {
  const { page, limit, status } = query
  const filter = { user: userId }
  if (status && status !== 'all') filter.status = status
  return paginate(filter, { page, limit, populates: ORDER_POPULATES })
}

/** 단건 조회 (본인 또는 어드민) */
const getOrderById = async (orderId, requester) => {
  const order = await Order.findById(orderId)
    .populate('items.product', 'name nameKo images sku price')
    .populate('items.pack',    'name nameKo heroArt sku price')
    .populate('user', 'name email phone')
  if (!order) throw new AppError('주문을 찾을 수 없습니다.', 404)
  if (requester.user_type !== 'admin' && order.user._id.toString() !== requester._id.toString()) {
    throw new AppError('권한이 없습니다.', 403)
  }
  return order
}

/** 취소 */
const cancelOrder = async (orderId, userId, reason) => {
  const order = await Order.findOne({ _id: orderId, user: userId })
  if (!order) throw new AppError('주문을 찾을 수 없습니다.', 404)
  if (!['pending_payment', 'paid', 'preparing'].includes(order.status)) {
    throw new AppError('현재 상태에서는 취소할 수 없습니다.')
  }
  // 재고 복구
  await adjustStock(order.items, +1)
  order.status = 'cancelled'
  order.cancelledAt = new Date()
  order.cancelReason = reason || '사용자 요청'
  await order.save()
  return order
}

/** 어드민 전체 조회 */
const getAllOrders = async (query) => {
  const { page, limit, status, search } = query
  const filter = {}
  if (status && status !== 'all') filter.status = status
  if (search) {
    const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ orderNumber: rx }, { 'shipping.recipient': rx }]
  }
  return paginate(filter, { page, limit, populates: ORDER_POPULATES })
}

/** 상태 변경 (어드민) */
const updateOrderStatus = async (orderId, status) => {
  if (!VALID_ADMIN_STATUSES.includes(status)) {
    throw new AppError('유효하지 않은 상태값입니다.')
  }
  const order = await Order.findById(orderId)
  if (!order) throw new AppError('주문을 찾을 수 없습니다.', 404)
  order.status = status
  if (status === 'cancelled' || status === 'refunded') {
    if (!order.cancelledAt) {
      order.cancelledAt = new Date()
      await adjustStock(order.items, +1)
    }
  }
  await order.save()
  return order
}

/** 송장 등록 (어드민) */
const updateTracking = async (orderId, { trackingNumber, carrier }) => {
  const order = await Order.findById(orderId)
  if (!order) throw new AppError('주문을 찾을 수 없습니다.', 404)
  if (trackingNumber !== undefined) order.shipping.trackingNumber = trackingNumber
  if (carrier !== undefined) order.shipping.carrier = carrier
  if (trackingNumber && !order.shipping.shippedAt) {
    order.shipping.shippedAt = new Date()
    if (order.status === 'paid' || order.status === 'preparing') order.status = 'shipped'
  }
  await order.save()
  return order
}

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  updateTracking,
}
