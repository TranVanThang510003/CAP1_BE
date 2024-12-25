const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const deleteBedByName = async (req, res) => {
    const { roomTypeId, bedTypeId } = req.params; // Lấy ROOM_TYPE_ID và BED_TYPE_ID từ params

    try {
        const pool = await connectToDB();

        // Bắt đầu giao dịch
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Xóa giường theo ROOM_TYPE_ID và BED_TYPE_ID
        const deleteBedQuery = `
            DELETE FROM BED_TYPES
            WHERE ROOM_TYPE_ID = @roomTypeId AND BED_TYPE_ID = @bedTypeId;
        `;

        const deleteResult = await transaction.request()
            .input("roomTypeId", sql.Int, roomTypeId)
            .input("bedTypeId", sql.Int, bedTypeId)
            .query(deleteBedQuery);

        if (deleteResult.rowsAffected[0] === 0) {
            // Nếu không tìm thấy giường cần xóa
            await transaction.rollback();
            return res.status(404).json({ message: "Không tìm thấy loại giường cần xóa." });
        }

        // Kiểm tra xem phòng còn giường nào không
        const checkBedsQuery = `
            SELECT COUNT(*) AS remainingBeds
            FROM BED_TYPES
            WHERE ROOM_TYPE_ID = @roomTypeId;
        `;

        const checkBedsResult = await transaction.request()
            .input("roomTypeId", sql.Int, roomTypeId)
            .query(checkBedsQuery);

        const remainingBeds = checkBedsResult.recordset[0].remainingBeds;

        if (remainingBeds === 0) {
            // Nếu không còn giường nào, xóa luôn phòng
            const deleteRoomQuery = `
                DELETE FROM ROOM_TYPE
                WHERE ROOM_TYPE_ID = @roomTypeId;
            `;

            await transaction.request()
                .input("roomTypeId", sql.Int, roomTypeId)
                .query(deleteRoomQuery);

            console.log(`Phòng (ROOM_TYPE_ID = ${roomTypeId}) đã bị xóa do không còn giường.`);
        }

        // Commit giao dịch
        await transaction.commit();
        res.status(200).json({
            message: `Đã xóa giường (BED_TYPE_ID = ${bedTypeId}). ${
                remainingBeds === 0 ? "Phòng cũng đã bị xóa." : ""
            }`
        });
    } catch (error) {
        console.error("Lỗi khi xóa loại giường:", error);
        res.status(500).json({ message: "Lỗi khi xóa loại giường.", error: error.message });
    }
};

module.exports = deleteBedByName;
