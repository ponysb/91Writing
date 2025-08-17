const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const WithdrawalRequest = sequelize.define('WithdrawalRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '提现工单ID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  withdrawal_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '提现金额'
  },
  commission_record_ids: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '关联的分成记录ID数组'
  },
  withdrawal_method: {
    type: DataTypes.ENUM('alipay', 'wechat', 'bank_transfer'),
    allowNull: false,
    comment: '提现方式：支付宝、微信、银行转账'
  },
  withdrawal_account: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '提现账户信息'
  },
  account_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '账户姓名'
  },
  withdrawal_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '提现备注'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled'),
    defaultValue: 'pending',
    comment: '工单状态：待审核、已批准、已拒绝、已完成、已取消'
  },
  admin_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '管理员审核备注'
  },
  processed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '处理人ID（管理员）'
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '处理时间'
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '完成时间'
  },
  transaction_id: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: '交易流水号'
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
  tableName: 'withdrawal_requests',
  paranoid: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['processed_at']
    }
  ]
});

module.exports = WithdrawalRequest;