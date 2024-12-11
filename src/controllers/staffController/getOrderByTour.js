const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const formatDate = (date) => {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getOrdersByTour = async (creatorId) => {
    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .input('creatorId', sql.Int, creatorId) // Truyền creatorId làm tham số
            .query(`
                SELECT
                    T.TOUR_NAME AS tourName,
                    T.TOUR_ID AS tourId,
                    B.BOOKING_ID AS bookingId,
                    B.DATE AS departureDate,
                    TS.END_DATE AS endDate,
                    B.TOTAL_PRICE AS totalPrice,
                    B.ADULT_COUNT AS adultCount,
                    B.CHILD_COUNT AS childCount,
                    U.USERNAME AS customerFirstName,
                    U.EMAIL AS customerEmail,
                    U.PHONE AS customerPhone
                FROM
                    [TRIPGO1].[dbo].[TOUR_BOOKINGS] B
                    LEFT JOIN [TRIPGO1].[dbo].[USERS] U ON B.USER_ID = U.USER_ID
                    LEFT JOIN [TRIPGO1].[dbo].[TOUR] T ON B.TOUR_ID = T.TOUR_ID
                    LEFT JOIN [TRIPGO1].[dbo].[TOUR_SCHEDULE] TS ON B.TOUR_ID = TS.TOUR_ID AND B.DATE = TS.DEPARTURE_DATE
                WHERE
                    T.CREATED_BY = @creatorId -- Lọc tour theo creatorId
                ORDER BY
                    T.TOUR_NAME, B.DATE
            `);

        const groupedOrders = result.recordset.reduce((acc, order) => {
            const {
                tourName,
                departureDate,
                bookingId,
                endDate,
                totalPrice,
                adultCount,
                childCount,
                customerFirstName,
                customerEmail,
                customerPhone
            } = order;

            const formattedDepartureDate = formatDate(departureDate);
            const formattedEndDate = endDate ? formatDate(endDate) : null;

            if (!acc[tourName]) {
                acc[tourName] = {};
            }

            if (!acc[tourName][formattedDepartureDate]) {
                acc[tourName][formattedDepartureDate] = [];
            }

            acc[tourName][formattedDepartureDate].push({
                bookingId,
                endDate: formattedEndDate,
                totalPrice,
                adultCount,
                childCount,
                customerFirstName,
                customerEmail,
                customerPhone
            });

            return acc;
        }, {});

        return groupedOrders;
    } catch (error) {
        console.error('Lỗi khi truy vấn danh sách khách hàng theo tour:', error);
        throw error;
    }
};

module.exports = getOrdersByTour;
