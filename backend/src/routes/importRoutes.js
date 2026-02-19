const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middlewares/auth');
const { importFromPepperplate } = require('../controllers/importController');

const router = express.Router();

// Configure multer for memory storage (we'll process the zip in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Only accept zip files
    if (
      file.mimetype === 'application/zip' ||
      file.mimetype === 'application/x-zip-compressed' ||
      file.originalname.endsWith('.zip')
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only .zip files are allowed'), false);
    }
  },
});

// POST /api/v1/import/pepperplate - Import from Pepperplate export
router.post('/pepperplate', authenticateToken, upload.single('file'), importFromPepperplate);

module.exports = router;
