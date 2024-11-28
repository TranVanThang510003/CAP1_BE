const express = require('express');
const hotelController = require('../controllers/hotelController');
const router = express.Router();

router.get('/', hotelController.getAllHotels);
router.get('/:id', hotelController.getHotelById);

module.exports = router;
