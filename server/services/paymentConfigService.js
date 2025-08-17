const PaymentConfig = require('../models/paymentConfig');

class PaymentConfigService {
  constructor() {
    this.configCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5分钟缓存
    this.lastCacheTime = 0;
  }

  /**
   * 获取启用的支付配置
   * @param {string} code 支付渠道代码，可选
   * @returns {Promise<Array|Object>} 支付配置列表或单个配置
   */
  async getEnabledConfigs(code = null) {
    await this.refreshCache();
    
    if (code) {
      return this.configCache.get(code) || null;
    }
    
    return Array.from(this.configCache.values());
  }

  /**
   * 根据代码获取支付配置
   * @param {string} code 支付渠道代码
   * @returns {Promise<Object|null>} 支付配置
   */
  async getConfigByCode(code) {
    return await this.getEnabledConfigs(code);
  }

  /**
   * 刷新缓存
   */
  async refreshCache() {
    const now = Date.now();
    if (now - this.lastCacheTime < this.cacheExpiry) {
      return; // 缓存未过期
    }

    try {
      const configs = await PaymentConfig.findAll({
        where: { status: 1 },
        order: [['sort_order', 'ASC'], ['id', 'ASC']]
      });

      this.configCache.clear();
      configs.forEach(config => {
        this.configCache.set(config.code, {
          id: config.id,
          name: config.name,
          code: config.code,
          config: config.config,
          sort_order: config.sort_order,
          description: config.description
        });
      });

      this.lastCacheTime = now;
    } catch (error) {
      console.error('刷新支付配置缓存失败:', error);
    }
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.configCache.clear();
    this.lastCacheTime = 0;
  }

  /**
   * 获取蓝兔支付配置
   * @returns {Promise<Object|null>} 蓝兔支付配置
   */
  async getLtzfConfig() {
    const config = await this.getConfigByCode('ltzf');
    if (!config) {
      return null;
    }
    
    return {
      mchId: config.config.mch_id,
      apiKey: config.config.api_key,
      notifyUrl: config.config.notify_url
    };
  }

  /**
   * 检查是否有启用的支付配置
   * @returns {Promise<boolean>} 是否有启用的配置
   */
  async hasEnabledConfig() {
    const configs = await this.getEnabledConfigs();
    return configs.length > 0;
  }
}

module.exports = new PaymentConfigService();