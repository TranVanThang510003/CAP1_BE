const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const getReviewStatus = async (req) => {
    try {
        const userId = parseInt(req.query.userId, 10);

        if (isNaN(userId) || userId <= 0) {
            throw new Error('Dữ liệu userId không hợp lệ.');
        }

        const pool = await connectToDB();

        // Lấy danh sách các đánh giá duy nhất cho từng bookingId (dựa trên REVIEW_DATE mới nhất)
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                WITH RankedReviews AS (
                    SELECT
                        b.BOOKING_ID,
                        b.TOUR_ID,
                        r.REVIEW_ID,
                        r.RATING,
                        r.COMMENTS,
                        r.REVIEW_DATE,
                        ROW_NUMBER() OVER (
                            PARTITION BY b.BOOKING_ID 
                            ORDER BY r.REVIEW_DATE DESC
                        ) AS RowNum
                    FROM
                        TOUR_BOOKINGS b
                            INNER JOIN
                        TOUR_REVIEWS r
                        ON
                            b.TOUR_ID = r.TOUR_ID AND b.BOOKING_ID = r.BOOKING_ID
                    WHERE
                        b.USER_ID = @userId
                )
                SELECT
                    BOOKING_ID,
                    TOUR_ID,
                    REVIEW_ID,
                    RATING,
                    COMMENTS,
                    REVIEW_DATE
                FROM
                    RankedReviews
                WHERE
                    RowNum = 1; -- Chỉ lấy bản ghi mới nhất cho mỗi Booking_ID
            `);

        return {
            reviewedBookings: result.recordset // Trả về danh sách đánh giá duy nhất theo Booking_ID
        };
    } catch (error) {
        console.error('Lỗi khi lấy trạng thái đánh giá:', error);
        throw error;
    }
};

module.exports = getReviewStatus;
