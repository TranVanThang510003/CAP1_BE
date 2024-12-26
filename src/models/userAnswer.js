module.exports = (sequelize, DataTypes) => {
    const UserAnswer = sequelize.define('UserAnswer', {
      ANSWER_ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      USER_ID: { type: DataTypes.INTEGER, allowNull: false },
      QUESTION_ID: { type: DataTypes.INTEGER, allowNull: false },
      ANSWER_NAME: { type: DataTypes.STRING, allowNull: false },
    });
  
    return UserAnswer;
  };
  