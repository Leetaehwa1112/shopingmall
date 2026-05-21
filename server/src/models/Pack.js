const mongoose = require("mongoose");

const packSchema = new mongoose.Schema(
  {
    sku:        { type: String, required: [true, "SKU는 필수입니다."], unique: true, uppercase: true, trim: true },
    name:       { type: String, required: [true, "팩명(영문)은 필수입니다."], trim: true },
    nameKo:     { type: String, trim: true, default: "" },
    setShort:   { type: String, trim: true, default: "" },
    year:       { type: Number },
    type:       { type: String, enum: ["pack", "box"], default: "pack" },
    price:      { type: Number, required: [true, "가격은 필수입니다."], min: 0 },
    stock:      { type: Number, default: 0, min: 0 },
    cardsPerPack: { type: Number, default: 0 },
    sealed:     { type: Boolean, default: true },
    heroArt:    { type: String, default: "" },
    setLogo:    { type: String, default: "" },
    description: { type: String, trim: true, default: "" },
    status:     { type: String, enum: ["active", "sold_out", "hidden"], default: "active" },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

packSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model("Pack", packSchema);
