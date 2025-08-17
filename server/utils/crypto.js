const crypto = require('crypto');
const CryptoJS = require('crypto-js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const ENCRYPT_SECRET = process.env.ENCRYPT_SECRET || 'default_encrypt_secret';
const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

class CryptoUtils {
  // 生成随机字符串
  static generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // 生成UUID
  static generateUUID() {
    return crypto.randomUUID();
  }

  // MD5哈希
  static md5(text) {
    return crypto.createHash('md5').update(text).digest('hex');
  }

  // SHA256哈希
  static sha256(text) {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  // 密码加密
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // 密码验证
  static async verifyPassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // AES加密
  static encrypt(text) {
    return CryptoJS.AES.encrypt(text, ENCRYPT_SECRET).toString();
  }

  // AES解密
  static decrypt(encryptedText) {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPT_SECRET);
    return bytes.toString(CryptoJS.enc.Utf8);
  }

  // 生成JWT Token
  static generateToken(payload) {
    try {
      return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
        issuer: 'ai-novel-backend',
        audience: 'ai-novel-frontend'
      });
    } catch (error) {
      throw new Error('Token生成失败: ' + error.message);
    }
  }

  // 验证JWT Token
  static verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET, {
        issuer: 'ai-novel-backend',
        audience: 'ai-novel-frontend'
      });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token已过期');
      } else if (error.name === 'JsonWebTokenError') {
        throw new Error('Token无效');
      } else {
        throw new Error('Token验证失败: ' + error.message);
      }
    }
  }

  // 解码JWT Token（不验证）
  static decodeToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      throw new Error('Token解码失败: ' + error.message);
    }
  }

  // 生成激活码
  static generateActivationCode(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 生成邀请码
  static generateInviteCode(userId) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // 生成订单号
  static generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${timestamp}${random}`;
  }

  // 数据签名
  static sign(data) {
    const sortedData = Object.keys(data)
      .sort()
      .reduce((result, key) => {
        result[key] = data[key];
        return result;
      }, {});
    
    const queryString = Object.entries(sortedData)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    return this.sha256(queryString + ENCRYPT_SECRET);
  }

  // 验证签名
  static verifySign(data, signature) {
    return this.sign(data) === signature;
  }

  // 蓝兔支付签名生成（用于支付请求）
  static createSign(params, apiKey) {
    // 按照ASCII码从小到大排序
    const sortedKeys = Object.keys(params).sort();
    const stringArr = [];
    
    sortedKeys.forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        stringArr.push(`${key}=${params[key]}`);
      }
    });
    
    // 最后加上商户Key
    stringArr.push(`key=${apiKey}`);
    const string = stringArr.join('&');
    
    return this.md5(string).toUpperCase();
  }

  // 蓝兔支付查询订单签名生成
  static createQuerySign(params, apiKey) {
    // 查询订单使用相同的签名算法
    return this.createSign(params, apiKey);
  }

  // 验证蓝兔支付回调签名
  static verifyLtzfSign(params, apiKey) {
    const { sign, ...otherParams } = params;
    
    // 只包含参与签名的字段
    const signParams = {
      code: otherParams.code,
      timestamp: otherParams.timestamp,
      mch_id: otherParams.mch_id,
      order_no: otherParams.order_no,
      out_trade_no: otherParams.out_trade_no,
      pay_no: otherParams.pay_no,
      total_fee: otherParams.total_fee
    };
    
    const calculatedSign = this.createSign(signParams, apiKey);
    return calculatedSign === sign;
  }
}

module.exports = CryptoUtils;