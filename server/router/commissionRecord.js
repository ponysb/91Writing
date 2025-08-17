const Router = require('koa-router');
const CommissionRecord = require('../models/commissionRecord');
const InviteRecord = require('../models/inviteRecord');
const User = require('../models/user');
const Package = require('../models/package');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

const router = new Router({ prefix: '/api/commission-records' });

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

// 获取分成记录列表（用户端 - 只能查看自己的记录）
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      settlement_status,
      commission_type,
      inviter_id,
      invitee_id,
      start_date,
      end_date,
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
    if (settlement_status) {
      whereClause.settlement_status = settlement_status;
    }
    if (commission_type) {
      whereClause.commission_type = commission_type;
    }
    if (inviter_id) {
      whereClause.inviter_id = inviter_id;
    }
    if (invitee_id) {
      whereClause.invitee_id = invitee_id;
    }
    if (start_date && end_date) {
      whereClause.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }
    if (search) {
      whereClause[Op.or] = [
        { order_id: { [Op.like]: `%${search}%` } },
        { transaction_id: { [Op.like]: `%${search}%` } }
      ];
    }

    // 用户端接口：只能查看自己的分成记录
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '请先登录'
      };
      return;
    }
    whereClause.inviter_id = ctx.state.user.id;

    const { count, rows } = await CommissionRecord.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: InviteRecord,
          as: 'inviteRecord',
          attributes: ['id', 'invite_code', 'commission_rate'],
          required: false
        },
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'username', 'nickname', 'email'],
          required: false
        },
        {
          model: User,
          as: 'invitee',
          attributes: ['id', 'username', 'nickname', 'email'],
          required: false
        },
        {
          model: Package,
          as: 'package',
          attributes: ['id', 'name', 'price', 'type'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]]
    });

    ctx.body = {
      success: true,
      message: '获取分成记录列表成功',
      data: {
        commissionRecords: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    };
  } catch (error) {
    console.error('获取分成记录列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取分成记录列表失败'
    };
  }
});

// 管理员获取所有分成记录列表
router.get('/admin/list', requireAdmin, async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      settlement_status,
      commission_type,
      inviter_id,
      invitee_id,
      start_date,
      end_date,
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
    if (settlement_status) {
      whereClause.settlement_status = settlement_status;
    }
    if (commission_type) {
      whereClause.commission_type = commission_type;
    }
    if (inviter_id) {
      whereClause.inviter_id = inviter_id;
    }
    if (invitee_id) {
      whereClause.invitee_id = invitee_id;
    }
    if (start_date && end_date) {
      whereClause.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }
    if (search) {
      whereClause[Op.or] = [
        { order_id: { [Op.like]: `%${search}%` } },
        { transaction_id: { [Op.like]: `%${search}%` } }
      ];
    }

    // 管理员可以查看所有记录，不添加额外的权限限制

    const { count, rows } = await CommissionRecord.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: InviteRecord,
          as: 'inviteRecord',
          attributes: ['id', 'invite_code', 'commission_rate'],
          required: false
        },
        {
          model: User,
          as: 'inviter',
          attributes: ['id', 'username', 'nickname', 'email'],
          required: false
        },
        {
          model: User,
          as: 'invitee',
          attributes: ['id', 'username', 'nickname', 'email'],
          required: false
        },
        {
          model: Package,
          as: 'package',
          attributes: ['id', 'name', 'price', 'type'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]]
    });

    ctx.body = {
      success: true,
      message: '获取分成记录列表成功',
      data: {
        commission_records: rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_count: count,
          per_page: parseInt(limit)
        }
      }
    };
  } catch (error) {
    console.error('获取分成记录列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取分成记录列表失败'
    };
  }
});

// 获取单个分成记录详情
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const whereClause = { id };
    
    // 权限控制：普通用户只能查看自己的分成记录
    if (ctx.state.user && ctx.state.user.role !== 'admin') {
      whereClause.inviter_id = ctx.state.user.id;
    }

    const commissionRecord = await CommissionRecord.findOne({
      where: whereClause,
      include: [
        {
          model: InviteRecord,
          as: 'inviteRecord',
          attributes: ['id', 'invite_code', 'commission_rate', 'created_at'],
          required: false
        },
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
        },
        {
          model: Package,
          as: 'package',
          attributes: ['id', 'name', 'price', 'type', 'description'],
          required: false
        }
      ]
    });

    if (!commissionRecord) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '分成记录不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '获取分成记录详情成功',
      data: commissionRecord
    };
  } catch (error) {
    console.error('获取分成记录详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取分成记录详情失败'
    };
  }
});

// 创建分成记录
router.post('/', async (ctx) => {
  try {
    const {
      invite_record_id,
      inviter_id,
      invitee_id,
      order_id,
      package_id,
      commission_type,
      original_amount,
      commission_rate,
      currency = 'CNY',
      notes
    } = ctx.request.body;

    // 验证管理员权限
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足'
      };
      return;
    }

    // 验证必填字段
    if (!invite_record_id || !inviter_id || !invitee_id || !commission_type || !original_amount || !commission_rate) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少必填字段'
      };
      return;
    }

    // 计算分成金额
    const commissionAmount = parseFloat(original_amount) * parseFloat(commission_rate);

    const commissionRecord = await CommissionRecord.create({
      invite_record_id,
      inviter_id,
      invitee_id,
      order_id,
      package_id,
      commission_type,
      original_amount: parseFloat(original_amount),
      commission_rate: parseFloat(commission_rate),
      commission_amount: commissionAmount,
      currency,
      notes,
      created_by: ctx.state.user.id
    });

    ctx.body = {
      success: true,
      message: '分成记录创建成功',
      data: {
        id: commissionRecord.id,
        commission_amount: commissionRecord.commission_amount,
        status: commissionRecord.status,
        created_at: commissionRecord.created_at
      }
    };
  } catch (error) {
    console.error('创建分成记录失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建分成记录失败'
    };
  }
});

// 更新分成记录状态
router.put('/:id/status', async (ctx) => {
  try {
    const { id } = ctx.params;
    const { status, settlement_status, settlement_method, settlement_account, notes } = ctx.request.body;

    // 验证管理员权限
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足'
      };
      return;
    }

    const commissionRecord = await CommissionRecord.findByPk(id);
    if (!commissionRecord) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '分成记录不存在'
      };
      return;
    }

    const updateData = {
      updated_by: ctx.state.user.id
    };

    if (status) {
      updateData.status = status;
      if (status === 'confirmed') {
        updateData.confirm_time = new Date();
      } else if (status === 'paid') {
        updateData.pay_time = new Date();
      }
    }

    if (settlement_status) {
      updateData.settlement_status = settlement_status;
      if (settlement_status === 'settled') {
        updateData.settlement_time = new Date();
      }
    }

    if (settlement_method) updateData.settlement_method = settlement_method;
    if (settlement_account) updateData.settlement_account = settlement_account;
    if (notes) updateData.notes = notes;

    await commissionRecord.update(updateData);

    ctx.body = {
      success: true,
      message: '分成记录状态更新成功',
      data: {
        id: commissionRecord.id,
        status: updateData.status || commissionRecord.status,
        settlement_status: updateData.settlement_status || commissionRecord.settlement_status,
        updated_at: new Date()
      }
    };
  } catch (error) {
    console.error('更新分成记录状态失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新分成记录状态失败'
    };
  }
});

// 批量确认分成记录
router.post('/batch/confirm', async (ctx) => {
  try {
    const { ids } = ctx.request.body;

    // 验证管理员权限
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足'
      };
      return;
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供有效的记录ID列表'
      };
      return;
    }

    const [updatedCount] = await CommissionRecord.update(
      {
        status: 'confirmed',
        confirm_time: new Date(),
        updated_by: ctx.state.user.id
      },
      {
        where: {
          id: { [Op.in]: ids },
          status: 'pending'
        }
      }
    );

    ctx.body = {
      success: true,
      message: `批量确认成功，确认了 ${updatedCount} 条记录`
    };
  } catch (error) {
    console.error('批量确认分成记录失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量确认分成记录失败'
    };
  }
});

// 获取分成统计
router.get('/stats/summary', async (ctx) => {
  try {
    const { inviter_id, start_date, end_date } = ctx.query;
    
    let whereClause = {};
    
    // 权限控制：普通用户只能查看自己的统计
    if (ctx.state.user && ctx.state.user.role !== 'admin') {
      whereClause.inviter_id = ctx.state.user.id;
    } else if (inviter_id) {
      whereClause.inviter_id = inviter_id;
    }

    if (start_date && end_date) {
      whereClause.created_at = {
        [Op.between]: [new Date(start_date), new Date(end_date)]
      };
    }

    // 总分成统计
    const totalStats = await CommissionRecord.findOne({
      where: whereClause,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_records'],
        [sequelize.fn('SUM', sequelize.col('commission_amount')), 'total_commission'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'confirmed' THEN commission_amount ELSE 0 END")), 'confirmed_commission'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END")), 'paid_commission'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN settlement_status = 'settled' THEN commission_amount ELSE 0 END")), 'settled_commission']
      ],
      raw: true
    });

    // 按类型统计
    const typeStats = await CommissionRecord.findAll({
      where: whereClause,
      attributes: [
        'commission_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('commission_amount')), 'total_amount']
      ],
      group: ['commission_type'],
      raw: true
    });

    // 按状态统计
    const statusStats = await CommissionRecord.findAll({
      where: whereClause,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('commission_amount')), 'total_amount']
      ],
      group: ['status'],
      raw: true
    });

    ctx.body = {
      success: true,
      message: '获取分成统计成功',
      data: {
        total_stats: {
          total_records: parseInt(totalStats.total_records) || 0,
          total_commission: parseFloat(totalStats.total_commission) || 0,
          confirmed_commission: parseFloat(totalStats.confirmed_commission) || 0,
          paid_commission: parseFloat(totalStats.paid_commission) || 0,
          settled_commission: parseFloat(totalStats.settled_commission) || 0
        },
        type_stats: typeStats,
        status_stats: statusStats
      }
    };
  } catch (error) {
    console.error('获取分成统计失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取分成统计失败'
    };
  }
});

// 删除分成记录（管理员权限）
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

    const commissionRecord = await CommissionRecord.findByPk(id);
    if (!commissionRecord) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '分成记录不存在'
      };
      return;
    }

    // 只允许删除待确认状态的记录
    if (commissionRecord.status !== 'pending') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '只能删除待确认状态的分成记录'
      };
      return;
    }

    await commissionRecord.destroy();

    ctx.body = {
      success: true,
      message: '分成记录删除成功'
    };
  } catch (error) {
    console.error('删除分成记录失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除分成记录失败'
    };
  }
});

module.exports = router;