const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const getToursWithRevenue = async (creatorId) => {
    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .input('creatorId', sql.Int, creatorId)
            .query(`
                SELECT
                    T.TOUR_NAME AS tourName,
                    B.DATE AS departureDate,
                    ISNULL(SUM(B.TOTAL_PRICE), 0) AS revenue
                FROM
                    [TRIPGO1].[dbo].[TOUR] T
                    LEFT JOIN [TRIPGO1].[dbo].[TOUR_BOOKINGS] B ON B.TOUR_ID = T.TOUR_ID
                WHERE
                    T.CREATED_BY = @creatorId
                GROUP BY
                    T.TOUR_NAME, B.DATE
                ORDER BY
                    T.TOUR_NAME, B.DATE;
            `);

        const tours = {};

        // Group data into the desired structure
        result.recordset.forEach((record) => {
            const { tourName, departureDate, revenue } = record;

            if (!tours[tourName]) {
                tours[tourName] = {
                    tourName,
                    departures: [],
                    totalRevenue: 0,
                };
            }

            if (departureDate) {
                tours[tourName].departures.push({
                    date: departureDate.toISOString().split('T')[0],
                    revenue,
                });
            }

            tours[tourName].totalRevenue += revenue;
        });

        // Ensure tours without any bookings are included
        Object.values(tours).forEach((tour) => {
            if (tour.departures.length === 0) {
                tour.totalRevenue = 0;
            }
        });

        // Convert object to array and sort by totalRevenue descending
        return Object.values(tours).sort((a, b) => b.totalRevenue - a.totalRevenue);
    } catch (error) {
        console.error('Error fetching tours with revenue:', error);
        throw error;
    }
};

module.exports = getToursWithRevenue;
