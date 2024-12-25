const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const addRoom = async (req, res) => {
    let transaction;
    try {
        console.log('Request body:', req.body);
        console.log('Uploaded files:', req.files);

        const uploadedFiles = req.files?.newImages || [];
        const { hotelId } = req.body;

        if (!hotelId) {
            return res.status(400).json({ message: 'Thiếu thông tin bắt buộc: hotelId' });
        }

        // Kết nối SQL Server
        const pool = await connectToDB();
        transaction = new sql.Transaction(pool);
        await transaction.begin();
        console.log('Kết nối SQL thành công!');

        // Lấy dữ liệu room_x từ body và parse JSON
        const rooms = Object.keys(req.body)
            .filter((key) => key.startsWith('room_'))
            .map((key) => {
                try {
                    return JSON.parse(req.body[key]);
                } catch (err) {
                    throw new Error(`Dữ liệu phòng không hợp lệ tại key ${key}: ${err.message}`);
                }
            });

        console.log('Rooms parsed:', rooms);

        for (let roomIndex = 0; roomIndex < rooms.length; roomIndex++) {
            const room = rooms[roomIndex];

            // Kiểm tra và xử lý bedTypes
            const bedTypes = room.bedTypes || [];
            if (!Array.isArray(bedTypes)) {
                throw new Error(`Dữ liệu bedTypes không hợp lệ cho phòng ${room.roomName}`);
            }

            // 1. Thêm thông tin phòng vào ROOM_TYPE
            const roomResult = await transaction.request()
                .input('HOTEL_ID', sql.Int, hotelId)
                .input('ROOM_NAME', sql.NVarChar, room.roomName)
                .query(`
                    INSERT INTO ROOM_TYPE (HOTEL_ID, ROOM_NAME, LAST_UPDATED)
                        OUTPUT INSERTED.ROOM_TYPE_ID
                    VALUES (@HOTEL_ID, @ROOM_NAME,  GETDATE())
                `);

            const roomTypeId = roomResult.recordset[0].ROOM_TYPE_ID;
            console.log(`ROOM_TYPE_ID cho phòng ${room.roomName}: ${roomTypeId}`);

            // 2. Thêm loại giường vào BED_TYPES và xử lý tiện nghi từ từng giường
            for (const bed of bedTypes) {
                console.log(`Thêm giường: ${JSON.stringify(bed)}`);

                // Tra cứu BED_TYPE_MASTER_ID dựa vào type
                const bedTypeMasterResult = await transaction.request()
                    .input('BED_TYPE_NAME', sql.NVarChar, bed.type) // 'type' là giá trị như "Single", "Double"
                    .query(`
            SELECT BED_TYPE_ID 
            FROM BED_TYPE_MASTER 
            WHERE BED_TYPE_NAME = @BED_TYPE_NAME
        `);

                if (bedTypeMasterResult.recordset.length === 0) {
                    throw new Error(`Không tìm thấy loại giường phù hợp cho: ${bed.type}`);
                }

                const bedTypeMasterId = bedTypeMasterResult.recordset[0].BED_TYPE_ID;

                // Thêm BED_TYPES
                await transaction.request()
                    .input('ROOM_TYPE_ID', sql.Int, roomTypeId)
                    .input('BED_TYPE_MASTER_ID', sql.Int, bedTypeMasterId)
                    .input('PRICE', sql.Money, bed.price)
                    .input('BED_QUANTITY', sql.Int, bed.quantity)
                    .input('ROOM_SIZE', sql.Int, bed.roomSize)
                    .query(`
            INSERT INTO BED_TYPES (ROOM_TYPE_ID, BED_TYPE_MASTER_ID, PRICE, BED_QUANTITY, ROOM_SIZE)
            VALUES (@ROOM_TYPE_ID, @BED_TYPE_MASTER_ID, @PRICE, @BED_QUANTITY, @ROOM_SIZE)
        `);

                console.log(`Đã thêm loại giường ${bed.type} vào phòng ${room.roomName}`);


                // 3. Xử lý tiện nghi cho phòng (cả phòng, không phụ thuộc vào giường)
                const facilities = [...new Set(room.facilities || [])]; // Loại bỏ trùng lặp tiện nghi trong mảng
                if (!Array.isArray(facilities)) {
                    throw new Error(`Dữ liệu facilities không hợp lệ cho phòng ${room.roomName}`);
                }
                console.log(`Kiểm tra facilities cho phòng ${room.roomName}:`, facilities);

// Thêm tiện nghi duy nhất cho phòng
                for (const amenity of facilities) {
                    console.log(`Thêm tiện nghi cho phòng: ${amenity}`);
                    await transaction.request()
                        .input('ROOM_TYPE_ID', sql.Int, roomTypeId)
                        .input('AMENITY_NAME', sql.NVarChar, amenity)
                        .query(`
            IF NOT EXISTS (
                SELECT 1 FROM ROOM_AMENITIES 
                WHERE ROOM_TYPE_ID = @ROOM_TYPE_ID AND AMENITY_NAME = @AMENITY_NAME
            )
            INSERT INTO ROOM_AMENITIES (ROOM_TYPE_ID, AMENITY_NAME)
            VALUES (@ROOM_TYPE_ID, @AMENITY_NAME)
        `);
                }

            }

            // 3. Xử lý ảnh phòng
            for (const file of uploadedFiles) {
                const imageUrl = `uploads/${file.filename}`;
                console.log(`Thêm ảnh: ${imageUrl}`);

                await transaction.request()
                    .input('ROOM_TYPE_ID', sql.Int, roomTypeId)
                    .input('IMAGE_URL', sql.NVarChar, imageUrl)
                    .query(`
                        INSERT INTO ROOM_IMAGES (ROOM_TYPE_ID, IMAGE_URL)
                        VALUES (@ROOM_TYPE_ID, @IMAGE_URL)
                    `);
            }
        }

        // Commit transaction
        await transaction.commit();
        console.log('Transaction đã commit thành công!');

        // Phản hồi thành công
        res.status(201).json({ message: 'Tất cả phòng đã được thêm thành công!' });

    } catch (error) {
        console.error('Error creating rooms:', error.message);
        if (transaction) await transaction.rollback();
        res.status(500).json({ message: 'Lỗi khi thêm phòng!', error: error.message });
    }
};

module.exports = addRoom;
