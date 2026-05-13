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
} = require("../controllers/userController");
const { protect } = require("../middlewares/auth");

// POST   /api/users/login - 유저 로그인
router.post("/login", loginUser);

// GET    /api/users/me - 내 정보 조회 (토큰 필요)
router.get("/me", protect, getMe);

// GET    /api/users       - 전체 유저 조회
// POST   /api/users       - 유저 생성
router.route("/").get(getAllUsers).post(createUser);

// GET    /api/users/:id   - 특정 유저 조회
// PUT    /api/users/:id   - 유저 수정
// DELETE /api/users/:id   - 유저 삭제
router.route("/:id").get(getUserById).put(updateUser).delete(deleteUser);

// POST   /api/users/:id/wishlist/:cardId  - 위시리스트 추가
// DELETE /api/users/:id/wishlist/:cardId  - 위시리스트 제거
router.route("/:id/wishlist/:cardId")
  .post(addToWishlist)
  .delete(removeFromWishlist);

module.exports = router;
