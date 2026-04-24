const fs = require('fs');
const path = require('path');
const multer = require('multer');

const itemUploadDir = path.join(__dirname, '..', 'uploads', 'items');
fs.mkdirSync(itemUploadDir, { recursive: true });

const allowedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, itemUploadDir);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const rawBaseName = path.basename(file.originalname || 'item-image', extension).toLowerCase();
    const safeBaseName = rawBaseName
      .replace(/[^a-z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'item-image';

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${safeBaseName}${extension}`);
  }
});

const fileFilter = (_req, file, cb) => {
  if (allowedMimeTypes.has(file.mimetype)) {
    return cb(null, true);
  }

  return cb(new Error('Only JPG, PNG, WEBP, and GIF images are allowed.'));
};

const uploadItemImage = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

module.exports = uploadItemImage;
