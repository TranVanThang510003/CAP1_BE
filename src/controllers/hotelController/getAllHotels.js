const sql = require('mssql');
const { connectToDB } = require('../../config/db');
const getAllHotels = async (req, res) => {
    try {
        // Kết nối đến database
        const pool = await connectToDB();

        // Truy vấn để lấy tất cả thông tin khách sạn và kết hợp với các bảng liên quan
        const query = `
            SELECT 
                H.HOTEL_ID,
                H.HOTEL_NAME,
                H.HOTEL_TYPE,
                H.DESCRIPTION,
                H.ADDRESS,
                H.PROVINCE,
                H.DISTRICT,
                H.WARD,
                H.CREATED_BY,
                H.CREATED_AT,
                H.LAST_UPDATED,
               
                -- Lấy hình ảnh kết hợp bằng GROUP_CONCAT
                STUFF((
                    SELECT ', ' + HI.IMAGE_URL
                    FROM HOTEL_IMAGES HI
                    WHERE HI.HOTEL_ID = H.HOTEL_ID
                    FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)')
                , 1, 2, '') AS IMAGE_URLS
              
            FROM HOTEL H
        `;

        const result = await pool.request().query(query);

        // Trả về kết quả
        res.status(200).json({
            message: 'Danh sách khách sạn',
            data: result.recordset,
        });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin khách sạn:', error);
        res.status(500).json({ message: 'Lỗi khi lấy thông tin khách sạn', error: error.message });
    }
};

module.exports= getAllHotels;
