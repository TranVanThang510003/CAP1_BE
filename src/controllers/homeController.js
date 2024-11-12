const { connectToDB } = require('../config/db');

// Lấy các đề xuất điểm đến cho trang chủ
export const getDestinationSuggestions = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM [LOCATION]');
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Lấy danh sách các ưu đãi đặc biệt
export const getSpecialOffers = async (req, res) => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT * FROM [VOUCHER] WHERE IS_ACTIVE = 1');
    res.status(200).json(result.recordset);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};