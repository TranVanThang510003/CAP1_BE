const express = require('express');
const router = express.Router();
const getTourReviews = require('../controllers/publicTourController/getTourReviews');
const getAllTours = require('../controllers/publicTourController/getAllTours');
const getTourById = require('../controllers/publicTourController/getTourById');
const getToursByCreator = require('../controllers/publicTourController/getTourByCreator');
const createTour = require('../controllers/publicTourController/createTour');
const updateTour = require('../controllers/publicTourController/updateTour');
const deleteTour = require('../controllers/publicTourController/deleteTour');
const { authenticateUser, verifyStaffRole } = require('../middlewares/authMiddleware');
const getTopBookedTours = require("../controllers/publicTourController/getTopBookedTours");
const { multipleUpload } = require('../middlewares/uploadMiddlewares');

// Public tour routes
router.get('/', getAllTours);
router.get('/top-tours', getTopBookedTours);

router.get('/:id', getTourById);
router.get('/by-creator/:creatorId', async (req, res) => {
    const creatorId = parseInt(req.params.creatorId, 10);
    if (isNaN(creatorId) || creatorId <= 0) {
        return res.status(400).json({ message: 'creatorId không hợp lệ' });
    }

    try {
        const tours = await getToursByCreator(creatorId);
        res.status(200).json({ tours });
    } catch (error) {
        res.status(500).json({
            message: 'Lỗi khi lấy danh sách tour theo người tạo',
            error: error.message,
        });
    }
});

// Create, update, delete tours
router.post('/createTour', authenticateUser, verifyStaffRole, multipleUpload, createTour);
router.put('/:id', authenticateUser, verifyStaffRole, multipleUpload, updateTour);
router.delete('/:id', deleteTour);


// Route để lấy đánh giá của tour
router.get('/reviews/:tourId', getTourReviews);

module.exports = router;
