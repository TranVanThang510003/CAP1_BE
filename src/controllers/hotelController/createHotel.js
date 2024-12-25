const sql = require('mssql');
const { connectToDB } = require('../../config/db');
const axios = require('axios');

// Hàm gọi API để lấy tên địa điểm
const getLocationName = async (code, type) => {
    try {
        const url = `https://provinces.open-api.vn/api/${type}/${code}`;
        const response = await axios.get(url);
        return response.data.name;
    } catch (error) {
        console.error(`Lỗi khi lấy tên ${type} với mã ${code}:`, error.message);
        return null;
    }
};

// Hàm lấy ID lớn nhất
const getNextId = async (pool, tableName, columnName) => {
    const query = `SELECT ISNULL(MAX(${columnName}), 0) + 1 AS NextId FROM ${tableName}`;
    const result = await pool.request().query(query);
    return result.recordset[0].NextId;
};


// Hàm tạo khách sạn
const createHotel = async (req, res) => {
    let transaction;
    try {
        console.log('Request body:', req.body);
        console.log('Uploaded files:', req.files);

        const {
            hotelName,
            hotelType,
            description,
            address,
            province,
            district,
            ward,
            CREATED_BY,
            mealPlans,  // JSON string
            services    // JSON string
        } = req.body;

        const uploadedFiles = req.files?.newImages || [];

        // Kết nối SQL Server
        const pool = await connectToDB();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Lấy ID tiếp theo
        const nextHotelId = await getNextId(pool, 'HOTEL', 'HOTEL_ID');

        // Lấy tên địa điểm
        const provinceName = await getLocationName(province, 'p');
        const districtName = await getLocationName(district, 'd');
        const wardName = await getLocationName(ward, 'w');

        if (!provinceName || !districtName || !wardName) {
            throw new Error('Không thể lấy thông tin địa điểm.');
        }

        // Thêm vào bảng HOTEL
        await transaction.request()
            .input('HOTEL_ID', sql.Int, nextHotelId)
            .input('HOTEL_NAME', sql.NVarChar, hotelName)
            .input('HOTEL_TYPE', sql.Int, hotelType)
            .input('DESCRIPTION', sql.NVarChar, description)
            .input('PROVINCE', sql.NVarChar, provinceName)
            .input('DISTRICT', sql.NVarChar, districtName)
            .input('WARD', sql.NVarChar, wardName)
            .input('ADDRESS', sql.NVarChar, address)
            .input('CREATED_BY', sql.Int, parseInt(CREATED_BY, 10))
            .query(`
                INSERT INTO HOTEL (HOTEL_ID, HOTEL_NAME, HOTEL_TYPE, DESCRIPTION, PROVINCE, DISTRICT, WARD, ADDRESS, CREATED_BY, CREATED_AT, LAST_UPDATED)
                VALUES (@HOTEL_ID, @HOTEL_NAME, @HOTEL_TYPE, @DESCRIPTION, @PROVINCE, @DISTRICT, @WARD, @ADDRESS, @CREATED_BY, GETDATE(), GETDATE())
            `);

        // Thêm vào bảng HOTEL_SERVICES
        const parsedServices = JSON.parse(services || '[]');
        for (const serviceId of parsedServices) {
            await transaction.request()
                .input('HOTEL_ID', sql.Int, nextHotelId)
                .input('SERVICE_ID', sql.Int, serviceId)
                .query(`
                    INSERT INTO HOTEL_SERVICES (HOTEL_ID, SERVICE_ID)
                    VALUES (@HOTEL_ID, @SERVICE_ID)
                `);
        }

        // Thêm vào bảng MEAL_PLAN
        const parsedMealPlans = JSON.parse(mealPlans || '[]');
        for (const meal of parsedMealPlans) {
            await transaction.request()
                .input('HOTEL_ID', sql.Int, nextHotelId)
                .input('MEAL_TYPE', sql.NVarChar, meal.type)
                .input('PRICE', sql.Money, meal.price)
                .input('DESCRIPTION', sql.NVarChar, meal.description)
                .query(`
                    INSERT INTO MEAL_PLAN (HOTEL_ID, MEAL_TYPE, PRICE, DESCRIPTION)
                    VALUES (@HOTEL_ID, @MEAL_TYPE, @PRICE, @DESCRIPTION)
                `);
        }

        // Thêm vào bảng HOTEL_IMAGES
        let nextImageId = await getNextId(pool, 'HOTEL_IMAGES', 'IMAGE_ID');
        for (const file of uploadedFiles) {
            const imageUrl = `uploads/${file.filename}`;
            await transaction.request()
                .input('IMAGE_ID', sql.Int, nextImageId++)
                .input('HOTEL_ID', sql.Int, nextHotelId)
                .input('IMAGE_URL', sql.NVarChar, imageUrl)
                .query(`
                    INSERT INTO HOTEL_IMAGES (IMAGE_ID, HOTEL_ID, IMAGE_URL)
                    VALUES (@IMAGE_ID, @HOTEL_ID, @IMAGE_URL)
                `);
        }

        // Commit transaction
        await transaction.commit();

        res.status(201).json({
            message: 'Hotel created successfully',
            HOTEL_ID: nextHotelId,
        });
    } catch (error) {
        console.error('Error creating hotel:', error);
        if (transaction) await transaction.rollback();
        res.status(500).json({ message: 'Error creating hotel', error: error.message });
    }
};

module.exports = createHotel;
