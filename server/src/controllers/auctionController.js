const AuctionApplication = require("../models/AuctionApplication");

// [POST] /api/auctions - 경매 신청 (일반 유저)
const createApplication = async (req, res) => {
  try {
    const {
      name, nameKo, set, year, number,
      gradeCompany, gradeScore, gradeCert,
      saleType, startPrice, buyNowPrice, endsAt, minIncrement,
      photos,
    } = req.body;

    const application = await AuctionApplication.create({
      user: req.user._id,
      name, nameKo, set, year, number,
      gradeCompany, gradeScore, gradeCert,
      saleType, startPrice,
      buyNowPrice: buyNowPrice || null,
      endsAt: endsAt || null,
      minIncrement: minIncrement || 1000000,
      photos: photos || [],
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
    const applications = await AuctionApplication.find({ user: req.user._id })
      .sort({ createdAt: -1 });
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
    const [applications, total] = await Promise.all([
      AuctionApplication.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("user", "name email phone"),
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
const updateStatus = async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const allowed = ["pending", "approved", "rejected", "live", "ended"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "유효하지 않은 상태값입니다." });
    }

    const application = await AuctionApplication.findByIdAndUpdate(
      req.params.id,
      { status, ...(adminNote !== undefined && { adminNote }) },
      { new: true }
    ).populate("user", "name email");

    if (!application) {
      return res.status(404).json({ success: false, message: "신청 내역을 찾을 수 없습니다." });
    }

    res.status(200).json({ success: true, data: application });
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
};
