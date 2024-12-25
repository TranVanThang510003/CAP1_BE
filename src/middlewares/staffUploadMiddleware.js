const multer = require('multer');
const path = require('path');

// Định nghĩa nơi lưu trữ file
const staffStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Đường dẫn riêng cho file liên quan đến staff
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname}`); // Đặt tên file duy nhất
    },
});

// Bộ lọc định dạng file
const staffFileFilter = (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Chỉ chấp nhận định dạng ảnh (JPEG, PNG, GIF)'), false);
    }
};

// Cấu hình Multer cho staff requests
const staffUpload = multer({
    storage: staffStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn kích thước file: 5MB
    fileFilter: staffFileFilter,
});

module.exports = {
    staffUploadMiddleware: staffUpload.fields([
        { name: 'cmnd', maxCount: 1 }, // Chỉ 1 ảnh cho CMND/CCCD
        { name: 'certificate', maxCount: 1 }, // Chỉ 1 ảnh cho giấy phép kinh doanh
    ]),
};
