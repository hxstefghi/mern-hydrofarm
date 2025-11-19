const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const auth = require('../middleware/auth');

// All routes require auth and admin (controllers verify admin)
router.post('/', auth, usersController.createUser);
router.get('/', auth, usersController.listUsers);
router.get('/:id', auth, usersController.getUser);
router.put('/:id', auth, usersController.updateUser);
router.delete('/:id', auth, usersController.deleteUser);

module.exports = router;
