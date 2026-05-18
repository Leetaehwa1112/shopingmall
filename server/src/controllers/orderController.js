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
