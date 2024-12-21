const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const getStaffRequestByUserId = async (userId) => {
    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT 
                    SR.REQUEST_ID AS requestId,
                    SR.USER_ID AS userId,
                    U.USERNAME AS username,
                    U.EMAIL AS userEmail,
                    SR.ID_CARD_IMAGE_URL AS idCardImageUrl,
                    SR.BUSINESS_LICENSE_URL AS businessLicenseUrl,
                    SR.REASON AS reason,
                    SR.PHONE AS phone,
                    SR.EMAIL AS email,
                    SR.STATUS AS status,
                    SR.CREATED_AT AS createdAt,
                    SR.UPDATED_AT AS updatedAt
                FROM STAFF_REQUESTS SR
                LEFT JOIN USERS U ON SR.USER_ID = U.USER_ID
                WHERE SR.USER_ID = @userId AND SR.STATUS = 'approved'
                ORDER BY SR.UPDATED_AT DESC;
            `);

        const staffRequests = result.recordset;

        // Return the staff requests to be handled in the route
        return staffRequests;
    } catch (error) {
        console.error('Error fetching staff notification by user ID:', error.message);
        throw new Error('Lỗi khi lấy thông báo phản hồi'); // Throw error to be caught by the caller
    }
};

module.exports = getStaffRequestByUserId;
