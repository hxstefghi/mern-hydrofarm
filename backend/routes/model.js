const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { getThresholds, uploadCsv } = require('../controllers/modelController');

// Use OS temp directory for cloud deployments (Render, Heroku, etc.)
// Falls back to local uploads dir if temp not available
let uploadsDir;
try {
	uploadsDir = os.tmpdir();
	console.log('Using temp directory for uploads:', uploadsDir);
} catch (e) {
	uploadsDir = path.join(__dirname, '..', 'uploads');
	if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
	console.log('Using local uploads directory:', uploadsDir);
}

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadsDir);
	},
	filename: function (req, file, cb) {
		const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
		cb(null, safeName);
	}
});

const upload = multer({ 
	storage,
	limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// GET /api/model/thresholds
router.get('/thresholds', getThresholds);

// POST /api/model/upload - accepts single file under field 'file' (keeps file)
router.post('/upload', upload.single('file'), uploadCsv);

// POST /api/model/train - accepts single file under field 'file', runs training and merges on success
router.post('/train', upload.single('file'), require('../controllers/modelController').trainUploaded);

// Error handling middleware for multer errors
router.use((error, req, res, next) => {
	console.error('Multer/Route error:', error);
	if (error instanceof multer.MulterError) {
		// A Multer error occurred when uploading
		if (error.code === 'LIMIT_FILE_SIZE') {
			return res.status(400).json({ error: 'File too large. Max 10MB.' });
		}
		return res.status(400).json({ error: `Upload error: ${error.message}` });
	} else if (error) {
		// An unknown error occurred
		return res.status(500).json({ error: error.message || 'Internal server error during upload' });
	}
	next();
});

module.exports = router;
