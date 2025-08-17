const axios = require('axios');
const cryptoUtils = require('../utils/crypto');
const paymentConfigService = require('./paymentConfigService');

class LtzfService {
  constructor() {
    this.baseURL = 'https://api.ltzf.cn';
    
    // 创建axios实例
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  }

  /**
   * 获取蓝兔支付配置
   * @returns {Promise<Object>} 配置信息
   */
  async getConfig() {
    const config = await paymentConfigService.getLtzfConfig();
    if (!config) {
      throw new Error('蓝兔支付配置未设置或未启用');
    }
    return config;
  }

  /**
   * 扫码支付
   * @param {object} params 支付参数
   * @param {string} params.out_trade_no 商户订单号
   * @param {string} params.total_fee 支付金额（元）
   * @param {string} params.body 商品描述
   * @param {string} params.notify_url 支付通知地址
   * @param {string} params.attach 附加数据（可选）
   * @param {string} params.time_expire 订单失效时间（可选，默认5m）
   * @param {string} params.developer_appid 开发者应用ID（可选）
   * @returns {object} 支付结果
   */
  async nativePay(params) {
    const config = await this.getConfig();
    
    const requestData = {
      mch_id: config.mchId,
      out_trade_no: params.out_trade_no,
      total_fee: params.total_fee,
      body: params.body,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      notify_url: params.notify_url || config.notifyUrl,
      attach: params.attach || '',
      time_expire: params.time_expire || '5m',
      developer_appid: params.developer_appid || ''
    };

    // 生成签名（根据文档，只有必填参数才参与签名）
    const signParams = {
      body: requestData.body,
      mch_id: requestData.mch_id,
      notify_url: requestData.notify_url,
      out_trade_no: requestData.out_trade_no,
      timestamp: requestData.timestamp,
      total_fee: requestData.total_fee
    };
    
    requestData.sign = cryptoUtils.createSign(signParams, config.apiKey);

    try {
      console.log('发起扫码支付请求:', {
        ...requestData,
        sign: requestData.sign.substring(0, 8) + '...'
      });
      
      const response = await this.client.post('/api/wxpay/native', new URLSearchParams(requestData));
      console.log('扫码支付响应:', response.data);
      return response.data;
    } catch (error) {
      console.error('扫码支付请求失败:', error.message);
      if (error.response) {
        console.error('响应数据:', error.response.data);
        throw new Error(`支付请求失败: ${error.response.data.msg || error.message}`);
      }
      throw new Error(`网络请求失败: ${error.message}`);
    }
  }

  /**
   * 查询订单
   * @param {string} outTradeNo 商户订单号
   * @returns {object} 查询结果
   */
  async queryOrder(outTradeNo) {
    const config = await this.getConfig();
    
    const requestData = {
      mch_id: config.mchId,
      out_trade_no: outTradeNo,
      timestamp: Math.floor(Date.now() / 1000).toString()
    };

    // 生成签名
    requestData.sign = cryptoUtils.createQuerySign(requestData, config.apiKey);

    try {
      console.log('发起查询订单请求:', {
        ...requestData,
        sign: requestData.sign.substring(0, 8) + '...'
      });
      
      const response = await this.client.post('/api/wxpay/get_pay_order', new URLSearchParams(requestData));
      console.log('查询订单响应:', response.data);
      return response.data;
    } catch (error) {
      console.error('查询订单请求失败:', error.message);
      if (error.response) {
        console.error('响应数据:', error.response.data);
        throw new Error(`查询订单失败: ${error.response.data.msg || error.message}`);
      }
      throw new Error(`网络请求失败: ${error.message}`);
    }
  }

  /**
   * 验证回调签名
   * @param {object} params 回调参数
   * @returns {Promise<boolean>} 验证结果
   */
  async verifyNotifySign(params) {
    try {
      const config = await this.getConfig();
      return cryptoUtils.verifyLtzfSign(params, config.apiKey);
    } catch (error) {
      console.error('验证回调签名失败:', error.message);
      return false;
    }
  }

  /**
   * 格式化金额（元转分）
   * @param {number} amount 金额（元）
   * @returns {string} 格式化后的金额（分）
   */
  formatAmount(amount) {
    return (Math.round(amount * 100)).toString();
  }

  /**
   * 解析金额（分转元）
   * @param {string} amount 金额（分）
   * @returns {number} 解析后的金额（元）
   */
  parseAmount(amount) {
    return parseInt(amount) / 100;
  }
}

module.exports = new LtzfService();