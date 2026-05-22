const mongoose = require('mongoose')

const orderItemSchema = new mongoose.Schema(
  {
    itemType:       { type: String, enum: ['product', 'pack'], default: 'product', required: true },
    product:        { type: mongoose.Schema.Types.ObjectId, ref: 'Product', default: null },
    pack:           { type: mongoose.Schema.Types.ObjectId, ref: 'Pack', default: null },
    qty:            { type: Number, required: true, min: 1 },
    unitPrice:      { type: Number, required: true },       // 주문 시점 가격 스냅샷
    shippingOption: { type: String, enum: ['standard', 'quick'], default: 'standard' },
  },
  { _id: false }
)

// Mongoose 9: pre('validate')는 callback(next) 시그니처 미지원 → throw 방식
orderItemSchema.pre('validate', function () {
  if (this.itemType === 'product' && !this.product) {
    throw new Error('주문 아이템(product)에 product id가 필요합니다.')
  }
  if (this.itemType === 'pack' && !this.pack) {
    throw new Error('주문 아이템(pack)에 pack id가 필요합니다.')
  }
})

const addressSchema = new mongoose.Schema(
  {
    zipcode: { type: String, trim: true },
    street:  { type: String, trim: true },   // 도로명
    detail:  { type: String, trim: true },   // 상세 (동/호)
    city:    { type: String, trim: true },   // 시/도
  },
  { _id: false }
)

const orderSchema = new mongoose.Schema(
  {
    // ─── 식별 ──────────────────────────────────────────────
    orderNumber: {
      type: String,
      unique: true,
      uppercase: true,
      // 생성 시 자동 할당: 'PV-' + timestamp36
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ─── 주문 아이템 ────────────────────────────────────────
    items: {
      type: [orderItemSchema],
      validate: [(v) => v.length > 0, '주문 아이템이 없습니다.'],
    },

    // ─── 금액 ──────────────────────────────────────────────
    subtotal:     { type: Number, required: true, min: 0 },   // 상품 합계
    shippingFee:  { type: Number, required: true, min: 0, default: 0 },
    insuranceFee: { type: Number, required: true, min: 0, default: 0 },
    totalAmount:  { type: Number, required: true, min: 0 },   // 최종 결제액

    // ─── 배송 ──────────────────────────────────────────────
    shipping: {
      method: {
        type: String,
        enum: ['standard', 'fedex', 'quick', 'brinks', 'pickup'],
        required: true,
      },
      recipient:       { type: String, required: true, trim: true },
      phone:           { type: String, required: true, trim: true },
      address:         { type: addressSchema, required: true },
      requireSignature:{ type: Boolean, default: true },
      memo:            { type: String, trim: true, default: '' },
      trackingNumber:  { type: String, trim: true, default: null },  // 출고 후 기입
      carrier:         { type: String, trim: true, default: null },  // 'FedEx' | "Brink's"
      shippedAt:       { type: Date, default: null },
      deliveredAt:     { type: Date, default: null },
    },

    // ─── 결제 ──────────────────────────────────────────────
    payment: {
      method: {
        type: String,
        enum: ['card', 'toss', 'kakao', 'bank', 'escrow'],
        required: true,
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending',
      },
      paidAt:   { type: Date, default: null },
      // PG사 트랜잭션 ID (카드사 승인번호 등) — 카드 원본 정보는 저장 안 함
      pgTxId:   { type: String, default: null },
      // 환불 시 PG에서 받은 취소 ID (KakaoPay aid 등) — 환불 감사 추적용
      cancelTxId: { type: String, default: null },
    },

    // ─── 에스크로 (1,000,000원 이상 자동) ──────────────────
    escrow: {
      status: {
        type: String,
        enum: ['none', 'held', 'released'],
        default: 'none',
      },
      releasedAt: { type: Date, default: null },
    },

    // ─── 주문 상태 ──────────────────────────────────────────
    status: {
      type: String,
      enum: [
        'pending_payment', // 입금 전
        'paid',            // 결제 완료
        'preparing',       // 배송 준비중 (송장 등록 대기)
        'ready_to_ship',   // 배송 대기 (송장 등록 완료, 발송 전)
        'shipped',         // 배송중 (carrier에 인계됨)
        'delivered',       // 배송 완료
        'cancelled',       // 취소
        'refunded',        // 환불 완료
      ],
      default: 'pending_payment',
    },
    cancelledAt:  { type: Date, default: null },
    cancelReason: { type: String, trim: true, default: null },
    refundedAt:   { type: Date, default: null },
    refundReason: { type: String, trim: true, default: null },
    refundAmount: { type: Number, default: null },  // null = 전액 환불, 숫자 = 부분 환불 금액
  },
  {
    timestamps: true,
  }
)

// ─── orderNumber 자동 생성 ──────────────────────────────────
orderSchema.pre('save', async function () {
  if (!this.orderNumber) {
    this.orderNumber = 'PV-' + Date.now().toString(36).toUpperCase()
  }
})

// ─── 에스크로 자동 설정 (100만원 이상) ─────────────────────
orderSchema.pre('save', async function () {
  if (this.isNew && this.totalAmount >= 1_000_000 && this.payment.method === 'escrow') {
    this.escrow.status = 'held'
  }
})

// ─── 가상 필드 ──────────────────────────────────────────────
orderSchema.virtual('isCancellable').get(function () {
  return ['pending_payment', 'paid', 'preparing', 'ready_to_ship'].includes(this.status)
})

orderSchema.virtual('isRefundable').get(function () {
  return ['paid', 'delivered'].includes(this.status)
})

// ─── 인덱스 ─────────────────────────────────────────────────
// getMyOrders: { user, status? } + sort by createdAt DESC
orderSchema.index({ user: 1, createdAt: -1 })
// getAllOrders (admin): { status? } + sort by createdAt DESC
orderSchema.index({ status: 1, createdAt: -1 })
// 송장/검색 — orderNumber는 이미 unique 인덱스, 추가 불필요

// 대시보드 shippingDue 카운트 — status='paid' AND shipping.trackingNumber=null.
// partialFilterExpression으로 status='paid' 문서만 인덱싱 → 인덱스 크기 최소화.
orderSchema.index(
  { 'shipping.trackingNumber': 1, status: 1 },
  { partialFilterExpression: { status: 'paid' } },
)

const Order = mongoose.model('Order', orderSchema)

module.exports = Order
