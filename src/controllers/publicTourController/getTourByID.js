const sql = require('mssql');
const { connectToDB } = require('../../config/db');


const getTourById = async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ message: 'ID tour không hợp lệ' });
    }

    try {
        const pool = await connectToDB();
        const result = await pool.request().input('tourId', sql.Int, id).query(`
                -- Lấy thông tin tour
                SELECT 
                    T.TOUR_ID AS id,
                    T.TOUR_NAME AS name,
                    T.HIGHLIGHTS AS highlights,
                    T.DESCRIPTION AS description,
                    T.TOUR_TYPE_ID AS tourTypeId,                                      
                    T.CREATED_BY AS createdBy,
                    ISNULL(T.LAST_UPDATED, GETDATE()) AS lastUpdated,
                    CONCAT(T.WARD, ', ', T.DISTRICT, ', ', T.PROVINCE) AS location,
                    TT.TOUR_TYPE_NAME AS tourType,
                    T.SERVICE_TYPE AS serviceType,
                    CASE 
                        WHEN T.LANGUAGE = 'vi' THEN N'Tiếng Việt'
                        WHEN T.LANGUAGE = 'en' THEN N'Tiếng Anh'
                        ELSE N'Ngôn ngữ khác'
                    END AS language,
                    ISNULL(ReviewData.reviewCount, 0) AS reviewCount,
                    ISNULL(ReviewData.averageRating, 0) AS averageRating,
                    LatestReview.latestComment AS latestComment,
                    LatestReview.userName AS userName
                FROM [TRIPGO1].[dbo].[TOUR] T
                LEFT JOIN [TRIPGO1].[dbo].[TOUR_TYPE] TT ON T.TOUR_TYPE_ID = TT.TOUR_TYPE_ID
                OUTER APPLY (
                    SELECT 
                        COUNT(RV.REVIEW_ID) AS reviewCount,
                        AVG(RV.RATING) AS averageRating
                    FROM [TRIPGO1].[dbo].[TOUR_REVIEWS] RV
                    WHERE RV.TOUR_ID = T.TOUR_ID
                ) AS ReviewData
                OUTER APPLY (
                    SELECT TOP 1 
                        RV.COMMENTS AS latestComment,
                        U.USERNAME AS userName
                    FROM [TRIPGO1].[dbo].[TOUR_REVIEWS] RV
                    LEFT JOIN [TRIPGO1].[dbo].[USERS] U ON RV.USER_ID = U.USER_ID
                    WHERE RV.TOUR_ID = @tourId
                    ORDER BY RV.REVIEW_DATE DESC
                ) AS LatestReview
                WHERE T.TOUR_ID = @tourId;

                -- Lấy danh sách ảnh liên quan đến tour
                SELECT 
                    TI.IMAGE_ID AS imageId,
                    TI.IMAGE_URL AS imageUrl
                FROM [TRIPGO1].[dbo].[TOUR_IMAGES] TI
                WHERE TI.TOUR_ID = @tourId;
-- Lấy danh sách lịch trình và số lượng booking
    SELECT 
        S.SCHEDULE_ID AS scheduleId,
        S.DEPARTURE_DATE AS departureDate,
        ISNULL(S.END_DATE, S.DEPARTURE_DATE) AS endDate,
        S.PRICE_ADULT AS priceAdult,
        S.PRICE_CHILD AS priceChild,
        S.QUANTITY AS quantity,
        -- Tính tổng số lượng booking (người lớn và trẻ em)
        ISNULL(SUM(TB.ADULT_COUNT), 0) AS bookedAdults,
        ISNULL(SUM(TB.CHILD_COUNT), 0) AS bookedChildren,
        ISNULL(SUM(TB.ADULT_COUNT) + SUM(TB.CHILD_COUNT), 0) AS totalBooked
    FROM [TRIPGO1].[dbo].[TOUR_SCHEDULE] S
    LEFT JOIN [TRIPGO1].[dbo].[TOUR_BOOKINGS] TB ON TB.TOUR_ID = S.TOUR_ID AND TB.DATE = S.DEPARTURE_DATE
    WHERE S.TOUR_ID = @tourId
    GROUP BY S.SCHEDULE_ID, S.DEPARTURE_DATE, S.END_DATE, S.PRICE_ADULT, S.PRICE_CHILD, S.QUANTITY
    ORDER BY S.DEPARTURE_DATE ASC;
            `);

        // Kiểm tra nếu không có dữ liệu tour
        if (result.recordsets[0].length === 0) {
            return res
                .status(404)
                .json({ message: 'Không tìm thấy tour với ID đã cho.' });
        }

        // Lấy dữ liệu từ recordsets
        const tourData = result.recordsets[0][0];
        const images = result.recordsets[1].map((row) => ({
            imageId: row.imageId,
            imageUrl: row.imageUrl,
        }));

        const schedules = result.recordsets[2].map((schedule) => ({
            scheduleId: schedule.scheduleId,
            departureDate: schedule.departureDate,
            endDate: schedule.endDate,
            priceAdult: schedule.priceAdult,
            priceChild: schedule.priceChild,
            quantity: schedule.quantity,
            totalBooked:schedule.totalBooked
        }));

        // Kiểm tra service_type và lấy dữ liệu tương ứng
        let servicesQuery = '';
        if (tourData.serviceType === 'trong ngày') {
            servicesQuery = `
                SELECT 
                    DS.TIME AS time,
                    DS.TITLE AS title,
                    DS.DESCRIPTION AS description
                FROM [TRIPGO1].[dbo].[DAILY_SCHEDULES] DS
                WHERE DS.TOUR_ID = @tourId
            `;
        } else if (tourData.serviceType === 'nhiều ngày') {
            servicesQuery = `
                SELECT 
                    MS.DAY_NUMBER AS dayNumber,
                    MS.TITLE AS title,
                    MS.DESCRIPTION AS description
                FROM [TRIPGO1].[dbo].[MULTI_DAY_SCHEDULES] MS
                WHERE MS.TOUR_ID = @tourId
            `;
        } else {
            return res.status(400).json({ message: 'Loại dịch vụ không hợp lệ.' });
        }

        // Thực hiện truy vấn dịch vụ
        const servicesResult = await pool
            .request()
            .input('tourId', sql.Int, id)
            .query(servicesQuery);

        const services = servicesResult.recordset.map((row) => ({
            time: row.time ? row.time.toISOString().slice(11, 16) : null, // Thời gian (chỉ áp dụng cho "trong ngày")
            dayNumber: row.dayNumber || null, // Số ngày (chỉ áp dụng cho "nhiều ngày")
            title: row.title,
            description: row.description,
        }));

        // Cấu trúc lại dữ liệu tour để trả về
        const tour = {
            id: tourData.id,
            name: tourData.name,
            description: tourData.description || 'Chưa có mô tả',
            highlights: tourData.highlights ? tourData.highlights.split(',') : [],
            services, // Dịch vụ tương ứng với serviceType
            createdBy: tourData.createdBy,
            lastUpdated: tourData.lastUpdated,
            location: tourData.location,
            tourType: tourData.tourType,
            tourTypeId: tourData.tourTypeId,
            serviceType: tourData.serviceType, // Trả về serviceType
            language: tourData.language,
            reviewCount: tourData.reviewCount,
            averageRating: tourData.averageRating
                ? parseFloat(tourData.averageRating).toFixed(1)
                : 0,
            latestComment: tourData.latestComment,
            userName: tourData.userName,
            images, // Danh sách ảnh
            schedules, // Danh sách lịch trình
        };

        res.status(200).json({ tour });
    } catch (error) {
        console.error('Error fetching tour details:', error.message);
        res
            .status(500)
            .json({ message: 'Lỗi khi lấy chi tiết tour', error: error.message });
    }
};

module.exports = getTourById;