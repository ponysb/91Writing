const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ShortStory = sequelize.define('ShortStory', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '短文ID'
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '短文标题'
  },
  content: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
    comment: '短文内容'
  },
  type: {
    type: DataTypes.ENUM('short_novel', 'article', 'essay', 'poem', 'script', 'other'),
    defaultValue: 'short_novel',
    comment: '短文类型：短篇小说/文章/散文/诗歌/剧本/其他'
  },
  prompt_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '使用的提示词ID'
  },
  prompt_content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '使用的提示词内容快照'
  },
  reference_article: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '参考文章'
  },
  word_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '字数统计'
  },
  protagonist: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '主角名称'
  },
  setting: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '设定/背景'
  },
  genre: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '题材/风格'
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '标签'
  },
  summary: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '内容摘要'
  },
  mood: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '情绪/氛围'
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
    type: DataTypes.ENUM('draft', 'completed', 'published', 'archived'),
    defaultValue: 'draft',
    comment: '状态：草稿/完成/发布/归档'
  },
  ai_model_used: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '使用的AI模型'
  },
  tokens_used: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '使用的Token数'
  },
  generation_cost: {
    type: DataTypes.DECIMAL(10, 4),
    defaultValue: 0.0000,
    comment: '生成成本'
  },
  generation_time: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '生成耗时（秒）'
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
    comment: '删除时间（软删除）'
  }
}, {
  tableName: 'short_stories',
  paranoid: true, // 启用软删除
  timestamps: true,
  hooks: {
    beforeCreate: (shortStory, options) => {
      if (shortStory.content) {
        shortStory.word_count = shortStory.content.length;
      }
    },
    beforeUpdate: (shortStory, options) => {
      if (shortStory.content) {
        shortStory.word_count = shortStory.content.length;
      }
    }
  },
  indexes: [
    {
      fields: ['user_id', 'status']
    },
    {
      fields: ['type']
    },
    {
      fields: ['is_public', 'is_featured']
    },
    {
      fields: ['created_at']
    }
  ]
});

// 定义关联关系
ShortStory.associate = (models) => {
  // 短文属于一个提示词
  ShortStory.belongsTo(models.Prompt, {
    foreignKey: 'prompt_id',
    as: 'prompt'
  });
  
  // 短文属于一个用户
  ShortStory.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

module.exports = ShortStory;