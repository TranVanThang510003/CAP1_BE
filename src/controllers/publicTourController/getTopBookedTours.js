const { connectToDB } = require('../../config/db');

const getTopBookedTours = async (req, res) => {
    try {
        const pool = await connectToDB();
        const result = await pool.request().query(`
            SELECT TOP 3
                T.TOUR_ID AS id,
                    T.TOUR_NAME AS name,
                   T.DESCRIPTION AS description,
                   T.SERVICE_TYPE as serviceType,
                   S.NEAREST_PRICE_ADULT AS priceAdult,
                   T.CREATED_BY AS createBy,
                   S.DURATION AS duration,
                   T.LAST_UPDATED AS lastUpdated,
                   I.IMAGE_URL AS imageUrl,
                   T.PROVINCE AS province,
                   T.DISTRICT AS district,
                   T.WARD AS ward,
                   ISNULL(ReviewData.reviewCount, 0) AS reviewCount,
                   ISNULL(ReviewData.averageRating, 0) AS averageRating,
                   ISNULL(BookingData.nub_booking, 0) AS nubBooking,
                   ISNULL(BookingData.totalAdultCount, 0) AS totalAdultCount,
                   TT.TOUR_TYPE_NAME AS tourType,
                   CASE
                       WHEN T.LANGUAGE = 'vi' THEN N'Tiếng Việt'
                       WHEN T.LANGUAGE = 'en' THEN N'Tiếng Anh'
                       ELSE N'Ngôn ngữ khác'
                       END AS language
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
                MIN(S.PRICE_ADULT) AS NEAREST_PRICE_ADULT,
                MIN(DATEDIFF(DAY, S.DEPARTURE_DATE, S.END_DATE) + 1) AS DURATION
                FROM [TRIPGO1].[dbo].[TOUR_SCHEDULE] S
                WHERE S.TOUR_ID = T.TOUR_ID
                ) S
                OUTER APPLY (
                SELECT
                COUNT(B.BOOKING_ID) AS nub_booking,
                SUM(B.ADULT_COUNT) AS totalAdultCount
                FROM [TRIPGO1].[dbo].[TOUR_BOOKINGS] B
                WHERE B.TOUR_ID = T.TOUR_ID
                ) BookingData
                OUTER APPLY (
                SELECT
                COUNT(RV.REVIEW_ID) AS reviewCount,
                AVG(RV.RATING) AS averageRating
                FROM [TRIPGO1].[dbo].[TOUR_REVIEWS] RV
                WHERE RV.TOUR_ID = T.TOUR_ID
                ) ReviewData
            ORDER BY BookingData.nub_booking DESC;
        `);

        const tour = result.recordset.map((tour) => ({
            ...tour,
            imageUrl: tour.imageUrl ? `/${tour.imageUrl}` : null,
            fullLocation: `${tour.ward || ''}, ${tour.district || ''}, ${tour.province || ''}`.trim(),
        }));

        // Lấy danh sách lịch trình
        const schedulesResult = await pool.request().query(`
            SELECT
                S.TOUR_ID AS tourId,
                S.SCHEDULE_ID AS scheduleId,
                S.DEPARTURE_DATE AS departureDate,
                ISNULL(S.END_DATE, S.DEPARTURE_DATE) AS endDate,
                S.PRICE_ADULT AS priceAdult,
                S.PRICE_CHILD AS priceChild,
                S.QUANTITY AS quantity
            FROM [TRIPGO1].[dbo].[TOUR_SCHEDULE] S
            ORDER BY S.DEPARTURE_DATE ASC;
        `);

        const schedules = schedulesResult.recordset;

        // Gắn `scheduleData` vào từng tour
        const tours = tour.map((tour) => ({
            ...tour,
            scheduleData: schedules.filter((schedule) => schedule.tourId === tour.id),
        }));

        res.status(200).json({ tours });
    } catch (error) {
        console.error('Error fetching top booked tours:', error.message);
        res
            .status(500)
            .json({ message: 'Lỗi khi lấy danh sách tour', error: error.message });
    }
};

module.exports = getTopBookedTours;
