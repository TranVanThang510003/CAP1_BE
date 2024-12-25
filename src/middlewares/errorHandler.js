const fs = require('fs');
const path = require('path');

/**
 * Ghi log lỗi vào file và hiển thị trên console.
 * @param {Error} err - Đối tượng lỗi cần ghi log.
 * @param {Object} [req] - Yêu cầu HTTP (tuỳ chọn để ghi thêm thông tin về request).
 */
const logError = (err, req = null) => {
    const logDir = path.join(__dirname, '..', 'logs'); // Thư mục chứa logs
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir); // Tạo thư mục logs nếu chưa tồn tại
    }

    const logFile = path.join(logDir, `${new Date().toISOString().split('T')[0]}.log`); // File log theo ngày
    const logMessage = `
${new Date().toISOString()} - ${err.name || 'Error'}: ${err.message}
Method: ${req?.method || 'N/A'}
URL: ${req?.originalUrl || 'N/A'}
Headers: ${req ? JSON.stringify(req.headers) : 'N/A'}
Body: ${req ? JSON.stringify(req.body) : 'N/A'}
Stack Trace: ${err.stack || 'No stack trace'}
\n`;

    // Log trên console
    console.error(logMessage);

    // Ghi log vào file
    fs.appendFile(logFile, logMessage, (fileErr) => {
        if (fileErr) {
            console.error('Failed to write to log file:', fileErr.message);
        }
    });
};

/**
 * Middleware xử lý lỗi chung cho ứng dụng Express.
 * @param {Error} err - Đối tượng lỗi được truyền từ các middleware khác.
 * @param {Object} req - Đối tượng yêu cầu HTTP của Express.
 * @param {Object} res - Đối tượng phản hồi HTTP của Express.
 * @param {Function} next - Hàm gọi middleware tiếp theo (không sử dụng ở đây).
 */
const errorHandler = (err, req, res, next) => {
    // Ghi log lỗi
    logError(err, req);

    // Xác định mã trạng thái HTTP
    const statusCode = err.status || 500;

    // Phản hồi JSON tới client
    const errorResponse = {
        success: false,
        error: {
            name: err.name || 'InternalServerError',
            message: err.isOperational
                ? err.message
                : 'An unexpected error occurred. Please try again later.',
        },
    };

    // Đính kèm stack trace trong môi trường không phải production
    if (process.env.NODE_ENV !== 'production') {
        errorResponse.error.stack = err.stack;
    }

    res.status(statusCode).json(errorResponse);
};

/**
 * Middleware xử lý route không tồn tại.
 * @param {Object} req - Đối tượng yêu cầu HTTP của Express.
 * @param {Object} res - Đối tượng phản hồi HTTP của Express.
 * @param {Function} next - Hàm gọi middleware tiếp theo.
 */
const notFoundHandler = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    error.status = 404;
    error.isOperational = true; // Đánh dấu là lỗi có thể đoán trước
    next(error); // Chuyển lỗi tới errorHandler
};

/**
 * Middleware bắt lỗi promise bị từ chối mà không được xử lý.
 */
const handleUnhandledRejections = () => {
    process.on('unhandledRejection', (reason, promise) => {
        const err = new Error('Unhandled Rejection');
        err.message = reason instanceof Error ? reason.message : JSON.stringify(reason);
        err.stack = reason instanceof Error ? reason.stack : 'No stack trace available';
        logError(err);
    });
};

/**
 * Middleware bắt lỗi exception chưa được xử lý.
 */
const handleUncaughtExceptions = () => {
    process.on('uncaughtException', (err) => {
        logError(err);
        console.error('Uncaught Exception! Shutting down...');
        process.exit(1); // Dừng ứng dụng để đảm bảo an toàn
    });
};

module.exports = {
    errorHandler,
    notFoundHandler,
    handleUnhandledRejections,
    handleUncaughtExceptions,
};
