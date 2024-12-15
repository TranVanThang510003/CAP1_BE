const express = require('express');
const router = express.Router();
const {
  singleUpload,
  multipleUpload,
} = require('../middlewares/uploadMiddlewares');

// Import các controller
const { getUserById, updateUser } = require('../controllers/userController/UserController');
const { login, register } = require('../controllers/authController');
const getAllTours = require('../controllers/publicTourController/getAllTours');
const getTourById = require('../controllers/publicTourController/getTourById');
const getToursByCreator = require('../controllers/publicTourController/getTourByCreator');
const createTour = require('../controllers/publicTourController/createTour');
const updateTour = require('../controllers/publicTourController/updateTour');
const deleteTour = require('../controllers/publicTourController/deleteTour');

const {
  getAllAccount,
  getAccountById,
  updateAccountRole,
} = require('../controllers/adminController/adminController');
const hotelController = require('../controllers/hotelController');
const funActivityController = require('../controllers/funActivityController');
const initPaymentRoutes = require('../controllers/paymentController');
const {
  getAllInvoices,
  getBookingsByStaff,
} = require('../controllers/staffController/staffcontroller');
const {
  verifyStaffRole,
  authenticateUser,
} = require('../middlewares/authMiddleware');
const locationController = require('../controllers/locationController');

// ===== Routes liên quan đến người dùng =====
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);

// ===== Routes quản lý tài khoản (Admin) =====
router.get('/accounts', getAllAccount);
router.get('/accounts/:userId', getAccountById);
router.put('/accounts/:userId/role', updateAccountRole);

// ===== Routes đăng nhập và đăng ký =====
router.post('/login', login);
router.post('/register', register);

// ===== Routes hóa đơn =====
router.get('/invoices/:creatorId', async (req, res) => {
  const creatorId = parseInt(req.params.creatorId, 10);
  if (isNaN(creatorId) || creatorId <= 0) {
    return res.status(400).json({ message: 'creatorId không hợp lệ' });
  }

  try {
    const invoices = await getBookingsByStaff(creatorId);
    res.status(200).json({ invoices });
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Lỗi khi lấy danh sách hóa đơn', error: error.message });
  }
});

// ===== Routes tour công khai =====
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
    res.status(500).json({
      message: 'Lỗi khi lấy danh sách tour theo người tạo',
      error: error.message,
    });
  }
});

// ===== Routes tạo và cập nhật tour =====
router.post(
  '/createTour',
  authenticateUser,
  verifyStaffRole,
  multipleUpload,
  createTour
);

router.put(
  '/public-tours/:id',
  authenticateUser,
  verifyStaffRole,
  multipleUpload,
  async (req, res) => {
    try {
      const tourId = parseInt(req.params.id, 10);
      if (isNaN(tourId)) {
        return res.status(400).json({ message: 'Invalid tour ID' });
      }
      req.body.TOUR_ID = tourId; // Gán ID vào body
      await updateTour(req, res);
    } catch (error) {
      res
        .status(500)
        .json({ message: 'Error updating the tour', error: error.message });
    }
  }
);

router.delete('/public-tours/:id', deleteTour);

// ===== Route upload file (test) =====
router.post('/upload-single', singleUpload, (req, res) => {
  try {
    const uploadedFile = req.file;
    res.status(200).json({
      message: 'Upload thành công!',
      file: uploadedFile,
    });
  } catch (error) {
    res.status(400).json({ message: 'Upload thất bại!', error: error.message });
  }
});

// ===== Routes khách sạn =====
router.get('/hotels', hotelController.getAllHotels);
router.get('/hotels/:id', hotelController.getHotelById);

// ===== Routes hoạt động giải trí =====
router.get('/activities', funActivityController.getAllActivities);

// ===== Routes thanh toán =====
initPaymentRoutes(router);

// ===== Routes vị trí =====
router.get('/provinces', locationController.getProvinces);
router.get('/districts/:provinceId', locationController.getDistricts);
router.get('/wards/:districtId', locationController.getWards);

module.exports = router;
