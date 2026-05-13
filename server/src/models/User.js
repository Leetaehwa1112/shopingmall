const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // ─── 기본 정보 ───────────────────────────────────────────────
    email: {
      type: String,
      required: [true, "이메일은 필수입니다."],
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "이름은 필수입니다."],
      trim: true,
    },
    password: {
      type: String,
      required: [true, "비밀번호는 필수입니다."],
    },
    user_type: {
      type: String,
      enum: ["customer", "admin"],
      required: [true, "유저 타입은 필수입니다."],
      default: "customer",
    },
    profile_image: {
      type: String, // 이미지 URL
      default: null,
    },

    // ─── 연락처 & 배송 정보 ──────────────────────────────────────
    phone: {
      type: String, // 고액 거래 시 Brink's 연락용
      trim: true,
      default: null,
    },
    address: {
      zipcode: { type: String, trim: true },   // 우편번호
      street:  { type: String, trim: true },   // 도로명 주소
      detail:  { type: String, trim: true },   // 상세 주소 (동/호수 등)
      city:    { type: String, trim: true },   // 시/도
    },

    // ─── 옥션 & 쇼핑 관련 ────────────────────────────────────────
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Card", // Card 모델 생성 후 populate 가능
      },
    ],
    // 낙찰된 경매 목록 (Auction 모델 생성 후 populate 가능)
    won_auctions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Auction",
      },
    ],
  },
  {
    timestamps: true, // createdAt, updatedAt 자동 생성
  }
);

const User = mongoose.model("User", userSchema);

module.exports = User;
