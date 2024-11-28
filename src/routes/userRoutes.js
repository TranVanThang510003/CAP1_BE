const express = require('express');
const router = express.Router();
const { getUserById, updateUser } = require('../controllers/UserController');

// ===== Routes liên quan đến người dùng =====
router.get('/:id', getUserById);
router.put('/:id', updateUser);

module.exports = router;
