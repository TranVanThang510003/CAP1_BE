const sql = require('mssql');
const { connectToDB } = require('../../config/db');

// Function to get all users
const getAllAccount = async (req, res) => {
    try {
        const pool = await connectToDB();
        const result = await pool.request().query(`
            SELECT 
                U.USER_ID AS userId,
                U.USERNAME AS username,
                U.EMAIL AS email,
                U.PHONE AS phone,
                U.JOIN_DATE AS joinDate,
                U.ROLE_ID as roleId,
                R.ROLE_NAME AS role
            FROM USERS U
            LEFT JOIN ROLE R ON U.ROLE_ID = R.ROLE_ID
             WHERE U.ROLE_ID != 3;
        `);

        const users = result.recordset;

        res.status(200).json({ users });
    } catch (error) {
        console.error('Error fetching users:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy danh sách người dùng', error: error.message });
    }
};

// Function to get user details by ID
const getAccountById = async (req, res) => {
    const { id } = req.params;

    if (isNaN(id) || parseInt(id) <= 0) {
        return res.status(400).json({ message: 'ID người dùng không hợp lệ' });
    }

    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .input('userId', sql.Int, id)
            .query(`
                SELECT 
                    U.USER_ID AS userId,
                    U.USERNAME AS username,
                    U.EMAIL AS email,
                    U.PHONE AS phone,
                    U.JOIN_DATE AS joinDate,
                    U.ADDRESS AS address,
                    U.BIRTHDAY AS birthday,
                
                    R.ROLE_NAME AS role
                FROM USERS U
                LEFT JOIN ROLE R ON U.ROLE_ID = R.ROLE_ID
                WHERE U.USER_ID = @userId;
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Không tìm thấy người dùng với ID đã cho.' });
        }

        const user = result.recordset[0];
        
        res.status(200).json({ user });
    } catch (error) {
        console.error('Error fetching user details:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy chi tiết người dùng', error: error.message });
    }
};

const updateAccountRole = async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body; // Vai trò mới từ frontend ("C" hoặc "S")

    // Chuyển đổi từ "C"/"S" sang `roleId` phù hợp
    const newRoleId = role === "C" ? 1 : role === "S" ? 2 : null;

    if (!newRoleId) {
        return res.status(400).json({ message: "Vai trò không hợp lệ" });
    }

    try {
        const pool = await connectToDB();

        // Cập nhật vai trò người dùng trong cơ sở dữ liệu
        await pool.request()
            .input('roleId', sql.Int, newRoleId)
            .input('userId', sql.Int, userId)
            .query(`
                UPDATE USERS
                SET ROLE_ID = @roleId
                WHERE USER_ID = @userId
            `);

        res.status(200).json({ message: "Vai trò người dùng đã được cập nhật thành công." });
    } catch (error) {
        console.error('Error updating user role:', error.message);
        res.status(500).json({ message: "Lỗi khi cập nhật vai trò người dùng", error: error.message });
    }
};
module.exports = {
    getAllAccount,
    getAccountById,
    updateAccountRole
};
