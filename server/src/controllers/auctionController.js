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
    buyNowPrice: app.buyNowPrice || null,
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

    // ─── 입력 검증 (서버는 항상 검증 — 클라 검증은 UX용) ───
    const errors = [];
    if (!name || typeof name !== "string" || !name.trim()) errors.push("카드명(영문)이 필요합니다.");
    if (name && name.length > 100) errors.push("카드명은 100자 이하로 입력해주세요.");
    if (!["PSA", "BGS", "CGC"].includes(gradeCompany)) errors.push("등급사를 선택해주세요 (PSA/BGS/CGC).");
    const scoreNum = Number(gradeScore);
    if (!Number.isFinite(scoreNum) || scoreNum < 1 || scoreNum > 10) errors.push("등급 점수는 1~10 사이여야 합니다.");
    if (!["auction", "buynow"].includes(saleType)) errors.push("판매 유형을 선택해주세요.");
    const startNum = Number(startPrice);
    if (!Number.isFinite(startNum) || startNum < 0) errors.push("시작가는 0 이상이어야 합니다.");
    if (startNum > 100_000_000_000) errors.push("시작가가 너무 큽니다."); // 1000억 상한
    if (buyNowPrice != null && buyNowPrice !== "") {
      const bnp = Number(buyNowPrice);
      if (!Number.isFinite(bnp) || bnp <= startNum) errors.push("즉시낙찰가는 시작가보다 커야 합니다.");
    }
    if (endsAt) {
      const t = new Date(endsAt).getTime();
      if (!Number.isFinite(t)) errors.push("경매 종료 시각이 올바르지 않습니다.");
      else if (t < Date.now() + 60_000) errors.push("경매 종료 시각은 최소 1분 이후여야 합니다.");
    }
    if (description && description.length > 5000) errors.push("설명은 5000자 이하로 입력해주세요.");
    if (Array.isArray(photos) && photos.length > 10) errors.push("사진은 최대 10장까지 첨부 가능합니다.");

    if (errors.length) {
      return res.status(400).json({ success: false, message: errors });
    }

    const application = await AuctionApplication.create({
      user: req.user._id,
      name: name.trim(),
      nameKo: typeof nameKo === "string" ? nameKo.trim() : "",
      set: typeof set === "string" ? set.trim() : "",
      year: typeof year === "string" ? year.trim() : (year ?? ""),
      number: typeof number === "string" ? number.trim() : "",
      gradeCompany,
      gradeScore,
      gradeCert: typeof gradeCert === "string" ? gradeCert.trim() : "",
      cardCountry: cardCountry || "USA",
      saleType,
      startPrice: startNum,
      buyNowPrice: buyNowPrice ? Number(buyNowPrice) : null,
      endsAt: endsAt || null,
      minIncrement: Number(minIncrement) || 1000000,
      photos: Array.isArray(photos) ? photos.slice(0, 10) : [],
      description: typeof description === "string" ? description.slice(0, 5000) : "",
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

    // 이미 게시된 Product가 있다면 신청 상태에 맞춰 Product.status 동기화 —
    // 거절/대기/승인은 'hidden'(사이트 비노출), live는 'active', ended는 'sold_out'.
    if (application.publishedProduct) {
      const productStatus =
        status === "live" ? "active" :
        status === "ended" ? "sold_out" : "hidden";
      await Product.findByIdAndUpdate(application.publishedProduct, { status: productStatus });
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

// [PATCH] /api/auctions/:id - 신청 내역 수정 (어드민)
//   진행 중(live) 매물도 수정 가능 — publishedProduct에 자동 동기화.
//   입찰이 시작된 매물의 startPrice/saleType은 변경 불가 (거래 무결성 보호).
const updateApplication = async (req, res) => {
  try {
    const application = await AuctionApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: "신청 내역을 찾을 수 없습니다." });
    }

    const {
      name, nameKo, set, year, number,
      gradeCompany, gradeScore, gradeCert, cardCountry,
      saleType, startPrice, buyNowPrice, endsAt, minIncrement,
      photos, description, adminNote,
    } = req.body;

    // 입찰이 시작된 경우 거래 무결성 보호
    const hasBids = (application.bidCount || 0) > 0 || application.currentBid;
    const errors = [];

    if (name !== undefined) {
      if (!name || !String(name).trim()) errors.push("카드명(영문)이 필요합니다.");
      else application.name = String(name).trim();
    }
    if (nameKo !== undefined) application.nameKo = String(nameKo).trim();
    if (set !== undefined) application.set = String(set).trim();
    if (year !== undefined) application.year = String(year).trim();
    if (number !== undefined) application.number = String(number).trim();
    if (gradeCompany !== undefined) {
      if (!["PSA", "BGS", "CGC"].includes(gradeCompany)) errors.push("등급사는 PSA/BGS/CGC 중 하나여야 합니다.");
      else application.gradeCompany = gradeCompany;
    }
    if (gradeScore !== undefined) application.gradeScore = String(gradeScore);
    if (gradeCert !== undefined) application.gradeCert = String(gradeCert).trim();
    if (cardCountry !== undefined) {
      if (!["USA", "JPN", "KOR"].includes(cardCountry)) errors.push("언어판은 USA/JPN/KOR 중 하나여야 합니다.");
      else application.cardCountry = cardCountry;
    }
    if (saleType !== undefined) {
      if (hasBids && saleType !== application.saleType) {
        errors.push("입찰이 진행된 매물의 판매 유형은 변경할 수 없습니다.");
      } else if (!["auction", "buynow"].includes(saleType)) {
        errors.push("판매 유형은 auction/buynow 중 하나여야 합니다.");
      } else {
        application.saleType = saleType;
      }
    }
    if (startPrice !== undefined) {
      const v = Number(startPrice);
      if (!Number.isFinite(v) || v < 0) errors.push("시작가는 0 이상이어야 합니다.");
      else if (hasBids && v !== application.startPrice) errors.push("입찰이 진행된 매물의 시작가는 변경할 수 없습니다.");
      else application.startPrice = v;
    }
    if (buyNowPrice !== undefined) {
      if (buyNowPrice === null || buyNowPrice === "" || buyNowPrice === 0) {
        application.buyNowPrice = null;
      } else {
        const v = Number(buyNowPrice);
        if (!Number.isFinite(v) || v <= application.startPrice) {
          errors.push("즉시낙찰가는 시작가보다 커야 합니다.");
        } else if (application.currentBid && v < application.currentBid) {
          errors.push("즉시낙찰가는 현재 최고가보다 커야 합니다.");
        } else {
          application.buyNowPrice = v;
        }
      }
    }
    if (endsAt !== undefined) {
      application.endsAt = endsAt ? new Date(endsAt) : null;
    }
    if (minIncrement !== undefined) {
      const v = Number(minIncrement);
      if (Number.isFinite(v) && v > 0) application.minIncrement = v;
    }
    if (Array.isArray(photos)) application.photos = photos.slice(0, 10);
    if (description !== undefined) application.description = String(description).slice(0, 5000);
    if (adminNote !== undefined) application.adminNote = adminNote;

    if (errors.length) {
      return res.status(400).json({ success: false, message: errors });
    }

    await application.save();

    // 게시된 Product가 있으면 동기화 (live/ended 상태 모두)
    if (application.publishedProduct) {
      const isBuyNow = application.saleType === "buynow";
      const productUpdate = {
        name: application.name,
        nameKo: application.nameKo,
        set: application.set,
        year: Number(application.year) || undefined,
        number: application.number,
        sale_type: isBuyNow ? "buynow" : "auction",
        price: isBuyNow
          ? (application.buyNowPrice || application.startPrice)
          : application.startPrice,
        startPrice: application.startPrice,
        buyNowPrice: application.buyNowPrice || null,
        endsAt: application.endsAt,
        images: application.photos || [],
        description: application.description || "",
        grade: {
          company: application.gradeCompany,
          score: Number(application.gradeScore),
          country: application.cardCountry || "USA",
          cert: application.gradeCert || "",
        },
      };
      await Product.findByIdAndUpdate(application.publishedProduct, productUpdate, { runValidators: true });
    }

    await application.populate("user", "name email phone");
    res.status(200).json({ success: true, data: application });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// [DELETE] /api/auctions/:id - 신청 삭제 (어드민)
//   publishedProduct가 있으면 함께 삭제. 입찰이 있으면 ?force=true 필요 (안전장치).
const deleteApplication = async (req, res) => {
  try {
    const application = await AuctionApplication.findById(req.params.id);
    if (!application) {
      return res.status(404).json({ success: false, message: "신청 내역을 찾을 수 없습니다." });
    }

    const force = req.query.force === "true" || req.body?.force === true;

    if (application.publishedProduct) {
      const product = await Product.findById(application.publishedProduct).select("bidCount currentBid");
      if (product && (product.bidCount > 0 || product.currentBid) && !force) {
        return res.status(400).json({
          success: false,
          message: "입찰이 진행된 매물입니다. 강제 삭제하려면 force=true를 전달하세요.",
          requireForce: true,
        });
      }
      if (product) await Product.findByIdAndDelete(application.publishedProduct);
    }

    await AuctionApplication.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "신청이 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createApplication,
  getMyApplications,
  getApplications,
  getApplicationById,
  updateStatus,
  updateApplication,
  deleteApplication,
};
