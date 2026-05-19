const orderService = require('../services/orderService')

// ─── 공통 에러 핸들러 ──────────────────────────────────────
const handleError = (res, err) => {
  if (err.status) {
    return res.status(err.status).json({ success: false, message: err.message })
  }
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message)
    return res.status(400).json({ success: false, message: messages })
  }
  return res.status(500).json({ success: false, message: err.message })
}

// ─── 고객 ───────────────────────────────────────────────────

// [POST] /api/orders
const createOrder = async (req, res) => {
  try {
    // ─── 입력 검증 ───
    const { shippingMethod, recipient, phone, address, paymentMethod } = req.body || {}
    const errors = []
    if (!['standard', 'fedex', 'quick', 'brinks', 'pickup'].includes(shippingMethod)) {
      errors.push('배송 수단을 선택해주세요.')
    }
    if (!['card', 'toss', 'kakao', 'bank', 'escrow'].includes(paymentMethod)) {
      errors.push('결제 수단을 선택해주세요.')
    }
    if (!recipient || typeof recipient !== 'string' || !recipient.trim()) {
      errors.push('수령인 이름이 필요합니다.')
    } else if (recipient.length > 50) {
      errors.push('수령인 이름은 50자 이하로 입력해주세요.')
    }
    if (!phone || typeof phone !== 'string' || !/^[0-9+\-\s()]{8,20}$/.test(phone.trim())) {
      errors.push('연락처를 올바르게 입력해주세요.')
    }
    if (shippingMethod !== 'pickup') {
      if (!address || typeof address !== 'object') errors.push('배송 주소가 필요합니다.')
      else {
        if (!address.zipcode || !/^[0-9\-]{3,10}$/.test(String(address.zipcode))) errors.push('우편번호가 올바르지 않습니다.')
        if (!address.street || !String(address.street).trim()) errors.push('도로명 주소가 필요합니다.')
      }
    }

    if (errors.length) {
      return res.status(400).json({ success: false, message: errors })
    }

    const order = await orderService.createOrder(req.user._id, req.body)
    res.status(201).json({ success: true, data: order })
  } catch (err) { handleError(res, err) }
}

// [GET] /api/orders/me
const getMyOrders = async (req, res) => {
  try {
    const result = await orderService.getMyOrders(req.user._id, req.query)
    res.status(200).json({ success: true, ...result })
  } catch (err) { handleError(res, err) }
}

// [GET] /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id, req.user)
    res.status(200).json({ success: true, data: order })
  } catch (err) { handleError(res, err) }
}

// [PATCH] /api/orders/:id/cancel
const cancelOrder = async (req, res) => {
  try {
    const order = await orderService.cancelOrder(req.params.id, req.user._id, req.body.reason)
    res.status(200).json({ success: true, data: order })
  } catch (err) { handleError(res, err) }
}

// ─── 관리자 ────────────────────────────────────────────────

// [GET] /api/orders
const getAllOrders = async (req, res) => {
  try {
    const result = await orderService.getAllOrders(req.query)
    res.status(200).json({ success: true, ...result })
  } catch (err) { handleError(res, err) }
}

// [PATCH] /api/orders/:id/status
const updateOrderStatus = async (req, res) => {
  try {
    const order = await orderService.updateOrderStatus(req.params.id, req.body.status)
    res.status(200).json({ success: true, data: order })
  } catch (err) { handleError(res, err) }
}

// [PATCH] /api/orders/:id/tracking
const updateTracking = async (req, res) => {
  try {
    const order = await orderService.updateTracking(req.params.id, req.body)
    res.status(200).json({ success: true, data: order })
  } catch (err) { handleError(res, err) }
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
