const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const updateBed = async (req, res) => {
    const { roomTypeId, oldBedTypeId } = req.params; // Lấy mã giường cũ từ URL
    const { bedTypeId, roomSize, price, quantity } = req.body; // Lấy mã giường mới và các thông tin khác

    console.log("Request params:", { roomTypeId, oldBedTypeId });
    console.log("Request body:", { bedTypeId, roomSize, price, quantity });

    try {
        // Kết nối tới cơ sở dữ liệu
        const pool = await connectToDB();

        // Chuyển đổi kiểu dữ liệu
        const parsedRoomTypeId = parseInt(roomTypeId, 10);
        const parsedOldBedTypeId = parseInt(oldBedTypeId, 10);
        const parsedNewBedTypeId = parseInt(bedTypeId, 10);

        console.log("Parsed params:", {
            roomTypeId: parsedRoomTypeId,
            oldBedTypeId: parsedOldBedTypeId,
            newBedTypeId: parsedNewBedTypeId,
            roomSize,
            price,
            quantity
        });

        // Kiểm tra dữ liệu đầu vào
        if (isNaN(parsedRoomTypeId) || isNaN(parsedOldBedTypeId) || isNaN(parsedNewBedTypeId)) {
            return res.status(400).json({ message: "roomTypeId hoặc bedTypeId không hợp lệ!" });
        }

        // Kiểm tra bản ghi tồn tại
        const checkQuery = `
            SELECT * FROM BED_TYPES
            WHERE ROOM_TYPE_ID = @roomTypeId AND BED_TYPE_MASTER_ID = @oldBedTypeId;
        `;
        const checkResult = await pool.request()
            .input("roomTypeId", sql.Int, parsedRoomTypeId)
            .input("oldBedTypeId", sql.Int, parsedOldBedTypeId)
            .query(checkQuery);

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ message: "Không tìm thấy giường cần cập nhật!" });
        }

        // Thực hiện cập nhật thông tin giường
        const updateQuery = `
            UPDATE BED_TYPES
            SET 
                BED_TYPE_MASTER_ID = @newBedTypeId,
                ROOM_SIZE = @roomSize,
                PRICE = @price,
                BED_QUANTITY = @quantity
            WHERE 
                ROOM_TYPE_ID = @roomTypeId AND BED_TYPE_MASTER_ID = @oldBedTypeId;
        `;
        const result = await pool.request()
            .input("roomTypeId", sql.Int, parsedRoomTypeId)
            .input("oldBedTypeId", sql.Int, parsedOldBedTypeId) // Mã giường cũ
            .input("newBedTypeId", sql.Int, parsedNewBedTypeId) // Mã giường mới
            .input("roomSize", sql.Float, roomSize)
            .input("price", sql.Float, price)
            .input("quantity", sql.Int, quantity)
            .query(updateQuery);

        // Phản hồi kết quả
        console.log("Rows affected:", result.rowsAffected);
        if (result.rowsAffected[0] > 0) {
            return res.status(200).json({ message: "Cập nhật thông tin giường thành công!" });
        } else {
            return res.status(400).json({ message: "Cập nhật thất bại!" });
        }
    } catch (error) {
        console.error("Lỗi khi cập nhật giường:", error);
        return res.status(500).json({ message: "Lỗi máy chủ nội bộ", error: error.message });
    }
};

module.exports = updateBed;
