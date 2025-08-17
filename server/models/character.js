const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Character = sequelize.define('Character', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '人物ID'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '人物姓名'
  },
  nickname: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '昵称/别名'
  },
  role: {
    type: DataTypes.ENUM('protagonist', 'deuteragonist', 'antagonist', 'supporting', 'minor', 'cameo'),
    defaultValue: 'supporting',
    comment: '角色类型：主角/次要主角/反派/配角/次要角色/客串'
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other', 'unknown'),
    allowNull: true,
    comment: '性别'
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '年龄'
  },
  age_range: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '年龄段描述，如：青年、中年等'
  },
  occupation: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '职业'
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '头衔/称号'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '人物描述'
  },
  appearance: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '外貌描述'
  },
  personality: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '性格特点'
  },
  background: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '背景故事'
  },
  motivation: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '动机/目标'
  },
  skills: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '技能/能力列表'
  },
  relationships: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '人物关系'
  },
  character_arc: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '角色发展弧线'
  },
  dialogue_style: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '对话风格'
  },
  catchphrase: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '口头禅/标志性台词'
  },
  strengths: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '优点/长处'
  },
  weaknesses: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '缺点/弱点'
  },
  fears: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '恐惧/担忧'
  },
  desires: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '欲望/渴望'
  },
  avatar_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '头像图片URL'
  },
  importance_level: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 10
    },
    comment: '重要程度（1-10）'
  },
  first_appearance_chapter: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '首次出现章节'
  },
  last_appearance_chapter: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '最后出现章节'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'deceased', 'missing', 'unknown'),
    defaultValue: 'active',
    comment: '状态'
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
    defaultValue: DataTypes.NOW,
    comment: '创建时间'
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '更新时间'
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '删除时间（软删除）'
  }
}, {
  tableName: 'characters',
  paranoid: true, // 启用软删除
  timestamps: true,
  indexes: [
    {
      fields: ['novel_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['role']
    },
    {
      fields: ['importance_level']
    },
    {
      fields: ['status']
    },
    {
      fields: ['name']
    },
    {
      fields: ['novel_id', 'role']
    },
    {
      fields: ['novel_id', 'importance_level']
    }
  ]
});

module.exports = Character;