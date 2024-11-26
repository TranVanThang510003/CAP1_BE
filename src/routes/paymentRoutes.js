const express = require('express');
const initPaymentRoutes = require('../controllers/paymentController');
const router = express.Router();

initPaymentRoutes(router);

module.exports = router;
