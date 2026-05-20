const Product = require("../models/Product");

// 목록 응답용 projection — UI가 실제 사용하는 필드만.
// 제외: bidHistory(최대 50개 sub-doc), description(긴 본문), created_by populate.
const LIST_FIELDS =
  "sku name nameKo set setShort year number accent rarity isHolo grade " +
  "price currentBid bidCount watchers endsAt population category " +
  "sale_type status images stock createdAt";

// [GET] /api/products - 상품 목록 조회
const getProducts = async (req, res) => {
  try {
    const { category, status = "active", sale_type, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (sale_type) filter.sale_type = sale_type;

    const skip = (Number(page) - 1) * Number(limit);

    // lean() — Mongoose hydration 스킵, plain object 반환 (list는 read-only)
    // select(LIST_FIELDS) — bidHistory/description 등 list 미사용 필드 제외
    // populate 제거 — created_by는 list UI에서 미사용
    const [products, total] = await Promise.all([
      Product.find(filter)
        .select(LIST_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: products,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [GET] /api/products/:id - 상품 단건 조회
const getProductById = async (req, res) => {
  try {
    // 단건 상세 — bidHistory/description 포함 풀필드. lean()으로 hydration 생략.
    // created_by populate는 ProductDetailPage UI 미사용 → 제거.
    const product = await Product.findById(req.params.id).lean();

    if (!product) {
      return res.status(404).json({ success: false, message: "상품을 찾을 수 없습니다." });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [GET] /api/products/sku/:sku - SKU로 상품 조회
const getProductBySku = async (req, res) => {
  try {
    const product = await Product.findOne({ sku: req.params.sku.toUpperCase() }).lean();

    if (!product) {
      return res.status(404).json({ success: false, message: "해당 SKU의 상품이 없습니다." });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [POST] /api/products - 상품 등록 (어드민)
const createProduct = async (req, res) => {
  try {
    const { sku, name, price, category, images, description, stock, sale_type } = req.body;

    const existing = await Product.findOne({ sku: sku?.toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "이미 사용 중인 SKU입니다." });
    }

    const product = await Product.create({
      sku,
      name,
      price,
      category,
      images,
      description,
      stock,
      sale_type,
      created_by: req.user._id,
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "이미 사용 중인 SKU입니다." });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// [PUT] /api/products/:id - 상품 수정 (어드민)
const updateProduct = async (req, res) => {
  try {
    const { sku, name, price, category, images, description, stock, sale_type, status } = req.body;

    // SKU 변경 시 중복 확인
    if (sku) {
      const existing = await Product.findOne({ sku: sku.toUpperCase(), _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(409).json({ success: false, message: "이미 사용 중인 SKU입니다." });
      }
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { sku, name, price, category, images, description, stock, sale_type, status },
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "상품을 찾을 수 없습니다." });
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "이미 사용 중인 SKU입니다." });
    }
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// [DELETE] /api/products/:id - 상품 삭제 (어드민)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: "상품을 찾을 수 없습니다." });
    }

    res.status(200).json({ success: true, message: "상품이 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [POST] /api/products/:id/bid - 경매 입찰 (로그인 필수)
const placeBid = async (req, res) => {
  try {
    const { amount } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ success: false, message: "유효한 입찰 금액을 입력해주세요." });
    }

    // 1) 사전 조회로 친절한 에러 메시지 (경매 종료/유형/연속입찰 등)
    const product = await Product.findById(req.params.id).select(
      "sale_type status endsAt currentBid startPrice price bidHistory"
    );
    if (!product) {
      return res.status(404).json({ success: false, message: "상품을 찾을 수 없습니다." });
    }
    if (product.sale_type !== "auction") {
      return res.status(400).json({ success: false, message: "경매 상품이 아닙니다." });
    }
    if (product.status !== "active") {
      return res.status(400).json({ success: false, message: "진행 중인 경매가 아닙니다." });
    }
    if (product.endsAt && new Date(product.endsAt).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: "이미 종료된 경매입니다." });
    }

    const baseline = product.currentBid || product.startPrice || product.price || 0;
    const minBid = baseline + 1;
    if (numAmount < minBid) {
      return res.status(400).json({
        success: false,
        message: `최소 입찰가는 ${minBid.toLocaleString("ko-KR")}원 이상이어야 합니다.`,
      });
    }
    // 상한 sanity check — 직전 가격의 10배 OR 100억(10,000,000,000), 둘 중 작은 값
    // 사용자의 오타·실수로 천문학적 금액 입력 방지
    const ABSOLUTE_MAX = 10_000_000_000; // 100억
    const maxBid = Math.min(baseline * 10, ABSOLUTE_MAX);
    if (numAmount > maxBid) {
      return res.status(400).json({
        success: false,
        message: `입찰 한도를 초과했어요. 최대 ${maxBid.toLocaleString("ko-KR")}원까지 입찰 가능합니다.`,
      });
    }
    // 만원 단위로 떨어지지 않으면 거부 (깔끔한 금액만 허용)
    if (numAmount % 10000 !== 0) {
      return res.status(400).json({
        success: false,
        message: "입찰 금액은 만원 단위로 입력해주세요.",
      });
    }

    const lastBid = product.bidHistory?.[0];
    if (lastBid && String(lastBid.bidder_id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: "이미 최고 입찰자입니다." });
    }

    const bidEntry = {
      bidder: req.user.name || "익명 트레이너",
      bidder_id: req.user._id,
      amount: numAmount,
      at: new Date(),
    };

    // 2) atomic update — currentBid < numAmount 조건이 매치될 때만 갱신
    //    동시 입찰 race 방지: 다른 요청이 먼저 더 높은 금액으로 갱신했다면 409
    const updated = await Product.findOneAndUpdate(
      {
        _id: req.params.id,
        sale_type: "auction",
        status: "active",
        $or: [{ currentBid: { $lt: numAmount } }, { currentBid: { $exists: false } }],
        $and: [
          { $or: [{ endsAt: null }, { endsAt: { $gt: new Date() } }] },
        ],
      },
      {
        $set: { currentBid: numAmount },
        $inc: { bidCount: 1 },
        $push: { bidHistory: { $each: [bidEntry], $position: 0, $slice: 50 } },
      },
      { new: true }
    );

    if (!updated) {
      return res.status(409).json({
        success: false,
        message: "더 높은 입찰이 이미 들어왔어요. 새로고침 후 다시 시도해주세요.",
      });
    }

    res.status(201).json({
      success: true,
      message: "입찰이 등록되었습니다.",
      data: {
        currentBid: updated.currentBid,
        bidCount: updated.bidCount,
        bidHistory: updated.bidHistory,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getProductBySku,
  createProduct,
  updateProduct,
  deleteProduct,
  placeBid,
};
