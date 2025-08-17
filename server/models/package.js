const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Package = sequelize.define('Package', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '套餐ID'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '套餐名称'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '套餐描述'
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '积分数量'
  },
  validity_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '有效期天数'
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '套餐价格'
  },
  original_price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: '原价'
  },
  discount: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: '折扣（0-1之间）'
  },
  type: {
    type: DataTypes.ENUM('basic', 'premium', 'vip', 'enterprise'),
    defaultValue: 'basic',
    comment: '套餐类型'
  },
  features: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '套餐特性（JSON格式）'
  },
  max_activations: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '最大激活次数限制（null表示无限制）'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'discontinued'),
    defaultValue: 'active',
    comment: '套餐状态'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序顺序'
  },
  is_popular: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否热门套餐'
  },
  weight: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: '套餐权重（用于确定会员等级优先级，数值越大优先级越高）'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  },
  is_recommended: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否推荐套餐'
  },
  discount_percentage: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '折扣百分比'
  },
  icon: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '套餐图标'
  },
  badge: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '套餐标签'
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
  tableName: 'packages',
  paranoid: true,
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['type']
    },
    {
      fields: ['sort_order']
    }
  ]
});

module.exports = Package;