const express = require('express');
const router = express.Router();
const { postReading, getRecent } = require('../controllers/sensorsController');
const auth = require('../middleware/auth');

// Allow devices to post readings without auth; protect recent fetch (dashboard) behind JWT
router.post('/', postReading);
router.get('/recent', auth, getRecent);

module.exports = router;