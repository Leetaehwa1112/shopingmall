const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  addToWishlist,
  removeFromWishlist,
  loginUser,
  getMe,
  checkEmail,
} = require("../controllers/userController");
const { protect, admin } = require("../middlewares/auth");

// IDOR 방어 — :id 파라미터가 본인이 아니면 거부 (admin은 통과)
const requireSelfOrAdmin = (req, res, next) => {
  const isAdmin = req.user?.user_type === "admin";
  const isSelf = req.user && req.user._id.toString() === req.params.id;
  if (!isAdmin && !isSelf) {
    return res.status(403).json({ success: false, message: "권한이 없습니다." });
  }
  next();
};

// POST   /api/users/login       - 유저 로그인 (public)
router.post("/login", loginUser);
// GET    /api/users/check-email - 이메일 중복 확인 (public)
router.get("/check-email", checkEmail);
// POST   /api/users             - 회원가입 (public)
router.post("/", createUser);

// GET    /api/users/me     - 내 정보 조회
router.get("/me", protect, getMe);

// 위시리스트 — 본인만 (IDOR 방어)
router.route("/:id/wishlist/:cardId")
  .post(protect, requireSelfOrAdmin, addToWishlist)
  .delete(protect, requireSelfOrAdmin, removeFromWishlist);

// 본인 또는 admin
router.put("/:id", protect, requireSelfOrAdmin, updateUser);

// 어드민 전용
router.get("/",       ...admin, getAllUsers);
router.get("/:id",    ...admin, getUserById);
router.delete("/:id", ...admin, deleteUser);

module.exports = router;
