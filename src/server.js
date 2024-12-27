const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan'); // Ghi log các request
const bodyParser = require('body-parser'); // Parse body JSON
const { errorHandler, notFoundHandler } = require('../src/middlewares/errorHandler.js'); // Middleware xử lý lỗi
const { connectToDB } = require('../src/config/db'); // Kết nối Sequelize
const db = require('./models'); // Import models

const app = express();
const port = process.env.PORT || 3000;
const hostname = process.env.HOST_NAME || 'localhost';

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

// Kết nối cơ sở dữ liệu và đồng bộ models
(async () => {
  try {
    await connectToDB();
    console.log('Kết nối cơ sở dữ liệu thành công!');

    await db.sequelize.sync(); // Đồng bộ models với cơ sở dữ liệu
    console.log('Database connected and synced!');

    // Định nghĩa routes sau khi kết nối thành công
    const answerRoutes = require('./routes/answerRoutes');
    const tourRoutes = require('./routes/tourRoutes');
    const apiRoutes = require('../src/routes/index');

    app.use('/api/answers', answerRoutes);
    app.use('/api/tours', tourRoutes);
    app.use('/api', apiRoutes);

    // Middleware xử lý route không tồn tại
    app.use(notFoundHandler);

    // Middleware xử lý lỗi
    app.use(errorHandler);

    // Khởi động server
    app.listen(port, hostname, () => {
      console.log(`Server đang chạy tại http://${hostname}:${port}`);
    });
  } catch (err) {
    console.error('Không thể khởi động server:', err.message);
    process.exit(1);
  }
})();
