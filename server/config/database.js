const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// 数据库配置
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'ai_novel',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  dialect: process.env.DB_DIALECT || 'mysql',
  timezone: '+08:00',
  pool: {
    max: 20,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: (msg) => {
    if (process.env.NODE_ENV === 'development') {
      logger.debug(msg);
    }
  },
  define: {
    timestamps: true,
    paranoid: true,
    underscored: true,
    freezeTableName: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci'
  }
};

// 创建Sequelize实例
const sequelize = new Sequelize(config.database, config.username, config.password, config);

// 测试连接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    logger.info('数据库连接测试成功');
  } catch (error) {
    logger.error('数据库连接测试失败:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  testConnection,
  config
};