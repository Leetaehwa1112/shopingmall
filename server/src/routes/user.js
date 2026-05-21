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

// POST   /api/users/login       - 유저 로그인 (public)
router.post("/login", loginUser);
// GET    /api/users/check-email - 이메일 중복 확인 (public)
router.get("/check-email", checkEmail);
// POST   /api/users             - 회원가입 (public)
router.post("/", createUser);

// GET    /api/users/me     - 내 정보 조회
router.get("/me", protect, getMe);

// 위시리스트 (본인)
router.route("/:id/wishlist/:cardId")
  .post(protect, addToWishlist)
  .delete(protect, removeFromWishlist);

// 어드민 전용
router.get("/",     ...admin, getAllUsers);
router.get("/:id",  ...admin, getUserById);
router.put("/:id",  ...admin, updateUser);
router.delete("/:id", ...admin, deleteUser);

module.exports = router;
