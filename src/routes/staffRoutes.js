const express = require('express');
const {
    getBookingsByStaff,
} = require('../controllers/staffController/staffcontroller');
const getOrdersByTour = require('../controllers/staffController/getOrderByTour');
const getToursWithRevenue = require('../controllers/staffController/getToursWithRevenue');
const  getTopDestinations =require('../controllers/staffController/getTopDestinations');
const getMonthlyRevenue= require('../controllers/staffController/getMonthlyRevenue');
const router = express.Router();

// Helper function to validate creatorId
const validateCreatorId = (creatorId) => {
    const id = parseInt(creatorId, 10);
    if (isNaN(id) || id <= 0) {
        return null;
    }
    return id;
};

// Route: Get orders by tour
router.get('/order/:creatorId', async (req, res) => {
    const creatorId = validateCreatorId(req.params.creatorId);
    if (!creatorId) {
        return res.status(400).json({ message: 'creatorId không hợp lệ' });
    }

    try {
        const orders = await getOrdersByTour(creatorId);
        res.status(200).json({ orders });
    } catch (error) {
        res.status(500).json({
            message: 'Lỗi khi lấy danh sách hóa đơn theo tour',
            error: error.message,
        });
    }
});

// Route: Get revenue by tours
router.get('/revenue/:creatorId', async (req, res) => {
    const creatorId = validateCreatorId(req.params.creatorId); // Using params for creatorId
    if (!creatorId) {
        return res.status(400).json({ message: 'creatorId không hợp lệ' });
    }

    try {
        const revenue = await getToursWithRevenue(creatorId); // Fetch revenue by creatorId
        res.status(200).json({ revenue });
    } catch (error) {
        res.status(500).json({
            message: 'Lỗi khi lấy doanh thu theo tour',
            error: error.message,
        });
    }
});



// Route: Get bookings by staff
router.get('/bills/:creatorId', async (req, res) => {
    const creatorId = validateCreatorId(req.params.creatorId);
    if (!creatorId) {
        return res.status(400).json({ message: 'creatorId không hợp lệ' });
    }

    try {
        const invoices = await getBookingsByStaff(creatorId);
        res.status(200).json({ invoices });
    } catch (error) {
        res.status(500).json({
            message: 'Lỗi khi lấy danh sách hóa đơn',
            error: error.message,
        });
    }
});



router.get('/top-destinations',getTopDestinations);
router.get("/monthly-revenue/:createId",getMonthlyRevenue)

module.exports = router;
