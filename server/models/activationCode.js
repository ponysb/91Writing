const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ActivationCode = sequelize.define('ActivationCode', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '激活码ID'
  },
  code: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
    comment: '激活码'
  },
  package_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联套餐ID'
  },
  batch_id: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '批次ID（用于批量生成）'
  },
  status: {
    type: DataTypes.ENUM('unused', 'used', 'expired', 'disabled'),
    defaultValue: 'unused',
    comment: '激活码状态'
  },
  used_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '使用者用户ID'
  },
  used_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '使用时间'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '过期时间'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '创建者ID'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注信息'
  },
  usage_ip: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: '使用时的IP地址'
  },
  usage_user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '使用时的用户代理'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '创建时间'
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '更新时间'
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '删除时间'
  }
}, {
  tableName: 'activation_codes',
  paranoid: true,
  indexes: [
    {
      fields: ['package_id', 'status']
    },
    {
      fields: ['batch_id']
    },
    {
      fields: ['expires_at']
    }
  ]
});

module.exports = ActivationCode;