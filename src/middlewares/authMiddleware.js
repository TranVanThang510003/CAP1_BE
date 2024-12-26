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
  
  module.exports = { verifyStaffRole , authenticateUser };
  
  const jwt = require('jsonwebtoken');

  exports.authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
  
    if (!token) {
      return res.status(401).json({ message: 'Access token required' });
    }
  
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid token' });
      }
      req.user = user;
      next();
    });
  };
  
