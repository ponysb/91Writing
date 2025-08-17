const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserPackageRecord = sequelize.define('UserPackageRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '用户套餐记录ID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  package_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '套餐ID'
  },
  activation_type: {
    type: DataTypes.ENUM('recharge', 'activation_code'),
    allowNull: false,
    comment: '开通方式：充值或激活码'
  },
  activation_code_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '激活码ID（激活码开通时使用）'
  },
  order_id: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '订单ID（充值开通时使用）'
  },
  credits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '获得的调用次数'
  },
  remaining_credits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '剩余调用次数'
  },
  validity_days: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '有效期天数'
  },
  start_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '开始时间'
  },
  end_date: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '结束时间'
  },
  package_type: {
    type: DataTypes.ENUM('basic', 'premium', 'vip', 'enterprise'),
    allowNull: false,
    comment: '套餐类型'
  },
  package_weight: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    comment: '套餐权重（用于确定当前会员等级）'
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'exhausted', 'cancelled'),
    defaultValue: 'active',
    comment: '状态：激活中、已过期、已用完、已取消'
  },
  payment_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: '支付金额（充值时使用）'
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '支付方式'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注信息'
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
  tableName: 'user_package_records',
  paranoid: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['package_id']
    },
    {
      fields: ['activation_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['start_date', 'end_date']
    },
    {
      fields: ['user_id', 'status']
    },
    {
      fields: ['user_id', 'end_date']
    }
  ]
});

module.exports = UserPackageRecord;