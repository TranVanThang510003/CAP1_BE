const sql = require('mssql');
const { connectToDB } = require('../../config/db');

const getHotelDetails = async (req, res) => {
    const { hotelId } = req.params;

    try {
        const pool = await connectToDB();

        if (!hotelId) {
            return res.status(400).json({ message: 'Thiếu hotelId trong request.' });
        }

        // Truy vấn SQL để lấy dữ liệu phòng, giường và tiện nghi
        const query = `
            SELECT
                H.HOTEL_ID,
                H.HOTEL_NAME,
                H.DESCRIPTION,
                H.ADDRESS,
                H.PROVINCE,
                H.DISTRICT,
                H.WARD,
                H.HOTEL_TYPE,
                HI.IMAGE_URL AS HOTEL_IMAGE,
                RT.ROOM_TYPE_ID,
                RT.ROOM_NAME,
                RI.IMAGE_URL AS ROOM_IMAGE,
                BT.PRICE,
                BT.ROOM_SIZE,
                BT.BED_QUANTITY,
                BTM.BED_TYPE_NAME,
                RA.AMENITY_NAME
            FROM HOTEL H
                     LEFT JOIN HOTEL_IMAGES HI ON H.HOTEL_ID = HI.HOTEL_ID
                     LEFT JOIN ROOM_TYPE RT ON H.HOTEL_ID = RT.HOTEL_ID
                     LEFT JOIN ROOM_IMAGES RI ON RT.ROOM_TYPE_ID = RI.ROOM_TYPE_ID
                     LEFT JOIN BED_TYPES BT ON RT.ROOM_TYPE_ID = BT.ROOM_TYPE_ID
                     LEFT JOIN BED_TYPE_MASTER BTM ON BT.BED_TYPE_MASTER_ID = BTM.BED_TYPE_ID
                     LEFT JOIN ROOM_AMENITIES RA ON RT.ROOM_TYPE_ID = RA.ROOM_TYPE_ID
            WHERE H.HOTEL_ID = @hotelId;
        `;

        const result = await pool.request()
            .input('hotelId', sql.Int, hotelId)
            .query(query);

        const rows = result.recordset;

        if (!rows.length) {
            return res.status(404).json({ message: 'Không tìm thấy khách sạn!' });
        }

        // Tổ chức dữ liệu khách sạn
        const hotelInfo = {
            hotelId: rows[0].HOTEL_ID,
            name: rows[0].HOTEL_NAME,
            description: rows[0].DESCRIPTION,
            address: `${rows[0].ADDRESS}, ${rows[0].WARD}, ${rows[0].DISTRICT}, ${rows[0].PROVINCE}`,
            hotelType: rows[0].HOTEL_TYPE,
            images: [...new Set(rows.map(row => row.HOTEL_IMAGE))].filter(Boolean),
            rooms: [],
        };

        // Nhóm dữ liệu theo phòng và giường
        const roomMap = new Map();

        rows.forEach(row => {
            if (!roomMap.has(row.ROOM_TYPE_ID)) {
                roomMap.set(row.ROOM_TYPE_ID, {
                    roomTypeId: row.ROOM_TYPE_ID,
                    roomName: row.ROOM_NAME,
                    images: [],
                    beds: [],
                    amenities: [], // Tiện nghi chung cho phòng
                });
            }

            const room = roomMap.get(row.ROOM_TYPE_ID);

            // Thêm ảnh phòng
            if (row.ROOM_IMAGE && !room.images.includes(row.ROOM_IMAGE)) {
                room.images.push(row.ROOM_IMAGE);
            }

            // Thêm tiện nghi cho phòng (lọc trùng lặp)
            if (row.AMENITY_NAME && !room.amenities.includes(row.AMENITY_NAME)) {
                room.amenities.push(row.AMENITY_NAME);
            }

            // Thêm giường vào phòng
            let bed = room.beds.find(b =>
                b.bedTypeName === row.BED_TYPE_NAME &&
                b.price === row.PRICE &&
                b.roomSize === row.ROOM_SIZE
            );

            if (!bed && row.BED_TYPE_NAME) {
                bed = {
                    bedTypeName: row.BED_TYPE_NAME,
                    roomSize: row.ROOM_SIZE,
                    price: row.PRICE,
                    bedQuantity: row.BED_QUANTITY,
                };
                room.beds.push(bed);
            }
        });

        hotelInfo.rooms = Array.from(roomMap.values());

        res.status(200).json({
            message: 'Thông tin chi tiết khách sạn',
            data: hotelInfo
        });

    } catch (error) {
        console.error('Lỗi khi lấy thông tin chi tiết khách sạn:', error.message);
        res.status(500).json({ message: 'Lỗi khi lấy thông tin chi tiết khách sạn.', error: error.message });
    }
};

module.exports = getHotelDetails;
