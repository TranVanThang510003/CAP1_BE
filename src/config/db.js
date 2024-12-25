const sql = require('mssql');
require('dotenv').config();
console.log('Connecting to database:', process.env.DB_DATABASE);

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: false, // Nếu dùng Azure, bạn cần đặt encrypt là true
    trustServerCertificate: true, // Dùng khi kết nối cục bộ
   charset: 'utf8' 
  },
};

const connectToDB = async () => {
  try {
    const pool = await sql.connect(config);
    console.log('Kết nối thành công đến SQL Server!');
    return pool;
  } catch (error) {
    console.error('Lỗi khi kết nối đến SQL Server:', error);
    throw error;
  }
};

module.exports = {connectToDB };