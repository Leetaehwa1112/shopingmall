const mongoose = require('mongoose')

const orderItemSchema = new mongoose.Schema(
  {
    product:        { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    qty:            { type: Number, required: true, min: 1 },
    unitPrice:      { type: Number, required: true },       // 주문 시점 가격 스냅샷
    shippingOption: { type: String, enum: ['standard', 'quick'], default: 'standard' },
  },
  { _id: false }
)

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
        'pending_payment', // 결제 대기
        'paid',            // 결제 완료
        'preparing',       // 상품 준비중
        'shipped',         // 발송 완료
        'delivered',       // 배송 완료
        'cancelled',       // 취소
        'refunded',        // 환불 완료
      ],
      default: 'pending_payment',
    },
    cancelledAt:  { type: Date, default: null },
    cancelReason: { type: String, trim: true, default: null },
    refundedAt:   { type: Date, default: null },
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
  return ['pending_payment', 'paid', 'preparing'].includes(this.status)
})

orderSchema.virtual('isRefundable').get(function () {
  return ['paid', 'delivered'].includes(this.status)
})

const Order = mongoose.model('Order', orderSchema)

module.exports = Order
