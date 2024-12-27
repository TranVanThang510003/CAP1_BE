const { Sequelize, DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

// Định nghĩa các models
const User = require('./user')(sequelize, DataTypes);
const Question = require('./question')(sequelize, DataTypes);
const UserAnswer = require('./userAnswer')(sequelize, DataTypes);
const Tour = require('./tour')(sequelize, DataTypes);
const TourPreference = require('./tourPreference')(sequelize, DataTypes);

// Nếu có liên kết giữa các models, thiết lập tại đây
User.hasMany(Tour, { foreignKey: 'userId' });
Tour.belongsTo(User, { foreignKey: 'userId' });

const db = {
  sequelize,
  Sequelize,
  User,
  Question,
  UserAnswer,
  Tour,
  TourPreference,
};

module.exports = db;
