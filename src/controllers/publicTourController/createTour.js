const sql = require('mssql');
const { connectToDB } = require('../../config/db');
const axios = require('axios');



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

        // Lấy danh sách file mới upload

        const uploadedFiles = req.files?.newImages || []; // Dùng khi `multipleUpload`
        console.log('Uploaded files:', uploadedFiles);
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
                .input('QUANTITY', sql.Int, schedule.quantity)
                .query(`
                    INSERT INTO TOUR_SCHEDULE (TOUR_ID, DEPARTURE_DATE, END_DATE, PRICE_ADULT, PRICE_CHILD,QUANTITY)
                    VALUES (@TOUR_ID, @DEPARTURE_DATE, @END_DATE, @PRICE_ADULT, @PRICE_CHILD, @QUANTITY)
                `);
        }

        // Lưu hình ảnh vào TOUR_IMAGES

        if (uploadedFiles.length > 0) {
            for (const file of uploadedFiles) {
                const imageUrl = `uploads/${file.filename}`;
                await pool
                    .request()
                    .input('TOUR_ID', sql.Int, newTourId)
                    .input('IMAGE_URL', sql.NVarChar, imageUrl).query(`
                    INSERT INTO TOUR_IMAGES (TOUR_ID, IMAGE_URL)
                    VALUES (@TOUR_ID, @IMAGE_URL)
                `);
            }
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

module.exports =
    createTour
;
