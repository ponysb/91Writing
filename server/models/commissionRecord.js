const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const CommissionRecord = sequelize.define('CommissionRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '分成记录ID'
  },
  invite_record_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '邀请记录ID'
  },
  inviter_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '邀请人ID'
  },
  invitee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '被邀请人ID'
  },
  order_id: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: '订单ID（如果是购买产生的分成）'
  },
  package_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '套餐ID'
  },
  commission_type: {
    type: DataTypes.ENUM('registration', 'purchase', 'activation', 'renewal', 'upgrade'),
    allowNull: false,
    comment: '分成类型：注册、购买、激活、续费、升级'
  },
  original_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: '原始金额'
  },
  commission_rate: {
    type: DataTypes.DECIMAL(5, 4),
    allowNull: false,
    comment: '分成比例'
  },
  commission_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    comment: '分成金额'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'CNY',
    comment: '货币类型'
  },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'paid', 'cancelled', 'refunded'),
    defaultValue: 'pending',
    comment: '分成状态：待确认、已确认、已支付、已取消、已退款'
  },
  settlement_status: {
    type: DataTypes.ENUM('unsettled', 'processing', 'settled', 'failed'),
    defaultValue: 'unsettled',
    comment: '结算状态：未结算、处理中、已结算、结算失败'
  },
  settlement_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '结算时间'
  },
  settlement_method: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '结算方式'
  },
  settlement_account: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '结算账户'
  },
  transaction_id: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: '交易ID'
  },
  confirm_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '确认时间'
  },
  pay_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '支付时间'
  },
  expire_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '过期时间'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注信息'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '扩展元数据'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '创建者ID'
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '更新者ID'
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
  tableName: 'commission_records',
  paranoid: true,
  indexes: [
    {
      fields: ['invite_record_id']
    },
    {
      fields: ['inviter_id']
    },
    {
      fields: ['invitee_id']
    },
    {
      fields: ['order_id']
    },
    {
      fields: ['package_id']
    },
    {
      fields: ['commission_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['settlement_status']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['settlement_time']
    }
  ]
});

module.exports = CommissionRecord;