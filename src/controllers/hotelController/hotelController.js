const sql = require('mssql');
const { connectToDB } = require('../../config/db');

// Hàm lấy danh sách các khách sạn
const getAllHotels = async (req, res) => {
    try {
        const pool = await connectToDB();
        const result = await pool.request().query(`
            SELECT 
                H.HOTEL_ID AS id,
                H.HOTEL_NAME AS name,
                CONCAT(L.ADDRESS, ', ', L.CITY) AS location,
                H.STAR_RATING AS starRating,
                H.HOTEL_TYPE AS hotelType,
                H.AMENITIES AS amenities,
                H.CHAIN AS chain,
                H.IS_CENTRAL AS isCentral,
                H.IS_FREE_CANCELLATION AS isFreeCancellation,
                H.CHILD_FREE_POLICY AS childFreePolicy,
                H.DESCRIPTION AS description,
                H.PARKING AS parking,
                H.POOL AS pool,
                H.GYM AS gym,
                H.SPA AS spa,
                H.INTERNET_ACCESS AS internetAccess,
                H.PET_POLICY AS petPolicy,
                H.AIRPORT_TRANSFER AS airportTransfer,
                H.LAST_UPDATED AS lastUpdated,
                I.IMAGE_URL AS imageUrl,
                ISNULL(ReviewData.reviewCount, 0) AS reviewCount,
                ISNULL(ReviewData.averageRating, 0) AS averageRating
            FROM [TRIPGO1].[dbo].[HOTEL] H
            LEFT JOIN [TRIPGO1].[dbo].[LOCATION] L ON H.LOCATION_ID = L.LOCATION_ID
            LEFT JOIN [TRIPGO1].[dbo].[HOTEL_IMAGES] I ON H.HOTEL_ID = I.HOTEL_ID
            OUTER APPLY (
                SELECT 
                    COUNT(RV.REVIEW_ID) AS reviewCount,
                    AVG(RV.RATING) AS averageRating
                FROM [TRIPGO1].[dbo].[HOTELREVIEW] RV
                WHERE RV.HOTEL_ID = H.HOTEL_ID
            ) AS ReviewData;
        `);

        const hotels = result.recordset.map(hotel => ({
            ...hotel,
            imageUrl: hotel.imageUrl ? `/${hotel.imageUrl}` : null
        }));

        res.status(200).json({ hotels });
    } catch (error) {
        console.error('Error fetching hotel list:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách khách sạn', error: error.message });
    }
};


// Hàm lấy chi tiết một khách sạn với thông tin về phòng, ảnh giường, kế hoạch bữa ăn, và thông tin đánh giá
const getHotelById = async (req, res) => {
    const { id } = req.params;

    if (isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ message: 'ID khách sạn không hợp lệ' });
    }

    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .input('hotelId', sql.Int, id)
            .query(`
                SELECT 
                    H.HOTEL_ID AS id,
                    H.HOTEL_NAME AS name,
                    L.LOCATION_NAME AS location,
                    H.HOTEL_TYPE AS hotelType,
                    H.AMENITIES AS amenities,
                    H.CHAIN AS chain,
                    H.IS_CENTRAL AS isCentral,
                    H.IS_FREE_CANCELLATION AS isFreeCancellation,
                    H.CHILD_FREE_POLICY AS childFreePolicy,
                    H.DESCRIPTION AS description,
                    H.PARKING AS parking,
                    H.POOL AS pool,
                    H.GYM AS gym,
                    H.SPA AS spa,
                    H.INTERNET_ACCESS AS internetAccess,
                    H.PET_POLICY AS petPolicy,
                    H.AIRPORT_TRANSFER AS airportTransfer,
                    H.LAST_UPDATED AS lastUpdated,
                    I.IMAGE_URL AS imageUrl,
                    R.ROOM_TYPE_ID AS roomTypeId,
                    R.ROOM_NAME AS roomName,
                    R.ROOM_PRICE AS roomPrice,
                    R.MAX_OCCUPANCY AS maxOccupancy,
                    R.DESCRIPTION AS roomDescription,
                    R.BED_TYPE AS bedType,
                    R.ROOM_SIZE AS roomSize,
                    B.BED_IMAGE_URL AS bedImageUrl,
                    M.MEAL_PLAN_ID AS mealPlanId,
                    M.MEAL_TYPE AS mealType,
                    M.PRICE AS mealPrice,
                    M.DESCRIPTION AS mealDescription,
                    ReviewData.reviewCount AS reviewCount,
                    COALESCE(ReviewData.averageRating, 0) AS averageRating,
                    LatestReview.latestComment AS latestComment,
                    LatestReview.userName AS userName -- Latest comment and username
                FROM [TRIPGO1].[dbo].[HOTEL] H
                LEFT JOIN [TRIPGO1].[dbo].[LOCATION] L ON H.LOCATION_ID = L.LOCATION_ID
                LEFT JOIN [TRIPGO1].[dbo].[HOTEL_IMAGES] I ON H.HOTEL_ID = I.HOTEL_ID
                LEFT JOIN [TRIPGO1].[dbo].[ROOM_TYPE] R ON H.HOTEL_ID = R.HOTEL_ID
                LEFT JOIN [TRIPGO1].[dbo].[ROOM_BED_IMAGES] B ON R.ROOM_TYPE_ID = B.ROOM_TYPE_ID
                LEFT JOIN [TRIPGO1].[dbo].[MEAL_PLAN] M ON R.ROOM_TYPE_ID = M.ROOM_TYPE_ID
                OUTER APPLY (
                    SELECT 
                        COUNT(RV.REVIEW_ID) AS reviewCount,
                        AVG(RV.RATING) AS averageRating
                    FROM [TRIPGO1].[dbo].[HOTELREVIEW] RV
                    WHERE RV.HOTEL_ID = H.HOTEL_ID
                ) AS ReviewData
                OUTER APPLY (
                    SELECT TOP 1 
                        RV.COMMENTS AS latestComment,
                        U.USERNAME AS userName -- Get the username of the latest reviewer
                    FROM [TRIPGO1].[dbo].[HOTELREVIEW] RV
                    LEFT JOIN [TRIPGO1].[dbo].[USERS] U ON RV.USER_ID = U.USER_ID
                    WHERE RV.HOTEL_ID = H.HOTEL_ID
                    ORDER BY RV.REVIEW_DATE DESC -- Get the latest comment by review date
                ) AS LatestReview
                WHERE H.HOTEL_ID = @hotelId;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy khách sạn với ID đã cho.' });
        }

        const hotelData = result.recordset[0];
        const hotel = {
            id: hotelData.id,
            name: hotelData.name,
            location: hotelData.location,
            hotelType: hotelData.hotelType,
            amenities: hotelData.amenities,
            chain: hotelData.chain,
            isCentral: hotelData.isCentral,
            isFreeCancellation: hotelData.isFreeCancellation,
            childFreePolicy: hotelData.childFreePolicy,
            description: hotelData.description,
            parking: hotelData.parking,
            pool: hotelData.pool,
            gym: hotelData.gym,
            spa: hotelData.spa,
            internetAccess: hotelData.internetAccess,
            petPolicy: hotelData.petPolicy,
            airportTransfer: hotelData.airportTransfer,
            lastUpdated: hotelData.lastUpdated,
            imageUrl: hotelData.imageUrl ? `/${hotelData.imageUrl}` : null,
            reviewCount: hotelData.reviewCount,
            averageRating: hotelData.averageRating,
            latestComment: hotelData.latestComment, // Latest comment
            userName: hotelData.userName, // Username of the latest commenter
            roomTypes: []
        };

        // Populate room types with relevant information
        result.recordset.forEach(record => {
            let roomType = hotel.roomTypes.find(rt => rt.roomTypeId === record.roomTypeId);
            if (!roomType && record.roomTypeId) {
                roomType = {
                    roomTypeId: record.roomTypeId,
                    roomName: record.roomName,
                    roomPrice: record.roomPrice,
                    maxOccupancy: record.maxOccupancy,
                    roomDescription: record.roomDescription,
                    bedType: record.bedType,
                    roomSize: record.roomSize,
                    bedImages: [],
                    mealPlans: []
                };
                hotel.roomTypes.push(roomType);
            }

            // Add bed images and meal plans if they exist
            if (roomType && record.bedImageUrl) {
                roomType.bedImages.push(`/${record.bedImageUrl}`);
            }
            if (roomType && record.mealPlanId) {
                roomType.mealPlans.push({
                    mealPlanId: record.mealPlanId,
                    mealType: record.mealType,
                    price: record.mealPrice,
                    description: record.mealDescription
                });
            }
        });

        res.status(200).json({ hotel });
    } catch (error) {
        console.error('Error fetching hotel details:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy chi tiết khách sạn', error: error.message });
    }
};

module.exports = {
    getAllHotels,
    getHotelById
};
