const Router = require('koa-router');
const { Op } = require('sequelize');
const User = require('../models/user');
const InviteRecord = require('../models/inviteRecord');
const DistributionConfig = require('../models/distributionConfig');
const { sequelize } = require('../config/database');
const db = sequelize;
const logger = require('../utils/logger');
const cryptoUtils = require('../utils/crypto');

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

const router = new Router({ prefix: '/api/invite-records' });

// 管理员获取所有邀请记录列表
router.get('/admin/list', async (ctx) => {
  try {
    // 验证管理员权限
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，仅管理员可访问'
      };
      return;
    }

    const {
      page = 1,
      limit = 10,
      status,
      inviter_id,
      invitee_id,
      search,
      sort = 'created_at',
      order = 'DESC'
    } = ctx.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // 筛选条件
    if (status) {
      whereClause.status = status;
    }
    if (inviter_id) {
      whereClause.inviter_id = inviter_id;
    }
    if (invitee_id) {
      whereClause.invitee_id = invitee_id;
    }
    if (search) {
      whereClause[Op.or] = [
        { invite_code: { [Op.like]: `%${search}%` } },
        { invitee_username: { [Op.like]: `%${search}%` } },
        { invitee_email: { [Op.like]: `%${search}%` } },
        { invitee_phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await InviteRecord.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'username', 'nickname', 'email', 'avatar'],
          required: false
        },
        {
          model: User,
          as: 'invitee',
          attributes: ['id', 'username', 'nickname', 'email', 'avatar'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]]
    });

    ctx.body = {
      success: true,
      message: '获取邀请记录列表成功',
      data: {
        inviteRecords: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    };
  } catch (error) {
    console.error('获取邀请记录列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取邀请记录列表失败'
    };
  }
});

// 用户获取自己的邀请记录列表
router.get('/my-records', async (ctx) => {
  try {
    // 验证用户权限
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '请先登录'
      };
      return;
    }

    const {
      page = 1,
      limit = 10,
      status,
      search,
      sort = 'created_at',
      order = 'DESC'
    } = ctx.query;

    const offset = (page - 1) * limit;
    const whereClause = {
      inviter_id: ctx.state.user.id // 只能查看自己的邀请记录
    };

    // 筛选条件
    if (status) {
      whereClause.status = status;
    }
    if (search) {
      whereClause[Op.or] = [
        { invite_code: { [Op.like]: `%${search}%` } },
        { invitee_username: { [Op.like]: `%${search}%` } },
        { invitee_email: { [Op.like]: `%${search}%` } },
        { invitee_phone: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await InviteRecord.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'invitee',
          attributes: ['id', 'username', 'nickname', 'email', 'avatar'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]]
    });

    // 获取当前用户的有效分成比例
    const effectiveCommissionRate = await getEffectiveCommissionRate(ctx.state.user.id);

    // 为每条记录添加有效的分成比例，并覆盖原始的commission_rate
    const recordsWithCommissionRate = rows.map(record => {
      const recordData = record.toJSON();
      recordData.commission_rate = effectiveCommissionRate; // 用动态计算的值覆盖原始值
      recordData.effective_commission_rate = effectiveCommissionRate;
      return recordData;
    });

    ctx.body = {
      success: true,
      message: '获取我的邀请记录成功',
      data: {
        inviteRecords: recordsWithCommissionRate,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    };
  } catch (error) {
    console.error('获取我的邀请记录失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取我的邀请记录失败'
    };
  }
});

// 获取用户自己的邀请码
router.get('/my-invite-code', async (ctx) => {
  try {
    // 验证用户权限
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '请先登录'
      };
      return;
    }

    const userId = ctx.state.user.id;
    
    // 从用户表获取邀请码
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'nickname', 'invite_code']
    });

    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }

    // 如果用户还没有邀请码，生成一个
    if (!user.invite_code) {
      const inviteCode = cryptoUtils.generateInviteCode(userId);
      
      // 更新用户的邀请码
      await user.update({ invite_code: inviteCode });
      user.invite_code = inviteCode;
    }

    // 获取该用户的邀请统计信息
     const inviteStats = await InviteRecord.findAll({
       where: { inviter_id: userId },
       attributes: [
         [db.fn('COUNT', db.col('id')), 'total_invites'],
         [db.fn('COUNT', db.literal('CASE WHEN status = "pending" THEN 1 END')), 'pending_invites']
       ],
       raw: true
     });

    // 统计成功开通会员的邀请用户数量
    const successfulInvitesCount = await db.query(`
      SELECT COUNT(DISTINCT ir.invitee_id) as successful_invites
      FROM invite_records ir
      INNER JOIN user_package_records upr ON ir.invitee_id = upr.user_id
      WHERE ir.inviter_id = :userId
        AND ir.status IN ('registered', 'activated')
        AND upr.status = 'active'
    `, {
      replacements: { userId },
      type: db.QueryTypes.SELECT
    });

    const stats = inviteStats[0] || {
      total_invites: 0,
      pending_invites: 0
    };
    
    // 添加成功开通会员的邀请数量
    stats.successful_invites = successfulInvitesCount[0]?.successful_invites || 0;

    ctx.body = {
      success: true,
      message: '获取邀请码成功',
      data: {
        user_info: {
          id: user.id,
          username: user.username,
          nickname: user.nickname
        },
        invite_code: user.invite_code,
        invite_url: `${ctx.request.origin}/register?invite_code=${user.invite_code}`,
        stats: {
          total_invites: parseInt(stats.total_invites) || 0,
          successful_invites: parseInt(stats.successful_invites) || 0,
          pending_invites: parseInt(stats.pending_invites) || 0
        }
      }
    };
  } catch (error) {
    console.error('获取用户邀请码失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取用户邀请码失败'
    };
  }
});

// 获取单个邀请记录详情
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const whereClause = { id };
    
    // 权限控制：普通用户只能查看自己的邀请记录
    if (ctx.state.user && ctx.state.user.role !== 'admin') {
      whereClause.inviter_id = ctx.state.user.id;
    }

    const inviteRecord = await InviteRecord.findOne({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'username', 'nickname', 'email', 'avatar'],
          required: false
        },
        {
          model: User,
          as: 'invitee',
          attributes: ['id', 'username', 'nickname', 'email', 'avatar'],
          required: false
        }
      ]
    });

    if (!inviteRecord) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '邀请记录不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '获取邀请记录详情成功',
      data: inviteRecord
    };
  } catch (error) {
    console.error('获取邀请记录详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取邀请记录详情失败'
    };
  }
});

// 创建邀请记录（生成邀请码）
router.post('/', async (ctx) => {
  try {
    const {
      commission_rate,
      expire_days = 30,
      source,
      notes
    } = ctx.request.body;

    // 验证用户权限
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '请先登录'
      };
      return;
    }

    // 获取有效的分销比例
    let effectiveRate = 0.1; // 默认值
    
    if (commission_rate !== undefined) {
      // 如果明确指定了分销比例，使用指定值
      effectiveRate = parseFloat(commission_rate);
    } else {
      // 从分销配置系统获取用户的有效分销比例
      try {
        // 先查找用户个性化配置
        const userConfig = await DistributionConfig.findOne({
          where: { user_id: ctx.state.user.id, is_enabled: true }
        });
        
        if (userConfig) {
          effectiveRate = parseFloat(userConfig.commission_rate);
        } else {
          // 使用全局默认配置
          const globalConfig = await DistributionConfig.findOne({
            where: { user_id: null, is_enabled: true }
          });
          if (globalConfig) {
            effectiveRate = parseFloat(globalConfig.commission_rate);
          }
        }
      } catch (configError) {
        console.warn('获取分销配置失败，使用默认值:', configError);
      }
    }

    // 生成邀请码
    const inviteCode = cryptoUtils.generateInviteCode(ctx.state.user.id);

    // 计算过期时间
    const expireTime = new Date();
    expireTime.setDate(expireTime.getDate() + parseInt(expire_days));

    const inviteRecord = await InviteRecord.create({
      inviter_id: ctx.state.user.id,
      invite_code: inviteCode,
      commission_rate: effectiveRate,
      expire_time: expireTime,
      source,
      notes
    });

    ctx.body = {
      success: true,
      message: '邀请码生成成功',
      data: {
        id: inviteRecord.id,
        invite_code: inviteRecord.invite_code,
        commission_rate: inviteRecord.commission_rate,
        expire_time: inviteRecord.expire_time,
        created_at: inviteRecord.created_at
      }
    };
  } catch (error) {
    console.error('创建邀请记录失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建邀请记录失败'
    };
  }
});

// 更新邀请记录
router.put('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const updateData = ctx.request.body;

    // 验证管理员权限
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足'
      };
      return;
    }

    const inviteRecord = await InviteRecord.findByPk(id);
    if (!inviteRecord) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '邀请记录不存在'
      };
      return;
    }

    // 过滤允许更新的字段
    const allowedFields = [
      'commission_rate', 'status', 'expire_time', 'notes', 'metadata'
    ];
    const filteredData = {};
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        filteredData[field] = updateData[field];
      }
    });

    await inviteRecord.update(filteredData);

    ctx.body = {
      success: true,
      message: '邀请记录更新成功',
      data: {
        id: inviteRecord.id,
        ...filteredData,
        updated_at: new Date()
      }
    };
  } catch (error) {
    console.error('更新邀请记录失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新邀请记录失败'
    };
  }
});

// 删除邀请记录（管理员权限）
router.delete('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;

    // 验证管理员权限
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足'
      };
      return;
    }

    const inviteRecord = await InviteRecord.findByPk(id);
    if (!inviteRecord) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '邀请记录不存在'
      };
      return;
    }

    await inviteRecord.destroy();

    ctx.body = {
      success: true,
      message: '邀请记录删除成功'
    };
  } catch (error) {
    console.error('删除邀请记录失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除邀请记录失败'
    };
  }
});

// 验证邀请码
router.post('/validate', async (ctx) => {
  try {
    const { invite_code } = ctx.request.body;

    if (!invite_code) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供邀请码'
      };
      return;
    }

    // 首先在InviteRecord表中查找邀请码
    let inviteRecord = await InviteRecord.findOne({
      where: {
        invite_code,
        status: 'pending'
      },
      include: [
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'username', 'nickname'],
          required: true
        }
      ]
    });

    // 如果在InviteRecord表中找到了，检查过期时间
    if (inviteRecord) {
      if (inviteRecord.expire_time && new Date() > inviteRecord.expire_time) {
        await inviteRecord.update({ status: 'expired' });
        ctx.body = {
          success: false,
          message: '邀请码已过期',
          data: { valid: false, expired: true }
        };
        return;
      }

      // 获取邀请人的有效分成比例
      const effectiveCommissionRate = await getEffectiveCommissionRate(inviteRecord.inviter.id);

      ctx.body = {
        success: true,
        message: '邀请码有效',
        data: {
          valid: true,
          invite_record_id: inviteRecord.id,
          inviter: inviteRecord.inviter,
          commission_rate: effectiveCommissionRate
        }
      };
      return;
    }

    // 如果在InviteRecord表中没找到，在User表中查找
    const user = await User.findOne({
      where: { invite_code },
      attributes: ['id', 'username', 'nickname']
    });

    if (!user) {
      ctx.body = {
        success: false,
        message: '邀请码无效或已使用',
        data: { valid: false }
      };
      return;
    }

    // 获取邀请人的有效分成比例
    const effectiveCommissionRate = await getEffectiveCommissionRate(user.id);

    // 用户表中的邀请码有效，返回成功
    ctx.body = {
      success: true,
      message: '邀请码有效',
      data: {
        valid: true,
        inviter: {
          id: user.id,
          username: user.username,
          nickname: user.nickname
        },
        commission_rate: effectiveCommissionRate
      }
    };
  } catch (error) {
    console.error('验证邀请码失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '验证邀请码失败'
    };
  }
});

// 获取用户的邀请统计
router.get('/stats/summary', async (ctx) => {
  try {
    // 验证用户权限
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '请先登录'
      };
      return;
    }

    const userId = ctx.state.user.id;

    // 统计邀请数据
    const totalInvites = await InviteRecord.count({
      where: { inviter_id: userId }
    });

    const registeredInvites = await InviteRecord.count({
      where: {
        inviter_id: userId,
        status: { [Op.in]: ['registered', 'activated'] }
      }
    });

    const activatedInvites = await InviteRecord.count({
      where: {
        inviter_id: userId,
        status: 'activated'
      }
    });

    const pendingInvites = await InviteRecord.count({
      where: {
        inviter_id: userId,
        status: 'pending'
      }
    });

    // 统计成功开通会员的邀请用户数量
    const membershipInvitesCount = await db.query(`
      SELECT COUNT(DISTINCT ir.invitee_id) as membership_invites
      FROM invite_records ir
      INNER JOIN user_package_records upr ON ir.invitee_id = upr.user_id
      WHERE ir.inviter_id = :userId
        AND ir.status IN ('registered', 'activated')
        AND upr.status = 'active'
    `, {
      replacements: { userId },
      type: db.QueryTypes.SELECT
    });

    const membershipInvites = membershipInvitesCount[0]?.membership_invites || 0;

    ctx.body = {
      success: true,
      message: '获取邀请统计成功',
      data: {
        total_invites: totalInvites,
        registered_invites: registeredInvites,
        activated_invites: activatedInvites,
        pending_invites: pendingInvites,
        membership_invites: membershipInvites,
        conversion_rate: totalInvites > 0 ? (registeredInvites / totalInvites * 100).toFixed(2) : 0,
        membership_conversion_rate: totalInvites > 0 ? (membershipInvites / totalInvites * 100).toFixed(2) : 0,
        activation_rate: registeredInvites > 0 ? (activatedInvites / registeredInvites * 100).toFixed(2) : 0
      }
    };
  } catch (error) {
    console.error('获取邀请统计失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取邀请统计失败'
    };
  }
});

module.exports = router;