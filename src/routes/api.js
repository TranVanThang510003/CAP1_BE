const express = require('express');
const router = express.Router();

// Import các controller
const { getUserById, updateUser } = require('../controllers/UserController');
const { login, register } = require('../controllers/authController');
const { getAllTours, getTourById, getToursByCreator , createTour } = require('../controllers/publicTourController');
const { getAllAccount, getAccountById, updateAccountRole } = require('../controllers/adminController');
const hotelController = require('../controllers/hotelController');
const funActivityController = require('../controllers/funActivityController');
const initPaymentRoutes = require('../controllers/paymentController');
const { getAllInvoices, getBookingsByStaff } = require('../controllers/staffcontroller');
const { verifyStaffRole,authenticateUser } = require('../middlewares/authMiddleware');

// Route thông tin người dùng
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);

// Route quản lý tài khoản người dùng (admin)
router.get('/accounts', getAllAccount);
router.get('/accounts/:userId', getAccountById);
router.put('/accounts/:userId/role', updateAccountRole);
router.get('/bookings/:userId/role',getBookingsByStaff);
// Route cho đăng nhập và đăng ký
router.post('/login', login);
router.post('/register', register);

// Route cho hóa đơn (in hóa đơn theo `creatorId`)
router.get('/invoices/:creatorId', async (req, res) => {
    const creatorId = parseInt(req.params.creatorId, 10);
    if (isNaN(creatorId) || creatorId <= 0) {
        return res.status(400).json({ message: 'creatorId không hợp lệ' });
    }

    try {
        const invoices = await getBookingsByStaff(creatorId);
        res.status(200).json({ invoices });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách hóa đơn', error: error.message });
    }
});

// Route cho tour công khai
router.get('/public-tours', getAllTours);
router.get('/public-tours/:id', getTourById);
router.get('/public-tours/by-creator/:creatorId', async (req, res) => {
    const creatorId = parseInt(req.params.creatorId, 10);
    if (isNaN(creatorId) || creatorId <= 0) {
        return res.status(400).json({ message: 'creatorId không hợp lệ' });
    }

    try {
        const tours = await getToursByCreator(creatorId);
        res.status(200).json({ tours });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách tour theo người tạo', error: error.message });
    }
});

// Route tạo mới một tour chỉ cho phép nhân viên (staff) thực hiện
router.post('/createtour', authenticateUser, verifyStaffRole, createTour);
// Route cho khách sạn
router.get('/hotels', hotelController.getAllHotels);
router.get('/hotels/:id', hotelController.getHotelById);

// Route cho hoạt động giải trí
router.get('/activities', funActivityController.getAllActivities);

// Route thanh toán
initPaymentRoutes(router);

module.exports = router;
