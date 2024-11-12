const { connectToDB } = require('./config/db'); // Đường dẫn đến tệp kết nối DB
const bcrypt = require('bcrypt');
const sql = require('mssql'); // Cần import mssql để sử dụng sql.NVarChar

const updatePasswords = async () => {
    const pool = await connectToDB();
    
    try {
        const users = await pool.request().query('SELECT * FROM Users');
        
        for (const user of users.recordset) {
            // Mã hóa mật khẩu
            const hashedPassword = await bcrypt.hash(user.PASSWORD, 10);
            // Cập nhật mật khẩu đã mã hóa vào cơ sở dữ liệu
            await pool.request()
                .input('userId', sql.Int, user.USER_ID)
                .input('hashedPassword', sql.NVarChar, hashedPassword)
                .query('UPDATE Users SET PASSWORD = @hashedPassword WHERE USER_ID = @userId');
        }
        
        console.log('Mật khẩu đã được mã hóa thành công!');
    } catch (err) {
        console.error('Lỗi khi mã hóa mật khẩu:', err);
    } finally {
        await pool.close(); // Đảm bảo đóng kết nối
    }
};

updatePasswords();
