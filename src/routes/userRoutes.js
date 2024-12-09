const express = require('express');
const router = express.Router();
const { getUserById, updateUser } = require('../controllers/userController/UserController');
const getOrderInfomation = require('../controllers/userController/getOrderInfomation');
const { toggleFavorite } = require('../controllers/userController/favoriteController');
const getFavoriteTours= require('../controllers/userController/getFavorites');
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
module.exports = router;
