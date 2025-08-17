const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AiModel = sequelize.define('AiModel', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: 'AI模型ID'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '模型名称'
  },
  display_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '显示名称'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '模型描述'
  },
  provider: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '模型提供商（如：OpenAI、Claude、ChatGLM等）'
  },
  model_type: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '模型类型（如：chat、completion、embedding等）'
  },
  version: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '模型版本'
  },
  api_endpoint: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'API接口地址'
  },
  proxy_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '代理地址'
  },
  api_key: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'API密钥'
  },
  max_tokens: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 4096,
    comment: '最大token数'
  },
  temperature: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0.7,
    validate: {
      min: 0,
      max: 2
    },
    comment: '温度参数（0-2）'
  },
  top_p: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 1.0,
    validate: {
      min: 0,
      max: 1
    },
    comment: 'Top-p参数（0-1）'
  },
  frequency_penalty: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: -2,
      max: 2
    },
    comment: '频率惩罚（-2到2）'
  },
  presence_penalty: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
    validate: {
      min: -2,
      max: 2
    },
    comment: '存在惩罚（-2到2）'
  },
  custom_parameters: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '自定义参数（JSON格式）'
  },
  request_headers: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '请求头配置（JSON格式）'
  },
  timeout: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 30000,
    comment: '请求超时时间（毫秒）'
  },
  retry_count: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 3,
    comment: '重试次数'
  },
  rate_limit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '速率限制（每分钟请求数）'
  },
  credits_per_call: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    comment: '调用一次扣除的积分数'
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'active',
    comment: '状态（active、inactive、testing）'
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否为默认模型'
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否公开可用'
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
    comment: '优先级（数字越大优先级越高）'
  },
  tags: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '标签（逗号分隔）'
  },
  capabilities: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '模型能力描述（JSON格式）'
  },
  limitations: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '模型限制说明'
  },
  usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '使用次数统计'
  },
  last_used_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后使用时间'
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
  tableName: 'ai_models',
  paranoid: true,
  indexes: [
    {
      fields: ['provider']
    },
    {
      fields: ['model_type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['is_default']
    },
    {
      fields: ['priority']
    }
  ]
});

module.exports = AiModel;