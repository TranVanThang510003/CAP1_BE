const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const addReview = async (reviewData) => {
    const { tourId, userId, rating, comments, reviewDate } = reviewData;

    // Kiểm tra đầu vào
    if (
        typeof tourId !== 'number' || tourId <= 0 ||
        typeof userId !== 'number' || userId <= 0 ||
        typeof rating !== 'number' || rating < 1 || rating > 5 ||
        !comments || typeof comments !== 'string' || !reviewDate
    ) {
        throw new Error('Dữ liệu đánh giá không hợp lệ');
    }

    try {
        const pool = await connectToDB();
        await pool.request()
            .input('tourId', sql.Int, tourId)
            .input('userId', sql.Int, userId)
            .input('rating', sql.Int, rating)
            .input('comments', sql.NVarChar, comments)
            .input('reviewDate', sql.DateTime, reviewDate)
            .query(`
                INSERT INTO [TRIPGO1].[dbo].[TOUR_REVIEW] ([TOUR_ID], [USER_ID], [RATING], [COMMENTS], [REVIEW_DATE])
                VALUES (@tourId, @userId, @rating, @comments, @reviewDate)
            `);

        return { message: 'Đánh giá đã được lưu thành công!' };
    } catch (error) {
        console.error('Lỗi khi thêm đánh giá:', error);
        throw error;
    }
};

module.exports = addReview;
