const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Timeline = sequelize.define('Timeline', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '事件线ID'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '事件线名称'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '事件线描述'
  },
  event_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '事件类型'
  },
  priority: {
    type: DataTypes.ENUM('critical', 'high', 'medium', 'low'),
    defaultValue: 'medium',
    comment: '重要程度'
  },
  status: {
    type: DataTypes.ENUM('planned', 'in_progress', 'completed', 'cancelled', 'on_hold'),
    defaultValue: 'planned',
    comment: '状态'
  },
  start_chapter: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '开始章节'
  },
  end_chapter: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '结束章节'
  },
  estimated_duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '预计持续章节数'
  },
  actual_duration: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '实际持续章节数'
  },
  trigger_event: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '触发事件'
  },
  trigger_conditions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '触发条件'
  },
  main_characters: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '主要角色'
  },
  supporting_characters: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '配角'
  },
  locations: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '相关地点'
  },
  key_events: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '关键事件列表'
  },
  plot_points: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '情节要点'
  },
  conflicts: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '冲突设定'
  },
  resolutions: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '解决方案'
  },
  consequences: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '后果影响'
  },
  character_development: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '角色发展'
  },
  world_changes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '世界变化'
  },
  themes: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '主题元素'
  },
  foreshadowing: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '伏笔设置'
  },
  callbacks: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '回调设置'
  },
  parallel_events: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '并行事件'
  },
  dependencies: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '依赖关系'
  },
  emotional_arc: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '情感弧线'
  },
  pacing_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '节奏备注'
  },
  research_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '研究笔记'
  },
  inspiration_sources: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '灵感来源'
  },
  completion_percentage: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    comment: '完成度百分比'
  },
  word_count_estimate: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '预计字数'
  },
  actual_word_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '实际字数'
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
  tableName: 'timelines',
  paranoid: true,
  indexes: [
    {
      fields: ['novel_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['event_type']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['status']
    },
    {
      fields: ['start_chapter']
    },
    {
      fields: ['end_chapter']
    }
  ]
});

module.exports = Timeline;