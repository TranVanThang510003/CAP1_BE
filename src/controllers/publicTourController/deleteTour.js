const sql = require('mssql');
const { connectToDB } = require('../../config/db');


const deleteTour = async (req, res) => {
    console.log('Delete request received for TOUR_ID:', req.params.id);

    const { id } = req.params;

    try {
        const pool = await connectToDB();

        // Kiểm tra tour có tồn tại
        const tour = await pool
            .request()
            .input('TOUR_ID', sql.Int, id)
            .query('SELECT * FROM TOUR WHERE TOUR_ID = @TOUR_ID');
        console.log('Tour found:', tour.recordset);

        if (!tour.recordset.length) {
            return res.status(404).json({ message: 'Tour không tồn tại.' });
        }

        // Xóa dữ liệu liên quan
        console.log('Deleting related data...');
        await pool.request().input('TOUR_ID', sql.Int, id).query(`
      DELETE FROM DAILY_SCHEDULES WHERE TOUR_ID = @TOUR_ID;
      DELETE FROM MULTI_DAY_SCHEDULES WHERE TOUR_ID = @TOUR_ID;
      DELETE FROM TOUR_SCHEDULE WHERE TOUR_ID = @TOUR_ID;
      DELETE FROM TOUR_IMAGES WHERE TOUR_ID = @TOUR_ID;
    `);

        // Xóa tour chính
        console.log('Deleting main tour...');
        await pool
            .request()
            .input('TOUR_ID', sql.Int, id)
            .query('DELETE FROM TOUR WHERE TOUR_ID = @TOUR_ID');

        return res.status(200).json({ message: 'Xóa tour thành công.' });
    } catch (error) {
        console.error('Error deleting tour:', error);
        return res.status(500).json({
            message: 'Có lỗi xảy ra khi xóa tour.',
            error: error.message,
        });
    }
};


module.exports =deleteTour;
