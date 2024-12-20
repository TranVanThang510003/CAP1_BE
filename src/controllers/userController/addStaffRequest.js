const sql = require('mssql');
const path = require('path');
const fs = require('fs');
const { connectToDB } = require('../../config/db');

const addStaffRequest = async (req) => {
    let transaction = null; // Khởi tạo transaction
    try {
        // Parse dữ liệu từ body
        const { userId, reason, phone, email } = req.body;

        // Debug dữ liệu nhận được
        console.log("Staff Request Data Received:", req.body);
        console.log("Parsed Images:", req.files);

        // Kiểm tra dữ liệu đầu vào
        if (!userId || !reason || !phone || !email) {
            console.log("Invalid Data:", { userId, reason, phone, email });
            throw new Error('Dữ liệu yêu cầu không hợp lệ');
        }

        // Lấy danh sách ảnh từ multer
        const cmndImage = req.files?.cmnd?.[0]; // Ảnh CMND/CCCD
        const certificateImage = req.files?.certificate?.[0]; // Giấy phép kinh doanh

        if (!cmndImage) {
            throw new Error('Ảnh CMND/CCCD là bắt buộc.');
        }

        const pool = await connectToDB();
        transaction = pool.transaction();
        await transaction.begin();

        // Kiểm tra xem người dùng đã gửi yêu cầu trước đó chưa
        const existingRequest = await transaction.request()
            .input('userId', sql.Int, userId)
            .query(`
                SELECT REQUEST_ID
                FROM [TRIPGO1].[dbo].[STAFF_REQUESTS]
                WHERE USER_ID = @userId;
            `);

        if (existingRequest.recordset.length > 0) {
            // Nếu đã tồn tại yêu cầu, cập nhật yêu cầu cũ
            const requestId = existingRequest.recordset[0].REQUEST_ID;

            console.log(`Updating existing request with ID: ${requestId}`);

            // Cập nhật thông tin yêu cầu
            await transaction.request()
                .input('reason', sql.NVarChar, reason)
                .input('phone', sql.NVarChar, phone)
                .input('email', sql.NVarChar, email)
                .input('updatedAt', sql.DateTime, new Date())
                .input('requestId', sql.Int, requestId)
                .query(`
                    UPDATE [TRIPGO1].[dbo].[STAFF_REQUESTS]
                    SET REASON = @reason, PHONE = @phone, EMAIL = @email, UPDATED_AT = @updatedAt
                    WHERE REQUEST_ID = @requestId;
                `);

            // Xử lý ảnh (CMND/CCCD và giấy phép kinh doanh)
            const filePathsToUpdate = {
                cmnd: cmndImage?.path ? path.relative(process.cwd(), cmndImage.path) : null,
                certificate: certificateImage?.path ? path.relative(process.cwd(), certificateImage.path) : null,
            };

            for (const [field, newPath] of Object.entries(filePathsToUpdate)) {
                if (newPath) {
                    await transaction.request()
                        .input('field', sql.NVarChar, field === 'cmnd' ? 'ID_CARD_IMAGE_URL' : 'BUSINESS_LICENSE_URL')
                        .input('newPath', sql.NVarChar, newPath)
                        .input('requestId', sql.Int, requestId)
                        .query(`
                            UPDATE [TRIPGO1].[dbo].[STAFF_REQUESTS]
                            SET ${field === 'cmnd' ? 'ID_CARD_IMAGE_URL' : 'BUSINESS_LICENSE_URL'} = @newPath
                            WHERE REQUEST_ID = @requestId;
                        `);
                }
            }
        } else {
            // Nếu chưa tồn tại yêu cầu, thêm mới
            const result = await transaction.request()
                .input('userId', sql.Int, userId)
                .input('reason', sql.NVarChar, reason)
                .input('phone', sql.NVarChar, phone)
                .input('email', sql.NVarChar, email)
                .input('cmndPath', sql.NVarChar, cmndImage?.path ? path.relative(process.cwd(), cmndImage.path) : null)
                .input('certificatePath', sql.NVarChar, certificateImage?.path ? path.relative(process.cwd(), certificateImage.path) : null)
                .query(`
                    INSERT INTO [TRIPGO1].[dbo].[STAFF_REQUESTS]
                    ([USER_ID], [ID_CARD_IMAGE_URL], [BUSINESS_LICENSE_URL], [REASON], [PHONE], [EMAIL], [STATUS])
                    VALUES (@userId, @cmndPath, @certificatePath, @reason, @phone, @email, 'pending');
                `);

            console.log(`Inserted new staff request for user ID: ${userId}`);
        }

        // Commit transaction sau khi hoàn thành
        await transaction.commit();

        return { message: 'Yêu cầu trở thành staff đã được xử lý thành công!' };
    } catch (error) {
        console.error('Lỗi khi xử lý yêu cầu trở thành staff:', error);

        // Rollback nếu có lỗi
        if (transaction) await transaction.rollback();
        throw error;
    }
};

module.exports = addStaffRequest;
