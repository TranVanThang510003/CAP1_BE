const express = require('express');
const router = express.Router();
const zeroShotController = require('../controllers/zeroShotController');

// Route to handle user answers and recommendations
router.post('/answers', zeroShotController.handleUserAnswers);

module.exports = router;
