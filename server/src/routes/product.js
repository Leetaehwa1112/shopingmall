const express = require("express");
const router = express.Router();
const {
  getProducts,
  getProductById,
  getProductBySku,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const { admin } = require("../middlewares/auth");

// Public routes
router.get("/", getProducts);
router.get("/sku/:sku", getProductBySku);
router.get("/:id", getProductById);

// Admin-only routes
router.post("/", ...admin, createProduct);
router.put("/:id", ...admin, updateProduct);
router.delete("/:id", ...admin, deleteProduct);

module.exports = router;
