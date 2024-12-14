const express = require('express');
const router = express.Router();
const { getUserById, updateUser } = require('../controllers/userController/UserController');
const getOrderInfomation = require('../controllers/userController/getOrderInfomation');
const { toggleFavorite } = require('../controllers/userController/favoriteController');
const getFavoriteTours= require('../controllers/userController/getFavorites');
const addReview =require('../controllers/userController/addReview');
const getReviewStatus = require('../controllers/userController/getReviewStatus');
const { multipleUpload } = require('../middlewares/uploadMiddlewares');
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
router.post('/review', multipleUpload, async (req, res) => {
    console.log('Files:', req.files); // Kiểm tra dữ liệu nhận từ multer
    try {
        const result = await addReview(req);
        res.status(200).json(result);
    } catch (error) {
        console.error('Error adding review:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra khi thêm đánh giá.', error: error.message });
    }
});


router.get('/reviews/status', async (req, res) => {
    try {
        const result = await getReviewStatus(req);
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ message: 'Có lỗi xảy ra khi kiểm tra trạng thái đánh giá.' });
    }
});
module.exports = router;
