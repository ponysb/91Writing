const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AiMessage = sequelize.define('AiMessage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'AI消息ID'
  },
  conversation_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '对话会话ID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  role: {
    type: DataTypes.ENUM('user', 'assistant', 'system'),
    allowNull: false,
    comment: '消息角色'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '消息内容'
  },
  content_type: {
    type: DataTypes.ENUM('text', 'markdown', 'json', 'code'),
    defaultValue: 'text',
    comment: '内容类型'
  },
  attachments: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '附件信息'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '元数据信息'
  },
  model_used: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '使用的AI模型'
  },
  tokens_used: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '消耗Token数'
  },
  cost: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0.0000,
    comment: '消耗成本'
  },
  response_time: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '响应时间（毫秒）'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
    defaultValue: 'completed',
    comment: '消息状态'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误信息'
  },
  parent_message_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '父消息ID（用于消息树结构）'
  },
  sequence_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '消息序号'
  },
  is_edited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否已编辑'
  },
  edit_history: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '编辑历史'
  },
  rating: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: {
      min: 1,
      max: 5
    },
    comment: '用户评分（1-5）'
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '用户反馈'
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
  tableName: 'ai_messages',
  paranoid: true,
  indexes: [
    {
      fields: ['conversation_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['role']
    },
    {
      fields: ['status']
    },
    {
      fields: ['conversation_id', 'sequence_number']
    },
    {
      fields: ['parent_message_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = AiMessage;