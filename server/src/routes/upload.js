const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { protect } = require('../middlewares/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// 로그인 유저 누구나 업로드 가능 (admin 페이지 + SellPage 둘 다 사용).
// 파일 크기 10MB 제한 + Cloudinary 자체 rate limit으로 남용 방어.
router.post('/', protect, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: '파일이 없습니다.' });

  try {
    const folder = req.query.folder || 'pokevault';
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image' },
        (error, result) => error ? reject(error) : resolve(result)
      );
      stream.end(req.file.buffer);
    });

    res.json({ success: true, url: result.secure_url, public_id: result.public_id });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

module.exports = router;
