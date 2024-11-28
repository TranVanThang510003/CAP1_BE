const express = require('express');
const funActivityController = require('../controllers/funActivityController');
const router = express.Router();

router.get('/', funActivityController.getAllActivities);

module.exports = router;
