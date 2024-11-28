const multer = require('multer');
const path = require('path');

// Định nghĩa nơi lưu trữ file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Đường dẫn lưu ảnh
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}-${file.originalname}`); // Đặt tên file duy nhất
  },
});

// Bộ lọc định dạng file
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Chỉ chấp nhận định dạng ảnh (JPEG, PNG, GIF)'), false);
  }
};

// Cấu hình Multer
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn kích thước file: 5MB
  fileFilter: fileFilter,
});

module.exports = {
  singleUpload: upload.single('IMAGE'),
  multipleUpload: upload.fields([
    { name: 'newImages', maxCount: 10 }, // Đổi từ 'newImages[]' thành 'newImages'
    { name: 'existingImages', maxCount: 10 }, // Đổi từ 'existingImages[]' thành 'existingImages'
  ]),
};
