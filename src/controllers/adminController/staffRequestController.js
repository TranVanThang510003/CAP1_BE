const sql = require('mssql');
const { connectToDB } = require('../../config/db');

// Function to get all staff requests
const getAllStaffRequests = async (req, res) => {
    try {
        const pool = await connectToDB();
        const result = await pool.request().query(`
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
            ORDER BY SR.CREATED_AT DESC;
        `);

        const staffRequests = result.recordset;

        res.status(200).json({ staffRequests });
    } catch (error) {
        console.error('Error fetching staff requests:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách yêu cầu staff', error: error.message });
    }
};

// Function to get staff request details by ID
const getStaffRequestById = async (req, res) => {
    const { id } = req.params;

    if (isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ message: 'ID yêu cầu không hợp lệ' });
    }

    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .input('requestId', sql.Int, id)
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
                WHERE SR.REQUEST_ID = @requestId;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy yêu cầu với ID đã cho.' });
        }

        const staffRequest = result.recordset[0];
        res.status(200).json({ staffRequest });
    } catch (error) {
        console.error('Error fetching staff request details:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy chi tiết yêu cầu staff', error: error.message });
    }
};

const updateStaffRequestStatus = async (req, res) => {
    const { requestId } = req.params;
    const { status } = req.body; // Trạng thái mới từ frontend (pending, approved, rejected)

    if (!['pending', 'approved', 'rejected'].includes(status)) {
        return res.status(400).json({ message: 'Trạng thái không hợp lệ' });
    }

    try {
        const pool = await connectToDB();

        // Kiểm tra yêu cầu và lấy user_id từ bảng STAFF_REQUESTS
        const result = await pool.request()
            .input('requestId', sql.Int, requestId)
            .query(`
                SELECT USER_ID 
                FROM STAFF_REQUESTS 
                WHERE REQUEST_ID = @requestId
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Yêu cầu không tồn tại.' });
        }

        const userId = result.recordset[0].USER_ID;

        // Cập nhật trạng thái yêu cầu
        await pool.request()
            .input('status', sql.NVarChar, status)
            .input('requestId', sql.Int, requestId)
            .query(`
                UPDATE STAFF_REQUESTS
                SET STATUS = @status, UPDATED_AT = GETDATE()
                WHERE REQUEST_ID = @requestId;
            `);

        // Nếu trạng thái là "approved", cập nhật role_id của người dùng trong bảng users
        if (status === 'approved') {
            await pool.request()
                .input('roleId', sql.Int, 2) // role_id = 2
                .input('userId', sql.Int, userId)
                .query(`
                    UPDATE USERS
                    SET ROLE_ID = @roleId
                    WHERE USER_ID = @userId;
                `);
        }

        res.status(200).json({ message: 'Trạng thái yêu cầu và vai trò người dùng đã được cập nhật thành công.' });
    } catch (error) {
        console.error('Error updating staff request status:', error.message);
        res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái yêu cầu staff', error: error.message });
    }
};

module.exports = {
    getAllStaffRequests,
    getStaffRequestById,
    updateStaffRequestStatus
};
