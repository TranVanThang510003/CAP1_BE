const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const getTourReviews = async (req, res) => {
    try {
        // Lấy giá trị `tourId` từ `params`
        const tourId = parseInt(req.params.tourId, 10);

        // Kiểm tra tính hợp lệ của `tourId`
        if (!tourId || isNaN(tourId) || tourId <= 0) {
            return res.status(400).json({ message: 'ID tour không hợp lệ!' });
        }

        const pool = await connectToDB();

        // Kiểm tra xem `tourId` có tồn tại hay không
        const tourExists = await pool.request()
            .input('tourId', sql.Int, tourId)
            .query(`SELECT 1 FROM [TRIPGO1].[dbo].[TOUR] WHERE TOUR_ID = @tourId`);

        if (tourExists.recordset.length === 0) {
            return res.status(404).json({ message: 'Tour không tồn tại!' });
        }

        // Truy vấn dữ liệu đánh giá
        const result = await pool.request()
            .input('tourId', sql.Int, tourId)
            .query(`
                SELECT
                    COUNT(*) AS totalReviews,
                    ISNULL(AVG(R.RATING), 0) AS averageRating
                FROM [TRIPGO1].[dbo].[TOUR_REVIEWS] R
                WHERE R.TOUR_ID = @tourId;

                SELECT
                    R.REVIEW_ID AS reviewId,
                    U.USERNAME AS userName,
                    R.RATING AS rating,
                    R.COMMENTS AS comment,
                    R.REVIEW_DATE AS reviewDate,
                    I.IMAGE_URL AS imageUrl
                FROM [TRIPGO1].[dbo].[TOUR_REVIEWS] R
                    LEFT JOIN [TRIPGO1].[dbo].[TOUR_REVIEW_IMAGES] I
                ON R.REVIEW_ID = I.REVIEW_ID
                    LEFT JOIN [TRIPGO1].[dbo].[USERS] U
                    ON R.USER_ID = U.USER_ID
                WHERE R.TOUR_ID = @tourId
                ORDER BY R.REVIEW_DATE DESC;
            `);

        const aggregateData = result.recordsets[0][0] || { totalReviews: 0, averageRating: 0 };
        const reviewDetails = result.recordsets[1] || [];

        // Gộp danh sách ảnh theo `reviewId`
        const reviewsGrouped = reviewDetails.reduce((acc, curr) => {
            const { reviewId, userName, rating, comment, reviewDate, imageUrl } = curr;

            // Tìm reviewId đã tồn tại trong danh sách
            const existingReview = acc.find(r => r.reviewId === reviewId);

            if (existingReview) {
                // Nếu tồn tại, thêm ảnh mới vào mảng `images`
                if (imageUrl) existingReview.images.push(imageUrl);
            } else {
                // Nếu chưa tồn tại, tạo mới đánh giá
                acc.push({
                    reviewId,
                    userName,
                    rating,
                    comment,
                    reviewDate,
                    images: imageUrl ? [imageUrl] : []
                });
            }

            return acc;
        }, []);

        res.status(200).json({
            totalReviews: aggregateData.totalReviews,
            averageRating: parseFloat(aggregateData.averageRating.toFixed(1)),
            reviews: reviewsGrouped
        });
    } catch (error) {
        console.error('Lỗi khi lấy danh sách đánh giá:', error);
        res.status(500).json({ message: 'Có lỗi xảy ra khi lấy danh sách đánh giá.' });
    }
};

module.exports = getTourReviews;
