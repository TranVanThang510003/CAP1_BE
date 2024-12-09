const express = require('express');
const router = express.Router();

const userRoutes = require('./userRoutes');
const authRoutes = require('./authRoutes');
const tourRoutes = require('./tourRoutes');
const adminRoutes = require('./adminRoutes');
const hotelRoutes = require('./hotelRoutes');
const funActivityRoutes = require('./funActivityRoutes');
const paymentRoutes = require('./paymentRoutes');
const invoiceRoutes = require('./staffRoutes');
const dashboardRoutes = require('./dashboardRoutes');
// Mount routes
router.use('/users', userRoutes);
router.use('/', authRoutes);
router.use('/', dashboardRoutes) ;
router.use('/public-tours', tourRoutes);
router.use('/accounts', adminRoutes);
router.use('/hotels', hotelRoutes);
router.use('/activities', funActivityRoutes);
router.use('/', paymentRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/',marketingRoutes);

module.exports = router;
