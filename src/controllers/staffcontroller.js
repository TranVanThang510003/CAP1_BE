const sql = require('mssql');
const { connectToDB } = require('../config/db');

// Function to get all invoices
const getAllInvoices = async (req, res) => {
    try {
        const pool = await connectToDB();
        const result = await pool.request().query(`
            SELECT 
                T.TRANSACTION_ID AS transactionId,
                T.USER_ID AS userId,
                T.BOOKING_ID AS bookingId,
                T.AMOUNT AS amount,
                T.STATUS AS status,
                T.ZP_TRANS_ID AS zpTransId,
                T.CREATED_AT AS createdAt,
                T.UPDATED_AT AS updatedAt,
                T.DESCRIPTION AS description
            FROM TRANSACTIONS T
            ORDER BY T.CREATED_AT DESC;
        `);

        const invoices = result.recordset;

        res.status(200).json({ invoices });
    } catch (error) {
        console.error('Error fetching invoices:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách hóa đơn', error: error.message });
    }
};

const getBookingsByStaff = async (staffId) => {
    if (typeof staffId !== 'number' || isNaN(staffId) || staffId <= 0) {
        throw new Error('staffId không hợp lệ');
    }

    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .input('staffId', sql.Int, staffId)
            .query(`
                SELECT 
                    B.BOOKING_ID AS bookingId,
                    B.DATE AS bookingDate, -- Sử dụng DATE thay cho BOOKING_DATE
                    B.TOTAL_PRICE AS totalPrice,
                    B.STATUS AS status,
                    U.USERNAME AS bookedBy,
                    T.TOUR_NAME AS tourName,
                    T.PRICE AS tourPrice,
                    T.DURATION AS tourDuration,
                    L.LOCATION_NAME AS tourLocation,
                    B.ADULT_COUNT AS adultCount,
                    B.CHILD_COUNT AS childCount
                FROM 
                    [TRIPGO1].[dbo].[TOUR_BOOKINGS] B
                LEFT JOIN 
                    [TRIPGO1].[dbo].[USERS] U ON B.USER_ID = U.USER_ID
                LEFT JOIN 
                    [TRIPGO1].[dbo].[TOUR] T ON B.TOUR_ID = T.TOUR_ID
                LEFT JOIN 
                    [TRIPGO1].[dbo].[TOUR_LOCATION] L ON T.TOUR_ID = L.TOUR_ID
                WHERE 
                    U.CREATED_BY = @staffId;
            `);

        return result.recordset;
    } catch (error) {
        console.error('Lỗi khi truy vấn danh sách hóa đơn:', error);
        throw error;
    }
};





module.exports = {
    getAllInvoices,
    getBookingsByStaff
};
