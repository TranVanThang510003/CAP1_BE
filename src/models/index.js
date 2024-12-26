const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('TRIPGO1', 'username', 'password', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Import models
db.User = require('./user')(sequelize, Sequelize);
db.Question = require('./question')(sequelize, Sequelize);
db.UserAnswer = require('./userAnswer')(sequelize, Sequelize);
db.Tour = require('./tour')(sequelize, Sequelize);
db.TourPreference = require('./tourPreference')(sequelize, Sequelize);

// Define relationships
db.User.hasMany(db.UserAnswer, { foreignKey: 'userId' });
db.UserAnswer.belongsTo(db.User, { foreignKey: 'userId' });

db.Question.hasMany(db.UserAnswer, { foreignKey: 'questionId' });
db.UserAnswer.belongsTo(db.Question, { foreignKey: 'questionId' });

db.Tour.hasMany(db.TourPreference, { foreignKey: 'tourId' });
db.TourPreference.belongsTo(db.Tour, { foreignKey: 'tourId' });

module.exports = db;
