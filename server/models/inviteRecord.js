const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const InviteRecord = sequelize.define('InviteRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '邀请记录ID'
  },
  inviter_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '邀请人ID'
  },
  invitee_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '被邀请人ID（注册后填入）'
  },
  invite_code: {
    type: DataTypes.STRING(32),
    allowNull: false,
    unique: true,
    comment: '邀请码'
  },
  invitee_username: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '被邀请人用户名'
  },
  invitee_email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '被邀请人邮箱'
  },
  invitee_phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: '被邀请人手机号'
  },
  status: {
    type: DataTypes.ENUM('pending', 'registered', 'activated', 'expired'),
    defaultValue: 'pending',
    comment: '邀请状态：待注册、已注册、已激活、已过期'
  },
  commission_rate: {
    type: DataTypes.DECIMAL(5, 4),
    defaultValue: 0.1000,
    comment: '分成比例（0-1之间的小数）'
  },
  register_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '注册时间'
  },
  activate_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '激活时间'
  },
  expire_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '邀请码过期时间'
  },
  register_ip: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: '注册IP地址'
  },
  source: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '邀请来源'
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
  tableName: 'invite_records',
  paranoid: true,
  indexes: [
    {
      fields: ['inviter_id']
    },
    {
      fields: ['invitee_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['expire_time']
    }
  ]
});

module.exports = InviteRecord;