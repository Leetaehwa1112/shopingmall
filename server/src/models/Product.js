const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, "SKU는 필수입니다."],
      unique: true,
      uppercase: true,
      trim: true,
      match: [/^[A-Z0-9\-_]+$/, "SKU는 영문 대문자, 숫자, 하이픈, 언더스코어만 사용 가능합니다."],
    },

    name:     { type: String, required: [true, "상품명은 필수입니다."], trim: true },
    nameKo:   { type: String, trim: true, default: "" },
    set:      { type: String, trim: true, default: "" },
    setShort: { type: String, trim: true, default: "" },
    year:     { type: Number },
    number:   { type: String, default: "" },   // "4/102"
    accent:   { type: String, default: "" },   // hex 또는 css 색상 (카드 글로우)
    rarity:   { type: String, default: "" },
    isHolo:   { type: Boolean, default: false },

    grade: {
      company: { type: String, enum: ["PSA", "BGS", "CGC", ""], default: "" },
      score:   { type: Number },
      country: { type: String, enum: ["USA", "JPN", "KOR", ""], default: "" },
      cert:    { type: String, default: "" },
    },

    price:       { type: Number, required: [true, "가격은 필수입니다."], min: 0 },
    startPrice:  { type: Number },
    buyNowPrice: { type: Number, default: null }, // 경매 즉시낙찰가 — 입찰 상한 + 즉시구매 트리거
    currentBid:  { type: Number },
    bidCount:   { type: Number, default: 0 },
    watchers:   { type: Number, default: 0 },
    // 경매 일정 — startsAt이 비어있으면 즉시 시작(legacy). 미래값이면 'upcoming'으로 노출.
    startsAt:   { type: Date },
    endsAt:     { type: Date },
    // 동시 LIVE 경매는 1건 — 어드민이 손으로 순번 부여, 작은 수가 먼저.
    lotOrder:   { type: Number, default: 0 },
    population: { type: mongoose.Schema.Types.Mixed, default: {} },

    // 입찰 내역 — 최근 입찰부터 unshift, 최대 50건 유지
    bidHistory: [
      {
        bidder:    { type: String, default: "" },
        bidder_id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        amount:    { type: Number, required: true },
        at:        { type: Date, default: Date.now },
      },
    ],

    category: {
      type: String,
      required: [true, "카테고리는 필수입니다."],
      enum: {
        values: ["base", "neo", "ex", "xy", "swsh", "sv", "japanese", "promo", "pack", "box"],
        message: "유효하지 않은 카테고리입니다.",
      },
    },

    images:      { type: [String], default: [] },
    description: { type: String, trim: true, default: "" },
    stock:       { type: Number, default: 1, min: 0 },

    sale_type: { type: String, enum: ["buynow", "auction"], default: "buynow" },
    // active: LIVE 진행 중 / upcoming: 시작 전 예약 / sold_out: 낙찰·재고소진 / hidden: 비공개
    status:    { type: String, enum: ["active", "upcoming", "sold_out", "hidden"], default: "active" },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

productSchema.index({ category: 1, status: 1 });
productSchema.index({ sale_type: 1, status: 1 });

module.exports = mongoose.model("Product", productSchema);
