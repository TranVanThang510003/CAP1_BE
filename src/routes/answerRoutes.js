const express = require('express');
const router = express.Router();
const { saveAnswers, getSuggestedTours } = require('../controllers/answerController');
const { authenticateToken } = require('../middlewares/authMiddleware');

router.post('/save', authenticateToken, saveAnswers);
router.get('/suggested-tours', authenticateToken, getSuggestedTours);

module.exports = router;
