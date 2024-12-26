module.exports = (sequelize, DataTypes) => {
    const Question = sequelize.define('Question', {
      QUESTION_ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      QUESTION_NAME: { type: DataTypes.STRING, allowNull: false },
    });
  
    return Question;
  };
  