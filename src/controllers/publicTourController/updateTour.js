const sql = require('mssql');
const { connectToDB } = require('../../config/db');
const axios = require('axios');
const path = require("path");
const fs = require("fs");

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


const updateTour = async (req, res) => {
    try {
        console.log('Request body:', req.body);
        console.log('Uploaded file:', req.file);
        const TOUR_ID = parseInt(req.params.id, 10);
        if (isNaN(TOUR_ID)) {
            return res.status(400).json({ message: 'Invalid TOUR_ID' });
        }
        req.body.TOUR_ID = TOUR_ID;
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
            schedules,
            numDays,
            scheduleDetails,
            multiDaySchedules,
        } = req.body;

        // Lấy danh sách file mới upload
        const uploadedFiles = req.files.newImages || []; // Nhận từ 'newImages'
        console.log('Uploaded files:', uploadedFiles);

        // Lấy danh sách ảnh cũ từ body
        const existingImages = JSON.parse(req.body.existingImages || '[]');
        console.log('Existing images:', existingImages);

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
                .input('QUANTITY', sql.Int, schedule.quantity)
                .query(`
            INSERT INTO TOUR_SCHEDULE (TOUR_ID, DEPARTURE_DATE, END_DATE, PRICE_ADULT, PRICE_CHILD, QUANTITY)
            VALUES (@TOUR_ID, @DEPARTURE_DATE, @END_DATE, @PRICE_ADULT, @PRICE_CHILD, @QUANTITY)
        `);
        }
        // Xóa ảnh cũ không còn trong danh sách existingImages
        const dbImagesResult = await pool
            .request()
            .input('TOUR_ID', sql.Int, TOUR_ID)
            .query('SELECT IMAGE_URL FROM TOUR_IMAGES WHERE TOUR_ID = @TOUR_ID');

        const dbImages = dbImagesResult.recordset.map((row) => row.IMAGE_URL);
        const imagesToDelete = dbImages.filter(
            (dbImage) => !existingImages.includes(dbImage)
        );
        console.log('Images to delete:', imagesToDelete);
        // Xóa ảnh cũ không còn trong `existingImages`
        for (const image of imagesToDelete) {
            const filePath = path.join(__dirname, '..', image); // Đường dẫn đầy đủ tới file
            console.log('Deleting file at:', filePath); // Log đường dẫn file
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // Xóa file
            }
        }

        if (imagesToDelete.length > 0) {
            const deleteQuery = `
        DELETE FROM TOUR_IMAGES 
        WHERE TOUR_ID = @TOUR_ID 
        AND IMAGE_URL IN (${imagesToDelete.map((url) => `'${url}'`).join(', ')})
      `;
            await pool
                .request()
                .input('TOUR_ID', sql.Int, TOUR_ID)
                .query(deleteQuery);
        }

        // Thêm ảnh mới vào DB
        console.log('Request files:', req.files); // Log toàn bộ files
        console.log('newImages:', req.files.newImages || []); // Log dữ liệu mảng newImages

        if (uploadedFiles.length > 0) {
            // Lưu file mới vào DB
            for (const file of uploadedFiles) {
                const imageUrl = `uploads/${file.filename}`;
                await pool
                    .request()
                    .input('TOUR_ID', sql.Int, req.body.TOUR_ID)
                    .input('IMAGE_URL', sql.NVarChar, imageUrl).query(`
          INSERT INTO TOUR_IMAGES (TOUR_ID, IMAGE_URL)
          VALUES (@TOUR_ID, @IMAGE_URL)
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

module.exports =
    updateTour
;