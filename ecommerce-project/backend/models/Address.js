const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Address = sequelize.define('Address', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  address_line: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  landmark: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  state: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  postal_code: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('home', 'work', 'other'),
    defaultValue: 'home'
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'addresses',
  timestamps: false
});

module.exports = Address;