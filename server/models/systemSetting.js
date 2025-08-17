const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const SystemSetting = sequelize.define('SystemSetting', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '设置ID'
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: '设置键名'
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '设置值'
  },
  type: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json', 'text', 'url', 'email', 'color', 'file'),
    allowNull: false,
    defaultValue: 'string',
    comment: '数据类型'
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'general',
    comment: '设置分类：general-基础设置，appearance-外观设置，seo-SEO设置，email-邮件设置，payment-支付设置，ai-AI设置，security-安全设置'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '设置名称'
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '设置描述'
  },
  default_value: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '默认值'
  },
  validation_rules: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '验证规则'
  },
  options: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '选项列表（用于下拉框等）'
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否公开（前端可访问）'
  },
  is_required: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否必填'
  },
  is_readonly: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    comment: '是否只读'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '排序顺序'
  },
  group_name: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '分组名称'
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
  tableName: 'system_settings',
  paranoid: true, // 启用软删除
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  indexes: [
    {
      fields: ['category', 'type']
    },
    {
      fields: ['is_public', 'group_name']
    },
    {
      fields: ['sort_order']
    }
  ]
});

module.exports = SystemSetting;