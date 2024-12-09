const sql = require('mssql');
const { connectToDB } = require('../../config/db');

// Hàm lấy thông tin người dùng theo ID
const getUserById = async (req, res) => {
    const userId = req.params.id;

    try {
        const pool = await connectToDB();
        const result = await pool.request()
            .input('userId', sql.Int, userId)
            .query('SELECT * FROM USERS WHERE USER_ID = @userId');

        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Người dùng không tồn tại' });
        }

        res.status(200).json(result.recordset[0]);
    } catch (error) {
        console.error('Lỗi khi lấy thông tin người dùng:', error);
        res.status(500).json({ message: 'Lỗi máy chủ' });
    }
};

// Controller cập nhật thông tin người dùng

const updateUser = async (req, res) => {
    const userId = req.params.id;
    const { USERNAME, EMAIL, PHONE, ADDRESS, BIRTHDAY } = req.body;

    if (!USERNAME || !EMAIL || !PHONE || !ADDRESS || !BIRTHDAY) {
        return res.status(400).send('Một hoặc nhiều trường không được phép null.');
    }

    try {
        const pool = await connectToDB();
        await pool.request()
            .input('userId', sql.Int, userId)
            .input('username', sql.NVarChar, USERNAME)
            .input('email', sql.NVarChar, EMAIL)
            .input('phone', sql.NVarChar, PHONE)
            .input('address', sql.NVarChar, ADDRESS)
            .input('birthday', sql.Date, BIRTHDAY)
            .query(`UPDATE USERS 
                    SET USERNAME = @username, 
                        EMAIL = @email, 
                        PHONE = @phone, 
                        ADDRESS = @address, 
                        BIRTHDAY = @birthday 
                    WHERE USER_ID = @userId`);
        res.status(200).send('Cập nhật thành công!');
    } catch (err) {
        console.error('Lỗi khi cập nhật người dùng:', err);
        res.status(500).send('Lỗi máy chủ');
    }
};





module.exports = {
    getUserById,
    updateUser, 
};

