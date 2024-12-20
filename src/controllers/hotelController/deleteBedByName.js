const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const deleteBedByName = async (req, res) => {
    const { roomTypeId, bedTypeName } = req.params;

    try {
        const pool = await connectToDB();

        // Xóa loại giường theo ROOM_TYPE_ID và tên giường (BED_TYPE_NAME)
        const query = `
            DELETE BT
            FROM BED_TYPES BT
            JOIN BED_TYPE_MASTER BTM ON BT.BED_TYPE_MASTER_ID = BTM.BED_TYPE_ID
            WHERE BT.ROOM_TYPE_ID = @roomTypeId AND BTM.BED_TYPE_NAME = @bedTypeName;
        `;

        const result = await pool.request()
            .input("roomTypeId", sql.Int, roomTypeId)
            .input("bedTypeName", sql.NVarChar, bedTypeName)
            .query(query);

        if (result.rowsAffected[0] > 0) {
            res.status(200).json({ message: "Xóa thành công loại giường." });
        } else {
            res.status(404).json({ message: "Không tìm thấy loại giường cần xóa." });
        }
    } catch (error) {
        console.error("Lỗi khi xóa loại giường:", error);
        res.status(500).json({ message: "Lỗi khi xóa loại giường.", error: error.message });
    }
};

module.exports = deleteBedByName;
