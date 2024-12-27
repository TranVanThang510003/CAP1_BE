const express = require('express');
const router = express.Router();
const ZeroShotController = require('../controllers/zeroShotController');

// Route to handle user answers and recommendations
router.post('/answers', ZeroShotController.handleUserAnswers);

module.exports = router;
