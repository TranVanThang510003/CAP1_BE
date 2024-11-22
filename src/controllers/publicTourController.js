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
                S.NEAREST_PRICE_ADULT AS priceAdult, -- Lấy giá người lớn từ lịch gần nhất
                T.CREATED_BY AS createBy,
                S.DURATION AS duration, -- Thời lượng từ bảng TOUR_SCHEDULE
                T.LAST_UPDATED AS lastUpdated,
                I.IMAGE_URL AS imageUrl,
                T.PROVINCE AS location,
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
            LEFT JOIN [TRIPGO1].[dbo].[TOUR_IMAGES] I ON T.TOUR_ID = I.TOUR_ID
            LEFT JOIN [TRIPGO1].[dbo].[TOUR_TYPE] TT ON T.TOUR_TYPE_ID = TT.TOUR_TYPE_ID
            OUTER APPLY (
                SELECT 
                    MIN(S.DEPARTURE_DATE) AS NEAREST_DEPARTURE_DATE,
                    MIN(S.PRICE_ADULT) AS NEAREST_PRICE_ADULT, -- Lấy giá người lớn từ ngày khởi hành gần nhất
                    MIN(DATEDIFF(DAY, S.DEPARTURE_DATE, S.END_DATE))+1 AS DURATION -- Tính thời lượng từ bảng TOUR_SCHEDULE
                FROM [TRIPGO1].[dbo].[TOUR_SCHEDULE] S
                WHERE S.TOUR_ID = T.TOUR_ID AND S.DEPARTURE_DATE >= GETDATE()
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
                FROM [TRIPGO1].[dbo].[TOUR_REVIEW] RV
                WHERE RV.TOUR_ID = T.TOUR_ID
            ) AS ReviewData
            ORDER BY S.NEAREST_DEPARTURE_DATE;
        `);

    const tours = result.recordset.map((tour) => ({
      ...tour,
      imageUrl: tour.imageUrl ? `/${tour.imageUrl}` : null,
    }));

    res.status(200).json({ tours });
  } catch (error) {
    console.error('Error fetching tour list:', error.message);
    res
      .status(500)
      .json({ message: 'Lỗi khi lấy danh sách tour', error: error.message });
  }
};

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
                    FROM [TRIPGO1].[dbo].[TOUR_REVIEW] RV
                    WHERE RV.TOUR_ID = T.TOUR_ID
                ) AS ReviewData
                OUTER APPLY (
                    SELECT TOP 1 
                        RV.COMMENTS AS latestComment,
                        U.USERNAME AS userName
                    FROM [TRIPGO1].[dbo].[TOUR_REVIEW] RV
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

                -- Lấy danh sách lịch trình
                SELECT 
                    S.SCHEDULE_ID AS scheduleId,
                    S.DEPARTURE_DATE AS departureDate,
                    ISNULL(S.END_DATE, S.DEPARTURE_DATE) AS endDate,
                    S.PRICE_ADULT AS priceAdult,
                    S.PRICE_CHILD AS priceChild,
                    S.AVAILABLE_ADULT_COUNT AS availableAdults
                FROM [TRIPGO1].[dbo].[TOUR_SCHEDULE] S
                WHERE S.TOUR_ID = @tourId
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
      availableAdultCount: schedule.availableAdults,
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

const getToursByCreator = async (creatorId) => {
  if (typeof creatorId !== 'number' || isNaN(creatorId) || creatorId <= 0) {
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
                    ISNULL(S.NEAREST_PRICE_ADULT, 0) AS priceAdult, -- Giá người lớn từ lịch trình gần nhất
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
                    ISNULL(BookingData.totalBookings, 0) AS totalBookings -- Tổng lượt đặt
                FROM [TRIPGO1].[dbo].[TOUR] T
                LEFT JOIN [TRIPGO1].[dbo].[TOUR_IMAGES] I ON T.TOUR_ID = I.TOUR_ID
                LEFT JOIN [TRIPGO1].[dbo].[TOUR_TYPE] TT ON T.TOUR_TYPE_ID = TT.TOUR_TYPE_ID
                OUTER APPLY (
                    SELECT 
                        MIN(S.DEPARTURE_DATE) AS NEAREST_DEPARTURE_DATE,
                        MAX(S.END_DATE) AS END_DATE,
                        MIN(S.PRICE_ADULT) AS NEAREST_PRICE_ADULT, -- Lấy giá người lớn nhỏ nhất từ lịch trình gần nhất
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
                ORDER BY 
                    CASE 
                        WHEN GETDATE() < S.NEAREST_DEPARTURE_DATE THEN 1
                        WHEN GETDATE() BETWEEN S.NEAREST_DEPARTURE_DATE AND S.END_DATE THEN 2
                        WHEN GETDATE() > S.END_DATE THEN 3
                    END,
                    S.NEAREST_DEPARTURE_DATE;
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

const getLocationName = async (code, type) => {
  try {
    const url = `https://provinces.open-api.vn/api/${type}/${code}`;
    const response = await axios.get(url);
    return response.data.name;
  } catch (error) {
    console.error(
      `Lỗi khi lấy tên ${type} với mã ${code}:`,
      error.response ? error.response.data : error.message
    );
    return null;
  }
};

const createTour = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);

    const {
      PUCLIC_TOUR_NAME,
      PUCLIC_TOUR_TYPE,
      DESCRIPIONS_HIGHLIGHT,
      DESCRIPTIONS,
      province,
      district,
      ward,
      CREATED_BY,
      LANGUAGE,
      serviceDescription,
      schedules,
      numDays,
      scheduleDetails,
      multiDaySchedules,
    } = req.body;

    const IMAGE = req.file;

    // Chuyển mã địa điểm sang tên địa điểm
    const provinceName = await getLocationName(province, 'p');
    const districtName = await getLocationName(district, 'd');
    const wardName = await getLocationName(ward, 'w');

    if (!provinceName || !districtName || !wardName) {
      return res
        .status(500)
        .json({ message: 'Unable to fetch location details.' });
    }

    const pool = await connectToDB();

    // Xác định service_type dựa trên numDays
    const serviceType = parseInt(numDays) === 1 ? 'trong ngày' : 'nhiều ngày';

    // Thêm dữ liệu vào bảng TOUR
    const insertTour = await pool
      .request()
      .input('TOUR_NAME', sql.NVarChar, PUCLIC_TOUR_NAME)
      .input('TOUR_TYPE_ID', sql.Int, PUCLIC_TOUR_TYPE)
      .input('HIGHLIGHTS', sql.NVarChar, DESCRIPIONS_HIGHLIGHT)
      .input('DESCRIPTION', sql.NVarChar, DESCRIPTIONS)
      .input('PROVINCE', sql.NVarChar, provinceName)
      .input('DISTRICT', sql.NVarChar, districtName)
      .input('WARD', sql.NVarChar, wardName)
      .input('CREATED_BY', sql.Int, CREATED_BY)
      .input('LANGUAGE', sql.NVarChar, LANGUAGE)
      .input('SERVICE_TYPE', sql.NVarChar, serviceType) // Thêm service_type
      .query(`
                INSERT INTO TOUR 
                (TOUR_NAME, TOUR_TYPE_ID, HIGHLIGHTS, DESCRIPTION, PROVINCE, DISTRICT, WARD, CREATED_BY, LANGUAGE, SERVICE_TYPE)
                OUTPUT INSERTED.TOUR_ID
                VALUES (@TOUR_NAME, @TOUR_TYPE_ID, @HIGHLIGHTS, @DESCRIPTION, @PROVINCE, @DISTRICT, @WARD, @CREATED_BY, @LANGUAGE, @SERVICE_TYPE)
            `);

    const newTourId = insertTour.recordset[0].TOUR_ID;

    // Chuyển đổi thời gian từ HH:mm sang HH:mm:ss
    const formatTime = (time) => {
      if (time.length === 5) {
        return `${time}:00`; // Thêm ":00" nếu không có giây
      }
      return time;
    };

    // Kiểm tra định dạng thời gian (HH:mm:ss)
    const isValidTime = (time) => {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/; // Định dạng HH:mm:ss
      return timeRegex.test(time);
    };

    // Lưu lịch trình tour trong ngày
    if (parseInt(numDays) === 1) {
      const parsedScheduleDetails = JSON.parse(scheduleDetails || '[]');
      for (const detail of parsedScheduleDetails) {
        let formattedTime = formatTime(detail.time);

        if (!isValidTime(formattedTime)) {
          console.error(`Invalid time format: ${formattedTime}`);
          throw new Error(`Invalid time format: ${formattedTime}`);
        }

        await pool
          .request()
          .input('TOUR_ID', sql.Int, newTourId)
          .input('TIME', sql.VarChar, formattedTime)
          .input('TITLE', sql.NVarChar, detail.title)
          .input('DESCRIPTION', sql.NVarChar, detail.description).query(`
                        INSERT INTO DAILY_SCHEDULES (TOUR_ID, TIME, TITLE, DESCRIPTION)
                        VALUES (@TOUR_ID, CAST(@TIME AS TIME), @TITLE, @DESCRIPTION)
                    `);
      }
    } else if (parseInt(numDays) > 1) {
      const parsedMultiDaySchedules = JSON.parse(multiDaySchedules || '[]');
      for (
        let dayIndex = 0;
        dayIndex < parsedMultiDaySchedules.length;
        dayIndex++
      ) {
        if (dayIndex + 1 > numDays) break;

        const day = parsedMultiDaySchedules[dayIndex];
        await pool
          .request()
          .input('TOUR_ID', sql.Int, newTourId)
          .input('DAY_NUMBER', sql.Int, dayIndex + 1)
          .input('TITLE', sql.NVarChar, day.title)
          .input('DESCRIPTION', sql.NVarChar, day.description).query(`
                        INSERT INTO MULTI_DAY_SCHEDULES (TOUR_ID, DAY_NUMBER, TITLE, DESCRIPTION)
                        VALUES (@TOUR_ID, @DAY_NUMBER, @TITLE, @DESCRIPTION)
                    `);
      }
    }

    // Lưu lịch khởi hành vào TOUR_SCHEDULE
    const parsedSchedules = JSON.parse(schedules || '[]');
    for (const schedule of parsedSchedules) {
      const departureDate = new Date(schedule.departureDate);
      const numDays = parseInt(schedule.numDays, 10);

      const endDate = new Date(departureDate);
      endDate.setDate(departureDate.getDate() + (numDays - 1));

      await pool
        .request()
        .input('TOUR_ID', sql.Int, newTourId)
        .input('DEPARTURE_DATE', sql.Date, schedule.departureDate)
        .input('END_DATE', sql.Date, endDate.toISOString().split('T')[0])
        .input('PRICE_ADULT', sql.Money, schedule.priceAdult)
        .input('PRICE_CHILD', sql.Money, schedule.priceChild)
        .input('AVAILABLE_ADULT_COUNT', sql.Int, schedule.availableAdultCount)
        .query(`
                    INSERT INTO TOUR_SCHEDULE (TOUR_ID, DEPARTURE_DATE, END_DATE, PRICE_ADULT, PRICE_CHILD, AVAILABLE_ADULT_COUNT)
                    VALUES (@TOUR_ID, @DEPARTURE_DATE, @END_DATE, @PRICE_ADULT, @PRICE_CHILD, @AVAILABLE_ADULT_COUNT)
                `);
    }

    // Lưu hình ảnh vào TOUR_IMAGES
    if (IMAGE) {
      const imageUrl = `uploads/${IMAGE.filename}`;
      await pool
        .request()
        .input('TOUR_ID', sql.Int, newTourId)
        .input('IMAGE_URL', sql.NVarChar, imageUrl).query(`
                    INSERT INTO TOUR_IMAGES (TOUR_ID, IMAGE_URL)
                    VALUES (@TOUR_ID, @IMAGE_URL)
                `);
    }

    res
      .status(201)
      .json({ message: 'Tour created successfully', TOUR_ID: newTourId });
  } catch (error) {
    console.error('Error creating tour:', error);
    res
      .status(500)
      .json({ message: 'Error creating tour', error: error.message });
  }
};

const updateTour = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);

    const {
      TOUR_ID,
      PUCLIC_TOUR_NAME,
      PUCLIC_TOUR_TYPE,
      DESCRIPIONS_HIGHLIGHT,
      DESCRIPTIONS,
      province,
      district,
      ward,
      CREATED_BY,
      LANGUAGE,
      schedules,
      numDays,
      scheduleDetails,
      multiDaySchedules,
      existingImages,
    } = req.body;

    const uploadedFiles = req.files.newImages || [];

    if (
      !TOUR_ID ||
      !PUCLIC_TOUR_NAME ||
      !PUCLIC_TOUR_TYPE ||
      !province ||
      !district ||
      !ward
    ) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }
    if (
      !TOUR_ID ||
      !PUCLIC_TOUR_NAME ||
      !PUCLIC_TOUR_TYPE ||
      !province ||
      !district ||
      !ward
    ) {
      return res.status(400).json({ message: 'Missing required fields.' });
    }

    // Chuyển mã địa điểm sang tên địa điểm
    const provinceName = await getLocationName(province, 'p');
    const districtName = await getLocationName(district, 'd');
    const wardName = await getLocationName(ward, 'w');

    if (!provinceName || !districtName || !wardName) {
      return res
        .status(500)
        .json({ message: 'Unable to fetch location details.' });
    }

    const pool = await connectToDB();

    // Xác định service_type dựa trên numDays
    const serviceType = parseInt(numDays) === 1 ? 'trong ngày' : 'nhiều ngày';

    // Update tour details
    await pool
      .request()
      .input('TOUR_ID', sql.Int, TOUR_ID)
      .input('TOUR_NAME', sql.NVarChar, PUCLIC_TOUR_NAME)
      .input('TOUR_TYPE_ID', sql.Int, PUCLIC_TOUR_TYPE)
      .input('HIGHLIGHTS', sql.NVarChar, DESCRIPIONS_HIGHLIGHT)
      .input('DESCRIPTION', sql.NVarChar, DESCRIPTIONS)
      .input('PROVINCE', sql.NVarChar, provinceName)
      .input('DISTRICT', sql.NVarChar, districtName)
      .input('WARD', sql.NVarChar, wardName)
      .input('LANGUAGE', sql.NVarChar, LANGUAGE)
      .input('SERVICE_TYPE', sql.NVarChar, serviceType).query(`
          UPDATE TOUR
          SET 
            TOUR_NAME = @TOUR_NAME,
            TOUR_TYPE_ID = @TOUR_TYPE_ID,
            HIGHLIGHTS = @HIGHLIGHTS,
            DESCRIPTION = @DESCRIPTION,
            PROVINCE = @PROVINCE,
            DISTRICT = @DISTRICT,
            WARD = @WARD,
            LANGUAGE = @LANGUAGE,
            SERVICE_TYPE = @SERVICE_TYPE
          WHERE TOUR_ID = @TOUR_ID
        `);

    // Xóa các dữ liệu cũ liên quan đến tour
    await pool.request().input('TOUR_ID', sql.Int, TOUR_ID).query(`
        DELETE FROM DAILY_SCHEDULES WHERE TOUR_ID = @TOUR_ID;
        DELETE FROM MULTI_DAY_SCHEDULES WHERE TOUR_ID = @TOUR_ID;
        DELETE FROM TOUR_SCHEDULE WHERE TOUR_ID = @TOUR_ID;
    
      `);

    // Chuyển đổi thời gian từ HH:mm sang HH:mm:ss
    const formatTime = (time) => {
      if (time.length === 5) {
        return `${time}:00`; // Thêm ":00" nếu không có giây
      }
      return time;
    };

    // Kiểm tra định dạng thời gian (HH:mm:ss)
    const isValidTime = (time) => {
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/; // Định dạng HH:mm:ss
      return timeRegex.test(time);
    };

    if (parseInt(numDays) === 1) {
      const parsedScheduleDetails = JSON.parse(scheduleDetails || '[]');
      for (const detail of parsedScheduleDetails) {
        const formattedTime = formatTime(detail.time);

        if (!isValidTime(formattedTime)) {
          return res
            .status(400)
            .json({ message: `Invalid time format: ${formattedTime}` });
        }

        await pool
          .request()
          .input('TOUR_ID', sql.Int, TOUR_ID)
          .input('TIME', sql.VarChar, formattedTime)
          .input('TITLE', sql.NVarChar, detail.title)
          .input('DESCRIPTION', sql.NVarChar, detail.description).query(`
              INSERT INTO DAILY_SCHEDULES (TOUR_ID, TIME, TITLE, DESCRIPTION)
              VALUES (@TOUR_ID, CAST(@TIME AS TIME), @TITLE, @DESCRIPTION)
            `);
      }
    } else if (parseInt(numDays) > 1) {
      const parsedMultiDaySchedules = JSON.parse(multiDaySchedules || '[]');
      for (
        let dayIndex = 0;
        dayIndex < parsedMultiDaySchedules.length;
        dayIndex++
      ) {
        const day = parsedMultiDaySchedules[dayIndex];

        await pool
          .request()
          .input('TOUR_ID', sql.Int, TOUR_ID)
          .input('DAY_NUMBER', sql.Int, dayIndex + 1)
          .input('TITLE', sql.NVarChar, day.title)
          .input('DESCRIPTION', sql.NVarChar, day.description).query(`
              INSERT INTO MULTI_DAY_SCHEDULES (TOUR_ID, DAY_NUMBER, TITLE, DESCRIPTION)
              VALUES (@TOUR_ID, @DAY_NUMBER, @TITLE, @DESCRIPTION)
            `);
      }
    }

    // Cập nhật lịch khởi hành
    const parsedSchedules = JSON.parse(schedules || '[]');
    for (const schedule of parsedSchedules) {
      const departureDate = new Date(schedule.departureDate);

      // Kiểm tra nếu ngày khởi hành không hợp lệ
      if (isNaN(departureDate)) {
        return res.status(400).json({
          message: `Invalid departure date: ${schedule.departureDate}`,
        });
      }

      // Tính toán ngày kết thúc
      try {
        console.log('Request body:', req.body);

        // Lấy numDays và kiểm tra
        const numDays = parseInt(req.body.numDays, 10);
        if (isNaN(numDays) || numDays <= 0) {
          return res.status(400).json({
            message: `Invalid numDays value: ${req.body.numDays}`,
          });
        }

        console.log('Parsed numDays:', numDays);

        // Tiếp tục xử lý logic khác
      } catch (error) {
        console.error('Error parsing numDays:', error);
        res.status(500).json({
          message: 'Error parsing numDays',
          error: error.message,
        });
      }

      // Tính toán ngày kết thúc dựa trên ngày khởi hành và số ngày
      const endDate = new Date(departureDate);
      endDate.setDate(departureDate.getDate() + (numDays - 1));

      // Kiểm tra nếu endDate không hợp lệ
      if (isNaN(endDate)) {
        return res.status(400).json({
          message: `Invalid end date calculated from departure date: ${schedule.departureDate}`,
        });
      }

      await pool
        .request()
        .input('TOUR_ID', sql.Int, TOUR_ID)
        .input(
          'DEPARTURE_DATE',
          sql.Date,
          departureDate.toISOString().split('T')[0]
        )
        .input('END_DATE', sql.Date, endDate.toISOString().split('T')[0])
        .input('PRICE_ADULT', sql.Money, schedule.priceAdult)
        .input('PRICE_CHILD', sql.Money, schedule.priceChild)
        .input('AVAILABLE_ADULT_COUNT', sql.Int, schedule.availableAdultCount)
        .query(`
            INSERT INTO TOUR_SCHEDULE (TOUR_ID, DEPARTURE_DATE, END_DATE, PRICE_ADULT, PRICE_CHILD, AVAILABLE_ADULT_COUNT)
            VALUES (@TOUR_ID, @DEPARTURE_DATE, @END_DATE, @PRICE_ADULT, @PRICE_CHILD, @AVAILABLE_ADULT_COUNT)
        `);
    }
    // **Xóa tất cả ảnh cũ của tour đó**
    await pool
      .request()
      .input('TOUR_ID', sql.Int, TOUR_ID)
      .query(`DELETE FROM TOUR_IMAGES WHERE TOUR_ID = @TOUR_ID`);

    // **Thêm tất cả ảnh mới**
    if (uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        const imageUrl = `uploads/${file.filename}`; // Lưu URL của ảnh
        await pool
          .request()
          .input('TOUR_ID', sql.Int, TOUR_ID)
          .input('IMAGE_URL', sql.NVarChar, imageUrl).query(`
       INSERT INTO TOUR_IMAGES (TOUR_ID, IMAGE_URL)
       VALUES (@TOUR_ID, @IMAGE_URL);
     `);
      }
    }

    res.status(200).json({ message: 'Tour updated successfully.' });
  } catch (error) {
    console.error('Error updating tour:', error);
    res
      .status(500)
      .json({ message: 'Error updating tour.', error: error.message });
  }
};
module.exports = {
  getAllTours,
  getTourById,
  getToursByCreator,
  createTour,
  updateTour,
};
