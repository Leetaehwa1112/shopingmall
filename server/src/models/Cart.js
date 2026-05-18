const mongoose = require('mongoose')

const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    qty: {
      type: Number,
      required: true,
      min: [1, '수량은 1 이상이어야 합니다.'],
      default: 1,
    },
    shippingOption: {
      type: String,
      enum: ['standard', 'quick'],
      default: 'standard',
    },
    // 담을 당시 가격 스냅샷 (가격 변동 대비)
    priceSnapshot: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
)

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // 유저당 장바구니 1개
    },
    items: [cartItemSchema],
  },
  {
    timestamps: true,
  }
)

// 총액 가상 필드
cartSchema.virtual('totalPrice').get(function () {
  return this.items.reduce((sum, item) => {
    const shipping = item.shippingOption === 'quick' ? 50000 : 0
    return sum + item.priceSnapshot * item.qty + shipping
  }, 0)
})

// 특정 상품이 이미 담겨 있는지 확인
cartSchema.methods.hasProduct = function (productId) {
  return this.items.some((item) => item.product.toString() === productId.toString())
}

const Cart = mongoose.model('Cart', cartSchema)

module.exports = Cart
