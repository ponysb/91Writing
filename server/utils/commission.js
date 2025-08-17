const CommissionRecord = require('../models/commissionRecord');
const InviteRecord = require('../models/inviteRecord');
const User = require('../models/user');
const Package = require('../models/package');
const DistributionConfig = require('../models/distributionConfig');
const logger = require('./logger');
const { Op } = require('sequelize');

/**
 * 获取用户的有效分销比例
 */
const getEffectiveCommissionRate = async (userId) => {
  try {
    // 先查找用户个性化配置
    const userConfig = await DistributionConfig.findOne({
      where: { user_id: userId, is_enabled: true }
    });

    if (userConfig) {
      return parseFloat(userConfig.commission_rate);
    }

    // 使用全局默认配置
    const globalConfig = await DistributionConfig.findOne({
      where: { user_id: null, is_enabled: true }
    });

    return globalConfig ? parseFloat(globalConfig.commission_rate) : 0.1;
  } catch (error) {
    console.error('获取有效分销比例失败:', error);
    return 0.1; // 默认10%
  }
};

/**
 * 创建分成记录
 * @param {Object} params - 参数对象
 * @param {number} params.userId - 购买用户ID
 * @param {number} params.packageId - 套餐ID
 * @param {number} params.orderId - 订单ID
 * @param {number} params.originalAmount - 原始金额
 * @param {string} params.currency - 货币类型
 * @param {string} params.commissionType - 分成类型 (purchase/activation/renewal)
 * @returns {Promise<Object>} 分成记录创建结果
 */
async function createCommissionRecord(params) {
  try {
    const { userId, packageId, orderId, originalAmount, currency = 'CNY', commissionType = 'purchase' } = params;
    
    // 查找用户的邀请记录
    const inviteRecord = await InviteRecord.findOne({
      where: {
        invitee_id: userId,
        status: ['registered', 'activated']
      },
      include: [{
        model: User,
        as: 'inviter',
        attributes: ['id', 'username', 'nickname', 'email']
      }]
    });
    
    if (!inviteRecord) {
      logger.info(`用户 ${userId} 没有邀请记录，无需创建分成记录`);
      return {
        success: true,
        message: '用户没有邀请记录',
        data: null
      };
    }
    
    // 获取套餐信息
    const packageInfo = await Package.findByPk(packageId);
    if (!packageInfo) {
      throw new Error('套餐不存在');
    }
    
    // 获取邀请人的有效分成比例
    const commissionRate = await getEffectiveCommissionRate(inviteRecord.inviter_id);
    const commissionAmount = Math.round(originalAmount * commissionRate * 100) / 100; // 保留两位小数
    
    // 创建分成记录
    const commissionRecord = await CommissionRecord.create({
      invite_record_id: inviteRecord.id,
      inviter_id: inviteRecord.inviter_id,
      invitee_id: userId,
      order_id: orderId,
      package_id: packageId,
      commission_type: commissionType,
      original_amount: originalAmount,
      commission_rate: commissionRate,
      commission_amount: commissionAmount,
      currency: currency,
      status: 'pending',
      settlement_status: 'unsettled',
      confirmed_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30天后过期
      metadata: {
        package_name: packageInfo.name,
        package_type: packageInfo.type,
        inviter_info: {
          username: inviteRecord.inviter.username,
          nickname: inviteRecord.inviter.nickname
        }
      }
    });
    
    // 更新邀请记录状态（仅在第一次激活时更新）
    if (inviteRecord.status === 'registered') {
      await inviteRecord.update({
        status: 'activated',
        activate_time: new Date()
      });
    }
    
    logger.info(`为用户 ${userId} 创建分成记录成功，邀请人 ${inviteRecord.inviter_id}，分成金额 ${commissionAmount}`);
    
    return {
      success: true,
      message: '分成记录创建成功',
      data: {
        commission_record: commissionRecord,
        invite_record: inviteRecord,
        inviter: inviteRecord.inviter
      }
    };
    
  } catch (error) {
    logger.error('创建分成记录失败:', error);
    throw error;
  }
}

/**
 * 批量确认分成记录
 * @param {Array} recordIds - 分成记录ID数组
 * @param {number} adminId - 管理员ID
 * @returns {Promise<Object>} 批量确认结果
 */
async function batchConfirmCommissions(recordIds, adminId) {
  try {
    const result = await CommissionRecord.update(
      {
        status: 'confirmed',
        confirmed_at: new Date(),
        metadata: {
          confirmed_by: adminId,
          confirmed_at: new Date()
        }
      },
      {
        where: {
          id: {
            [Op.in]: recordIds
          },
          status: 'pending'
        }
      }
    );
    
    logger.info(`批量确认分成记录成功，影响记录数: ${result[0]}`);
    
    return {
      success: true,
      message: '批量确认成功',
      data: {
        affected_count: result[0]
      }
    };
    
  } catch (error) {
    logger.error('批量确认分成记录失败:', error);
    throw error;
  }
}

/**
 * 结算分成记录
 * @param {number} recordId - 分成记录ID
 * @param {Object} settlementInfo - 结算信息
 * @returns {Promise<Object>} 结算结果
 */
async function settleCommission(recordId, settlementInfo) {
  try {
    const { settlement_method, settlement_account, transaction_id, admin_id } = settlementInfo;
    
    const commissionRecord = await CommissionRecord.findByPk(recordId);
    if (!commissionRecord) {
      throw new Error('分成记录不存在');
    }
    
    if (commissionRecord.status !== 'confirmed') {
      throw new Error('只能结算已确认的分成记录');
    }
    
    await commissionRecord.update({
      settlement_status: 'settled',
      settlement_method,
      settlement_account,
      settlement_time: new Date(),
      transaction_id,
      metadata: {
        ...commissionRecord.metadata,
        settlement_info: {
          settled_by: admin_id,
          settled_at: new Date(),
          method: settlement_method,
          account: settlement_account,
          transaction_id
        }
      }
    });
    
    logger.info(`分成记录 ${recordId} 结算成功`);
    
    return {
      success: true,
      message: '结算成功',
      data: commissionRecord
    };
    
  } catch (error) {
    logger.error('结算分成记录失败:', error);
    throw error;
  }
}

/**
 * 获取用户分成统计
 * @param {number} userId - 用户ID
 * @returns {Promise<Object>} 分成统计数据
 */
async function getUserCommissionStats(userId) {
  try {
    // 作为邀请人的统计
    const inviterStats = await CommissionRecord.findAll({
      where: {
        inviter_id: userId
      },
      attributes: [
        'status',
        'settlement_status',
        [CommissionRecord.sequelize.fn('COUNT', CommissionRecord.sequelize.col('id')), 'count'],
        [CommissionRecord.sequelize.fn('SUM', CommissionRecord.sequelize.col('commission_amount')), 'total_amount']
      ],
      group: ['status', 'settlement_status'],
      raw: true
    });
    
    // 作为被邀请人的统计
    const invitedStats = await CommissionRecord.findAll({
      where: {
        invitee_id: userId
      },
      attributes: [
        'status',
        [CommissionRecord.sequelize.fn('COUNT', CommissionRecord.sequelize.col('id')), 'count'],
        [CommissionRecord.sequelize.fn('SUM', CommissionRecord.sequelize.col('commission_amount')), 'total_amount']
      ],
      group: ['status'],
      raw: true
    });
    
    return {
      success: true,
      data: {
        as_inviter: inviterStats,
        as_invited: invitedStats
      }
    };
    
  } catch (error) {
    logger.error('获取用户分成统计失败:', error);
    throw error;
  }
}

module.exports = {
  createCommissionRecord,
  batchConfirmCommissions,
  settleCommission,
  getUserCommissionStats
};