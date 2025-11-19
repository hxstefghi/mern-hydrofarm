const express = require('express');
const router = express.Router();
const { postReading, getRecent } = require('../controllers/sensorsController');


router.post('/', postReading);
router.get('/recent', getRecent);


module.exports = router;