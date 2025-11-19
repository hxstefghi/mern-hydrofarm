const express = require('express');
const router = express.Router();
const { createCommand, getLatestCommand } = require('../controllers/commandsController');


router.post('/', createCommand);
router.get('/latest', getLatestCommand);


module.exports = router;