const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  getProductBySku,
  createProduct,
  updateProduct,
  deleteProduct,
  placeBid,
} = require("../controllers/productController");
const { protect, admin } = require("../middlewares/auth");

// 짧은 HTTP 캐시 — 목록은 currentBid 변동 가능하지만 15s 정도면 UX↑ vs 신선도 트레이드오프 OK.
// SWR(stale-while-revalidate): 60s 동안은 stale 응답을 즉시 주고 백그라운드에서 갱신.
// 미래에 Cloudflare/CDN 붙이면 s-maxage가 그쪽에서도 캐시.
const listCache = (req, res, next) => {
  res.set("Cache-Control", "public, max-age=15, s-maxage=30, stale-while-revalidate=60");
  next();
};

// Public routes
router.get("/", listCache, getProducts);
router.get("/sku/:sku", getProductBySku);
router.get("/:id", getProductById);

// Authenticated user routes
router.post("/:id/bid", protect, placeBid);

// Admin-only routes
router.post("/", ...admin, createProduct);
router.put("/:id", ...admin, updateProduct);
router.delete("/:id", ...admin, deleteProduct);

module.exports = router;
