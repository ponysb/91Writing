const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Novel = sequelize.define('Novel', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '长篇小说ID'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '小说标题'
  },
  subtitle: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '副标题'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '小说简介'
  },
  cover_image: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '封面图片'
  },
  protagonist: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '主角名称'
  },
  characters: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '角色设定'
  },
  world_setting: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '世界观设定'
  },
  plot_outline: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '情节大纲'
  },
  chapter_outline: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '章节大纲'
  },
  genre: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '题材'
  },
  sub_genre: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '子题材'
  },
  atmosphere: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '氛围'
  },
  target_word_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '目标字数'
  },
  current_word_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '当前字数'
  },
  chapter_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '章节数'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '标签'
  },
  style: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '写作风格'
  },
  tone: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '语调'
  },
  target_audience: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '目标读者'
  },
  language: {
    type: DataTypes.STRING(10),
    defaultValue: 'zh-CN',
    comment: '语言'
  },
  status: {
    type: DataTypes.ENUM('planning', 'writing', 'paused', 'completed', 'published', 'archived'),
    defaultValue: 'planning',
    comment: '状态'
  },
  writing_progress: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    comment: '写作进度百分比'
  },
  generation_settings: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '生成设置'
  },
  ai_model_used: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '使用的AI模型'
  },
  total_tokens_used: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '总使用Token数'
  },
  total_cost: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0.0000,
    comment: '总生成成本'
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0.00,
    comment: '评分'
  },
  rating_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '评分人数'
  },
  view_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '查看次数'
  },
  like_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '点赞数'
  },
  favorite_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '收藏数'
  },
  share_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '分享次数'
  },
  comment_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '评论数'
  },
  is_public: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否公开'
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否精选'
  },
  is_original: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否原创'
  },
  copyright_info: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '版权信息'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '创建者ID'
  },
  category_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '分类ID'
  },
  novel_type_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '小说类型ID'
  },
  writing_style_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '文风ID'
  },
  last_chapter_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后更新章节时间'
  },
  published_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '发布时间'
  },
  completed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '完成时间'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '元数据'
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
  tableName: 'novels',
  paranoid: true,
  indexes: [
    {
      fields: ['user_id', 'status']
    },
    {
      fields: ['is_public', 'is_featured']
    },
    {
      fields: ['category_id']
    },
    {
      fields: ['novel_type_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

module.exports = Novel;