module.exports = (sequelize, DataTypes) => {
    const TourPreference = sequelize.define('TourPreference', {
      PREFERENCE_ID: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      USER_ID: { type: DataTypes.INTEGER, allowNull: false },
      PREFERENCE_NAME: { type: DataTypes.STRING, allowNull: false },
    });
  
    return TourPreference;
  };
  