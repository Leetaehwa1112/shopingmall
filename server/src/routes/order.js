const express = require('express')
const router = express.Router()
const { protect, admin } = require('../middlewares/auth')
const {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  updateTracking,
  adminUpdateFields,
  refundOrder,
} = require('../controllers/orderController')

// ─── 유저 ────────────────────────────────────────────────────
router.post('/',                  protect,    createOrder)       // 주문 생성
router.get('/me',                 protect,    getMyOrders)       // 내 주문 목록
router.get('/:id',                protect,    getOrderById)      // 주문 상세
router.patch('/:id/cancel',       protect,    cancelOrder)       // 주문 취소

// ─── 어드민 ──────────────────────────────────────────────────
router.get('/',                   ...admin,   getAllOrders)       // 전체 주문 조회
router.patch('/:id/status',       ...admin,   updateOrderStatus)  // 상태 변경
router.patch('/:id/tracking',     ...admin,   updateTracking)     // 송장 등록
router.patch('/:id/refund',       ...admin,   refundOrder)        // 환불 처리
router.patch('/:id',              ...admin,   adminUpdateFields)  // 화이트리스트 필드 부분 수정

module.exports = router
