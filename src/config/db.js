const { Sequelize } = require('sequelize');
require('dotenv').config();

console.log('Connecting to database:', process.env.DB_DATABASE);

const sequelize = new Sequelize(process.env.DB_DATABASE, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_SERVER,
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: false, // Nếu dùng Azure, đặt true
      trustServerCertificate: true, // Nếu kết nối cục bộ
    },
  },
  logging: console.log, // Log các truy vấn SQL (tắt nếu không cần)
});

const connectToDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Kết nối thành công đến SQL Server!');
  } catch (error) {
    console.error('Lỗi khi kết nối đến SQL Server:', error.message || error);
    throw error;
  }
};

module.exports = { sequelize, connectToDB };
