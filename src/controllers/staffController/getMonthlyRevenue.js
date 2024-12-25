const sql = require("mssql");
const { connectToDB } = require("../../config/db");

const getMonthlyRevenue = async (req, res) => {
    const creatorId = parseInt(req.params.createId, 10);

    if (isNaN(creatorId) || creatorId <= 0) {
        return res.status(400).json({ message: "creatorId không hợp lệ" });
    }

    try {
        const pool = await connectToDB();
        const result = await pool
            .request()
            .input("creatorId", sql.Int, creatorId)
            .query(`
                SELECT
                    FORMAT(B.CREATED_AT, 'yyyy-MM') AS month, -- Lấy tháng
                    SUM(B.TOTAL_PRICE) AS totalRevenue -- Tính tổng doanh thu
                FROM
                    TOUR_BOOKINGS B
                    JOIN
                    TOUR T ON B.TOUR_ID = T.TOUR_ID 
                WHERE
                    T.CREATED_BY = @creatorId -- Lọc theo creatorId
                   AND B.STATUS = 'success'
                GROUP BY
                    FORMAT(B.CREATED_AT, 'yyyy-MM') -- Nhóm theo tháng
                ORDER BY
                    month; -- Sắp xếp theo tháng
            `);

        res.status(200).json({ monthlyRevenue: result.recordset });
    } catch (error) {
        console.error("Lỗi khi tính tổng doanh thu theo tháng:", error);
        res.status(500).json({ message: "Lỗi server", error: error.message });
    }
};

module.exports = getMonthlyRevenue;
