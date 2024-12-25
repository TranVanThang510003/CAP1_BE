const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const getRevenueByTourType = async (creatorId) => {
    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .input("creatorId", sql.Int, creatorId || null)
            .query(`
                SELECT 
                    TT.TOUR_TYPE_NAME AS tourTypeName,
                    TT.DESCRIPTION AS tourTypeDescription,
                    SUM(B.TOTAL_PRICE) AS totalRevenue
                FROM 
                    TOUR_BOOKINGS B
                JOIN 
                    TOUR T ON B.TOUR_ID = T.TOUR_ID
                JOIN 
                    TOUR_TYPE TT ON T.TOUR_TYPE_ID = TT.TOUR_TYPE_ID
                WHERE 
                    @creatorId IS NULL OR T.CREATED_BY = @creatorId
                    AND B.STATUS = 'success'
                GROUP BY 
                    TT.TOUR_TYPE_NAME, TT.DESCRIPTION
                ORDER BY 
                    totalRevenue DESC;
            `);

        return result.recordset;
    } catch (error) {
        console.error("Error fetching revenue by tour type:", error);
        throw new Error("Error fetching revenue by tour type");
    }
};

module.exports = getRevenueByTourType;
