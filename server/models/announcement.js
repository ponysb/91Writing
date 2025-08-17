const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Announcement = sequelize.define('Announcement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '公告ID'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '公告标题'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '公告内容'
  },
  type: {
    type: DataTypes.ENUM('system', 'maintenance', 'feature', 'event', 'notice'),
    allowNull: false,
    defaultValue: 'notice',
    comment: '公告类型：system-系统公告，maintenance-维护公告，feature-功能更新，event-活动公告，notice-普通通知'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'normal',
    comment: '优先级：low-低，normal-普通，high-高，urgent-紧急'
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'archived'),
    allowNull: false,
    defaultValue: 'draft',
    comment: '状态：draft-草稿，published-已发布，archived-已归档'
  },
  is_pinned: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否置顶'
  },
  is_popup: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否弹窗显示'
  },
  target_audience: {
    type: DataTypes.ENUM('all', 'users', 'vip', 'admin'),
    allowNull: false,
    defaultValue: 'all',
    comment: '目标受众：all-所有用户，users-普通用户，vip-VIP用户，admin-管理员'
  },
  publish_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '发布时间'
  },
  expire_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '过期时间'
  },
  view_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '查看次数'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '排序顺序'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '标签列表'
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '附件列表'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '元数据'
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
  tableName: 'announcements',
  paranoid: true, // 启用软删除
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    {
      fields: ['status']
    },
    {
      fields: ['type']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['is_pinned']
    },
    {
      fields: ['target_audience']
    },
    {
      fields: ['publish_time']
    },
    {
      fields: ['expire_time']
    },
    {
      fields: ['created_by']
    },
    {
      fields: ['sort_order']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = Announcement;