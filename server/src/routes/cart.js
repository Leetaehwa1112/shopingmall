const express = require('express')
const router = express.Router()
const { protect } = require('../middlewares/auth')
const {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart,
} = require('../controllers/cartController')

// 모든 장바구니 라우트는 로그인 필요
router.use(protect)

router.get('/',                 getCart)    // 내 장바구니 조회
router.post('/',                addItem)    // 아이템 추가
router.put('/:productId',       updateItem) // 수량/배송옵션 변경
router.delete('/:productId',    removeItem) // 특정 아이템 삭제
router.delete('/',              clearCart)  // 전체 비우기

module.exports = router
