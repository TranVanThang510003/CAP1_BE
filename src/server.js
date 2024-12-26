const express = require('express');
const apiRoutes = require('../src/routes/index');
require('dotenv').config();
const cors = require('cors');
const path = require('path');
const morgan = require('morgan'); // Ghi log các request
const bodyParser = require('body-parser'); // Parse body JSON
const { errorHandler, notFoundHandler } = require('../src/middlewares/errorHandler.js'); // Middleware xử lý lỗi
const { connectToDB } = require('../src/config/db.js'); // Kết nối SQL Server

// Import các route và model mới
const db = require('./models');
const answerRoutes = require('./routes/answerRoutes');
const tourRoutes = require('./routes/tourRoutes');

const app = express();
const port = process.env.PORT || 3000;
const hostname = process.env.HOST_NAME || 'localhost';

// Kết nối cơ sở dữ liệu
connectToDB()
  .then(() => {
    console.log('Kết nối SQL Server thành công!');
    // Chỉ khởi động server sau khi kết nối DB thành công
    app.listen(port, hostname, () => {
      console.log(`Server đang chạy tại http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error('Không thể kết nối cơ sở dữ liệu:', err.message);
    process.exit(1); // Thoát nếu không kết nối được
  });

// Middleware ghi log các request
app.use(morgan('dev'));

// Cấu hình middleware để parse JSON từ request body
app.use(express.json());
app.use(bodyParser.json()); // body-parser middleware

// Cấu hình CORS
app.use(cors());

// Cấu hình để phục vụ các tệp tĩnh từ thư mục public
app.use('/uploads', express.static('uploads'));
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Thêm route API mới
app.use('/api/answers', answerRoutes);
app.use('/api/tours', tourRoutes);

// Middleware xử lý route không tồn tại
app.use(notFoundHandler);

// Middleware xử lý lỗi
app.use(errorHandler);

// Sync database từ Sequelize
db.sequelize.sync().then(() => {
  console.log('Database connected and synced');
});
