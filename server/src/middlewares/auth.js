const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '인증 토큰이 없습니다.' });
  }
  try {
    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: '유효하지 않은 토큰입니다.' });
    next();
  } catch {
    res.status(401).json({ success: false, message: '토큰 검증에 실패했습니다.' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user?.user_type !== 'admin') {
    return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
  }
  next();
};

// 자주 쓰이는 조합 — [protect, adminOnly] 대신 admin 하나로
const admin = [protect, adminOnly];

module.exports = { protect, adminOnly, admin };
