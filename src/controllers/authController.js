const sql = require('mssql');
const { connectToDB } = require('../config/db');
const bcrypt = require('bcrypt');

// Hàm kiểm tra email
const validateEmail = (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Biểu thức kiểm tra định dạng email
    return emailRegex.test(value);
};

// Hàm kiểm tra số điện thoại
const validatePhone = (value) => {
    const phoneRegex = /^\d{10,12}$/; // Biểu thức kiểm tra số điện thoại (10-12 số)
    return phoneRegex.test(value);
};

// Controller đăng nhập
const login = async (req, res) => {
    const { emailOrPhone, password } = req.body;

    try {
        const pool = await connectToDB();

        // Tìm người dùng bằng email hoặc số điện thoại, bao gồm cả vai trò
        const result = await pool.request()
            .input('emailOrPhone', sql.NVarChar, emailOrPhone)
            .query(`
                SELECT 
                    U.USER_ID, 
                    U.USERNAME, 
                    U.EMAIL, 
                    U.PHONE, 
                    U.PASSWORD, 
                    R.ROLE_NAME AS ROLE
                FROM USERS U
                LEFT JOIN ROLE R ON U.ROLE_ID = R.ROLE_ID
                WHERE U.EMAIL = @emailOrPhone OR U.PHONE = @emailOrPhone
            `);

        if (result.recordset.length === 0) {
            // Trường hợp người dùng không tồn tại
            return res.status(404).json({ success: false, message: 'Người dùng không tồn tại!' });
        }

        const user = result.recordset[0];

        // Kiểm tra mật khẩu
        if (!user.PASSWORD) {
            return res.status(500).json({ success: false, message: 'Lỗi máy chủ, không tìm thấy mật khẩu.' });
        }

        // So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, user.PASSWORD);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Mật khẩu không đúng!' });
        }

        // Nếu tất cả đều ổn, trả về thông tin người dùng (bao gồm cả ID và vai trò)
        const userInfo = {
            id: user.USER_ID, // ID người dùng
            username: user.USERNAME,
            email: user.EMAIL,
            phone: user.PHONE,
            role: user.ROLE // Vai trò của người dùng từ bảng ROLE
            // Thêm các trường khác nếu cần thiết
        };

        res.json({ success: true,message: 'Đăng nhập thành công!' , user: userInfo });
    } catch (err) {
        console.error('Lỗi đăng nhập:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
    }
};


// Controller đăng ký
const register = async (req, res) => {
    const { fullName, emailOrPhone, password } = req.body;

    // Kiểm tra email và số điện thoại
    const isEmail = validateEmail(emailOrPhone);
    const isPhone = validatePhone(emailOrPhone);

    if (!isEmail && !isPhone) {
        return res.status(400).json({ success: false, message: 'Email hoặc số điện thoại không hợp lệ!' });
    }

    try {
        const pool = await connectToDB();

        // Kiểm tra xem người dùng đã tồn tại chưa
        const userExists = await pool.request()
            .input('emailOrPhone', sql.NVarChar, emailOrPhone)
            .query('SELECT * FROM USERS WHERE EMAIL = @emailOrPhone OR PHONE = @emailOrPhone');

        if (userExists.recordset.length > 0) {
            return res.status(400).json({ success: false, message: 'Người dùng đã tồn tại!' });
        }

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);

        // Đặt ROLE_ID mặc định là 1 cho vai trò customer
        const customerRoleId = 1; // ID vai trò customer trong bảng ROLE

        // Xây dựng câu lệnh INSERT động
        const insertQuery = `
            INSERT INTO USERS (USERNAME, PASSWORD, ROLE_ID ${isEmail ? ', EMAIL' : ''} ${isPhone ? ', PHONE' : ''})
            VALUES (@fullName, @password, @roleId ${isEmail ? ', @email' : ''} ${isPhone ? ', @phone' : ''})
        `;

        const request = pool.request()
            .input('fullName', sql.NVarChar, fullName)
            .input('password', sql.NVarChar, hashedPassword)
            .input('roleId', sql.Int, customerRoleId);

        // Chỉ thêm giá trị email/phone khi có dữ liệu hợp lệ
        if (isEmail) request.input('email', sql.NVarChar, emailOrPhone);
        if (isPhone) request.input('phone', sql.NVarChar, emailOrPhone);

        // Thực hiện truy vấn chèn
        await request.query(insertQuery);

        res.json({ success: true, message: 'Đăng ký thành công!' });
    } catch (err) {
        console.error('Lỗi đăng ký:', err);
        if (err.number === 515) { // 515 là mã lỗi cho NULL không hợp lệ
            return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin!' });
        }
        res.status(500).json({ success: false, message: 'Lỗi máy chủ.' });
    }
};





module.exports = { login, register };
