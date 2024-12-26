module.exports = (sequelize, DataTypes) => {
    const Question = sequelize.define('Question', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      content: { type: DataTypes.STRING, allowNull: false },
    });
    return Question;
  };
  