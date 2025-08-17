const Router = require('koa-router');
const CommissionRecord = require('../models/commissionRecord');
const InviteRecord = require('../models/inviteRecord');
const User = require('../models/user');
const WithdrawalRequest = require('../models/withdrawalRequest');
const DistributionConfig = require('../models/distributionConfig');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

const router = new Router({ prefix: '/api/distribution-accounts' });

/**
 * 管理员权限检查中间件
 */
const requireAdmin = async (ctx, next) => {
  if (!ctx.state.user || ctx.state.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = {
      success: false,
      message: '需要管理员权限'
    };
    return;
  }
  await next();
};

/**
 * 获取配置值的辅助函数
 */
const getConfigValue = async (key, defaultValue) => {
  try {
    const config = await DistributionConfig.findOne({
      where: { 
        config_key: key,
        user_id: null  // 确保获取全局配置
      },
      order: [['updated_at', 'DESC']]  // 确保获取最新的配置记录
    });
    if (config) {
      if (config.config_type === 'number') {
        return parseFloat(config.config_value);
      } else if (config.config_type === 'boolean') {
        return config.config_value === 'true';
      }
      return config.config_value;
    }
    return defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

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

// 管理员获取佣金账户列表
router.get('/admin/list', requireAdmin, async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      sort = 'total_commission',
      order = 'DESC'
    } = ctx.query;

    const offset = (page - 1) * limit;

    // 构建搜索条件
    let userWhereClause = {};
    if (search) {
      userWhereClause = {
        [Op.or]: [
          { username: { [Op.like]: `%${search}%` } },
          { nickname: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ]
      };
    }

    // 获取所有有邀请记录的用户
    const usersWithInvites = await User.findAndCountAll({
      where: userWhereClause,
      include: [
        {
          model: InviteRecord,
          as: 'sentInvites',
          required: true,
          attributes: []
        }
      ],
      attributes: [
        'id',
        'username',
        'nickname',
        'email',
        'phone',
        'created_at'
      ],
      group: ['User.id'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['created_at', 'DESC']],
      distinct: true
    });

    // 为每个用户计算详细的分销数据
    const accountsData = [];
    for (const user of usersWithInvites.rows) {
      // 获取用户的邀请统计
      const inviteStats = await InviteRecord.findOne({
        where: { inviter_id: user.id },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'total_invites'],
          [sequelize.fn('COUNT', sequelize.literal('CASE WHEN invitee_id IS NOT NULL THEN 1 END')), 'registered_invites'],
          [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "activated" THEN 1 END')), 'activated_invites'],
          [sequelize.fn('AVG', sequelize.col('commission_rate')), 'avg_commission_rate']
        ],
        raw: true
      });

      // 获取用户的分成统计
      const commissionStats = await CommissionRecord.findOne({
        where: { inviter_id: user.id },
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('id')), 'total_orders'],
          [sequelize.fn('SUM', sequelize.col('commission_amount')), 'total_commission'],
          [sequelize.fn('SUM', sequelize.literal('CASE WHEN settlement_status = "settled" THEN commission_amount ELSE 0 END')), 'withdrawn_amount'],
          [sequelize.fn('SUM', sequelize.literal('CASE WHEN settlement_status = "unsettled" THEN commission_amount ELSE 0 END')), 'available_amount']
        ],
        raw: true
      });

      // 获取用户当前的有效分成比例（从DistributionConfig获取）
      const currentCommissionRate = await getEffectiveCommissionRate(user.id);

      accountsData.push({
        user_id: user.id,
        username: user.username,
        nickname: user.nickname,
        email: user.email,
        phone: user.phone,
        commission_rate: parseFloat(currentCommissionRate),
        total_invites: parseInt(inviteStats?.total_invites || 0),
        registered_invites: parseInt(inviteStats?.registered_invites || 0),
        activated_invites: parseInt(inviteStats?.activated_invites || 0),
        total_orders: parseInt(commissionStats?.total_orders || 0),
        total_commission: parseFloat(commissionStats?.total_commission || 0),
        withdrawn_amount: parseFloat(commissionStats?.withdrawn_amount || 0),
        available_amount: parseFloat(commissionStats?.available_amount || 0),
        conversion_rate: inviteStats?.total_invites > 0 ? 
          (inviteStats.registered_invites / inviteStats.total_invites * 100).toFixed(2) : '0.00',
        activation_rate: inviteStats?.registered_invites > 0 ? 
          (inviteStats.activated_invites / inviteStats.registered_invites * 100).toFixed(2) : '0.00',
        created_at: user.created_at
      });
    }

    // 排序
    const validSortFields = ['total_commission', 'available_amount', 'total_invites', 'total_orders', 'created_at'];
    if (validSortFields.includes(sort)) {
      accountsData.sort((a, b) => {
        const aVal = a[sort];
        const bVal = b[sort];
        if (order.toUpperCase() === 'DESC') {
          return bVal - aVal;
        } else {
          return aVal - bVal;
        }
      });
    }

    ctx.body = {
      success: true,
      message: '获取佣金账户列表成功',
      data: {
        list: accountsData,
        pagination: {
          total: usersWithInvites.count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(usersWithInvites.count / limit)
        }
      }
    };
  } catch (error) {
    console.error('获取佣金账户列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取佣金账户列表失败',
      error: error.message
    };
  }
});

// 管理员获取单个用户的佣金账户详情
router.get('/admin/:userId/detail', requireAdmin, async (ctx) => {
  try {
    const { userId } = ctx.params;

    // 获取用户信息
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'nickname', 'email', 'phone', 'created_at']
    });

    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }

    // 获取邀请统计
    const inviteStats = await InviteRecord.findAll({
      where: { inviter_id: userId },
      include: [
        {
          model: User,
          as: 'invitee',
          attributes: ['id', 'username', 'nickname', 'created_at'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // 获取分成记录
    const commissionRecords = await CommissionRecord.findAll({
      where: { inviter_id: userId },
      include: [
        {
          model: User,
          as: 'invitee',
          attributes: ['id', 'username', 'nickname']
        },
        {
          model: InviteRecord,
          as: 'inviteRecord',
          attributes: ['id', 'invite_code', 'commission_rate']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // 获取提现记录
    const withdrawalRecords = await WithdrawalRequest.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });

    // 计算统计数据
    const totalCommission = commissionRecords.reduce((sum, record) => sum + parseFloat(record.commission_amount), 0);
    const withdrawnAmount = commissionRecords
      .filter(record => record.settlement_status === 'settled')
      .reduce((sum, record) => sum + parseFloat(record.commission_amount), 0);
    const availableAmount = commissionRecords
      .filter(record => record.settlement_status === 'unsettled')
      .reduce((sum, record) => sum + parseFloat(record.commission_amount), 0);

    const registeredInvites = inviteStats.filter(invite => invite.invitee_id).length;
    const activatedInvites = inviteStats.filter(invite => invite.status === 'activated').length;

    ctx.body = {
      success: true,
      message: '获取佣金账户详情成功',
      data: {
        user_info: user,
        statistics: {
          total_invites: inviteStats.length,
          registered_invites: registeredInvites,
          activated_invites: activatedInvites,
          total_orders: commissionRecords.length,
          total_commission: totalCommission,
          withdrawn_amount: withdrawnAmount,
          available_amount: availableAmount,
          conversion_rate: inviteStats.length > 0 ? (registeredInvites / inviteStats.length * 100).toFixed(2) : '0.00',
          activation_rate: registeredInvites > 0 ? (activatedInvites / registeredInvites * 100).toFixed(2) : '0.00'
        },
        invite_records: inviteStats,
        commission_records: commissionRecords,
        withdrawal_records: withdrawalRecords
      }
    };
  } catch (error) {
    console.error('获取佣金账户详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取佣金账户详情失败',
      error: error.message
    };
  }
});

// 管理员更新用户分成比例
router.put('/admin/:userId/commission-rate', requireAdmin, async (ctx) => {
  try {
    const { userId } = ctx.params;
    const { commission_rate } = ctx.request.body;

    if (commission_rate === undefined || commission_rate < 0 || commission_rate > 1) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '分成比例必须在0-1之间'
      };
      return;
    }

    // 检查用户是否存在
    const user = await User.findByPk(userId);
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }

    // 更新用户所有邀请记录的分成比例
    const [updatedCount] = await InviteRecord.update(
      { commission_rate: commission_rate },
      { where: { inviter_id: userId } }
    );

    ctx.body = {
      success: true,
      message: '分成比例更新成功',
      data: {
        user_id: userId,
        commission_rate: commission_rate,
        updated_records: updatedCount
      }
    };
  } catch (error) {
    console.error('更新分成比例失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新分成比例失败',
      error: error.message
    };
  }
});

// 用户获取自己的分销账户信息
router.get('/my-account', async (ctx) => {
  try {
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '请先登录'
      };
      return;
    }

    const userId = ctx.state.user.id;

    // 获取邀请统计
    const inviteStats = await InviteRecord.findOne({
      where: { inviter_id: userId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_invites'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN invitee_id IS NOT NULL THEN 1 END')), 'registered_invites'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN status = "activated" THEN 1 END')), 'activated_invites']
      ],
      raw: true
    });

    // 获取分成统计
    const commissionStats = await CommissionRecord.findOne({
      where: { inviter_id: userId },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_orders'],
        [sequelize.fn('SUM', sequelize.col('commission_amount')), 'total_commission'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN settlement_status = "settled" THEN commission_amount ELSE 0 END')), 'withdrawn_amount'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN settlement_status = "unsettled" THEN commission_amount ELSE 0 END')), 'available_amount']
      ],
      raw: true
    });

    // 获取当前有效分成比例
    const currentCommissionRate = await getEffectiveCommissionRate(userId);

    // 获取最低提现金额
    const minWithdrawalAmount = await getConfigValue('min_withdrawal_amount', 10);
    console.log('[DEBUG] /my-account 接口获取 min_withdrawal_amount:', minWithdrawalAmount);

    ctx.body = {
      success: true,
      message: '获取分销账户信息成功',
      data: {
        commission_rate: parseFloat(currentCommissionRate),
        total_invites: parseInt(inviteStats?.total_invites || 0),
        registered_invites: parseInt(inviteStats?.registered_invites || 0),
        activated_invites: parseInt(inviteStats?.activated_invites || 0),
        total_orders: parseInt(commissionStats?.total_orders || 0),
        total_commission: parseFloat(commissionStats?.total_commission || 0),
        withdrawn_amount: parseFloat(commissionStats?.withdrawn_amount || 0),
        available_amount: parseFloat(commissionStats?.available_amount || 0),
        min_withdrawal_amount: minWithdrawalAmount,
        conversion_rate: inviteStats?.total_invites > 0 ? 
          (inviteStats.registered_invites / inviteStats.total_invites * 100).toFixed(2) : '0.00',
        activation_rate: inviteStats?.registered_invites > 0 ? 
          (inviteStats.activated_invites / inviteStats.registered_invites * 100).toFixed(2) : '0.00'
      }
    };
  } catch (error) {
    console.error('获取分销账户信息失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取分销账户信息失败',
      error: error.message
    };
  }
});

// 用户获取可提现的分成记录
router.get('/my-withdrawable-records', async (ctx) => {
  try {
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '请先登录'
      };
      return;
    }

    const userId = ctx.state.user.id;
    const { page = 1, limit = 10 } = ctx.query;
    const offset = (page - 1) * limit;

    // 获取可提现的分成记录（已确认且未结算）
    const { count, rows } = await CommissionRecord.findAndCountAll({
      where: {
        inviter_id: userId,
        status: 'confirmed',
        settlement_status: 'unsettled'
      },
      include: [
        {
          model: User,
          as: 'invitee',
          attributes: ['id', 'username', 'nickname']
        },
        {
          model: InviteRecord,
          as: 'inviteRecord',
          attributes: ['id', 'invite_code']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // 计算总可提现金额
    const totalAvailableAmount = rows.reduce((sum, record) => {
      return sum + parseFloat(record.commission_amount);
    }, 0);

    ctx.body = {
      success: true,
      message: '获取可提现记录成功',
      data: {
        list: rows,
        total_available_amount: totalAvailableAmount,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    };
  } catch (error) {
    console.error('获取可提现记录失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取可提现记录失败',
      error: error.message
    };
  }
});

module.exports = router;