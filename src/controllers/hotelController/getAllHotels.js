const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const getAllHotels = async (req, res) => {
    try {
        const pool = await connectToDB();

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
                STUFF((
                          SELECT ', ' + HI.IMAGE_URL
                          FROM HOTEL_IMAGES HI
                          WHERE HI.HOTEL_ID = H.HOTEL_ID
                          FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)')
                , 1, 2, '') AS IMAGE_URLS,
                MIN(BT.PRICE) AS MIN_PRICE
            FROM
                HOTEL H
                    LEFT JOIN ROOM_TYPE RT ON H.HOTEL_ID = RT.HOTEL_ID
                    LEFT JOIN BED_TYPES BT ON RT.ROOM_TYPE_ID = BT.ROOM_TYPE_ID
            GROUP BY
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
                H.LAST_UPDATED;
        `;

        const result = await pool.request().query(query);

        res.status(200).json({
            message: 'Danh sách khách sạn',
            data: result.recordset,
        });
    } catch (error) {
        console.error('Lỗi khi lấy thông tin khách sạn:', error);
        res.status(500).json({ message: 'Lỗi khi lấy thông tin khách sạn', error: error.message });
    }
};

module.exports = getAllHotels;
