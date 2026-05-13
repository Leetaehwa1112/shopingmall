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

module.exports = { protect };
