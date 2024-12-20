const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const getAllRoom = async (req, res) => {
    try {
        // Kết nối tới database
        const pool = await connectToDB();
        const hotelId = req.params.hotelId;

        if (!hotelId) {
            return res.status(400).json({ message: 'Thiếu hotelId trong request.' });
        }

        // Truy vấn SQL để lấy thông tin chi tiết
        const query = `
            SELECT
                RT.ROOM_NAME,
                RT.ROOM_TYPE_ID, -- Phân biệt phòng
                BT.ROOM_SIZE,
                BT.PRICE,
                BT.BED_TYPE_MASTER_ID,
                BTM.BED_TYPE_NAME,
                BT.BED_QUANTITY,
                RA.AMENITY_NAME, -- Tiện nghi phòng
                RI.IMAGE_URL
            FROM ROOM_TYPE RT
                     LEFT JOIN BED_TYPES BT ON RT.ROOM_TYPE_ID = BT.ROOM_TYPE_ID
                     LEFT JOIN BED_TYPE_MASTER BTM ON BT.BED_TYPE_MASTER_ID = BTM.BED_TYPE_ID
                     LEFT JOIN ROOM_AMENITIES RA ON RT.ROOM_TYPE_ID = RA.ROOM_TYPE_ID
                     LEFT JOIN ROOM_IMAGES RI ON RT.ROOM_TYPE_ID = RI.ROOM_TYPE_ID
            WHERE RT.HOTEL_ID = @hotelId;
        `;

        const result = await pool.request()
            .input('hotelId', sql.Int, hotelId)
            .query(query);

        const rows = result.recordset;

        // Tổ chức dữ liệu thành cấu trúc JSON mong muốn
        const rooms = rows.reduce((acc, row) => {
            // Tìm phòng đã tồn tại trong kết quả
            let room = acc.find(r => r.ROOM_TYPE_ID === row.ROOM_TYPE_ID);

            if (!room) {
                room = {
                    ROOM_NAME: row.ROOM_NAME,
                    ROOM_TYPE_ID: row.ROOM_TYPE_ID,
                    IMAGES: [],
                    BEDS: [],
                    AMENITIES: [] // Tiện nghi của phòng
                };
                acc.push(room);
            }

            // Thêm ảnh vào IMAGES nếu chưa có
            if (row.IMAGE_URL && !room.IMAGES.includes(row.IMAGE_URL)) {
                room.IMAGES.push(row.IMAGE_URL);
            }

            // Thêm tiện nghi vào AMENITIES của phòng
            if (row.AMENITY_NAME && !room.AMENITIES.includes(row.AMENITY_NAME)) {
                room.AMENITIES.push(row.AMENITY_NAME);
            }

            // Tìm giường trong mảng BEDS
            let bed = room.BEDS.find(b =>
                b.BED_TYPE_NAME === row.BED_TYPE_NAME &&
                b.ROOM_SIZE === row.ROOM_SIZE &&
                b.PRICE === row.PRICE
            );

            if (!bed && row.BED_TYPE_NAME) {
                bed = {
                    BED_TYPE_MASTER_ID: row.BED_TYPE_MASTER_ID,
                    BED_TYPE_NAME: row.BED_TYPE_NAME,
                    BED_QUANTITY: row.BED_QUANTITY,
                    ROOM_SIZE: row.ROOM_SIZE,
                    PRICE: row.PRICE
                };
                room.BEDS.push(bed);
            }

            return acc;
        }, []);

        const formattedRooms = rooms;

        // Trả về kết quả
        res.status(200).json({
            message: 'Danh sách phòng',
            data: formattedRooms
        });

    } catch (error) {
        console.error('Lỗi khi lấy thông tin phòng:', error);
        res.status(500).json({ message: 'Lỗi khi lấy thông tin phòng', error: error.message });
    }
};

module.exports = getAllRoom;
