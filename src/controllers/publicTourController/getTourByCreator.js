const sql = require('mssql');
const { connectToDB } = require('../../config/db'); // Giả sử connectToDB là một function kết nối tới DB

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
                    T.SERVICE_TYPE AS serviceType,
                    ISNULL(S.NEAREST_PRICE_ADULT, 0) AS priceAdult, -- Giá người lớn từ lịch gần nhất
                    T.CREATED_BY AS createBy,
                    -- DURATION tính theo lịch trình gần nhất
                    ISNULL(S.DURATION, 0) AS duration,
                    T.LAST_UPDATED AS lastUpdated,
                    I.IMAGE_URL AS imageUrl, -- Chỉ lấy một ảnh duy nhất
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
                        END AS language,
    -- Trạng thái tour tính từ ngày khởi hành đầu tiên và ngày kết thúc cuối cùng của tất cả lịch trình
    CASE
        WHEN StatusData.FIRST_DEPARTURE_DATE > CAST(GETDATE() AS DATE) THEN N'Sắp bắt đầu'
        WHEN StatusData.FIRST_DEPARTURE_DATE <= CAST(GETDATE() AS DATE) 
             AND StatusData.LAST_END_DATE >= CAST(GETDATE() AS DATE) THEN N'Đang hoạt động'
        ELSE N'Đã kết thúc'
                END AS status,
    StatusData.FIRST_DEPARTURE_DATE AS FIRST_DEPARTURE_DATE,
    StatusData.LAST_END_DATE AS LAST_END_DATE,
    CAST(GETDATE() AS DATE) AS currentDate  -- Log ngày hiện tại
FROM [TRIPGO1].[dbo].[TOUR] T
    OUTER APPLY (
        -- Lấy ảnh đầu tiên từ bảng TOUR_IMAGES
        SELECT TOP 1 IMAGE_URL 
        FROM [TRIPGO1].[dbo].[TOUR_IMAGES]
        WHERE TOUR_ID = T.TOUR_ID
        ORDER BY IMAGE_ID
    ) I
    LEFT JOIN [TRIPGO1].[dbo].[TOUR_TYPE] TT ON T.TOUR_TYPE_ID = TT.TOUR_TYPE_ID
    OUTER APPLY (
        -- Lấy lịch trình gần nhất để tính DURATION
        SELECT
            CAST(S.DEPARTURE_DATE AS DATE) AS FIRST_DEPARTURE_DATE,  -- Ngày khởi hành gần nhất
            CAST(S.END_DATE AS DATE) AS LAST_END_DATE,  -- Ngày kết thúc gần nhất
            MIN(S.PRICE_ADULT) AS NEAREST_PRICE_ADULT, -- Giá người lớn của lịch trình gần nhất
            DATEDIFF(DAY, S.DEPARTURE_DATE, S.END_DATE) + 1 AS DURATION  -- Tính DURATION từ lịch trình gần nhất
        FROM [TRIPGO1].[dbo].[TOUR_SCHEDULE] S
        WHERE S.TOUR_ID = T.TOUR_ID
        GROUP BY S.DEPARTURE_DATE, S.END_DATE  -- Nhóm theo ngày khởi hành và ngày kết thúc
        ORDER BY S.DEPARTURE_DATE  -- Chọn lịch trình gần nhất
        OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY -- Lấy lịch trình gần nhất
    ) AS S
    OUTER APPLY (
        -- Tính trạng thái từ tất cả lịch trình (ngày khởi hành đầu tiên và ngày kết thúc cuối cùng)
        SELECT
            MIN(S.DEPARTURE_DATE) AS FIRST_DEPARTURE_DATE,  -- Ngày khởi hành đầu tiên của tất cả lịch trình
            MAX(S.END_DATE) AS LAST_END_DATE  -- Ngày kết thúc cuối cùng của tất cả lịch trình
        FROM [TRIPGO1].[dbo].[TOUR_SCHEDULE] S
        WHERE S.TOUR_ID = T.TOUR_ID
    ) AS StatusData
    OUTER APPLY (
        -- Tính số lượng đặt tour và tổng số khách
        SELECT
            COUNT(B.BOOKING_ID) AS nub_booking,
            SUM(B.ADULT_COUNT) AS totalAdultCount
        FROM [TRIPGO1].[dbo].[TOUR_BOOKINGS] B
        WHERE B.TOUR_ID = T.TOUR_ID
    ) AS BookingData
    OUTER APPLY (
        -- Tính số lượng đánh giá và đánh giá trung bình
        SELECT
            COUNT(RV.REVIEW_ID) AS reviewCount,
            AVG(RV.RATING) AS averageRating
        FROM [TRIPGO1].[dbo].[TOUR_REVIEWS] RV
        WHERE RV.TOUR_ID = T.TOUR_ID
    ) AS ReviewData
WHERE T.CREATED_BY = @creatorId
ORDER BY S.FIRST_DEPARTURE_DATE;

            `);

        // Log dữ liệu ra console để kiểm tra
        result.recordset.forEach(tour => {
            console.log('Tour ID:', tour.id);
            console.log('First Departure Date:', tour.FIRST_DEPARTURE_DATE);
            console.log('Last End Date:', tour.LAST_END_DATE);
            console.log('Current Date (GETDATE()):', tour.currentDate);
            console.log('Status:', tour.status);
        });

        // Xử lý kết quả trả về
        return result.recordset.map((tour) => ({
            ...tour,
            imageUrl: tour.imageUrl ? `/${tour.imageUrl}` : null,
        }));

    } catch (error) {
        console.error('Lỗi khi truy vấn danh sách tour:', error);
        throw error;
    }
};

module.exports = getToursByCreator;
