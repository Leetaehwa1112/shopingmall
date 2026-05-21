const express = require("express");
const router = express.Router();
const {
  createApplication,
  getMyApplications,
  getApplications,
  getApplicationById,
  updateStatus,
} = require("../controllers/auctionController");
const { protect, admin } = require("../middlewares/auth");

// 일반 유저
router.post("/", protect, createApplication);
router.get("/me", protect, getMyApplications);

// 어드민
router.get("/", ...admin, getApplications);
router.get("/:id", ...admin, getApplicationById);
router.patch("/:id/status", ...admin, updateStatus);

module.exports = router;
