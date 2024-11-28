const express = require('express');
const {
  getAllAccount,
  getAccountById,
  updateAccountRole,
} = require('../controllers/adminController');
const router = express.Router();

router.get('/', getAllAccount);
router.get('/:userId', getAccountById);
router.put('/:userId/role', updateAccountRole);

module.exports = router;
