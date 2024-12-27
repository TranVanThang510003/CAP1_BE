module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      USER_ID: { 
        type: DataTypes.INTEGER, 
        primaryKey: true, 
        autoIncrement: true 
      },
      USERNAME: { 
        type: DataTypes.STRING(100), // Giới hạn độ dài như trong DB
        allowNull: false 
      },
      EMAIL: { 
        type: DataTypes.STRING(100), // Giới hạn độ dài như trong DB
        allowNull: true 
      },
      PHONE: { 
        type: DataTypes.STRING(15), // Giới hạn độ dài như trong DB
        allowNull: true 
      },
      JOIN_DATE: { 
        type: DataTypes.DATE, 
        allowNull: true,
        defaultValue: DataTypes.NOW // Giá trị mặc định là ngày hiện tại
      },
      PASSWORD: { 
        type: DataTypes.STRING(255), // Giới hạn độ dài như trong DB
        allowNull: false 
      },
      ADDRESS: { 
        type: DataTypes.STRING(255), 
        allowNull: true 
      },
      BIRTHDAY: { 
        type: DataTypes.DATE, 
        allowNull: true 
      },
      role_id: { 
        type: DataTypes.INTEGER, 
        allowNull: true 
      },
    },
    {
      tableName: 'USERS', // Đặt tên bảng như trong DB
      timestamps: false, // Không sử dụng `createdAt` và `updatedAt` vì bảng không có cột này
    }
  );

  // Thiết lập quan hệ nếu có
  User.associate = (models) => {
    User.belongsTo(models.Role, {
      foreignKey: 'role_id',
      as: 'role', // Alias để gọi trong query
    });

    User.hasMany(models.Answer, {
      foreignKey: 'USER_ID',
      as: 'answers', // Alias để gọi trong query
    });

    User.hasMany(models.Favorites, {
      foreignKey: 'user_id',
      as: 'favorites',
    });

    User.hasMany(models.TourBooking, {
      foreignKey: 'USER_ID',
      as: 'tourBookings',
    });

    User.hasMany(models.HotelBooking, {
      foreignKey: 'USER_ID',
      as: 'hotelBookings',
    });
  };

  return User;
};
