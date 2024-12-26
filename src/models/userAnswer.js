module.exports = (sequelize, DataTypes) => {
    const UserAnswer = sequelize.define('UserAnswer', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: DataTypes.INTEGER, allowNull: false },
      questionId: { type: DataTypes.INTEGER, allowNull: false },
      answer: { type: DataTypes.STRING, allowNull: false },
    });
    return UserAnswer;
  };
  