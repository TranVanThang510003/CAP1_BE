const sql = require('mssql');
const { connectToDB } = require('../config/db');

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
            T.DURATION AS duration,
            T.LAST_UPDATED AS lastUpdated,
            I.IMAGE_URL AS imageUrl,
            L.LOCATION_NAME AS location,
            ISNULL(ReviewData.reviewCount, 0) AS reviewCount,
            ISNULL(ReviewData.averageRating, 0) AS averageRating
        FROM [TRIPGO1].[dbo].[TOUR] T
        LEFT JOIN [TRIPGO1].[dbo].[TOUR_IMAGES] I ON T.TOUR_ID = I.TOUR_ID
        LEFT JOIN [TRIPGO1].[dbo].[TOUR_LOCATION] L ON T.TOUR_ID = L.TOUR_ID
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
                    T.DURATION AS duration,
                    T.LAST_UPDATED AS lastUpdated,
                    I.IMAGE_URL AS imageUrl,
                    L.LOCATION_NAME AS location,
                    ISNULL(ReviewData.reviewCount, 0) AS reviewCount,
                    ISNULL(ReviewData.averageRating, 0) AS averageRating,
                    LatestReview.latestComment AS latestComment,
                    LatestReview.userName AS userName
                FROM [TRIPGO1].[dbo].[TOUR] T
                LEFT JOIN [TRIPGO1].[dbo].[TOUR_IMAGES] I ON T.TOUR_ID = I.TOUR_ID
                LEFT JOIN [TRIPGO1].[dbo].[TOUR_LOCATION] L ON T.TOUR_ID = L.TOUR_ID
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
            location: tourData.location,
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
                    T.DURATION AS duration,
                    T.LAST_UPDATED AS lastUpdated,
                    I.IMAGE_URL AS imageUrl,
                    L.LOCATION_NAME AS location,
                    ISNULL(ReviewData.reviewCount, 0) AS reviewCount,
                    ISNULL(ReviewData.averageRating, 0) AS averageRating,
                    U.USERNAME AS createdBy
                FROM 
                    [TRIPGO1].[dbo].[TOUR] T
                LEFT JOIN 
                    [TRIPGO1].[dbo].[TOUR_IMAGES] I ON T.TOUR_ID = I.TOUR_ID
                LEFT JOIN 
                    [TRIPGO1].[dbo].[TOUR_LOCATION] L ON T.TOUR_ID = L.TOUR_ID
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



const createTour = async (req, res) => {
    try {
      const {
        PUCLIC_TOUR_NAME,
        PUCLIC_TOUR_TYPE,
        DESCRIPIONS_HIGHLIGHT,
        DESCRIPTIONS,
        DURATION,
        adultPrice,
        childPrice,
        CREATED_BY, // Assuming this is included in req.body or comes from authenticated session
      } = req.body;
      
      const IMAGE = req.file; // Uploaded file
      
      // Validate required fields
      if (
        !PUCLIC_TOUR_NAME ||
        !PUCLIC_TOUR_TYPE ||
        !DESCRIPIONS_HIGHLIGHT ||
        !DESCRIPTIONS ||
        !adultPrice ||
        !childPrice ||
        !CREATED_BY // Ensure CREATED_BY is provided
      ) {
        return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin tour.' });
      }
      
      const durationValue = DURATION !== undefined ? parseInt(DURATION, 10) : 1;
      const parsedAdultPrice = parseFloat(adultPrice);
      const parsedChildPrice = parseFloat(childPrice);
  
      if (isNaN(durationValue) || isNaN(parsedAdultPrice) || isNaN(parsedChildPrice)) {
        return res.status(400).json({ message: 'Thời lượng và giá phải là số hợp lệ.' });
      }
  
      // Insert new tour and retrieve TOUR_ID
      const pool = await connectToDB();
      const insertTour = await pool
        .request()
        .input('TOUR_NAME', sql.NVarChar, PUCLIC_TOUR_NAME)
        .input('TOUR_TYPE_ID', sql.NVarChar, PUCLIC_TOUR_TYPE)
        .input('HIGHLIGHTS', sql.NVarChar, DESCRIPIONS_HIGHLIGHT)
        .input('DESCRIPTION', sql.NVarChar, DESCRIPTIONS)
        .input('DURATION', sql.Int, durationValue)
        .input('PRICE_ADULT', sql.Money, parsedAdultPrice)
        .input('PRICE_CHILD', sql.Money, parsedChildPrice)
        .input('CREATED_BY', sql.Int, CREATED_BY) // Add CREATED_BY here
        .query(
          `INSERT INTO TOUR (TOUR_NAME, TOUR_TYPE_ID, HIGHLIGHTS, DESCRIPTION, DURATION, PRICE_ADULT, PRICE_CHILD, CREATED_BY) 
           OUTPUT INSERTED.TOUR_ID
           VALUES (@TOUR_NAME, @TOUR_TYPE_ID, @HIGHLIGHTS, @DESCRIPTION, @DURATION, @PRICE_ADULT, @PRICE_CHILD, @CREATED_BY)`
        );
  
      const newTourId = insertTour.recordset[0].TOUR_ID;
  
      // Save image information if an image was uploaded
      if (IMAGE) {
        const imageUrl = `uploads/${IMAGE.filename}`; // Path where the image is stored
  
        await pool
          .request()
          .input('TOUR_ID', sql.Int, newTourId)
          .input('IMAGE_URL', sql.NVarChar, imageUrl)
          .query(
            `INSERT INTO TOUR_IMAGES (TOUR_ID, IMAGE_URL) VALUES (@TOUR_ID, @IMAGE_URL)`
          );
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
