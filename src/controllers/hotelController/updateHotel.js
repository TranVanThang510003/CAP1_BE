const sql = require('mssql');
const { connectToDB } = require('../../config/db');
const path = require("path");
const fs = require("fs");
const axios = require("axios");

const getLocationName = async (code, type) => {
    try {
        const url = `https://provinces.open-api.vn/api/${type}/${code}`;
        const response = await axios.get(url, { timeout: 5000 });
        return response.data.name;
    } catch (error) {
        console.error(
            `Error fetching ${type} name for code ${code}:`,
            error.response ? error.response.data : error.message
        );
        return null;
    }
};

const getNextImageId = async (pool) => {
    try {
        const result = await pool.request().query(`
            SELECT ISNULL(MAX(IMAGE_ID), 0) + 1 AS NextImageId FROM HOTEL_IMAGES
        `);
        return result.recordset[0].NextImageId;
    } catch (error) {
        console.error("Error fetching next IMAGE_ID:", error.message);
        throw error;
    }
};

const updateHotel = async (req, res) => {
    let transaction;
    try {
        console.log('Request body:', req.body);
        console.log('Uploaded files:', req.files);

        const { hotelId } = req.params;
        const { hotelName, hotelType, description, address, province, district, ward } = req.body;

        if (!hotelId || isNaN(parseInt(hotelId, 10))) {
            console.error('Invalid HOTEL_ID:', hotelId);
            return res.status(400).json({ message: 'Invalid HOTEL_ID' });
        }
        const HOTEL_ID = parseInt(hotelId, 10);


        let existingImages = [];
        try {
            // Nếu là chuỗi JSON hợp lệ, parse thành mảng
            existingImages = typeof req.body.existingImages === 'string'
                ? JSON.parse(req.body.existingImages)
                : req.body.existingImages || [];
            console.log('Parsed existingImages:', existingImages);
        } catch (error) {
            console.error('Error parsing existingImages:', error.message);
            // Nếu không phải JSON, mặc định là mảng chứa chuỗi
            existingImages = [req.body.existingImages];
            console.log('Fallback to single image array:', existingImages);
        }


        const uploadedFiles = req.files?.newImages || [];
        console.log('Uploaded files:', uploadedFiles);

        const pool = await connectToDB();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Lấy tên địa điểm
        const provinceName = await getLocationName(province, 'p');
        const districtName = await getLocationName(district, 'd');
        const wardName = await getLocationName(ward, 'w');

        if (!provinceName || !districtName || !wardName) {
            console.error('Error fetching location names:', { provinceName, districtName, wardName });
            throw new Error('Unable to fetch location details.');
        }
        console.log('Location names:', { provinceName, districtName, wardName });

        // Cập nhật thông tin khách sạn
        console.log('Updating HOTEL table...');
        await transaction.request()
            .input('HOTEL_ID', sql.Int, HOTEL_ID)
            .input('HOTEL_NAME', sql.NVarChar, hotelName)
            .input('HOTEL_TYPE', sql.Int, hotelType)
            .input('DESCRIPTION', sql.NVarChar, description)
            .input('ADDRESS', sql.NVarChar, address)
            .input('PROVINCE', sql.NVarChar, provinceName)
            .input('DISTRICT', sql.NVarChar, districtName)
            .input('WARD', sql.NVarChar, wardName)
            .query(`
                UPDATE HOTEL
                SET HOTEL_NAME = @HOTEL_NAME,
                    HOTEL_TYPE = @HOTEL_TYPE,
                    DESCRIPTION = @DESCRIPTION,
                    ADDRESS = @ADDRESS,
                    PROVINCE = @PROVINCE,
                    DISTRICT = @DISTRICT,
                    WARD = @WARD
                WHERE HOTEL_ID = @HOTEL_ID
            `);

        // Lấy danh sách ảnh hiện tại trong DB
        const dbImagesResult = await pool.request()
            .input('HOTEL_ID', sql.Int, HOTEL_ID)
            .query('SELECT IMAGE_ID, IMAGE_URL FROM HOTEL_IMAGES WHERE HOTEL_ID = @HOTEL_ID');

        const dbImages = dbImagesResult.recordset;
        console.log('Current images in DB:', dbImages);

        // Xác định ảnh cần xóa
        const imagesToDelete = dbImages.filter(
            (dbImage) => !existingImages.includes(dbImage.IMAGE_URL)
        );
        console.log('Images to delete:', imagesToDelete);

        // Xóa ảnh khỏi hệ thống tệp
        for (const image of imagesToDelete) {
            const filePath = path.join(__dirname, '..', image.IMAGE_URL);
            console.log('Deleting file at:', filePath);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted file: ${filePath}`);
                } catch (err) {
                    console.error(`Error deleting file: ${filePath}`, err.message);
                }
            } else {
                console.warn(`File not found: ${filePath}`);
            }
        }

        // Xóa ảnh khỏi cơ sở dữ liệu
        if (imagesToDelete.length > 0) {
            const imageIdsToDelete = imagesToDelete.map((img) => img.IMAGE_ID).join(', ');
            try {
                await pool.request()
                    .input('HOTEL_ID', sql.Int, HOTEL_ID)
                    .query(`
                        DELETE FROM HOTEL_IMAGES
                        WHERE HOTEL_ID = @HOTEL_ID
                          AND IMAGE_ID IN (${imageIdsToDelete})
                    `);
                console.log('Deleted images from DB:', imageIdsToDelete);
            } catch (err) {
                console.error('Error deleting images from DB:', err.message);
                throw err;
            }
        }

        // Commit transaction trước khi thêm ảnh mới
        await transaction.commit();

        // Thêm ảnh mới
        if (uploadedFiles.length > 0) {
            let nextImageId = await getNextImageId(pool);
            console.log('Next IMAGE_ID:', nextImageId);

            for (const file of uploadedFiles) {
                const imageUrl = `uploads/${file.filename}`;
                try {
                    await pool.request()
                        .input('IMAGE_ID', sql.Int, nextImageId++)
                        .input('HOTEL_ID', sql.Int, HOTEL_ID)
                        .input('IMAGE_URL', sql.NVarChar, imageUrl)
                        .query(`
                            INSERT INTO HOTEL_IMAGES (IMAGE_ID, HOTEL_ID, IMAGE_URL)
                            VALUES (@IMAGE_ID, @HOTEL_ID, @IMAGE_URL)
                        `);
                    console.log('Inserted new image:', imageUrl);
                } catch (err) {
                    console.error('Error inserting new image:', imageUrl, err.message);
                    throw err;
                }
            }
        }

        res.status(200).json({ message: 'Hotel updated successfully.' });
    } catch (error) {
        console.error('Error updating hotel:', error.message);
        if (transaction) await transaction.rollback();
        res.status(500).json({ message: 'Error updating hotel.', error: error.message });
    }
};

module.exports = updateHotel;
