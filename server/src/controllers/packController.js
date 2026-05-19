const Pack = require("../models/Pack");

const getPacks = async (req, res) => {
  try {
    const { type, status = "active", page = 1, limit = 50 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    // lean() — list는 read-only, Mongoose 문서 hydration 불필요.
    // Pack 스키마는 큰 sub-doc/배열이 없어 select 생략 (전 필드 응답 크기 ~1KB/doc).
    const [packs, total] = await Promise.all([
      Pack.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Pack.countDocuments(filter),
    ]);
    res.json({ success: true, total, data: packs });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const getPackById = async (req, res) => {
  try {
    const pack = await Pack.findById(req.params.id).lean();
    if (!pack) return res.status(404).json({ success: false, message: "팩을 찾을 수 없습니다." });
    res.json({ success: true, data: pack });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

const createPack = async (req, res) => {
  try {
    const pack = await Pack.create({ ...req.body, created_by: req.user._id });
    res.status(201).json({ success: true, data: pack });
  } catch (e) {
    if (e.name === "ValidationError") {
      const msgs = Object.values(e.errors).map((x) => x.message);
      return res.status(400).json({ success: false, message: msgs });
    }
    res.status(500).json({ success: false, message: e.message });
  }
};

const updatePack = async (req, res) => {
  try {
    const pack = await Pack.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!pack) return res.status(404).json({ success: false, message: "팩을 찾을 수 없습니다." });
    res.json({ success: true, data: pack });
  } catch (e) {
    if (e.name === "ValidationError") {
      const msgs = Object.values(e.errors).map((x) => x.message);
      return res.status(400).json({ success: false, message: msgs });
    }
    res.status(500).json({ success: false, message: e.message });
  }
};

const deletePack = async (req, res) => {
  try {
    const pack = await Pack.findByIdAndDelete(req.params.id);
    if (!pack) return res.status(404).json({ success: false, message: "팩을 찾을 수 없습니다." });
    res.json({ success: true, message: "팩이 삭제되었습니다." });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

module.exports = { getPacks, getPackById, createPack, updatePack, deletePack };
