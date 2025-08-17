const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

// AI调用记录模型
const AiCallRecord = sequelize.define('AiCallRecord', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  business_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '业务类型：outline, character, dialogue, plot, polish, creative'
  },
  model_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '使用的AI模型ID'
  },
  prompt_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '自定义Prompt ID（可选）'
  },
  request_params: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '请求参数（JSON格式）'
  },
  system_prompt: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '系统提示词'
  },
  user_prompt: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '用户提示词'
  },
  response_content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'AI返回内容'
  },
  tokens_used: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: 'Token使用情况（包含prompt_tokens, completion_tokens, total_tokens）'
  },
  response_time: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '响应时间（毫秒）'
  },
  status: {
    type: DataTypes.ENUM('success', 'error', 'timeout'),
    allowNull: false,
    defaultValue: 'success',
    comment: '调用状态'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误信息（如果有）'
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: '客户端IP地址'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '用户代理信息'
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
  }
}, {
  tableName: 'ai_call_records',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['business_type']
    },
    {
      fields: ['model_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['status']
    }
  ]
});

module.exports = AiCallRecord;