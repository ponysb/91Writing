const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Worldview = sequelize.define('Worldview', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '世界观ID'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '世界观名称'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '世界观描述'
  },
  world_type: {
    type: DataTypes.ENUM('fantasy', 'sci-fi', 'modern', 'historical', 'mythology', 'post-apocalyptic', 'steampunk', 'cyberpunk', 'other'),
    defaultValue: 'fantasy',
    comment: '世界类型'
  },
  geography: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '地理环境'
  },
  climate: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '气候环境'
  },
  history: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '历史背景'
  },
  culture: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '文化背景'
  },
  society: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '社会结构'
  },
  politics: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '政治制度'
  },
  economy: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '经济体系'
  },
  technology: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '科技水平'
  },
  magic_system: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '魔法体系'
  },
  power_system: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '力量体系'
  },
  races: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '种族设定'
  },
  organizations: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '组织机构'
  },
  locations: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '重要地点'
  },
  languages: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '语言系统'
  },
  religions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '宗教信仰'
  },
  laws_rules: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '法律规则'
  },
  special_elements: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '特殊元素'
  },
  timeline: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '时间线'
  },
  conflicts: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '主要冲突'
  },
  themes: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '主题元素'
  },
  inspiration_sources: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '灵感来源'
  },
  visual_style: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '视觉风格'
  },
  mood_tone: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '情绪基调'
  },
  complexity_level: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 10
    },
    comment: '复杂程度(1-10)'
  },
  completeness: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    comment: '完整度百分比'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '标签'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注'
  },
  novel_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '所属小说ID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '创建者ID'
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
  tableName: 'worldviews',
  paranoid: true,
  indexes: [
    {
      fields: ['novel_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['world_type']
    },
    {
      fields: ['name']
    }
  ]
});

module.exports = Worldview;