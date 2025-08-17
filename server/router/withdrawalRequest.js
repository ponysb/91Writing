const Router = require('koa-router');
const WithdrawalRequest = require('../models/withdrawalRequest');
const CommissionRecord = require('../models/commissionRecord');
const User = require('../models/user');
const DistributionConfig = require('../models/distributionConfig');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

const router = new Router({ prefix: '/api/withdrawal-requests' });

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

// 用户获取自己的提现申请列表
router.get('/', async (ctx) => {
  try {
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '请先登录'
      };
      return;
    }

    const { page = 1, limit = 10, status } = ctx.query;
    const offset = (page - 1) * limit;
    const whereClause = { user_id: ctx.state.user.id };

    if (status) {
      whereClause.status = status;
    }

    const { count, rows } = await WithdrawalRequest.findAndCountAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    ctx.body = {
      success: true,
      message: '获取提现申请列表成功',
      data: {
        list: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    };
  } catch (error) {
    console.error('获取提现申请列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取提现申请列表失败',
      error: error.message
    };
  }
});

// 管理员获取所有提现申请列表
router.get('/admin/list', requireAdmin, async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      user_id,
      start_date,
      end_date,
      search
    } = ctx.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (status) {
      whereClause.status = status;
    }
    if (user_id) {
      whereClause.user_id = user_id;
    }
    if (start_date && end_date) {
      whereClause.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    const includeClause = [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'nickname', 'email', 'phone'],
        where: search ? {
          [Op.or]: [
            { username: { [Op.like]: `%${search}%` } },
            { nickname: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } }
          ]
        } : undefined
      }
    ];

    const { count, rows } = await WithdrawalRequest.findAndCountAll({
      where: whereClause,
      include: includeClause,
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    ctx.body = {
      success: true,
      message: '获取提现申请列表成功',
      data: {
        list: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    };
  } catch (error) {
    console.error('获取提现申请列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取提现申请列表失败',
      error: error.message
    };
  }
});

// 用户创建提现申请
router.post('/', async (ctx) => {
  try {
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '请先登录'
      };
      return;
    }

    const {
      commission_record_ids,
      withdrawal_method,
      withdrawal_account,
      account_name,
      withdrawal_notes
    } = ctx.request.body;

    // 验证必填字段
    if (!commission_record_ids || !Array.isArray(commission_record_ids) || commission_record_ids.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请选择要提现的分成记录'
      };
      return;
    }

    if (!withdrawal_method || !withdrawal_account || !account_name) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '提现方式、提现账户和账户姓名不能为空'
      };
      return;
    }

    // 验证提现方式
    const validMethods = ['alipay', 'wechat', 'bank_transfer'];
    if (!validMethods.includes(withdrawal_method)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '无效的提现方式'
      };
      return;
    }

    // 验证分成记录是否属于当前用户且可提现
    const commissionRecords = await CommissionRecord.findAll({
      where: {
        id: { [Op.in]: commission_record_ids },
        inviter_id: ctx.state.user.id,
        status: { [Op.in]: ['pending', 'confirmed'] },
        settlement_status: 'unsettled'
      }
    });

    if (commissionRecords.length !== commission_record_ids.length) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '部分分成记录不存在或不可提现'
      };
      return;
    }

    // 计算提现金额
    const withdrawalAmount = commissionRecords.reduce((sum, record) => {
      return sum + parseFloat(record.commission_amount);
    }, 0);

    // 检查最低提现金额
    const minWithdrawalAmount = await getConfigValue('min_withdrawal_amount', 10);
    console.log('[DEBUG] withdrawalRequest 接口获取 min_withdrawal_amount:', minWithdrawalAmount);
    if (withdrawalAmount < minWithdrawalAmount) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: `提现金额不能低于${minWithdrawalAmount}元`
      };
      return;
    }

    // 开始事务
    const transaction = await sequelize.transaction();

    try {
      // 创建提现申请
      const withdrawalRequest = await WithdrawalRequest.create({
        user_id: ctx.state.user.id,
        withdrawal_amount: withdrawalAmount,
        commission_record_ids: commission_record_ids,
        withdrawal_method,
        withdrawal_account,
        account_name,
        withdrawal_notes,
        status: 'pending'
      }, { transaction });

      // 更新分成记录状态为处理中
      await CommissionRecord.update(
        { settlement_status: 'processing' },
        {
          where: { id: { [Op.in]: commission_record_ids } },
          transaction
        }
      );

      await transaction.commit();

      ctx.body = {
        success: true,
        message: '提现申请提交成功',
        data: withdrawalRequest
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('创建提现申请失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建提现申请失败',
      error: error.message
    };
  }
});

// 管理员审核提现申请
router.put('/admin/:id/review', requireAdmin, async (ctx) => {
  try {
    const { id } = ctx.params;
    const { status, admin_notes, transaction_id } = ctx.request.body;

    // 验证状态
    const validStatuses = ['approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '无效的审核状态'
      };
      return;
    }

    const withdrawalRequest = await WithdrawalRequest.findByPk(id);
    if (!withdrawalRequest) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '提现申请不存在'
      };
      return;
    }

    if (withdrawalRequest.status !== 'pending') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '该提现申请已被处理'
      };
      return;
    }

    // 开始事务
    const transaction = await sequelize.transaction();

    try {
      // 更新提现申请状态
      await withdrawalRequest.update({
        status,
        admin_notes,
        transaction_id,
        processed_by: ctx.state.user.id,
        processed_at: new Date()
      }, { transaction });

      // 更新关联的分成记录状态
      if (status === 'approved') {
        // 批准：标记为已结算
        await CommissionRecord.update(
          {
            settlement_status: 'settled',
            settlement_time: new Date(),
            settlement_method: withdrawalRequest.withdrawal_method,
            settlement_account: withdrawalRequest.withdrawal_account,
            transaction_id
          },
          {
            where: { id: { [Op.in]: withdrawalRequest.commission_record_ids } },
            transaction
          }
        );
      } else {
        // 拒绝：恢复为未结算状态
        await CommissionRecord.update(
          { settlement_status: 'unsettled' },
          {
            where: { id: { [Op.in]: withdrawalRequest.commission_record_ids } },
            transaction
          }
        );
      }

      await transaction.commit();

      ctx.body = {
        success: true,
        message: `提现申请${status === 'approved' ? '批准' : '拒绝'}成功`,
        data: withdrawalRequest
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('审核提现申请失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '审核提现申请失败',
      error: error.message
    };
  }
});

// 管理员标记提现完成
router.put('/admin/:id/complete', requireAdmin, async (ctx) => {
  try {
    const { id } = ctx.params;
    const { transaction_id } = ctx.request.body;

    const withdrawalRequest = await WithdrawalRequest.findByPk(id);
    if (!withdrawalRequest) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '提现申请不存在'
      };
      return;
    }

    if (withdrawalRequest.status !== 'approved') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '只能完成已批准的提现申请'
      };
      return;
    }

    await withdrawalRequest.update({
      status: 'completed',
      transaction_id: transaction_id || withdrawalRequest.transaction_id,
      completed_at: new Date()
    });

    ctx.body = {
      success: true,
      message: '提现完成标记成功',
      data: withdrawalRequest
    };
  } catch (error) {
    console.error('标记提现完成失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '标记提现完成失败',
      error: error.message
    };
  }
});

// 用户取消提现申请
router.put('/:id/cancel', async (ctx) => {
  try {
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '请先登录'
      };
      return;
    }

    const { id } = ctx.params;

    const withdrawalRequest = await WithdrawalRequest.findOne({
      where: {
        id,
        user_id: ctx.state.user.id
      }
    });

    if (!withdrawalRequest) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '提现申请不存在'
      };
      return;
    }

    if (withdrawalRequest.status !== 'pending') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '只能取消待审核的提现申请'
      };
      return;
    }

    // 开始事务
    const transaction = await sequelize.transaction();

    try {
      // 更新提现申请状态
      await withdrawalRequest.update({
        status: 'cancelled'
      }, { transaction });

      // 恢复分成记录状态
      await CommissionRecord.update(
        { settlement_status: 'unsettled' },
        {
          where: { id: { [Op.in]: withdrawalRequest.commission_record_ids } },
          transaction
        }
      );

      await transaction.commit();

      ctx.body = {
        success: true,
        message: '提现申请取消成功',
        data: withdrawalRequest
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('取消提现申请失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '取消提现申请失败',
      error: error.message
    };
  }
});

// 获取提现申请详情
router.get('/:id', async (ctx) => {
  try {
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '请先登录'
      };
      return;
    }

    const { id } = ctx.params;
    const whereClause = { id };

    // 非管理员只能查看自己的申请
    if (ctx.state.user.role !== 'admin') {
      whereClause.user_id = ctx.state.user.id;
    }

    const withdrawalRequest = await WithdrawalRequest.findOne({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'nickname', 'email', 'phone']
        }
      ]
    });

    if (!withdrawalRequest) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '提现申请不存在'
      };
      return;
    }

    // 获取关联的分成记录
    const commissionRecords = await CommissionRecord.findAll({
      where: {
        id: { [Op.in]: withdrawalRequest.commission_record_ids }
      },
      include: [
        {
          model: User,
          as: 'invitee',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });

    ctx.body = {
      success: true,
      message: '获取提现申请详情成功',
      data: {
        ...withdrawalRequest.toJSON(),
        commission_records: commissionRecords
      }
    };
  } catch (error) {
    console.error('获取提现申请详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取提现申请详情失败',
      error: error.message
    };
  }
});

module.exports = router;