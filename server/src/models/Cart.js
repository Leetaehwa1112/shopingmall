const mongoose = require('mongoose')

const cartItemSchema = new mongoose.Schema(
  {
    // 'product' (Card) | 'pack' (CardPack/Box)
    itemType: {
      type: String,
      enum: ['product', 'pack'],
      default: 'product',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null,
    },
    pack: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Pack',
      default: null,
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

// Mongoose 9: pre('validate')는 callback(next) 시그니처 미지원 → throw 방식
cartItemSchema.pre('validate', function () {
  if (this.itemType === 'product' && !this.product) {
    throw new Error('product id가 필요합니다.')
  }
  if (this.itemType === 'pack' && !this.pack) {
    throw new Error('pack id가 필요합니다.')
  }
})

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

// 총액 가상 필드 — 상품가만 (배송비는 주문 단계에서 한 번만 계산)
cartSchema.virtual('totalPrice').get(function () {
  return this.items.reduce((sum, item) => {
    return sum + item.priceSnapshot * item.qty
  }, 0)
})

const Cart = mongoose.model('Cart', cartSchema)

module.exports = Cart
