module.exports = (sequelize, DataTypes) => {
    const TourPreference = sequelize.define('TourPreference', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tourId: { type: DataTypes.INTEGER, allowNull: false },
      preference: { type: DataTypes.STRING, allowNull: false },
    });
    return TourPreference;
  };
  