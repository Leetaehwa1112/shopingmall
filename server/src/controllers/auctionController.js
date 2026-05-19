const AuctionApplication = require("../models/AuctionApplication");
const Product = require("../models/Product");

// AuctionApplication → Product 매핑.
// price 필수: buynow면 buyNowPrice||startPrice, auction이면 startPrice.
function buildProductFromApplication(app) {
  const isBuyNow = app.saleType === "buynow";
  const price = isBuyNow
    ? (app.buyNowPrice || app.startPrice)
    : app.startPrice;

  return {
    // SKU 자동 생성 — application _id 기반, 충돌 방지 + 추적 가능
    sku: `APP-${app._id.toString().toUpperCase().slice(-12)}`,
    name: app.name,
    nameKo: app.nameKo,
    set: app.set,
    year: Number(app.year) || undefined,
    number: app.number,
    // Product.category enum 필수 — 신청서엔 카테고리 필드가 없으므로 기본 'promo'.
    // 게시 후 어드민이 /admin/products/:id/edit에서 정확한 카테고리로 변경 가능.
    category: "promo",
    grade: {
      company: app.gradeCompany,
      score: Number(app.gradeScore),
      country: app.cardCountry || "USA",
      cert: app.gradeCert || "",
    },
    sale_type: isBuyNow ? "buynow" : "auction",
    price,
    startPrice: app.startPrice,
    endsAt: app.endsAt,
    images: app.photos || [],
    description: app.description || "",
    stock: 1,
    status: "active",
    created_by: app.user,
  };
}

// [POST] /api/auctions - 경매 신청 (일반 유저)
const createApplication = async (req, res) => {
  try {
    const {
      name, nameKo, set, year, number,
      gradeCompany, gradeScore, gradeCert, cardCountry,
      saleType, startPrice, buyNowPrice, endsAt, minIncrement,
      photos, description,
    } = req.body;

    const application = await AuctionApplication.create({
      user: req.user._id,
      name, nameKo, set, year, number,
      gradeCompany, gradeScore, gradeCert,
      cardCountry: cardCountry || "USA",
      saleType, startPrice,
      buyNowPrice: buyNowPrice || null,
      endsAt: endsAt || null,
      minIncrement: minIncrement || 1000000,
      photos: photos || [],
      description: description || "",
    });

    res.status(201).json({ success: true, data: application });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// [GET] /api/auctions/me - 내 신청 목록
const getMyApplications = async (req, res) => {
  try {
    // 인덱스 { user: 1 } 활용 (모델 정의). lean()으로 hydration 생략.
    const applications = await AuctionApplication.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [GET] /api/auctions - 전체 신청 목록 (어드민)
const getApplications = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    // 인덱스 { status: 1, createdAt: -1 } 활용 (모델 정의).
    // lean()으로 hydration 생략, populate된 user도 plain object로 함께 lean.
    const [applications, total] = await Promise.all([
      AuctionApplication.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("user", "name email phone")
        .lean(),
      AuctionApplication.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: applications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [GET] /api/auctions/:id - 단건 조회 (어드민)
const getApplicationById = async (req, res) => {
  try {
    const application = await AuctionApplication.findById(req.params.id)
      .populate("user", "name email phone");
    if (!application) {
      return res.status(404).json({ success: false, message: "신청 내역을 찾을 수 없습니다." });
    }
    res.status(200).json({ success: true, data: application });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [PATCH] /api/auctions/:id/status - 상태 변경 (어드민: 승인/거절/live/ended)
//   'live' 전환 시 자동으로 Product를 생성해 사이트에 게시. 멱등 보장.
const updateStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const allowed = ["pending", "approved", "rejected", "live", "ended"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "유효하지 않은 상태값입니다." });
    }

    const application = await AuctionApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: "신청 내역을 찾을 수 없습니다." });
    }

    application.status = status;
    if (adminNote !== undefined) application.adminNote = adminNote;

    // 'live' 전환 시 Product 자동 게시 — 이미 publish된 경우는 skip (멱등)
    if (status === "live" && !application.publishedProduct) {
      const product = await Product.create(buildProductFromApplication(application));
      application.publishedProduct = product._id;
    }

    await application.save();
    await application.populate("user", "name email");

    res.status(200).json({ success: true, data: application });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "SKU 충돌 — 이미 게시된 상품일 수 있어요." });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createApplication,
  getMyApplications,
  getApplications,
  getApplicationById,
  updateStatus,
};
