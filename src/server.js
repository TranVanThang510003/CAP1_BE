const express = require('express');
const apiRoutes = require('../src/routes/api');
require('dotenv').config();
const cors = require('cors');
const path = require('path');


const app = express();
const port = process.env.PORT || 3000;
const hostname = process.env.HOST_NAME || 'localhost';


// Cấu hình middleware để parse JSON từ request body
app.use(express.json());
app.use('/uploads', express.static('uploads'));
// Cấu hình CORS
app.use(cors());

// Cấu hình để phục vụ các tệp tĩnh từ thư mục public
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Sử dụng route API
app.use('', apiRoutes);



// Khởi tạo server
app.listen(port, hostname, () => {
  console.log(`Server đang chạy tại http://${hostname}:${port}`);
});
