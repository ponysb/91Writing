const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NovelType = sequelize.define('NovelType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '小说类型ID'
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '类型名称'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '类型描述'
  },
  prompt_template: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '类型提示词模板'
  },
  writing_guidelines: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '写作指导'
  },
  character_guidelines: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '角色设定指导'
  },
  plot_guidelines: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '情节设定指导'
  },
  worldview_guidelines: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '世界观设定指导'
  },
  style_keywords: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '风格关键词'
  },
  common_themes: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '常见主题'
  },
  target_audience: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '目标读者群体'
  },
  difficulty_level: {
    type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
    defaultValue: 'intermediate',
    comment: '写作难度等级'
  },
  typical_length: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '典型长度范围'
  },
  color_code: {
    type: DataTypes.STRING(7),
    allowNull: true,
    comment: '类型颜色代码'
  },
  icon: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '类型图标'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '排序顺序'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否推荐'
  },
  usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '使用次数'
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
  tableName: 'novel_types',
  paranoid: true,
  indexes: [
    {
      fields: ['is_active', 'sort_order']
    },
    {
      fields: ['is_featured']
    },
    {
      fields: ['usage_count']
    }
  ]
});

module.exports = NovelType;