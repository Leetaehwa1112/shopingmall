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

// Public routes
router.get("/", getProducts);
router.get("/sku/:sku", getProductBySku);
router.get("/:id", getProductById);

// Authenticated user routes
router.post("/:id/bid", protect, placeBid);

// Admin-only routes
router.post("/", ...admin, createProduct);
router.put("/:id", ...admin, updateProduct);
router.delete("/:id", ...admin, deleteProduct);

module.exports = router;
