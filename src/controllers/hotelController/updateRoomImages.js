const sql = require('mssql');
const { connectToDB } = require('../../config/db');
const path = require('path');
const fs = require('fs');

const updateRoomImages = async (req, res) => {
    let transaction;
    try {
        console.log('Request body:', req.body);
        console.log('Uploaded files:', req.files);

        const { roomId } = req.params; // ID của phòng
        const { existingImages } = req.body; // Danh sách ảnh còn giữ lại
        const uploadedFiles = req.files?.newImages || []; // Ảnh mới được tải lên

        if (!roomId || isNaN(parseInt(roomId, 10))) {
            return res.status(400).json({ message: 'Invalid ROOM_ID' });
        }
        const ROOM_ID = parseInt(roomId, 10);

        const pool = await connectToDB();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Lấy danh sách ảnh hiện tại từ DB
        const dbImagesResult = await pool.request()
            .input('ROOM_ID', sql.Int, ROOM_ID)
            .query('SELECT IMAGE_ID, IMAGE_URL FROM ROOM_IMAGES WHERE ROOM_TYPE_ID = @ROOM_ID');

        const dbImages = dbImagesResult.recordset;
        console.log('Current images in DB:', dbImages);

        // Xác định ảnh cần xóa
        const imagesToDelete = dbImages.filter(
            (dbImage) => !existingImages.includes(dbImage.IMAGE_URL)
        );

        // Xóa ảnh khỏi hệ thống file
        for (const image of imagesToDelete) {
            const filePath = path.join(__dirname, '..', image.IMAGE_URL);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted file: ${filePath}`);
                } catch (err) {
                    console.error(`Error deleting file: ${filePath}`, err.message);
                }
            }
        }

        // Xóa ảnh khỏi DB
        if (imagesToDelete.length > 0) {
            const imageIdsToDelete = imagesToDelete.map((img) => img.IMAGE_ID).join(', ');
            await pool.request()
                .input('ROOM_ID', sql.Int, ROOM_ID)
                .query(`
                    DELETE FROM ROOM_IMAGES
                    WHERE ROOM_TYPE_ID = @ROOM_ID
                      AND IMAGE_ID IN (${imageIdsToDelete})
                `);
        }

        // Thêm ảnh mới
        if (uploadedFiles.length > 0) {
            for (const file of uploadedFiles) {
                const imageUrl = `uploads/${file.filename}`;
                console.log(`Thêm ảnh mới: ${imageUrl}`);

                await pool.request()
                    .input('ROOM_ID', sql.Int, ROOM_ID)
                    .input('IMAGE_URL', sql.NVarChar, imageUrl)
                    .query(`
                        INSERT INTO ROOM_IMAGES (ROOM_TYPE_ID, IMAGE_URL)
                        VALUES (@ROOM_ID, @IMAGE_URL)
                    `);
            }
        }

        // Commit transaction
        await transaction.commit();
        console.log('Transaction đã commit thành công!');

        // Phản hồi thành công
        res.status(200).json({ message: 'Cập nhật ảnh phòng thành công!' });

    } catch (error) {
        console.error('Error updating room images:', error.message);
        if (transaction) await transaction.rollback();
        res.status(500).json({ message: 'Lỗi khi cập nhật ảnh phòng!', error: error.message });
    }
};

module.exports = updateRoomImages;
