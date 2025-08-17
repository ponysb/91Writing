const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Prompt = sequelize.define('Prompt', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'Prompt ID'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Prompt名称'
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    comment: 'Prompt内容'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Prompt描述'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Prompt分类'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Prompt标签'
  },
  type: {
    type: DataTypes.ENUM('system', 'user', 'assistant', 'function'),
    defaultValue: 'user',
    comment: 'Prompt类型'
  },
  language: {
    type: DataTypes.STRING(10),
    defaultValue: 'zh-CN',
    comment: '语言'
  },
  variables: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '变量定义'
  },
  examples: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '使用示例'
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否公开'
  },
  is_system: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否系统内置'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'draft'),
    defaultValue: 'active',
    comment: '状态'
  },
  usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '使用次数'
  },
  like_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '点赞数'
  },
  version: {
    type: DataTypes.STRING(20),
    defaultValue: '1.0.0',
    comment: '版本号'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '创建者ID'
  },
  parent_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '父级Prompt ID（用于版本管理）'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序'
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
  tableName: 'prompts',
  paranoid: true,
  indexes: [
    {
      fields: ['name']
    },
    {
      fields: ['category']
    },
    {
      fields: ['type']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['parent_id']
    },
    {
      fields: ['is_public']
    },
    {
      fields: ['is_system']
    },
    {
      fields: ['status']
    },
    {
      fields: ['usage_count']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['sort_order']
    }
  ]
});

module.exports = Prompt;