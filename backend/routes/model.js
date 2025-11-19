const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getThresholds, uploadCsv } = require('../controllers/modelController');

// ensure uploads dir exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadsDir);
	},
	filename: function (req, file, cb) {
		const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
		cb(null, safeName);
	}
});

const upload = multer({ storage });

// GET /api/model/thresholds
router.get('/thresholds', getThresholds);

// POST /api/model/upload - accepts single file under field 'file' (keeps file)
router.post('/upload', upload.single('file'), uploadCsv);

// POST /api/model/train - accepts single file under field 'file', runs training and merges on success
router.post('/train', upload.single('file'), require('../controllers/modelController').trainUploaded);

module.exports = router;
