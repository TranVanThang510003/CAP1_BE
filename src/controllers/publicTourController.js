const sql = require('mssql');
const { connectToDB } = require('../config/db');
const axios = require('axios');
// Hàm lấy danh sách các tour
// src/controllers/publicTourController.js
const getAllTours = async (req, res) => {
    try {
      const pool = await connectToDB();
      const result = await pool.request().query(`
        SELECT 
            T.TOUR_ID AS id,
            T.TOUR_NAME AS name,
            T.DESCRIPTION AS description,
            T.PRICE_ADULT as priceAdult,
            T.CREATED_BY as createBy,
            DATEDIFF(DAY, T.START_DATE, T.END_DATE) AS duration,  -- Tính DURATION bằng số ngày
            T.LAST_UPDATED AS lastUpdated,
            I.IMAGE_URL AS imageUrl,
            T.PROVINCE AS location,  -- Lấy trực tiếp từ trường PROVINCE
            ISNULL(ReviewData.reviewCount, 0) AS reviewCount,
            ISNULL(ReviewData.averageRating, 0) AS averageRating
        FROM [TRIPGO1].[dbo].[TOUR] T
        LEFT JOIN [TRIPGO1].[dbo].[TOUR_IMAGES] I ON T.TOUR_ID = I.TOUR_ID
        OUTER APPLY (
            SELECT 
                COUNT(RV.REVIEW_ID) AS reviewCount,
                AVG(RV.RATING) AS averageRating
            FROM [TRIPGO1].[dbo].[TOUR_REVIEW] RV
            WHERE RV.TOUR_ID = T.TOUR_ID
        ) AS ReviewData;
      `);
  
      const tours = result.recordset.map(tour => ({
        ...tour,
        imageUrl: tour.imageUrl ? `/${tour.imageUrl}` : null,
      }));
  
      res.status(200).json({ tours });
    } catch (error) {
      console.error('Error fetching tour list:', error.message);
      res.status(500).json({ message: 'Lỗi khi lấy danh sách tour', error: error.message });
    }
};


// Hàm lấy chi tiết một tour
const getTourById = async (req, res) => {
    const { id } = req.params;

    // Kiểm tra ID
    if (!id || isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ message: 'ID tour không hợp lệ' });
    }

    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .input('tourId', sql.Int, id)
            .query(`
                SELECT 
                    T.TOUR_ID AS id,
                    T.TOUR_NAME AS name,
                    T.HIGHLIGHTS AS highlights,
                    T.DESCRIPTION AS description,
                    T.PRICE_ADULT AS priceAdult, -- Giá cho người lớn
                    T.PRICE_CHILD AS priceChild, -- Giá cho trẻ em
                    T.CREATED_BY AS createdBy, -- ID người tạo để so sánh
                     DATEDIFF(DAY, T.START_DATE, T.END_DATE) AS duration,  -- Tính DURATION bằng số ngày
                    T.LAST_UPDATED AS lastUpdated,
                    I.IMAGE_URL AS imageUrl,
                    CONCAT(T.ADDRESS, ', ', T.WARD, ', ', T.DISTRICT, ', ', T.PROVINCE) AS location,  -- Kết hợp địa chỉ
                    ISNULL(ReviewData.reviewCount, 0) AS reviewCount,
                    ISNULL(ReviewData.averageRating, 0) AS averageRating,
                    LatestReview.latestComment AS latestComment,
                    LatestReview.userName AS userName
                FROM [TRIPGO1].[dbo].[TOUR] T
                LEFT JOIN [TRIPGO1].[dbo].[TOUR_IMAGES] I ON T.TOUR_ID = I.TOUR_ID
                OUTER APPLY (
                    SELECT 
                        COUNT(RV.REVIEW_ID) AS reviewCount,
                        AVG(RV.RATING) AS averageRating
                    FROM [TRIPGO1].[dbo].[TOUR_REVIEW] RV
                    WHERE RV.TOUR_ID = T.TOUR_ID
                ) AS ReviewData
                OUTER APPLY (
                    SELECT TOP 1 
                        RV.COMMENTS AS latestComment,
                        U.USERNAME AS userName
                    FROM [TRIPGO1].[dbo].[TOUR_REVIEW] RV
                    LEFT JOIN [TRIPGO1].[dbo].[USERS] U ON RV.USER_ID = U.USER_ID
                    WHERE RV.TOUR_ID = T.TOUR_ID
                    ORDER BY RV.REVIEW_DATE DESC
                ) AS LatestReview
                WHERE T.TOUR_ID = @tourId;
            `);

        // Kiểm tra kết quả
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy tour với ID đã cho.' });
        }

        const tourData = result.recordset[0];
        const tour = {
            id: tourData.id,
            name: tourData.name,
            description: tourData.description,
            price: tourData.price,
            priceAdult: tourData.priceAdult, // Giá người lớn
            priceChild: tourData.priceChild, // Giá trẻ em
            duration: tourData.duration,
            lastUpdated: tourData.lastUpdated,
            imageUrl: tourData.imageUrl ? `/${tourData.imageUrl}` : null,
            location: tourData.location, // Địa chỉ đầy đủ
            reviewCount: tourData.reviewCount,
            averageRating: tourData.averageRating,
            latestComment: tourData.latestComment,
            userName: tourData.userName,
            createdBy: tourData.createdBy, // Lưu id người tạo để so sánh trong front-end
            highlights: tourData.highlights ? tourData.highlights.split(',') : [],
            services: [] // Khởi tạo mảng dịch vụ
        };

        // Lấy danh sách dịch vụ cho tour này
        const servicesResult = await pool.request()
            .input('tourId', sql.Int, id)
            .query(`
                SELECT 
                    S.SERVICE_NAME AS serviceName,
                    S.SERVICE_DESCRIPTION AS serviceDescription
                FROM [TRIPGO1].[dbo].[TOUR_SERVICE] S
                WHERE S.TOUR_ID = @tourId;
            `);

        if (servicesResult.recordset.length > 0) {
            tour.services = servicesResult.recordset.map(service => ({
                name: service.serviceName,
                description: service.serviceDescription
            }));
        }

        res.status(200).json({ tour });
    } catch (error) {
        console.error('Error fetching tour details:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy chi tiết tour', error: error.message });
    }
};


const getToursByCreator = async (creatorId) => {
    if (typeof creatorId !== 'number' || isNaN(creatorId) || creatorId <= 0) {
        throw new Error('creatorId không hợp lệ');
    }

    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .input('creatorId', sql.Int, creatorId)
            .query(`
                SELECT 
                    T.TOUR_ID AS id,
                    T.TOUR_NAME AS name,
                    T.DESCRIPTION AS description,
                    T.PRICE_ADULT AS priceAdult,
                     DATEDIFF(DAY, T.START_DATE, T.END_DATE) AS duration,  -- Tính DURATION bằng số ngày
                    T.LAST_UPDATED AS lastUpdated,
                    I.IMAGE_URL AS imageUrl,
                    T.PROVINCE AS location, -- Lấy tên tỉnh từ trường PROVINCE trong bảng TOUR
                    ISNULL(ReviewData.reviewCount, 0) AS reviewCount,
                    ISNULL(ReviewData.averageRating, 0) AS averageRating,
                    U.USERNAME AS createdBy
                FROM 
                    [TRIPGO1].[dbo].[TOUR] T
                LEFT JOIN 
                    [TRIPGO1].[dbo].[TOUR_IMAGES] I ON T.TOUR_ID = I.TOUR_ID
                LEFT JOIN 
                    [TRIPGO1].[dbo].[USERS] U ON T.CREATED_BY = U.USER_ID
                OUTER APPLY (
                    SELECT 
                        COUNT(RV.REVIEW_ID) AS reviewCount,
                        AVG(RV.RATING) AS averageRating
                    FROM 
                        [TRIPGO1].[dbo].[TOUR_REVIEW] RV
                    WHERE 
                        RV.TOUR_ID = T.TOUR_ID
                ) AS ReviewData
                WHERE 
                    T.CREATED_BY = @creatorId;
            `);

        return result.recordset;
    } catch (error) {
        console.error('Lỗi khi truy vấn danh sách tour:', error);
        throw error;
    }
};





const getLocationName = async (code, type) => {
    try {
        const url = `https://provinces.open-api.vn/api/${type}/${code}`;
        const response = await axios.get(url);
        return response.data.name;
    } catch (error) {
        console.error(`Lỗi khi lấy tên ${type} với mã ${code}:`, error.response ? error.response.data : error.message);
        return null;
    }
};


const createTour = async (req, res) => {
    try {
        console.log("Request body:", req.body); // Log dữ liệu từ client
        console.log("Uploaded file:", req.file); 

        // Log LANGUAGE từ req.body để kiểm tra
        console.log("LANGUAGE in req.body:", req.body.LANGUAGE); 
        
        const {
            PUCLIC_TOUR_NAME,
            PUCLIC_TOUR_TYPE,
            DESCRIPIONS_HIGHLIGHT,
            DESCRIPTIONS,
            adultPrice,
            childPrice,
            address,
            province,  // Mã tỉnh
            district,  // Mã quận
            ward,      // Mã xã/phường
            CREATED_BY,
            startDate,
            endDate,
            LANGUAGE,  // Thay vì language, dùng đúng từ khóa LANGUAGE
            serviceDescription
        } = req.body;

        const IMAGE = req.file;

        // Gọi API để lấy tên tỉnh, quận, xã/phường
        const provinceName = await getLocationName(province, 'p');
        const districtName = await getLocationName(district, 'd');
        const wardName = await getLocationName(ward, 'w');

        if (!provinceName || !districtName || !wardName) {
            return res.status(500).json({ message: 'Không thể lấy thông tin địa phương từ API.' });
        }

        const parsedAdultPrice = parseFloat(adultPrice);
        const parsedChildPrice = parseFloat(childPrice);

        const pool = await connectToDB();
        const insertTour = await pool.request()
            .input('TOUR_NAME', sql.NVarChar, PUCLIC_TOUR_NAME)
            .input('TOUR_TYPE_ID', sql.NVarChar, PUCLIC_TOUR_TYPE)
            .input('HIGHLIGHTS', sql.NVarChar, DESCRIPIONS_HIGHLIGHT)
            .input('DESCRIPTION', sql.NVarChar, DESCRIPTIONS)
            .input('PRICE_ADULT', sql.Money, parsedAdultPrice)
            .input('PRICE_CHILD', sql.Money, parsedChildPrice)
            .input('ADDRESS', sql.NVarChar, address)
            .input('PROVINCE', sql.NVarChar, provinceName)
            .input('DISTRICT', sql.NVarChar, districtName)
            .input('WARD', sql.NVarChar, wardName)
            .input('CREATED_BY', sql.Int, CREATED_BY)
            .input('START_DATE', sql.Date, startDate)
            .input('END_DATE', sql.Date, endDate)
            .input('LANGUAGE', sql.NVarChar, LANGUAGE) // Sử dụng biến đúng từ req.body
            .input('SERVICE_DESCRIPTION', sql.NVarChar, serviceDescription)  
            .query(`
                INSERT INTO TOUR 
                (TOUR_NAME, TOUR_TYPE_ID, HIGHLIGHTS, DESCRIPTION, PRICE_ADULT, PRICE_CHILD, ADDRESS, PROVINCE, DISTRICT, WARD, CREATED_BY, START_DATE, END_DATE, LANGUAGE, SERVICE_DESCRIPTION) 
                OUTPUT INSERTED.TOUR_ID
                VALUES (@TOUR_NAME, @TOUR_TYPE_ID, @HIGHLIGHTS, @DESCRIPTION, @PRICE_ADULT, @PRICE_CHILD, @ADDRESS, @PROVINCE, @DISTRICT, @WARD, @CREATED_BY, @START_DATE, @END_DATE, @LANGUAGE, @SERVICE_DESCRIPTION)
            `);

        const newTourId = insertTour.recordset[0].TOUR_ID;

        // Lưu thông tin ảnh nếu có ảnh được tải lên
        if (IMAGE) {
            const imageUrl = `uploads/${IMAGE.filename}`;
            await pool.request()
                .input('TOUR_ID', sql.Int, newTourId)
                .input('IMAGE_URL', sql.NVarChar, imageUrl)
                .query(`INSERT INTO TOUR_IMAGES (TOUR_ID, IMAGE_URL) VALUES (@TOUR_ID, @IMAGE_URL)`);
        }

        res.status(201).json({ message: 'Tour đã được tạo thành công.' });
    } catch (error) {
        console.error("Error creating tour:", error);
        res.status(500).json({ message: 'Có lỗi xảy ra khi tạo tour.', error: error.message });
    }
};



  





module.exports = {
    getAllTours,
    getTourById,
    getToursByCreator,
    createTour
};
