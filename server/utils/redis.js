const Redis = require('ioredis');
const logger = require('./logger');

// Redis配置
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  keyPrefix: process.env.REDIS_KEY_PREFIX || 'ai_novel:',
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  connectTimeout: 10000,
  commandTimeout: 5000,
  family: 4, // 4 (IPv4) or 6 (IPv6)
  keepAlive: 30000
};

// 创建Redis客户端
const redisClient = new Redis(redisConfig);

// 连接事件监听
redisClient.on('connect', () => {
  logger.info('Redis连接已建立');
});

redisClient.on('ready', () => {
  logger.info('Redis连接就绪');
});

redisClient.on('error', (err) => {
  logger.error('Redis连接错误:', err);
});

redisClient.on('close', () => {
  logger.warn('Redis连接已关闭');
});

redisClient.on('reconnecting', () => {
  logger.info('Redis正在重连...');
});

// 封装常用操作
class RedisUtil {
  constructor(client) {
    this.client = client;
  }

  /**
   * 设置键值对
   * @param {string} key 键
   * @param {any} value 值
   * @param {number} ttl 过期时间（秒）
   */
  async set(key, value, ttl = null) {
    try {
      const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
      if (ttl) {
        return await this.client.setex(key, ttl, serializedValue);
      } else {
        return await this.client.set(key, serializedValue);
      }
    } catch (error) {
      logger.error('Redis SET操作失败:', error);
      throw error;
    }
  }

  /**
   * 获取值
   * @param {string} key 键
   * @param {boolean} parseJson 是否解析JSON
   */
  async get(key, parseJson = false) {
    try {
      const value = await this.client.get(key);
      if (value === null) return null;
      
      if (parseJson) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    } catch (error) {
      logger.error('Redis GET操作失败:', error);
      throw error;
    }
  }

  /**
   * 删除键
   * @param {string|string[]} keys 键或键数组
   */
  async del(keys) {
    try {
      return await this.client.del(keys);
    } catch (error) {
      logger.error('Redis DEL操作失败:', error);
      throw error;
    }
  }

  /**
   * 检查键是否存在
   * @param {string} key 键
   */
  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (error) {
      logger.error('Redis EXISTS操作失败:', error);
      throw error;
    }
  }

  /**
   * 设置过期时间
   * @param {string} key 键
   * @param {number} seconds 秒数
   */
  async expire(key, seconds) {
    try {
      return await this.client.expire(key, seconds);
    } catch (error) {
      logger.error('Redis EXPIRE操作失败:', error);
      throw error;
    }
  }

  /**
   * 获取剩余过期时间
   * @param {string} key 键
   */
  async ttl(key) {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      logger.error('Redis TTL操作失败:', error);
      throw error;
    }
  }

  /**
   * 递增
   * @param {string} key 键
   * @param {number} increment 增量
   */
  async incr(key, increment = 1) {
    try {
      if (increment === 1) {
        return await this.client.incr(key);
      } else {
        return await this.client.incrby(key, increment);
      }
    } catch (error) {
      logger.error('Redis INCR操作失败:', error);
      throw error;
    }
  }

  /**
   * 递减
   * @param {string} key 键
   * @param {number} decrement 减量
   */
  async decr(key, decrement = 1) {
    try {
      if (decrement === 1) {
        return await this.client.decr(key);
      } else {
        return await this.client.decrby(key, decrement);
      }
    } catch (error) {
      logger.error('Redis DECR操作失败:', error);
      throw error;
    }
  }

  /**
   * 哈希表操作 - 设置字段
   * @param {string} key 键
   * @param {string} field 字段
   * @param {any} value 值
   */
  async hset(key, field, value) {
    try {
      const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
      return await this.client.hset(key, field, serializedValue);
    } catch (error) {
      logger.error('Redis HSET操作失败:', error);
      throw error;
    }
  }

  /**
   * 哈希表操作 - 获取字段
   * @param {string} key 键
   * @param {string} field 字段
   * @param {boolean} parseJson 是否解析JSON
   */
  async hget(key, field, parseJson = false) {
    try {
      const value = await this.client.hget(key, field);
      if (value === null) return null;
      
      if (parseJson) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    } catch (error) {
      logger.error('Redis HGET操作失败:', error);
      throw error;
    }
  }

  /**
   * 哈希表操作 - 删除字段
   * @param {string} key 键
   * @param {string|string[]} fields 字段或字段数组
   */
  async hdel(key, fields) {
    try {
      return await this.client.hdel(key, fields);
    } catch (error) {
      logger.error('Redis HDEL操作失败:', error);
      throw error;
    }
  }

  /**
   * 哈希表操作 - 获取所有字段和值
   * @param {string} key 键
   * @param {boolean} parseJson 是否解析JSON值
   */
  async hgetall(key, parseJson = false) {
    try {
      const result = await this.client.hgetall(key);
      if (parseJson) {
        const parsed = {};
        for (const [field, value] of Object.entries(result)) {
          try {
            parsed[field] = JSON.parse(value);
          } catch {
            parsed[field] = value;
          }
        }
        return parsed;
      }
      return result;
    } catch (error) {
      logger.error('Redis HGETALL操作失败:', error);
      throw error;
    }
  }

  /**
   * 列表操作 - 左侧推入
   * @param {string} key 键
   * @param {any} value 值
   */
  async lpush(key, value) {
    try {
      const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
      return await this.client.lpush(key, serializedValue);
    } catch (error) {
      logger.error('Redis LPUSH操作失败:', error);
      throw error;
    }
  }

  /**
   * 列表操作 - 右侧推入
   * @param {string} key 键
   * @param {any} value 值
   */
  async rpush(key, value) {
    try {
      const serializedValue = typeof value === 'object' ? JSON.stringify(value) : value;
      return await this.client.rpush(key, serializedValue);
    } catch (error) {
      logger.error('Redis RPUSH操作失败:', error);
      throw error;
    }
  }

  /**
   * 列表操作 - 左侧弹出
   * @param {string} key 键
   * @param {boolean} parseJson 是否解析JSON
   */
  async lpop(key, parseJson = false) {
    try {
      const value = await this.client.lpop(key);
      if (value === null) return null;
      
      if (parseJson) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    } catch (error) {
      logger.error('Redis LPOP操作失败:', error);
      throw error;
    }
  }

  /**
   * 列表操作 - 右侧弹出
   * @param {string} key 键
   * @param {boolean} parseJson 是否解析JSON
   */
  async rpop(key, parseJson = false) {
    try {
      const value = await this.client.rpop(key);
      if (value === null) return null;
      
      if (parseJson) {
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      }
      return value;
    } catch (error) {
      logger.error('Redis RPOP操作失败:', error);
      throw error;
    }
  }

  /**
   * 列表操作 - 获取范围内的元素
   * @param {string} key 键
   * @param {number} start 开始索引
   * @param {number} stop 结束索引
   * @param {boolean} parseJson 是否解析JSON
   */
  async lrange(key, start, stop, parseJson = false) {
    try {
      const values = await this.client.lrange(key, start, stop);
      if (parseJson) {
        return values.map(value => {
          try {
            return JSON.parse(value);
          } catch {
            return value;
          }
        });
      }
      return values;
    } catch (error) {
      logger.error('Redis LRANGE操作失败:', error);
      throw error;
    }
  }

  /**
   * 获取匹配模式的键
   * @param {string} pattern 模式
   */
  async keys(pattern) {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Redis KEYS操作失败:', error);
      throw error;
    }
  }

  /**
   * 清空当前数据库
   */
  async flushdb() {
    try {
      return await this.client.flushdb();
    } catch (error) {
      logger.error('Redis FLUSHDB操作失败:', error);
      throw error;
    }
  }

  /**
   * 获取原始客户端
   */
  getClient() {
    return this.client;
  }

  /**
   * 关闭连接
   */
  async disconnect() {
    try {
      await this.client.disconnect();
      logger.info('Redis连接已断开');
    } catch (error) {
      logger.error('Redis断开连接失败:', error);
    }
  }

  /**
   * 检查连接状态
   */
  isConnected() {
    return this.client.status === 'ready';
  }
}

// 创建工具实例
const redisUtil = new RedisUtil(redisClient);

// 导出客户端和工具
module.exports = redisClient;
module.exports.util = redisUtil;
module.exports.RedisUtil = RedisUtil;

// 优雅关闭
process.on('SIGINT', async () => {
  await redisUtil.disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await redisUtil.disconnect();
  process.exit(0);
});