const express = require('express');
const hotelController = require('../controllers/hotelController/hotelController');
const createHotel = require("../controllers/hotelController/createHotel")
const updateHotel = require("../controllers/hotelController/updateHotel");
const { multipleUpload } = require('../middlewares/uploadMiddlewares');
const getAllHotels = require('../controllers/hotelController/getAllHotels');
const getAllRoom = require('../controllers/hotelController/getAllRoom');
const deleteBedByName= require('../controllers/hotelController/deleteBedByName')
const addRoom = require('../controllers/hotelController/addRoom');
const updateBed = require('../controllers/hotelController/updateBed');
const getHotelDetails = require('../controllers/hotelController/getHotelDetails')
const router = express.Router();

router.get('/', getAllHotels);
router.get('/rooms/:hotelId', getAllRoom);
router.get('/:hotelId', getHotelDetails);
router.post('/create-hotel', multipleUpload, createHotel)
router.put('/update-hotel/:hotelId', multipleUpload, updateHotel);
router.post('/add-room', multipleUpload, addRoom)
router.delete('/delete-bed/:roomTypeId/:bedTypeId', deleteBedByName);
router.put('/update-bed/:roomTypeId/:oldBedTypeId', updateBed);

module.exports = router;