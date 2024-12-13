const express = require('express');
const router = express.Router();
const { getUserById, updateUser } = require('../controllers/userController/UserController');
const getOrderInfomation = require('../controllers/userController/getOrderInfomation');
const { toggleFavorite } = require('../controllers/userController/favoriteController');
const getFavoriteTours= require('../controllers/userController/getFavorites');
const addReview =require('../controllers/userController/addReview');
// ===== Routes liên quan đến người dùng =====
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.post('/favorite', toggleFavorite);
router.get('/favorites/:userId', getFavoriteTours);
router.get('/orders/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const orders = await getOrderInfomation(userId);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
router.post('/review', async (req, res) => {
    const reviewData = req.body;

    try {
        const result = await addReview(reviewData);
        res.status(201).json(result);
    } catch (error) {
        console.error('Lỗi khi lưu đánh giá:', error);
        res.status(500).json({ error: 'Đã xảy ra lỗi khi lưu đánh giá' });
    }
});
module.exports = router;
