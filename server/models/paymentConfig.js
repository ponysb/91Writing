const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentConfig = sequelize.define('PaymentConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '支付渠道名称'
  },
  code: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '支付渠道代码'
  },
  config: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '支付配置信息（JSON格式）'
  },
  status: {
    type: DataTypes.TINYINT,
    allowNull: false,
    defaultValue: 0,
    comment: '状态：1-启用，0-禁用'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '排序权重'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '支付渠道描述'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'payment_configs',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  comment: '支付配置表'
});

module.exports = PaymentConfig;