const express = require('express');
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const { admin } = require('../middlewares/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/', ...admin, upload.single('file'), async (req, res) => {
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
