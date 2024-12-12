const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const getTopDestinations = async (req, res) => {
    try {
        const pool = await connectToDB();
        const result = await pool.request().query(`
            SELECT
                T.PROVINCE AS province, -- Lấy thông tin từ bảng TOUR
                COUNT(B.BOOKING_ID) AS totalBookings
            FROM
                TOUR_BOOKINGS B
                    LEFT JOIN
                TOUR T ON B.TOUR_ID = T.TOUR_ID
            GROUP BY
                T.PROVINCE
            ORDER BY
                totalBookings DESC
            OFFSET 0 ROWS FETCH NEXT 5 ROWS ONLY; -- Lấy top 5
        `);

        res.status(200).json({ destinations: result.recordset });
    } catch (error) {
        console.error('Lỗi khi lấy top địa điểm booking:', error);
        res.status(500).json({ message: 'Lỗi server', error: error.message });
    }
};

module.exports = getTopDestinations;
