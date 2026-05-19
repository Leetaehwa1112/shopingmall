const Product = require("../models/Product");

// [GET] /api/products - 상품 목록 조회
const getProducts = async (req, res) => {
  try {
    const { category, status = "active", sale_type, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (sale_type) filter.sale_type = sale_type;

    const skip = (Number(page) - 1) * Number(limit);

    const [products, total] = await Promise.all([
      Product.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("created_by", "name email"),
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
    const product = await Product.findById(req.params.id).populate("created_by", "name email");

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
    const product = await Product.findOne({ sku: req.params.sku.toUpperCase() });

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

    const product = await Product.findById(req.params.id);
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

    const minBid = (product.currentBid || product.startPrice || product.price || 0) + 1;
    if (numAmount < minBid) {
      return res.status(400).json({
        success: false,
        message: `최소 입찰가는 ${minBid.toLocaleString("ko-KR")}원 이상이어야 합니다.`,
      });
    }

    // 마지막 입찰자가 본인인지 (연속 입찰 방지 — 선택 정책)
    const lastBid = product.bidHistory?.[0];
    if (lastBid && String(lastBid.bidder_id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: "이미 최고 입찰자입니다." });
    }

    // unshift + 50건 cap
    const bidEntry = {
      bidder: req.user.name || "익명 트레이너",
      bidder_id: req.user._id,
      amount: numAmount,
      at: new Date(),
    };
    product.bidHistory = [bidEntry, ...(product.bidHistory || [])].slice(0, 50);
    product.currentBid = numAmount;
    product.bidCount = (product.bidCount || 0) + 1;

    await product.save();

    res.status(201).json({
      success: true,
      message: "입찰이 등록되었습니다.",
      data: {
        currentBid: product.currentBid,
        bidCount: product.bidCount,
        bidHistory: product.bidHistory,
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
