const UserPackageRecord = require('../models/userPackageRecord');
const Package = require('../models/package');
// const VipPackage = require('../models/VipPackage'); // 已废弃，统一使用Package表
const User = require('../models/user');
const ActivationCode = require('../models/activationCode');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { createCommissionRecord } = require('../utils/commission');

/**
 * 会员服务类
 */
class MembershipService {
  /**
   * 获取用户剩余调用次数
   * @param {number} userId - 用户ID
   * @returns {Promise<number>} 剩余次数
   */
  static async getUserRemainingCredits(userId) {
    try {
      const now = new Date();
      
      // 获取用户所有有效的套餐记录（包括未来开始的记录，支持积分叠加）
      const activeRecords = await UserPackageRecord.findAll({
        where: {
          user_id: userId,
          status: 'active',
          end_date: { [Op.gte]: now }, // 只要结束日期大于当前时间即可
          remaining_credits: { [Op.gt]: 0 }
        }
      });
      
      // 累加所有有效记录的剩余次数
      const totalCredits = activeRecords.reduce((sum, record) => {
        return sum + record.remaining_credits;
      }, 0);
      
      return totalCredits;
    } catch (error) {
      logger.error('获取用户剩余次数失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取用户当前会员等级
   * @param {number} userId - 用户ID
   * @returns {Promise<Object|null>} 当前会员等级信息
   */
  static async getUserCurrentMembership(userId) {
    try {
      const now = new Date();
      
      // 获取用户所有有效期内的套餐记录，按权重排序
      const activeRecord = await UserPackageRecord.findOne({
        where: {
          user_id: userId,
          status: 'active',
          start_date: { [Op.lte]: now },
          end_date: { [Op.gte]: now }
        },
        include: [{
          model: Package,
          as: 'package'
        }],
        order: [['package_weight', 'DESC'], ['end_date', 'DESC']]
      });
      
      if (!activeRecord) {
        return null;
      }
      
      return {
        type: activeRecord.package_type,
        weight: activeRecord.package_weight,
        end_date: activeRecord.end_date,
        package_name: activeRecord.package?.name || '未知套餐'
      };
    } catch (error) {
      logger.error('获取用户当前会员等级失败:', error);
      throw error;
    }
  }
  
  /**
   * 获取用户所有会员记录
   * @param {number} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 会员记录列表
   */
  static async getUserMembershipRecords(userId, options = {}) {
    try {
      const { page = 1, limit = 10, status = null } = options;
      const offset = (page - 1) * limit;
      
      const whereCondition = { user_id: userId };
      if (status) {
        whereCondition.status = status;
      }
      
      const records = await UserPackageRecord.findAndCountAll({
        where: whereCondition,
        include: [
          {
            model: Package,
            as: 'package',
            attributes: ['id', 'name', 'type', 'weight']
          },
          {
            model: ActivationCode,
            as: 'activationCode',
            attributes: ['id', 'code'],
            required: false
          }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });
      
      return {
        records: records.rows,
        total: records.count,
        page,
        limit,
        totalPages: Math.ceil(records.count / limit)
      };
    } catch (error) {
      logger.error('获取用户会员记录失败:', error);
      throw error;
    }
  }
  
  /**
   * 通过充值开通会员
   * @param {Object} params - 参数
   * @param {number} params.userId - 用户ID
   * @param {number} params.packageId - 套餐ID
   * @param {string} params.orderId - 订单ID
   * @param {number} params.paymentAmount - 支付金额
   * @param {string} params.paymentMethod - 支付方式
   * @returns {Promise<Object>} 开通结果
   */
  static async activateByRecharge(params) {
    try {
      const { userId, packageId, orderId, paymentAmount, paymentMethod } = params;
      
      // 获取套餐信息（统一使用Package表）
      logger.info(`正在查找套餐，packageId: ${packageId}, 类型: ${typeof packageId}`);
      
      const packageInfo = await Package.findByPk(packageId);
      const packageType = packageInfo ? packageInfo.type : null;
      
      logger.info(`Package查找结果: ${packageInfo ? '找到' : '未找到'}，类型: ${packageType}`);
      
      if (!packageInfo) {
        logger.error(`套餐不存在，packageId: ${packageId}`);
        throw new Error('套餐不存在');
      }
      
      logger.info(`找到套餐: ${packageInfo.name}, 类型: ${packageType}`);
      
      const now = new Date();
      
      // 查找用户最新的有效会员记录，用于天数叠加
      const latestActiveRecord = await UserPackageRecord.findOne({
        where: {
          user_id: userId,
          status: 'active',
          end_date: {
            [Op.gt]: now // 结束日期大于当前时间
          }
        },
        order: [['end_date', 'DESC']] // 按结束日期降序排列，获取最晚结束的记录
      });
      
      // 计算开始日期和结束日期（实现天数叠加）
      let startDate, endDate;
      if (latestActiveRecord && latestActiveRecord.end_date > now) {
        // 如果有有效的会员记录，从其结束日期开始叠加
        startDate = new Date(latestActiveRecord.end_date);
        endDate = new Date(startDate.getTime() + packageInfo.validity_days * 24 * 60 * 60 * 1000);
        logger.info(`用户 ${userId} 存在有效会员记录，天数叠加：从 ${startDate.toISOString()} 开始，到 ${endDate.toISOString()} 结束`);
      } else {
        // 如果没有有效的会员记录，从当前时间开始
        startDate = now;
        endDate = new Date(now.getTime() + packageInfo.validity_days * 24 * 60 * 60 * 1000);
        logger.info(`用户 ${userId} 无有效会员记录，从当前时间开始：${startDate.toISOString()} 到 ${endDate.toISOString()}`);
      }
      
      // 创建用户套餐记录（新记录实现积分叠加）
      const recordData = {
        user_id: userId,
        package_id: packageId,
        activation_type: 'recharge',
        order_id: orderId,
        validity_days: packageInfo.validity_days,
        start_date: startDate,
        end_date: endDate,
        payment_amount: paymentAmount,
        payment_method: paymentMethod,
        status: 'active'
      };
      
      // 设置套餐字段
      recordData.credits = packageInfo.credits;
      recordData.remaining_credits = packageInfo.credits;
      recordData.package_type = packageInfo.type;
      recordData.package_weight = packageInfo.weight;
      
      const record = await UserPackageRecord.create(recordData);
      
      logger.info(`用户 ${userId} 通过充值开通套餐 ${packageId}，订单号：${orderId}`);
      
      // 创建分成记录（如果用户有邀请关系）
      try {
        await createCommissionRecord({
          userId: userId,
          packageId: packageId,
          orderId: orderId,
          originalAmount: paymentAmount,
          currency: 'CNY',
          commissionType: 'purchase'
        });
        logger.info(`用户 ${userId} 充值激活成功，已尝试创建分成记录`);
      } catch (commissionError) {
        // 分成记录创建失败不影响激活流程
        logger.warn(`用户 ${userId} 充值激活成功，但分成记录创建失败:`, commissionError.message);
      }
      
      return record;
    } catch (error) {
      logger.error('充值开通会员失败:', error);
      throw error;
    }
  }
  
  /**
   * 通过激活码开通会员
   * @param {Object} params - 参数
   * @param {number} params.userId - 用户ID
   * @param {string} params.activationCode - 激活码
   * @param {string} params.userIp - 用户IP
   * @param {string} params.userAgent - 用户代理
   * @returns {Promise<Object>} 开通结果
   */
  static async activateByCode(params) {
    try {
      const { userId, activationCode, userIp, userAgent } = params;
      
      // 查找激活码
      const codeRecord = await ActivationCode.findOne({
        where: {
          code: activationCode,
          status: 'unused'
        },
        include: [{
          model: Package,
          as: 'package'
        }]
      });
      
      if (!codeRecord) {
        throw new Error('激活码无效或已使用');
      }
      
      // 检查激活码是否过期
      if (codeRecord.expires_at && new Date() > codeRecord.expires_at) {
        throw new Error('激活码已过期');
      }
      
      const packageInfo = codeRecord.package;
      if (!packageInfo) {
        throw new Error('激活码关联的套餐不存在');
      }
      
      const now = new Date();
      
      // 查找用户最新的有效会员记录（实现天数叠加）
      const latestActiveRecord = await UserPackageRecord.findOne({
        where: {
          user_id: userId,
          status: {
            [Op.in]: ['active', 'expired']
          }
        },
        order: [['end_date', 'DESC']] // 按结束日期降序排列，获取最晚结束的记录
      });
      
      // 计算开始日期和结束日期（实现天数叠加）
      let startDate, endDate;
      if (latestActiveRecord && latestActiveRecord.end_date > now) {
        // 如果有有效的会员记录，从其结束日期开始叠加
        startDate = new Date(latestActiveRecord.end_date);
        endDate = new Date(startDate.getTime() + packageInfo.validity_days * 24 * 60 * 60 * 1000);
        logger.info(`用户 ${userId} 存在有效会员记录，天数叠加：从 ${startDate.toISOString()} 开始，到 ${endDate.toISOString()} 结束`);
      } else {
        // 如果没有有效的会员记录，从当前时间开始
        startDate = now;
        endDate = new Date(now.getTime() + packageInfo.validity_days * 24 * 60 * 60 * 1000);
        logger.info(`用户 ${userId} 无有效会员记录，从当前时间开始：${startDate.toISOString()} 到 ${endDate.toISOString()}`);
      }
      
      // 开始事务
      const transaction = await UserPackageRecord.sequelize.transaction();
      
      try {
        // 创建用户套餐记录
        const record = await UserPackageRecord.create({
          user_id: userId,
          package_id: packageInfo.id,
          activation_type: 'activation_code',
          activation_code_id: codeRecord.id,
          credits: packageInfo.credits,
          remaining_credits: packageInfo.credits,
          validity_days: packageInfo.validity_days,
          start_date: startDate,
          end_date: endDate,
          package_type: packageInfo.type,
          package_weight: packageInfo.weight,
          status: 'active'
        }, { transaction });
        
        // 更新激活码状态
        await codeRecord.update({
          status: 'used',
          used_by: userId,
          used_at: now,
          usage_ip: userIp,
          usage_user_agent: userAgent
        }, { transaction });
        
        await transaction.commit();
        
        logger.info(`用户 ${userId} 通过激活码 ${activationCode} 开通套餐 ${packageInfo.id}`);
        
        // 创建分成记录（如果用户有邀请关系）
        try {
          await createCommissionRecord({
            userId: userId,
            packageId: packageInfo.id,
            orderId: record.id, // 使用套餐记录ID作为订单ID
            originalAmount: packageInfo.price || 0, // 激活码激活时原始金额为套餐价格
            currency: 'CNY',
            commissionType: 'activation'
          });
          logger.info(`用户 ${userId} 激活码激活成功，已尝试创建分成记录`);
        } catch (commissionError) {
          // 分成记录创建失败不影响激活流程
          logger.warn(`用户 ${userId} 激活码激活成功，但分成记录创建失败:`, commissionError.message);
        }
        
        return record;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('激活码开通会员失败:', error);
      throw error;
    }
  }
  
  /**
   * 消费用户调用次数
   * @param {number} userId - 用户ID
   * @param {number} credits - 消费次数
   * @returns {Promise<boolean>} 是否成功
   */
  static async consumeCredits(userId, credits = 1) {
    try {
      const now = new Date();
      
      // 获取用户有效的套餐记录，按结束时间排序（先消费即将过期的）
      // 包括未来开始的记录，支持积分叠加和消费
      const activeRecords = await UserPackageRecord.findAll({
        where: {
          user_id: userId,
          status: 'active',
          end_date: { [Op.gte]: now }, // 只要结束日期大于当前时间即可
          remaining_credits: { [Op.gt]: 0 }
        },
        order: [['end_date', 'ASC']] // 优先消费即将过期的记录
      });
      
      if (activeRecords.length === 0) {
        throw new Error('用户没有可用的调用次数');
      }
      
      let remainingToConsume = credits;
      const transaction = await UserPackageRecord.sequelize.transaction();
      
      try {
        for (const record of activeRecords) {
          if (remainingToConsume <= 0) break;
          
          const consumeFromThis = Math.min(remainingToConsume, record.remaining_credits);
          const newRemaining = record.remaining_credits - consumeFromThis;
          
          await record.update({
            remaining_credits: newRemaining,
            status: newRemaining === 0 ? 'exhausted' : 'active'
          }, { transaction });
          
          remainingToConsume -= consumeFromThis;
        }
        
        if (remainingToConsume > 0) {
          throw new Error('用户调用次数不足');
        }
        
        await transaction.commit();
        
        // 更新用户总使用次数
        await User.increment('total_usage', {
          by: credits,
          where: { id: userId }
        });
        
        logger.info(`用户 ${userId} 消费 ${credits} 次调用次数`);
        
        return true;
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      logger.error('消费用户调用次数失败:', error);
      throw error;
    }
  }
  
  /**
   * 更新过期的套餐记录状态
   * @returns {Promise<number>} 更新的记录数
   */
  static async updateExpiredRecords() {
    try {
      const now = new Date();
      
      const [updatedCount] = await UserPackageRecord.update(
        { status: 'expired' },
        {
          where: {
            status: 'active',
            end_date: { [Op.lt]: now }
          }
        }
      );
      
      if (updatedCount > 0) {
        logger.info(`更新了 ${updatedCount} 条过期的套餐记录`);
      }
      
      return updatedCount;
    } catch (error) {
      logger.error('更新过期套餐记录失败:', error);
      throw error;
    }
  }

  /**
   * 检查用户是否可以使用AI
   * @param {number} userId - 用户ID
   * @returns {Promise<boolean>} 是否可以使用
   */
  static async canUseAI(userId) {
    try {
      const remainingCredits = await this.getUserRemainingCredits(userId);
      return remainingCredits > 0;
    } catch (error) {
      logger.error('检查用户AI使用权限失败:', error);
      return false;
    }
  }

  /**
   * 消费用户AI使用次数
   * @param {number} userId - 用户ID
   * @param {number} credits - 消费次数，默认为1
   * @returns {Promise<boolean>} 是否成功
   */
  static async consumeAIUsage(userId, credits = 1) {
    try {
      return await this.consumeCredits(userId, credits);
    } catch (error) {
      logger.error('消费用户AI使用次数失败:', error);
      throw error;
    }
  }
}

module.exports = MembershipService;