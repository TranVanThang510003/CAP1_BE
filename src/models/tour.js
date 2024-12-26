module.exports = (sequelize, DataTypes) => {
    const Tour = sequelize.define('Tour', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: DataTypes.STRING, allowNull: false },
      category: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT },
      price: { type: DataTypes.FLOAT, allowNull: false },
    });
    return Tour;
  };
  