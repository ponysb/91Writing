const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Corpus = sequelize.define('Corpus', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '语料库ID'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '语料标题'
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    comment: '语料内容'
  },
  content_type: {
    type: DataTypes.ENUM('dialogue', 'description', 'action', 'emotion', 'environment', 'character', 'plot', 'worldbuilding', 'style_sample', 'reference'),
    defaultValue: 'reference',
    comment: '内容类型'
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '分类'
  },
  subcategory: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '子分类'
  },
  genre_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '题材类型'
  },
  writing_style: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '写作风格'
  },
  tone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '语调'
  },
  emotion: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '情绪'
  },
  narrative_perspective: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '叙述视角'
  },
  tense: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '时态'
  },
  language_level: {
    type: DataTypes.STRING(50),
    defaultValue: 'intermediate',
    comment: '语言水平'
  },
  target_audience: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '目标读者'
  },
  involved_characters: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '涉及角色'
  },
  emotion_tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '情感标签'
  },
  theme_tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '主题标签'
  },
  keywords: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '关键词'
  },
  context_background: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '上下文背景'
  },
  usage_scenarios: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '使用场景'
  },
  source: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '来源'
  },
  original_author: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '原作者'
  },
  source_link: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '来源链接'
  },
  copyright_info: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '版权信息'
  },
  word_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '字数统计'
  },
  character_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '字符数统计'
  },
  quality_score: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
    comment: '质量评分(0-10)'
  },
  relevance_score: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
    comment: '相关性评分(0-10)'
  },
  usage_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '使用次数'
  },
  last_used_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后使用时间'
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否公开'
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否已验证'
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否精选'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'pending_review', 'rejected'),
    defaultValue: 'active',
    comment: '状态'
  },
  review_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '审核备注'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '标签'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '元数据'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注'
  },
  novel_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '关联小说ID（可选）'
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
  tableName: 'corpus',
  paranoid: true,
  indexes: [
    {
      fields: ['user_id', 'status']
    },
    {
      fields: ['content_type']
    },
    {
      fields: ['is_public', 'is_featured']
    },
    {
      fields: ['novel_id']
    }
  ]
});

module.exports = Corpus;