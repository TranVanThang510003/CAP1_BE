const express = require('express');
const { saveAnswers } = require('../controllers/answerController');
const { authenticateToken } = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/save-answers', authenticateToken, saveAnswers);

module.exports = router;
