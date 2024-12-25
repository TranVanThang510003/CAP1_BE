const express = require('express');
const {
  getAllAccount,
  getAccountById,
  updateAccountRole,
} = require('../controllers/adminController/adminController');
const {
  getAllStaffRequests,
  getStaffRequestById,
  updateStaffRequestStatus
} = require('../controllers/adminController/staffRequestController');
const getBookingTransactions = require('../controllers/adminController/getBookingTransactions')
const router = express.Router();
router.get('/accounts', getAllAccount);
router.get('/accounts/:userId', getAccountById);
router.get('/transactions', getBookingTransactions);
router.put('/:userId/role', updateAccountRole);

router.get('/staff-requests', getAllStaffRequests);
router.put("/update-request/:requestId", updateStaffRequestStatus);
module.exports = router;
