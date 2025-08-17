const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AiAssistant = sequelize.define('AiAssistant', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'AI助手ID'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'AI助手名称'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'AI助手描述'
  },
  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'AI助手头像URL'
  },
  personality: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'AI助手人格设定'
  },
  system_prompt: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '系统提示词'
  },
  context_prompt: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '上下文提示词'
  },
  model_config: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '模型配置参数'
  },
  capabilities: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'AI助手能力列表'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '创建者ID（管理员）'
  },
  type: {
    type: DataTypes.ENUM('general', 'writing', 'creative', 'analysis'),
    defaultValue: 'general',
    comment: 'AI助手类型'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'training'),
    defaultValue: 'active',
    comment: 'AI助手状态'
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否公开'
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否为默认助手'
  },
  usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '使用次数'
  },
  total_tokens: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '总消耗Token数'
  },
  total_cost: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0.0000,
    comment: '总消耗成本'
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
    comment: '用户评分'
  },
  rating_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '评分次数'
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
  tableName: 'ai_assistants',
  paranoid: true,
  indexes: [
    {
      fields: ['created_by']
    },
    {
      fields: ['type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['is_public']
    },
    {
      fields: ['is_default']
    }
  ]
});

module.exports = AiAssistant;