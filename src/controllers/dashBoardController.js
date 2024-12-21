const sql = require("mssql");
const { connectToDB } = require("../config/db");

//Get Total Revenue in Year
const getTotalRevenueInYear = async (req, res) => {
    try {
        const year = req.params.year;
        const pool = await connectToDB();

        // Thực hiện các truy vấn đồng thời
        const [revenueResult, countResult, tourResult] = await Promise.all([
            pool.request().input("year", sql.Int, year).query(`
                SELECT SUM([TOTAL_PRICE]) AS Total_Revenue, 
                       COUNT(DISTINCT [USER_ID]) AS Total_Unique_Users
                FROM [dbo].[TOUR_BOOKINGS]
                WHERE [STATUS] = 'success' AND YEAR([DATE]) = @year
            `),
            pool.request().input("year", sql.Int, year).query(`
                SELECT COUNT(DISTINCT [USER_ID]) AS Total_Users
                FROM USERS
                WHERE YEAR([JOIN_DATE]) = @year
            `),
            pool.query(`
                SELECT COUNT(DISTINCT [TOUR_ID]) AS Total_Tours
                FROM TOUR
            `)
        ]);

        // Lấy dữ liệu từ các truy vấn
        const revenue = revenueResult.recordset[0];
        const count = countResult.recordset[0];
        const tour = tourResult.recordset[0];

        // Trả về kết quả
        return res.json({
            Total_Revenue: revenue.Total_Revenue,
            Total_Tours: tour.Total_Tours,
            Total_Unique_Users: revenue.Total_Unique_Users,
            Total_Users: count.Total_Users
        });
    } catch (error) {
        console.error("Error fetching data:", error.message);
        return res.status(500).json({
            message: "Lỗi khi lấy dữ liệu",
            error: error.message,
        });
    }
};



//Get Number of Tuors in Year
const getTotalTourAndHotelInYear = async (req, res) => {
    try {
        const year = req.params.year;
        const pool = await connectToDB();
        const result = await pool.request().input("year", sql.Int, year)
            .query(`SELECT 
                    MONTH([CHECK_IN_DATE]) AS Month,
                    'Hotel' AS Type,
                    SUM([TOTAL_PRICE]) AS Total_Revenue
                FROM [dbo].[HOTEL_BOOKINGS]
                WHERE [STATUS] = 'success' AND YEAR([CHECK_IN_DATE]) = @year
                GROUP BY MONTH([CHECK_IN_DATE])

                UNION ALL

                SELECT 
                    MONTH([DATE]) AS Month,
                    'Tour' AS Type,
                    SUM([TOTAL_PRICE]) AS Total_Revenue
                FROM [dbo].[TOUR_BOOKINGS]
                WHERE [STATUS] = 'success' AND YEAR([DATE]) = @year
                GROUP BY MONTH([DATE])

                ORDER BY Month, Type;
                    
                    `);
        const totalTour = result.recordset;
        return res.json({ Total_Tours: totalTour });
    } catch (error) {
        console.error("Error fetching users:", error.message);
        res
            .status(500)
            .json({
                message: "Lỗi khi lấy danh sách người dùng",
                error: error.message,
            });
    }
};

const getTotalRevenueInYearforStaff = async (req, res) => {
    try {
        const year = req.params.year;
        const pool = await connectToDB();
        const result = await pool.request().input("year", sql.Int, year)
            .query(`SELECT 
                SUM(TB.[TOTAL_PRICE]) AS Total_Revenue, 
                COUNT(*) AS Total_Tours, 
                COUNT(DISTINCT TB.[USER_ID]) AS Total_Unique_Users
            FROM 
                [dbo].[TOUR_BOOKINGS] TB
            JOIN 
                [dbo].[USERS] U
            ON 
                TB.[USER_ID] = U.[USER_ID]
            WHERE 
                TB.[STATUS] = 'success' 
                AND YEAR(TB.[DATE]) = @year
                AND U.[ROLE_ID] = 1;`);
        const report = result.recordset[0];
        return res.json({
            Total_Revenue: report.Total_Revenue,
            Total_Tours: report.Total_Tours,
            Total_Unique_Users: report.Total_Unique_Users,
        });
    } catch (error) {
        console.error("Error fetching users:", error.message);
        res
            .status(500)
            .json({
                message: "Lỗi khi lấy danh sách người dùng",
                error: error.message,
            });
    }
};

const getReportforStaff = async (req, res) => {
    try {
        const year = req.params.year;
        const pool = await connectToDB();
        const result = await pool.request().input("year", sql.Int, year)
            .query(`SELECT 
                    MONTH(HB.[CHECK_IN_DATE]) AS Month,
                    'Hotel' AS Type,
                    SUM(HB.[TOTAL_PRICE]) AS Total_Revenue
                FROM 
                    [dbo].[HOTEL_BOOKINGS] HB
                JOIN 
                    [dbo].[USERS] U
                ON 
                    HB.[USER_ID] = U.[USER_ID]
                WHERE 
                    HB.[STATUS] = 'success' 
                    AND YEAR(HB.[CHECK_IN_DATE]) = @year
                    AND U.[ROLE_ID] = 1
                GROUP BY 
                    MONTH(HB.[CHECK_IN_DATE])

                UNION ALL

                SELECT 
                    MONTH(TB.[DATE]) AS Month,
                    'Tour' AS Type,
                    SUM(TB.[TOTAL_PRICE]) AS Total_Revenue
                FROM 
                    [dbo].[TOUR_BOOKINGS] TB
                JOIN 
                    [dbo].[USERS] U
                ON 
                    TB.[USER_ID] = U.[USER_ID]
                WHERE 
                    TB.[STATUS] = 'success' 
                    AND YEAR(TB.[DATE]) = @year
                    AND U.[ROLE_ID] = 1
                GROUP BY 
                    MONTH(TB.[DATE])

                ORDER BY 
                    Month, Type;`);
        const totalTour = result.recordset;
        return res.json({ Total_Tours: totalTour });
    } catch (error) {
        console.error("Error fetching users:", error.message);
        res
            .status(500)
            .json({
                message: "Lỗi khi lấy danh sách người dùng",
                error: error.message,
            });
    }
};

const manageTransaction = async (req, res) => {
    try {
        const pool = await connectToDB();
        const result = await pool.request().query(`
            SELECT
                USERS.USERNAME,
                TOUR.TOUR_NAME,
                TOUR.DESCRIPTION,
                TOUR.HIGHLIGHTS,
                TOUR_BOOKINGS.BOOKING_ID,
                TOUR_BOOKINGS.TOTAL_PRICE,
                TOUR_BOOKINGS.DATE,
                TOUR_BOOKINGS.ADULT_COUNT,
                TOUR_BOOKINGS.CHILD_COUNT,
                TOUR_SCHEDULE.PRICE_ADULT,
                TOUR_SCHEDULE.PRICE_CHILD,
                TOUR_BOOKINGS.CREATED_AT,
                TOUR.ADDRESS,
                TOUR.DISTRICT,
                TOUR.PROVINCE,
                TOUR.WARD
            FROM
                USERS
                    JOIN
                TOUR_BOOKINGS
                ON
                    USERS.USER_ID = TOUR_BOOKINGS.USER_ID
                    JOIN
                TOUR
                ON
                    TOUR_BOOKINGS.TOUR_ID = TOUR.TOUR_ID
                    JOIN
                TOUR_SCHEDULE
                ON
                    TOUR_BOOKINGS.TOUR_ID = TOUR_SCHEDULE.TOUR_ID
                        AND TOUR_BOOKINGS.DATE = TOUR_SCHEDULE.DEPARTURE_DATE
            WHERE
                TOUR_BOOKINGS.STATUS = 'success';
        `);
        const infor = result.recordset;
        return res.json({ Manage_Transaction: infor });
    } catch (error) {
        console.error("Error fetching users:", error.message);
        res
            .status(500)
            .json({
                message: "Lỗi khi lấy danh sách người dùng",
                error: error.message,
            });
    }
};


const deleteTransaction = async (req, res) => {
    try {
        const id = req.params.id;

        if (!id) {
            return res.status(400).json({ message: "Transaction ID is required!" });
        }

        const pool = await connectToDB();
        const result = await pool
            .request()
            .input("id", sql.Int, id)
            .query(
                `DELETE FROM TOUR_BOOKINGS
         WHERE STATUS = 'success'
         AND EXISTS (
             SELECT 1
             FROM USERS
             JOIN TOUR ON TOUR_BOOKINGS.TOUR_ID = TOUR.TOUR_ID
             WHERE USERS.USER_ID = TOUR_BOOKINGS.USER_ID AND TOUR_BOOKINGS.BOOKING_ID = @id
         );`
            );

        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ message: "Transaction not found or cannot be deleted!" });
        }

        return res.json({ message: "Deleted Successfully!" });
    } catch (error) {
        console.error("Error deleting transaction:", error.message);
        return res.status(500).json({
            message: "An error occurred while deleting the transaction",
            error: error.message,
        });
    }
};


module.exports = {
    getTotalRevenueInYear,
    getTotalTourAndHotelInYear,
    getTotalRevenueInYearforStaff,
    getReportforStaff,
    manageTransaction,
    deleteTransaction,
};
