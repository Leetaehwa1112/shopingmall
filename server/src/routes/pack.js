const express = require("express");
const router = express.Router();
const { getPacks, getPackById, createPack, updatePack, deletePack } = require("../controllers/packController");
const { admin } = require("../middlewares/auth");

// 팩은 재고/가격 변동 빈도 낮음 → 좀 더 길게 캐시.
const listCache = (req, res, next) => {
  res.set("Cache-Control", "public, max-age=60, s-maxage=120, stale-while-revalidate=300");
  next();
};

router.get("/", listCache, getPacks);
router.get("/:id", getPackById);
router.post("/", ...admin, createPack);
router.put("/:id", ...admin, updatePack);
router.delete("/:id", ...admin, deletePack);

module.exports = router;
