 const authenticateUser = (req, res, next) => {
    // Giả định có token và lấy thông tin user từ token
    const user = { id: 2, role: 'staff' }; // Thông tin giả lập cho ví dụ
    req.user = user;
    next();
  };
  
  const verifyStaffRole = (req, res, next) => {
    if (req.user && req.user.role === 'staff') {
      next();
    } else {
      res.status(403).json({ message: 'Chỉ nhân viên mới có quyền tạo tour.' });
    }
  };
  
module.exports = { verifyStaffRole , authenticateUser, };

const jwt = require('jsonwebtoken');
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'Token không tồn tại' });

  try {
    // eslint-disable-next-line no-undef
    const secret = process.env.JWT_SECRET || 'your_secret_key';
    const decoded = jwt.verify(token.split(' ')[1], secret); // Nếu Bearer token
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ message: 'Token không hợp lệ', error: error.message });
  }
};
module.exports = {authenticateToken};
  
