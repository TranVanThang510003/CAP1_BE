const sql = require('mssql');
const { connectToDB } = require('../../config/db');
const getToursByCreator = async (creatorId) => {
    if (isNaN(creatorId) || creatorId <= 0) {
        throw new Error('creatorId không hợp lệ');
    }

    try {
        const pool = await connectToDB();
        const result = await pool.request().input('creatorId', sql.Int, creatorId)
            .query(`
                SELECT
                    T.TOUR_ID AS id,
                    T.TOUR_NAME AS name,
                    T.DESCRIPTION AS description,
                    T.SERVICE_TYPE as serviceType,
                    ISNULL(S.NEAREST_PRICE_ADULT, 0) AS priceAdult,
                    S.DURATION AS duration,
                    T.LAST_UPDATED AS lastUpdated,
                    I.IMAGE_URL AS imageUrl,
                    T.PROVINCE AS location,
                    TT.TOUR_TYPE_NAME AS tourType,
                    CASE
                        WHEN T.LANGUAGE = 'vi' THEN N'Tiếng Việt'
                        WHEN T.LANGUAGE = 'en' THEN N'Tiếng Anh'
                        ELSE N'Ngôn ngữ khác'
                        END AS language,
            ISNULL(ReviewData.reviewCount, 0) AS reviewCount,
            ISNULL(ReviewData.averageRating, 0) AS averageRating,
            ISNULL(BookingData.totalBookings, 0) AS totalBookings,
            S.NEAREST_DEPARTURE_DATE -- Thêm cột này vào SELECT
                FROM [TRIPGO1].[dbo].[TOUR] T
                    LEFT JOIN (
                    SELECT TOUR_ID, MIN(IMAGE_URL) AS IMAGE_URL
                    FROM [TRIPGO1].[dbo].[TOUR_IMAGES]
                    GROUP BY TOUR_ID
                    ) I ON T.TOUR_ID = I.TOUR_ID
                    LEFT JOIN [TRIPGO1].[dbo].[TOUR_TYPE] TT ON T.TOUR_TYPE_ID = TT.TOUR_TYPE_ID
                    OUTER APPLY (
                    SELECT
                    MIN(S.DEPARTURE_DATE) AS NEAREST_DEPARTURE_DATE,
                    MAX(S.END_DATE) AS END_DATE,
                    MIN(S.PRICE_ADULT) AS NEAREST_PRICE_ADULT,
                    CASE
                    WHEN MAX(S.END_DATE) IS NOT NULL THEN DATEDIFF(DAY, MIN(S.DEPARTURE_DATE), MAX(S.END_DATE)) + 1
                    END AS DURATION
                    FROM [TRIPGO1].[dbo].[TOUR_SCHEDULE] S
                    WHERE S.TOUR_ID = T.TOUR_ID AND S.DEPARTURE_DATE >= GETDATE()
                    ) AS S
                    OUTER APPLY (
                    SELECT
                    COUNT(R.REVIEW_ID) AS reviewCount,
                    AVG(R.RATING) AS averageRating
                    FROM [TRIPGO1].[dbo].[TOUR_REVIEW] R
                    WHERE R.TOUR_ID = T.TOUR_ID
                    ) AS ReviewData
                    OUTER APPLY (
                    SELECT
                    COUNT(B.BOOKING_ID) AS totalBookings
                    FROM [TRIPGO1].[dbo].[TOUR_BOOKINGS] B
                    WHERE B.TOUR_ID = T.TOUR_ID
                    ) AS BookingData
                WHERE T.CREATED_BY = @creatorId

                ORDER BY T.LAST_UPDATED DESC; -- Sắp xếp theo ngày tạo giảm dần
            `);

        return result.recordset.map((tour) => ({
            ...tour,
            imageUrl: tour.imageUrl ? `/${tour.imageUrl}` : null,
        }));
    } catch (error) {
        console.error('Lỗi khi truy vấn danh sách tour:', error);
        throw error;
    }
};

module.exports =
    getToursByCreator
;