const { connectToDB } = require('../../config/db');

const getFavoriteTours = async (req, res) => {
    try {
        const { userId } = req.params; // Giả sử userId được truyền qua URL hoặc từ token của request

        const pool = await connectToDB();

        // Lấy danh sách tour yêu thích của người dùng
        const favoriteToursResult = await pool.request().query(`
            SELECT F.entity_id AS tourId
            FROM [TRIPGO1].[dbo].[Favorites] F
            WHERE F.user_id = ${userId} AND F.favorite_type = 'tour'
        `);

        const favoriteTourIds = favoriteToursResult.recordset.map((row) => row.tourId);

        // Nếu không có tour yêu thích, trả về danh sách tour rỗng
        if (favoriteTourIds.length === 0) {
            return res.status(200).json({ tours: [] });
        }

        // Lấy thông tin các tour yêu thích
        const result = await pool.request().query(`
            SELECT
                T.TOUR_ID AS id,
                T.TOUR_NAME AS name,
                S.NEAREST_PRICE_ADULT AS priceAdult,
                S.DURATION AS duration,
                I.IMAGE_URL AS imageUrl,
                T.PROVINCE AS province,
                ISNULL(ReviewData.reviewCount, 0) AS reviewCount,
                ISNULL(ReviewData.averageRating, 0) AS averageRating,
                ISNULL(BookingData.nub_booking, 0) AS nubBooking,
                TT.TOUR_TYPE_NAME AS tourType
            FROM [TRIPGO1].[dbo].[TOUR] T
                OUTER APPLY (
                SELECT TOP 1 IMAGE_URL
                FROM [TRIPGO1].[dbo].[TOUR_IMAGES]
                WHERE TOUR_ID = T.TOUR_ID
                ORDER BY IMAGE_ID
                ) I
                LEFT JOIN [TRIPGO1].[dbo].[TOUR_TYPE] TT ON T.TOUR_TYPE_ID = TT.TOUR_TYPE_ID
                OUTER APPLY (
                SELECT
                MIN(S.DEPARTURE_DATE) AS NEAREST_DEPARTURE_DATE,
                MIN(S.PRICE_ADULT) AS NEAREST_PRICE_ADULT,
                MIN(DATEDIFF(DAY, S.DEPARTURE_DATE, S.END_DATE)) + 1 AS DURATION
                FROM [TRIPGO1].[dbo].[TOUR_SCHEDULE] S
                WHERE S.TOUR_ID = T.TOUR_ID
                AND (S.DEPARTURE_DATE >= GETDATE() OR S.DEPARTURE_DATE <= GETDATE())
                ) AS S
                OUTER APPLY (
                SELECT
                COUNT(B.BOOKING_ID) AS nub_booking,
                SUM(B.ADULT_COUNT) AS totalAdultCount
                FROM [TRIPGO1].[dbo].[TOUR_BOOKINGS] B
                WHERE B.TOUR_ID = T.TOUR_ID
                ) AS BookingData
                OUTER APPLY (
                SELECT
                COUNT(RV.REVIEW_ID) AS reviewCount,
                AVG(RV.RATING) AS averageRating
                FROM [TRIPGO1].[dbo].[TOUR_REVIEWS] RV
                WHERE RV.TOUR_ID = T.TOUR_ID
                ) AS ReviewData
            WHERE T.TOUR_ID IN (${favoriteTourIds.join(",")})
            ORDER BY S.NEAREST_DEPARTURE_DATE;
        `);

        // Map kết quả truy vấn thành dữ liệu tour
        const tours = result.recordset.map((tour) => ({
            ...tour,
            imageUrl: tour.imageUrl ? `/${tour.imageUrl}` : null,
        }));

        res.status(200).json({ tours });
    } catch (error) {
        console.error('Error fetching favorite tours:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách tour yêu thích', error: error.message });
    }
};

module.exports = getFavoriteTours;
