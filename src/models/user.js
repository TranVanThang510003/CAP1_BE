module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
      USER_ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      USERNAME: { type: DataTypes.STRING, allowNull: false },
      EMAIL: { type: DataTypes.STRING },
      PASSWORD: { type: DataTypes.STRING, allowNull: false },
    });
  
    return User;
  };
  