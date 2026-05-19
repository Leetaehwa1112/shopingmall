const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const SALT_ROUNDS = 10;

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
    const [users, total] = await Promise.all([
      User.find(filter).select("-password").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
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
    const { email, name, password, user_type, profile_image, phone, address } =
      req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "이메일은 필수입니다." });
    }

    // 이메일 중복 체크 (소문자로 정규화 후 비교)
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "이미 사용 중인 이메일입니다." });
    }

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await User.create({
      email,
      name,
      password: hashedPassword,
      user_type,
      profile_image,
      phone,
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

// [PUT] /api/users/:id - 유저 정보 수정
const updateUser = async (req, res) => {
  try {
    const { email, name, password, user_type, profile_image, phone, address } =
      req.body;

    const updateData = { email, name, user_type, profile_image, phone, address };
    
    // 비밀번호가 전달된 경우에만 암호화해서 업데이트 객체에 추가
    if (password) {
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

    // 이메일로 유저 찾기
    const user = await User.findOne({ email });
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
