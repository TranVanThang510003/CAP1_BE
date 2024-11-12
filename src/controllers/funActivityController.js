const sql = require('mssql');
const { connectToDB } = require('../config/db');

// Hàm lấy danh sách các hoạt động
const getAllActivities = async (req, res) => {
    try {
        const pool = await connectToDB();
        
        const result = await pool.request().query(`
            SELECT 
                AF.ACTIVITY_FUN_ID AS id,
                AF.ACTIVITY_FUN_NAME AS name,
                L.LOCATION_NAME AS location,  -- Lấy tên địa điểm từ bảng LOCATION
                AF.PRICE AS price,
                AF.DESCRIPTIONS AS descriptions,
                AF.IMAGES AS imageUrl,
                AF.VIDEO AS video,
                AF.REVIEW_ID AS reviewId,
                AF.BOOKING_ID AS bookingId,
                AF.VOUCHER_ID AS voucherId
            FROM [TRIPGO].[dbo].[ACTIVITY_FUN] AF
            JOIN [TRIPGO].[dbo].[LOCATION] L ON AF.LOCATION_ID = L.LOCATION_ID -- Kết nối với bảng LOCATION để lấy tên địa điểm
        `);
        
        const activities = result.recordset.map(activity => ({
            ...activity,
            imageUrl: `/public/${activity.imageUrl}` // Đảm bảo đường dẫn ảnh đúng
        }));

        res.status(200).json({ activities });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách hoạt động', error });
    }
};

module.exports = {
    getAllActivities
};
