const express = require('express');
const { getBookingsByStaff } = require('../controllers/staffcontroller');
const router = express.Router();

router.get('/:creatorId', async (req, res) => {
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

module.exports = router;
