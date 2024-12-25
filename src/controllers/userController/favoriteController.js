const sql = require('mssql');
const { connectToDB } = require('../../config/db');

// Hàm thêm hoặc xóa yêu thích
const toggleFavorite = async (req, res) => {
    const { user_id, favorite_type, entity_id } = req.body;

    // Kiểm tra dữ liệu đầu vào
    if (!user_id || !favorite_type || !entity_id) {
        return res.status(400).send('Missing required fields');
    }

    try {
        // Kiểm tra xem mục này đã được yêu thích chưa
        const checkExisting = await sql.query`
            SELECT * FROM Favorites
            WHERE user_id = ${user_id} AND favorite_type = ${favorite_type} AND entity_id = ${entity_id}
        `;

        if (checkExisting.recordset.length > 0) {
            // Nếu đã có, xóa mục yêu thích
            await sql.query`
        DELETE FROM Favorites
        WHERE user_id = ${user_id} AND favorite_type = ${favorite_type} AND entity_id = ${entity_id}
      `;
            return res.status(200).send('Favorite removed successfully');
        } else {
            // Nếu chưa có, thêm vào bảng Favorite
            await sql.query`
        INSERT INTO Favorites (user_id, favorite_type, entity_id, created_at)
        VALUES (${user_id}, ${favorite_type}, ${entity_id}, GETDATE())
      `;
            return res.status(201).send('Favorite added successfully');
        }
    } catch (err) {
        console.error('Error handling favorite operation:', err);
        res.status(500).send('Server error');
    }
}

module.exports = { toggleFavorite };
