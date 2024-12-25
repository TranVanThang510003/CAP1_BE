const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getBookingTransactions = async (req, res) => {
    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .query(`
                SELECT
                    B.BOOKING_ID AS bookingId,
                    B.DATE AS departureDate,
                    B.TOTAL_PRICE AS totalPrice,
                    B.ADULT_COUNT AS adultCount,
                    B.CHILD_COUNT AS childCount,
                    U.USERNAME AS customerName,
                    U.EMAIL AS customerEmail,
                    U.PHONE AS customerPhone,
                    T.TOUR_NAME AS tourName
                FROM
                    [TRIPGO1].[dbo].[TOUR_BOOKINGS] B
                    LEFT JOIN [TRIPGO1].[dbo].[USERS] U ON B.USER_ID = U.USER_ID
                    LEFT JOIN [TRIPGO1].[dbo].[TOUR] T ON B.TOUR_ID = T.TOUR_ID
                ORDER BY
                    B.DATE DESC
            `);

        // Định dạng lại ngày trước khi trả về
        const bookings = result.recordset.map((booking) => ({
            bookingId: booking.bookingId,
            departureDate: formatDate(booking.departureDate),
            totalPrice: booking.totalPrice,
            adultCount: booking.adultCount,
            childCount: booking.childCount,
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            customerPhone: booking.customerPhone,
            tourName: booking.tourName
        }));

        // Gửi kết quả dưới dạng JSON
        res.status(200).json(bookings);
    } catch (error) {
        console.error('Lỗi khi truy vấn danh sách booking:', error);
        res.status(500).json({ message: 'Lỗi khi truy vấn danh sách booking', error: error.message });
    }
};

module.exports = getBookingTransactions;

