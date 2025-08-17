const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AiConversation = sequelize.define('AiConversation', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'AI对话会话ID'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '对话标题'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '对话描述'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  assistant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'AI助手ID'
  },
  novel_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '关联小说ID（可选）'
  },
  session_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '会话唯一标识'
  },
  context: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '对话上下文信息'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '元数据信息'
  },
  status: {
    type: DataTypes.ENUM('active', 'paused', 'completed', 'archived'),
    defaultValue: 'active',
    comment: '对话状态'
  },
  message_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '消息数量'
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
  last_message_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后消息时间'
  },
  is_pinned: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否置顶'
  },
  is_favorite: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否收藏'
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
  tableName: 'ai_conversations',
  paranoid: true,
  indexes: [
    {
      name: 'session_id_unique',
      unique: true,
      fields: ['session_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['assistant_id']
    },
    {
      fields: ['novel_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['user_id', 'assistant_id']
    },
    {
      fields: ['user_id', 'novel_id']
    },
    {
      fields: ['last_message_at']
    }
  ]
});

module.exports = AiConversation;