const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Chapter = sequelize.define('Chapter', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '章节ID'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '章节标题'
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: '章节内容'
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '章节摘要'
  },
  outline: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '章节大纲'
  },
  chapter_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '章节序号'
  },
  word_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '字数'
  },
  character_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '字符数'
  },
  reading_time: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '预估阅读时间（分钟）'
  },
  status: {
    type: DataTypes.ENUM('draft', 'generating', 'completed', 'published', 'failed'),
    defaultValue: 'draft',
    comment: '状态'
  },
  generation_params: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '生成参数'
  },
  prompt_used: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '使用的提示词'
  },
  model_used: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '使用的模型'
  },
  generation_time: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '生成耗时（毫秒）'
  },
  tokens_used: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '使用的Token数'
  },
  cost: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: true,
    comment: '生成成本'
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
  comment_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '评论数'
  },
  is_free: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否免费'
  },
  price: {
    type: DataTypes.DECIMAL(8, 2),
    defaultValue: 0.00,
    comment: '价格'
  },
  unlock_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '解锁次数'
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
  previous_chapter_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '上一章节ID'
  },
  next_chapter_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '下一章节ID'
  },
  error_message: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '错误信息'
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '元数据'
  },
  published_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '发布时间'
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
  tableName: 'chapters',
  paranoid: true,
  indexes: [
    {
      fields: ['novel_id', 'chapter_number'],
      unique: true
    },
    {
      fields: ['novel_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['chapter_number']
    },
    {
      fields: ['is_free']
    },
    {
      fields: ['published_at']
    },
    {
      fields: ['view_count']
    },
    {
      fields: ['like_count']
    },
    {
      fields: ['word_count']
    }
  ]
});

module.exports = Chapter;