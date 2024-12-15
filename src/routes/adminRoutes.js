const express = require('express');
const {
  getAllAccount,
  getAccountById,
  updateAccountRole,
} = require('../controllers/adminController/adminController');
const getBookingTransactions = require('../controllers/adminController/getBookingTransactions')
const router = express.Router();

router.get('/accounts', getAllAccount);
router.get('/accounts/:userId', getAccountById);
router.get('/transactions', getBookingTransactions);
router.put('/:userId/role', updateAccountRole);

module.exports = router;
