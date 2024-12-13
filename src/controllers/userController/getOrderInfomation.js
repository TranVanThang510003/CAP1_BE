const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const getOrderInfomation = async (userId) => {
    if (typeof userId !== 'number' || isNaN(userId) || userId <= 0) {
        throw new Error('userId không hợp lệ');
    }

    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                WITH CTE_TOUR_IMAGES AS (
                    SELECT
                        TI.TOUR_ID,
                        TI.IMAGE_URL,
                        ROW_NUMBER() OVER (PARTITION BY TI.TOUR_ID ORDER BY TI.IMAGE_ID) AS row_num
                    FROM [TRIPGO1].[dbo].[TOUR_IMAGES] TI
                    )
                SELECT
                    B.BOOKING_ID AS bookingId,
                    B.DATE AS departureDate,
                    TS.END_DATE AS endDate,
                    B.TOTAL_PRICE AS totalPrice,
                    B.STATUS AS status,
                    T.TOUR_NAME AS tourName,
                    T.TOUR_ID AS tourId,
                    B.ADULT_COUNT AS adultCount,
                    B.CHILD_COUNT AS childCount,
                    B.TOTAL_PRICE AS tourPrice,
                    CTE.IMAGE_URL AS imageUrl
                FROM
                    [TRIPGO1].[dbo].[TOUR_BOOKINGS] B
                    LEFT JOIN
                    [TRIPGO1].[dbo].[USERS] U ON B.USER_ID = U.USER_ID
                    LEFT JOIN
                    [TRIPGO1].[dbo].[TOUR] T ON B.TOUR_ID = T.TOUR_ID
                    LEFT JOIN
                    [TRIPGO1].[dbo].[TOUR_SCHEDULE] TS ON B.TOUR_ID = TS.TOUR_ID AND B.DATE = TS.DEPARTURE_DATE
                    LEFT JOIN
                    CTE_TOUR_IMAGES CTE ON T.TOUR_ID = CTE.TOUR_ID AND CTE.row_num = 1 -- Lấy chỉ ảnh đầu tiên
                WHERE
                    U.USER_ID = @userId
            `);

        return { orders: result.recordset };
    } catch (error) {
        console.error('Lỗi khi truy vấn danh sách hóa đơn:', error);
        throw error;
    }
};

module.exports = getOrderInfomation;
