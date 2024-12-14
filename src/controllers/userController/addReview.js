const sql = require('mssql');
const path = require('path');
const fs = require('fs');
const { connectToDB } = require('../../config/db');

const addReview = async (req) => {
    let transaction = null; // Khởi tạo transaction
    try {
        // Parse dữ liệu đánh giá từ body
        const reviewData = JSON.parse(req.body.reviewData);
        const { tourId, userId, rating, comments, reviewDate } = reviewData;
        const bookingId = parseInt(reviewData.bookingId, 10);

        // Debug dữ liệu nhận được
        console.log("Review Data Received:", reviewData);
        console.log("Parsed Images:", req.files?.newImages);

        // Kiểm tra dữ liệu đầu vào
        if (
            typeof bookingId !== 'number' || bookingId <= 0 ||
            typeof tourId !== 'number' || tourId <= 0 ||
            typeof userId !== 'number' || userId <= 0 ||
            typeof rating !== 'number' || rating < 1 || rating > 5 ||
            !comments || typeof comments !== 'string' || !reviewDate
        ) {
            console.log("Invalid Data:", { bookingId, tourId, userId, rating, comments, reviewDate });
            throw new Error('Dữ liệu đánh giá không hợp lệ');
        }

        // Lấy danh sách ảnh từ multer
        const images = req.files?.newImages || [];
        const pool = await connectToDB();
        transaction = pool.transaction();
        await transaction.begin();

        // Kiểm tra xem người dùng đã đánh giá `Booking_ID` chưa
        const existingReview = await transaction.request()
            .input('bookingId', sql.Int, bookingId)
            .query(`
                SELECT REVIEW_ID
                FROM [TRIPGO1].[dbo].[TOUR_REVIEWS]
                WHERE BOOKING_ID = @bookingId;
            `);

        if (existingReview.recordset.length > 0) {
            // Nếu đã tồn tại đánh giá, cập nhật đánh giá cũ
            const reviewId = existingReview.recordset[0].REVIEW_ID;

            console.log(`Updating existing review with ID: ${reviewId}`);

            // Xóa ảnh cũ trong bảng `TOUR_REVIEW_IMAGES`
            const oldImages = await transaction.request()
                .input('reviewId', sql.Int, reviewId)
                .query(`
                    SELECT IMAGE_URL
                    FROM [TRIPGO1].[dbo].[TOUR_REVIEW_IMAGES]
                    WHERE REVIEW_ID = @reviewId;
                `);

            // Xóa các file ảnh trên hệ thống tệp
            oldImages.recordset.forEach(({ IMAGE_URL }) => {
                const filePath = path.resolve(process.cwd(), IMAGE_URL);
                fs.unlink(filePath, (err) => {
                    if (err) {
                        console.error(`Error deleting file ${filePath}:`, err);
                    } else {
                        console.log(`Deleted file: ${filePath}`);
                    }
                });
            });

            // Xóa các bản ghi ảnh cũ trong cơ sở dữ liệu
            await transaction.request()
                .input('reviewId', sql.Int, reviewId)
                .query(`
                    DELETE FROM [TRIPGO1].[dbo].[TOUR_REVIEW_IMAGES]
                    WHERE REVIEW_ID = @reviewId;
                `);

            // Cập nhật đánh giá
            await transaction.request()
                .input('rating', sql.Int, rating)
                .input('comments', sql.NVarChar, comments)
                .input('reviewDate', sql.DateTime, reviewDate)
                .input('reviewId', sql.Int, reviewId)
                .query(`
                    UPDATE [TRIPGO1].[dbo].[TOUR_REVIEWS]
                    SET RATING = @rating, COMMENTS = @comments, REVIEW_DATE = @reviewDate
                    WHERE REVIEW_ID = @reviewId;
                `);

            // Thêm ảnh mới
            if (images.length > 0) {
                for (const image of images) {
                    const relativePath = image.path ? path.relative(process.cwd(), image.path) : null;
                    if (!relativePath) continue;

                    await transaction.request()
                        .input('reviewId', sql.Int, reviewId)
                        .input('imageUrl', sql.NVarChar, relativePath)
                        .query(`
                            INSERT INTO [TRIPGO1].[dbo].[TOUR_REVIEW_IMAGES]
                                ([REVIEW_ID], [IMAGE_URL])
                            VALUES (@reviewId, @imageUrl);
                        `);
                }
            }
        } else {
            // Nếu chưa tồn tại đánh giá, thêm mới
            const reviewResult = await transaction.request()
                .input('bookingId', sql.Int, bookingId)
                .input('tourId', sql.Int, tourId)
                .input('userId', sql.Int, userId)
                .input('rating', sql.Int, rating)
                .input('comments', sql.NVarChar, comments)
                .input('reviewDate', sql.DateTime, reviewDate)
                .query(`
                    INSERT INTO [TRIPGO1].[dbo].[TOUR_REVIEWS]
                    ([BOOKING_ID], [TOUR_ID], [USER_ID], [RATING], [COMMENTS], [REVIEW_DATE])
                        OUTPUT INSERTED.REVIEW_ID
                    VALUES (@bookingId, @tourId, @userId, @rating, @comments, @reviewDate);
                `);

            const reviewId = reviewResult.recordset[0].REVIEW_ID;
            console.log(`Inserted new review with ID: ${reviewId}`);

            // Thêm ảnh mới
            if (images.length > 0) {
                for (const image of images) {
                    const relativePath = image.path ? path.relative(process.cwd(), image.path) : null;
                    if (!relativePath) continue;

                    await transaction.request()
                        .input('reviewId', sql.Int, reviewId)
                        .input('imageUrl', sql.NVarChar, relativePath)
                        .query(`
                            INSERT INTO [TRIPGO1].[dbo].[TOUR_REVIEW_IMAGES]
                                ([REVIEW_ID], [IMAGE_URL])
                            VALUES (@reviewId, @imageUrl);
                        `);
                }
            }
        }

        // Commit transaction sau khi hoàn thành
        await transaction.commit();

        return { message: 'Đánh giá và ảnh đã được lưu thành công!' };
    } catch (error) {
        console.error('Lỗi khi thêm đánh giá và ảnh:', error);

        // Rollback nếu có lỗi
        if (transaction) await transaction.rollback();
        throw error;
    }
};

module.exports = addReview;
