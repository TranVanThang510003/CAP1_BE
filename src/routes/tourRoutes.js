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
const getTopBookedTours = require('../controllers/publicTourController/getTopBookedTours');
const { multipleUpload } = require('../middlewares/uploadMiddlewares');
const { getFilteredTours } = require('../controllers/tourController'); // Import thêm getFilteredTours
const { authenticateToken } = require('../middlewares/authMiddleware');
const { getSuggestedTours } = require('../controllers/answerController'); 
// Public tour routes
router.get('/', authenticateToken, getAllTours); // Updated: Added authenticateToken for all tours
router.get('/top-tours', authenticateToken, getTopBookedTours); // Updated: Added authenticateToken for top tours

router.get('/:id', authenticateToken, getTourById); // Updated: Added authenticateToken for specific tour
router.get('/by-creator/:creatorId', authenticateToken, async (req, res) => { // Updated: Added authenticateToken for tours by creator
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
router.delete('/:id', authenticateToken, deleteTour); // Updated: Added authenticateToken for deleting a tour

// Suggested tours route
router.get('/suggested-tours', authenticateToken, async (req, res) => {
    try {
        const suggestedTours = await getSuggestedTours(req, res);
        res.status(200).json({ suggestedTours });
    } catch (error) {
        res.status(500).json({
            message: 'Lỗi khi gợi ý tour',
            error: error.message,
        });
    }
});

// Route to get reviews for a tour
router.get('/reviews/:tourId', authenticateToken, getTourReviews); // Updated: Added authenticateToken for tour reviews

// New route for filtered tours
router.get('/filtered', authenticateToken, getFilteredTours); // Lọc tour dựa trên tiêu chí

module.exports = router;
