const sql = require("mssql");
const { connectToDB } = require("../../config/db");

const deleteBed = async (req, res) => {
    let transaction;
    try {
        const { roomTypeId, bedTypeId } = req.params;

        if (!roomTypeId || !bedTypeId) {
            return res.status(400).json({ message: "Missing roomTypeId or bedTypeId" });
        }

        const pool = await connectToDB();
        transaction = new sql.Transaction(pool);
        await transaction.begin();

        // Xóa giường từ bảng BED_TYPES
        const deleteBedResult = await transaction.request()
            .input("ROOM_TYPE_ID", sql.Int, roomTypeId)
            .input("BED_TYPE_ID", sql.Int, bedTypeId)
            .query(`
                DELETE FROM BED_TYPES 
                WHERE ROOM_TYPE_ID = @ROOM_TYPE_ID AND BED_TYPE_ID = @BED_TYPE_ID
            `);

        console.log(`Số hàng bị xóa từ BED_TYPES: ${deleteBedResult.rowsAffected}`);

        // Kiểm tra xem phòng có còn giường nào không
        const checkBeds = await transaction.request()
            .input("ROOM_TYPE_ID", sql.Int, roomTypeId)
            .query(`
                SELECT COUNT(*) AS remainingBeds 
                FROM BED_TYPES 
                WHERE ROOM_TYPE_ID = @ROOM_TYPE_ID
            `);

        const remainingBeds = checkBeds.recordset[0].remainingBeds;
        console.log(`Số giường còn lại: ${remainingBeds}`);

        if (remainingBeds === 0) {
            // Nếu không còn giường nào, xóa phòng
            const deleteRoomResult = await transaction.request()
                .input("ROOM_TYPE_ID", sql.Int, roomTypeId)
                .query(`
                    DELETE FROM ROOM_TYPE 
                    WHERE ROOM_TYPE_ID = @ROOM_TYPE_ID
                `);

            console.log(`Phòng bị xóa: ${deleteRoomResult.rowsAffected}`);
        }

        // Commit transaction
        await transaction.commit();
        res.status(200).json({ message: "Giường và phòng (nếu cần) đã được xóa thành công." });
    } catch (error) {
        console.error("Lỗi khi xóa giường:", error.message);
        if (transaction) await transaction.rollback();
        res.status(500).json({ message: "Đã xảy ra lỗi khi xóa giường.", error: error.message });
    }
};

module.exports = deleteBed;
