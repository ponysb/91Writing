const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    comment: '用户ID'
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '用户名'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      isEmail: true
    },
    comment: '邮箱'
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '密码哈希'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: '手机号'
  },
  avatar: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '头像URL'
  },
  nickname: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '昵称'
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'unknown'),
    defaultValue: 'unknown',
    comment: '性别'
  },
  birthday: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: '生日'
  },
  role: {
    type: DataTypes.ENUM('user', 'vip', 'admin', 'prompt_expert'),
    defaultValue: 'user',
    comment: '用户角色'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'banned', 'pending'),
    defaultValue: 'active',
    comment: '用户状态'
  },
  is_admin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否管理员'
  },
  last_login_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后登录时间'
  },
  last_login_ip: {
    type: DataTypes.STRING(45),
    allowNull: true,
    comment: '最后登录IP'
  },
  login_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '登录次数'
  },
  invite_code: {
    type: DataTypes.STRING(32),
    allowNull: true,
    // unique: true, // 临时移除unique约束
    comment: '邀请码'
  },
  invited_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '邀请人ID'
  },
  invite_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '邀请人数'
  },
  total_usage: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '总使用次数'
  },
  email_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '邮箱是否验证'
  },
  phone_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '手机是否验证'
  },
  settings: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '用户设置'
  },
  profile: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '用户资料'
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
  tableName: 'users',
  paranoid: true,
  // 临时移除所有自定义索引以解决索引过多问题
  // 只保留通过 unique: true 自动创建的索引
  indexes: []
});

module.exports = User;