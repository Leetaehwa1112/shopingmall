const mongoose = require("mongoose");

const auctionApplicationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 카드 기본 정보
    name: { type: String, required: [true, "카드명(영문)은 필수입니다."], trim: true },
    nameKo: { type: String, trim: true, default: "" },
    set: { type: String, trim: true, default: "" },
    year: { type: String, trim: true, default: "" },
    number: { type: String, trim: true, default: "" },

    // 등급 정보
    gradeCompany: {
      type: String,
      enum: ["PSA", "BGS", "CGC"],
      required: [true, "등급사는 필수입니다."],
    },
    gradeScore: { type: String, required: [true, "등급 점수는 필수입니다."] },
    gradeCert: { type: String, trim: true, default: "" },
    cardCountry: {
      type: String,
      enum: ["USA", "JPN", "KOR"],
      default: "USA",
    },

    // 판매 방식
    saleType: {
      type: String,
      enum: ["auction", "buynow"],
      default: "auction",
    },
    startPrice: { type: Number, required: [true, "시작가는 필수입니다."], min: 0 },
    buyNowPrice: { type: Number, default: null },
    // 경매 일정 — startsAt이 미래이면 'upcoming', 도달하면 어드민이 'live'로 전환.
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    minIncrement: { type: Number, default: 1000000 },
    // 동시에 LIVE 1건만 — 작은 수가 먼저 무대에 오름. 어드민이 수동 부여.
    lotOrder: { type: Number, default: 0 },

    // 사진
    photos: { type: [String], default: [] },

    // 신청자 설명 / 컨디션 노트
    description: { type: String, trim: true, default: "" },

    // 신청 상태
    //   pending  : 검수 대기
    //   approved : 승인 후 일정 미정
    //   upcoming : 일정 확정 — startsAt 미래, 사이트엔 예고편으로 노출
    //   live     : 현재 무대 위, 입찰 진행
    //   ended    : 종료/낙찰
    //   rejected : 반려
    status: {
      type: String,
      enum: ["pending", "approved", "upcoming", "rejected", "live", "ended"],
      default: "pending",
    },

    // 현재 최고 입찰
    currentBid: { type: Number, default: null },
    bidCount: { type: Number, default: 0 },

    // 어드민 메모
    adminNote: { type: String, trim: true, default: "" },

    // 'live' 전환 시 자동 생성된 Product 참조 (멱등 보장 + 추적)
    publishedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      default: null,
    },
  },
  { timestamps: true }
);

auctionApplicationSchema.index({ status: 1, createdAt: -1 });
auctionApplicationSchema.index({ user: 1 });

const AuctionApplication = mongoose.model("AuctionApplication", auctionApplicationSchema);

module.exports = AuctionApplication;
