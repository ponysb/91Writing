const Redis = require('ioredis');
const logger = require('../utils/logger');

// Redis配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000
};

// 创建Redis实例
const redis = new Redis(redisConfig);

// 连接事件监听
redis.on('connect', () => {
  logger.info('Redis连接成功');
});

redis.on('error', (error) => {
  logger.error('Redis连接错误:', error);
});

redis.on('close', () => {
  logger.warn('Redis连接关闭');
});

redis.on('reconnecting', () => {
  logger.info('Redis重新连接中...');
});

// Redis工具方法
const redisUtils = {
  // 设置缓存
  async set(key, value, ttl = 3600) {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, serializedValue);
      } else {
        await redis.set(key, serializedValue);
      }
      return true;
    } catch (error) {
      logger.error('Redis设置缓存失败:', error);
      return false;
    }
  },

  // 获取缓存
  async get(key) {
    try {
      const value = await redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      logger.error('Redis获取缓存失败:', error);
      return null;
    }
  },

  // 删除缓存
  async del(key) {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Redis删除缓存失败:', error);
      return false;
    }
  },

  // 检查key是否存在
  async exists(key) {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis检查key存在失败:', error);
      return false;
    }
  },

  // 设置过期时间
  async expire(key, ttl) {
    try {
      await redis.expire(key, ttl);
      return true;
    } catch (error) {
      logger.error('Redis设置过期时间失败:', error);
      return false;
    }
  },

  // 增加计数
  async incr(key, ttl = null) {
    try {
      const result = await redis.incr(key);
      if (ttl && result === 1) {
        await redis.expire(key, ttl);
      }
      return result;
    } catch (error) {
      logger.error('Redis增加计数失败:', error);
      return 0;
    }
  },

  // 获取剩余TTL
  async ttl(key) {
    try {
      return await redis.ttl(key);
    } catch (error) {
      logger.error('Redis获取TTL失败:', error);
      return -1;
    }
  }
};

module.exports = {
  redis,
  redisUtils
};