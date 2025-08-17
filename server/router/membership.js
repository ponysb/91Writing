const Router = require('koa-router');
const MembershipService = require('../services/membershipService');
const UserPackageRecord = require('../models/userPackageRecord');
const Package = require('../models/package');
const ActivationCode = require('../models/activationCode');
const PaymentOrder = require('../models/PaymentOrder');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const router = new Router({ prefix: '/api/membership' });

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
 * 管理员查询特定用户的会员记录
 */
router.get('/admin/user/:username', requireAdmin, async (ctx) => {
  try {
    const { username } = ctx.params;
    const User = require('../models/user');
    
    // 查找用户
    const user = await User.findOne({ where: { username } });
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }
    
    // 获取剩余次数
    const remainingCredits = await MembershipService.getUserRemainingCredits(user.id);
    
    // 获取当前会员等级
    const currentMembership = await MembershipService.getUserCurrentMembership(user.id);
    
    // 获取所有会员记录
    const now = new Date();
    const allRecords = await UserPackageRecord.findAll({
      where: {
        user_id: user.id
      },
      include: [{
        model: Package,
        as: 'package'
      }],
      order: [['created_at', 'DESC']]
    });
    
    // 获取有效记录
    const activeRecords = await UserPackageRecord.findAll({
      where: {
        user_id: user.id,
        status: 'active',
        start_date: { [Op.lte]: now },
        end_date: { [Op.gte]: now }
      },
      include: [{
        model: Package,
        as: 'package'
      }]
    });
    
    ctx.body = {
      success: true,
      message: '查询用户会员记录成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          is_admin: user.is_admin,
          total_usage: user.total_usage
        },
        remaining_credits: remainingCredits,
        current_membership: currentMembership,
        active_records_count: activeRecords.length,
        active_records: activeRecords.map(record => ({
          id: record.id,
          package_name: record.package?.name,
          remaining_credits: record.remaining_credits,
          start_date: record.start_date,
          end_date: record.end_date,
          status: record.status
        })),
        all_records_count: allRecords.length,
        all_records: allRecords.map(record => ({
          id: record.id,
          package_name: record.package?.name,
          remaining_credits: record.remaining_credits,
          start_date: record.start_date,
          end_date: record.end_date,
          status: record.status,
          created_at: record.created_at
        }))
      }
    };
  } catch (error) {
    logger.error('查询用户会员记录失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '查询用户会员记录失败',
      error: error.message
    };
  }
});

/**
 * 获取用户剩余调用次数
 */
router.get('/remaining-credits', async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    
    const remainingCredits = await MembershipService.getUserRemainingCredits(userId);
    
    ctx.body = {
      success: true,
      message: '获取剩余次数成功',
      data: {
        remaining_credits: remainingCredits
      }
    };
  } catch (error) {
    logger.error('获取用户剩余次数失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取剩余次数失败',
      error: error.message
    };
  }
});

/**
 * 获取用户当前会员等级
 */
router.get('/current-membership', async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    
    const membership = await MembershipService.getUserCurrentMembership(userId);
    
    ctx.body = {
      success: true,
      message: '获取当前会员等级成功',
      data: membership
    };
  } catch (error) {
    logger.error('获取用户当前会员等级失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取当前会员等级失败',
      error: error.message
    };
  }
});

/**
 * 获取用户会员开通记录列表（用户端）
 */
router.get('/records', async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const { page = 1, limit = 10, status } = ctx.query;
    
    const result = await MembershipService.getUserMembershipRecords(userId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status
    });
    
    ctx.body = {
      success: true,
      message: '获取会员记录成功',
      data: result
    };
  } catch (error) {
    logger.error('获取用户会员记录失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取会员记录失败',
      error: error.message
    };
  }
});

/**
 * 获取所有用户会员开通记录列表（管理员端）
 */
router.get('/admin/records', requireAdmin, async (ctx) => {
  try {
    const { page = 1, limit = 10, status, user_id, package_type, activation_type } = ctx.query;
    
    const where = {};
    if (status) {
      where.status = status;
    }
    if (user_id) {
      where.user_id = parseInt(user_id);
    }
    if (package_type) {
      where.package_type = package_type;
    }
    if (activation_type) {
      where.activation_type = activation_type;
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows } = await UserPackageRecord.findAndCountAll({
      where,
      include: [
        {
          model: Package,
          as: 'package',
          attributes: ['id', 'name', 'type', 'credits', 'validity_days', 'price', 'weight']
        },
        {
          model: require('../models/user'),
          as: 'user',
          attributes: ['id', 'username', 'email']
        },
        {
          model: ActivationCode,
          as: 'activationCode',
          attributes: ['id', 'code', 'status'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });

    // 格式化返回数据，添加package_name字段
    const formattedRecords = rows.map(record => {
      const recordData = record.toJSON();
      return {
        ...recordData,
        package_name: recordData.package ? recordData.package.name : null,
        User: recordData.user,
        Package: recordData.package,
        ActivationCode: recordData.activationCode
      };
    });
    
    ctx.body = {
      success: true,
      message: '获取所有用户会员记录成功',
      data: {
        records: formattedRecords,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / parseInt(limit)),
          total_count: count,
          per_page: parseInt(limit)
        }
      }
    };
  } catch (error) {
    logger.error('获取所有用户会员记录失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取所有用户会员记录失败',
      error: error.message
    };
  }
});

/**
 * 通过激活码开通会员
 */
router.post('/activate-by-code', async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const { activation_code } = ctx.request.body;
    
    if (!activation_code) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '激活码不能为空'
      };
      return;
    }
    
    const userIp = ctx.request.ip || ctx.request.header['x-forwarded-for'] || ctx.request.header['x-real-ip'] || 'unknown';
    const userAgent = ctx.request.header['user-agent'] || 'unknown';
    
    const record = await MembershipService.activateByCode({
      userId,
      activationCode: activation_code,
      userIp,
      userAgent
    });
    
    ctx.body = {
      success: true,
      message: '激活码开通会员成功',
      data: {
        id: record.id,
        package_type: record.package_type,
        credits: record.credits,
        end_date: record.end_date
      }
    };
  } catch (error) {
    logger.error('激活码开通会员失败:', error);
    ctx.status = 400;
    ctx.body = {
      success: false,
      message: error.message || '激活码开通会员失败'
    };
  }
});

/**
 * 通过充值开通会员（模拟接口，实际需要对接支付系统）
 */
router.post('/activate-by-recharge', async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    const { package_id, payment_amount, payment_method = 'alipay' } = ctx.request.body;
    
    if (!package_id || !payment_amount) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '套餐ID和支付金额不能为空'
      };
      return;
    }
    
    // 生成模拟订单号
    const orderId = `ORDER_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const record = await MembershipService.activateByRecharge({
      userId,
      packageId: package_id,
      orderId,
      paymentAmount: payment_amount,
      paymentMethod: payment_method
    });
    
    ctx.body = {
      success: true,
      message: '充值开通会员成功',
      data: {
        id: record.id,
        order_id: orderId,
        package_type: record.package_type,
        credits: record.credits,
        end_date: record.end_date
      }
    };
  } catch (error) {
    logger.error('充值开通会员失败:', error);
    ctx.status = 400;
    ctx.body = {
      success: false,
      message: error.message || '充值开通会员失败'
    };
  }
});

/**
 * 获取完整的会员开通记录（包含激活码和支付订单）
 */
router.get('/admin/all-records', requireAdmin, async (ctx) => {
  try {
    const { page = 1, limit = 10, status, user_id, package_type, activation_type } = ctx.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 查询会员开通记录
    const membershipWhere = {};
    if (status) membershipWhere.status = status;
    if (user_id) membershipWhere.user_id = parseInt(user_id);
    if (package_type) membershipWhere.package_type = package_type;
    if (activation_type) membershipWhere.activation_type = activation_type;
    
    const membershipRecords = await UserPackageRecord.findAll({
      where: membershipWhere,
      include: [
        {
          model: Package,
          as: 'package',
          attributes: ['id', 'name', 'type', 'credits', 'validity_days', 'price']
        },
        {
          model: require('../models/user'),
          as: 'user',
          attributes: ['id', 'username', 'email']
        },
        {
          model: ActivationCode,
          as: 'activationCode',
          attributes: ['id', 'code'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    // 查询支付订单记录（所有状态）
    const paymentWhere = { product_type: 'vip' };
    if (user_id) paymentWhere.user_id = parseInt(user_id);
    if (status) {
      if (status === 'paid_no_membership') {
        paymentWhere.status = 'paid';
      } else if (status !== 'active' && status !== 'expired' && status !== 'cancelled') {
        paymentWhere.status = status;
      }
    }
    
    const paymentRecords = await PaymentOrder.findAll({
      where: paymentWhere,
      include: [
        {
          model: require('../models/user'),
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['created_at', 'DESC']]
    });
    
    // 合并和格式化数据
    const allRecords = [];
    
    // 添加会员开通记录
    membershipRecords.forEach(record => {
      allRecords.push({
        id: `membership_${record.id}`,
        type: 'membership_record',
        user_id: record.user_id,
        user: record.user,
        package_id: record.package_id,
        package: record.package,
        activation_type: record.activation_type,
        activation_code: record.activationCode,
        order_id: record.order_id,
        credits: record.credits,
        remaining_credits: record.remaining_credits,
        validity_days: record.validity_days,
        start_date: record.start_date,
        end_date: record.end_date,
        package_type: record.package_type,
        status: record.status,
        payment_amount: record.payment_amount,
        payment_method: record.payment_method,
        created_at: record.created_at,
        updated_at: record.updated_at
      });
    });
    
    // 添加支付订单记录（查找对应的会员记录）
    for (const payment of paymentRecords) {
      // 检查是否已经有对应的会员记录
      const existingRecord = allRecords.find(r => 
        r.type === 'membership_record' && 
        r.order_id === payment.out_trade_no
      );
      
      if (!existingRecord) {
        // 如果没有对应的会员记录，添加支付记录
        let recordStatus = payment.status;
        let note = '';
        
        if (payment.status === 'paid') {
          recordStatus = 'paid_no_membership';
          note = '支付成功但未创建会员记录';
        } else if (payment.status === 'pending') {
          note = '待支付';
        } else if (payment.status === 'expired') {
          note = '订单已过期';
        } else if (payment.status === 'failed') {
          note = '支付失败';
        }
        
        allRecords.push({
          id: `payment_${payment.id}`,
          type: 'payment_record',
          user_id: payment.user_id,
          user: payment.user,
          package_id: payment.product_id,
          package: payment.product_info,
          activation_type: 'recharge',
          order_id: payment.out_trade_no,
          payment_amount: payment.total_fee,
          payment_method: 'ltzf',
          status: recordStatus,
          created_at: payment.created_at,
          updated_at: payment.updated_at,
          success_time: payment.success_time,
          note: note
        });
      }
    }
    
    // 按创建时间排序
    allRecords.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // 分页
    const total = allRecords.length;
    const paginatedRecords = allRecords.slice(offset, offset + parseInt(limit));
    
    ctx.body = {
      success: true,
      message: '获取完整会员开通记录成功',
      data: {
        records: paginatedRecords,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: total,
          total_pages: Math.ceil(total / parseInt(limit))
        },
        summary: {
          total_membership_records: membershipRecords.length,
          total_payment_records: paymentRecords.length,
          total_combined: total
        }
      }
    };
  } catch (error) {
    logger.error('获取完整会员开通记录失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取完整会员开通记录失败',
      error: error.message
    };
  }
});

/**
 * 获取统计信息（管理员）
 */
router.get('/statistics', async (ctx) => {
  try {
    const userId = ctx.state.user.id;
    
    // 获取剩余次数
    const remainingCredits = await MembershipService.getUserRemainingCredits(userId);
    
    // 获取当前会员等级
    const currentMembership = await MembershipService.getUserCurrentMembership(userId);
    
    // 获取总开通次数
    const totalActivations = await UserPackageRecord.count({
      where: { user_id: userId }
    });
    
    // 获取总消费次数（从用户表获取）
    const User = require('../models/user');
    const user = await User.findByPk(userId, {
      attributes: ['total_usage']
    });
    
    // 获取即将过期的会员记录
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const expiringRecords = await UserPackageRecord.findAll({
      where: {
        user_id: userId,
        status: 'active',
        end_date: {
          [Op.between]: [now, sevenDaysLater]
        }
      },
      include: [{
        model: Package,
        as: 'package',
        attributes: ['name', 'type']
      }],
      order: [['end_date', 'ASC']]
    });
    
    ctx.body = {
      success: true,
      message: '获取会员统计信息成功',
      data: {
        remaining_credits: remainingCredits,
        current_membership: currentMembership,
        total_activations: totalActivations,
        total_usage: user?.total_usage || 0,
        expiring_soon: expiringRecords.map(record => ({
          id: record.id,
          package_name: record.package?.name,
          package_type: record.package_type,
          end_date: record.end_date,
          remaining_credits: record.remaining_credits
        }))
      }
    };
  } catch (error) {
    logger.error('获取用户会员统计信息失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取会员统计信息失败',
      error: error.message
    };
  }
});

module.exports = router;