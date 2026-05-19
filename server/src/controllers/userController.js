const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const SALT_ROUNDS = 10;

// ─── 입력 검증 ──────────────────────────────────────────────
const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;

/** 비밀번호 정책 — 최소 8자, 영문/숫자/특수 중 2가지 이상 */
function validatePassword(pw) {
  if (typeof pw !== "string") return "비밀번호가 필요합니다.";
  if (pw.length < PASSWORD_MIN) return `비밀번호는 ${PASSWORD_MIN}자 이상이어야 해요.`;
  if (pw.length > PASSWORD_MAX) return `비밀번호는 ${PASSWORD_MAX}자 이하여야 해요.`;
  let kinds = 0;
  if (/[a-zA-Z]/.test(pw)) kinds++;
  if (/[0-9]/.test(pw)) kinds++;
  if (/[^a-zA-Z0-9]/.test(pw)) kinds++;
  if (kinds < 2) return "비밀번호는 영문/숫자/특수문자 중 2가지 이상을 포함해주세요.";
  return null;
}

function validateEmail(email) {
  if (typeof email !== "string" || !email.trim()) return "이메일이 필요합니다.";
  if (!EMAIL_RX.test(email.trim())) return "올바른 이메일 형식이 아닙니다.";
  if (email.length > 254) return "이메일이 너무 깁니다.";
  return null;
}

function trimStr(v, max) {
  if (typeof v !== "string") return v;
  const t = v.trim();
  return max && t.length > max ? t.slice(0, max) : t;
}

// [GET] /api/users - 전체 유저 조회 (페이징 + 검색)
const getAllUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "", user_type } = req.query;
    const filter = {};
    if (user_type) filter.user_type = user_type;
    if (search) {
      const rx = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: rx }, { email: rx }, { phone: rx }];
    }
    const skip = (Number(page) - 1) * Number(limit);
    // lean() — admin 목록은 read-only, hydration 불필요. password 제외 유지.
    const [users, total] = await Promise.all([
      User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      User.countDocuments(filter),
    ]);
    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [GET] /api/users/:id - 특정 유저 조회
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "유저를 찾을 수 없습니다." });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [POST] /api/users - 유저 생성
const createUser = async (req, res) => {
  try {
    const { email, name, password, profile_image, phone, address } = req.body;

    // ─── 입력 검증 ───
    const emailErr = validateEmail(email);
    if (emailErr) return res.status(400).json({ success: false, message: emailErr });
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "이름이 필요합니다." });
    }
    if (name.length > 50) {
      return res.status(400).json({ success: false, message: "이름은 50자 이하로 입력해주세요." });
    }
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ success: false, message: pwErr });

    // 이메일 중복 체크 (소문자로 정규화 후 비교)
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "이미 사용 중인 이메일입니다." });
    }

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // user_type은 클라이언트 입력 무시 → 항상 'customer'로 강제 (권한 상승 방어)
    const user = await User.create({
      email: normalizedEmail,
      name: trimStr(name, 50),
      password: hashedPassword,
      user_type: "customer",
      profile_image,
      phone: trimStr(phone, 30),
      address,
    });

    // 토큰 발급 + 비밀번호 제외
    const token = jwt.sign(
      { id: user._id, user_type: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    const { password: _, ...userData } = user.toObject();
    res.status(201).json({ success: true, token, data: userData });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// [PUT] /api/users/:id - 유저 정보 수정 (본인 또는 admin)
const updateUser = async (req, res) => {
  try {
    const isAdmin = req.user?.user_type === "admin";
    const isSelf = req.user && req.user._id.toString() === req.params.id;
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ success: false, message: "권한이 없습니다." });
    }

    const { email, name, password, user_type, profile_image, phone, address } =
      req.body;

    // undefined 필드는 set하지 않도록 명시적으로 추출 (덮어쓰기 방지)
    const updateData = {};
    if (name !== undefined) {
      if (!name || !name.trim()) return res.status(400).json({ success: false, message: "이름이 필요합니다." });
      updateData.name = trimStr(name, 50);
    }
    if (email !== undefined) {
      const e = validateEmail(email);
      if (e) return res.status(400).json({ success: false, message: e });
      updateData.email = email.toLowerCase().trim();
    }
    if (profile_image !== undefined) updateData.profile_image = profile_image;
    if (phone !== undefined) updateData.phone = trimStr(phone, 30);
    if (address !== undefined) updateData.address = address;
    // user_type 변경은 admin만 가능 (일반 유저가 보내면 무시)
    if (user_type !== undefined && isAdmin) updateData.user_type = user_type;

    // 비밀번호가 전달된 경우만 정책 검증 + 암호화
    if (password) {
      const pwErr = validatePassword(password);
      if (pwErr) return res.status(400).json({ success: false, message: pwErr });
      updateData.password = await bcrypt.hash(password, SALT_ROUNDS);
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "유저를 찾을 수 없습니다." });
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// [DELETE] /api/users/:id - 유저 삭제
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "유저를 찾을 수 없습니다." });
    }

    res.status(200).json({ success: true, message: "유저가 삭제되었습니다." });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [POST] /api/users/:id/wishlist/:cardId - 위시리스트에 카드 추가
const addToWishlist = async (req, res) => {
  try {
    const { id, cardId } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { $addToSet: { wishlist: cardId } }, // 중복 없이 추가
      { new: true }
    ).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "유저를 찾을 수 없습니다." });
    }

    res.status(200).json({ success: true, data: user.wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [DELETE] /api/users/:id/wishlist/:cardId - 위시리스트에서 카드 제거
const removeFromWishlist = async (req, res) => {
  try {
    const { id, cardId } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { $pull: { wishlist: cardId } }, // 해당 항목 제거
      { new: true }
    ).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "유저를 찾을 수 없습니다." });
    }

    res.status(200).json({ success: true, data: user.wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [POST] /api/users/login - 유저 로그인
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 이메일로 유저 찾기 (스키마 lowercase로 저장되므로 쿼리도 정규화)
    const normalizedEmail = (email || "").toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "이메일 또는 비밀번호가 일치하지 않습니다." });
    }

    // 비밀번호 비교
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, message: "이메일 또는 비밀번호가 일치하지 않습니다." });
    }

    // 비밀번호 일치 시 JWT 토큰 생성
    const token = jwt.sign(
      { id: user._id, user_type: user.user_type },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    // 응답에서 비밀번호 제외
    const { password: _, ...userData } = user.toObject();

    res.status(200).json({ 
      success: true, 
      token,
      data: userData 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [GET] /api/users/me - 내 정보 조회 (토큰 필요)
const getMe = async (req, res) => {
  try {
    const { password: _, ...userData } = req.user.toObject();
    res.status(200).json({ success: true, data: userData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// [GET] /api/users/check-email?email=xxx - 이메일 중복 확인 (public)
const checkEmail = async (req, res) => {
  try {
    const email = (req.query.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ success: false, message: '이메일을 입력해주세요.' });
    const exists = await User.exists({ email });
    res.json({ success: true, available: !exists });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
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
};
