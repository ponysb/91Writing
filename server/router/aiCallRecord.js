const Router = require('koa-router');
const AiCallRecord = require('../models/aiCallRecord');
const User = require('../models/user');
const AiModel = require('../models/aimodel');
const Prompt = require('../models/prompt');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

// 用户路由 - 只能访问自己的记录
const userRouter = new Router({
  prefix: '/api/user/ai-call-records'
});

// 管理员路由 - 可以访问所有记录
const adminRouter = new Router({
  prefix: '/api/admin/ai-call-records'
});

// 验证用户登录中间件
const requireUserAuth = async (ctx, next) => {
  if (!ctx.state.user) {
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: '请先登录'
    };
    return;
  }
  // 管理员也可以使用用户接口
  await next();
};

// 验证管理员权限中间件
const requireAdmin = async (ctx, next) => {
  if (!ctx.state.user) {
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: '请先登录'
    };
    return;
  }
  if (ctx.state.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = {
      success: false,
      message: '需要管理员权限'
    };
    return;
  }
  await next();
};

// ==================== 用户接口 ====================

// 1. 用户获取自己的AI调用记录列表
userRouter.get('/', requireUserAuth, async (ctx) => {
  try {
    const {
      page = 1,
      limit = 20,
      business_type,
      model_id,
      status,
      start_date,
      end_date
    } = ctx.query;

    const offset = (page - 1) * limit;
    const where = {
      user_id: ctx.state.user.id, // 强制只查询当前用户的记录
      business_type: { [Op.ne]: 'general' } // 排除general类型的记录
    };

    // 业务类型筛选
    if (business_type) {
      where.business_type = business_type;
    }

    // 模型筛选
    if (model_id) {
      where.model_id = model_id;
    }

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 时间范围筛选
    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) {
        where.created_at[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        where.created_at[Op.lte] = new Date(end_date);
      }
    }

    const { count, rows } = await AiCallRecord.findAndCountAll({
      where,
      include: [
        {
          model: AiModel,
          as: 'aiModel',
          attributes: ['id', 'name', 'provider']
        },
        {
          model: Prompt,
          as: 'prompt',
          attributes: ['id', 'name', 'type'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    ctx.body = {
      success: true,
      message: '获取AI调用记录成功',
      data: {
        records: rows,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / limit)
        }
      }
    };

  } catch (error) {
    logger.error('用户获取AI调用记录失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || '获取AI调用记录失败'
    };
  }
});

// 2. 用户获取自己的单个AI调用记录详情
userRouter.get('/:id', requireUserAuth, async (ctx) => {
  try {
    const { id } = ctx.params;
    const where = {
      id,
      user_id: ctx.state.user.id, // 强制只查询当前用户的记录
      business_type: { [Op.ne]: 'general' } // 排除general类型的记录
    };

    const record = await AiCallRecord.findOne({
      where,
      include: [
        {
          model: AiModel,
          as: 'aiModel',
          attributes: ['id', 'name', 'provider', 'version']
        },
        {
          model: Prompt,
          as: 'prompt',
          attributes: ['id', 'name', 'type', 'content'],
          required: false
        }
      ]
    });

    if (!record) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'AI调用记录不存在或无权限访问'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '获取AI调用记录详情成功',
      data: record
    };

  } catch (error) {
    logger.error('用户获取AI调用记录详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || '获取AI调用记录详情失败'
    };
  }
});

// 3. 用户获取自己的AI调用统计信息
userRouter.get('/stats/summary', requireUserAuth, async (ctx) => {
  try {
    const {
      start_date,
      end_date
    } = ctx.query;

    const where = {
      user_id: ctx.state.user.id, // 强制只查询当前用户的记录
      business_type: { [Op.ne]: 'general' } // 排除general类型的记录
    };

    // 时间范围筛选
    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) {
        where.created_at[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        where.created_at[Op.lte] = new Date(end_date);
      }
    }

    // 总调用次数
    const totalCalls = await AiCallRecord.count({ where });

    // 成功调用次数
    const successCalls = await AiCallRecord.count({
      where: { ...where, status: 'success' }
    });

    // 失败调用次数
    const errorCalls = await AiCallRecord.count({
      where: { ...where, status: 'error' }
    });

    // 按业务类型统计
    const businessTypeStats = await AiCallRecord.findAll({
      where,
      attributes: [
        'business_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['business_type'],
      raw: true
    });

    // 按模型统计
    const modelStats = await AiCallRecord.findAll({
      where,
      include: [
        {
          model: AiModel,
          as: 'aiModel',
          attributes: ['name']
        }
      ],
      attributes: [
        'model_id',
        [sequelize.fn('COUNT', sequelize.col('AiCallRecord.id')), 'count']
      ],
      group: ['model_id', 'aiModel.id'],
      raw: true
    });

    // Token使用统计（仅成功的调用）
    const tokenStats = await AiCallRecord.findAll({
      where: { ...where, status: 'success', tokens_used: { [Op.ne]: null } },
      attributes: [
        [sequelize.fn('SUM', sequelize.literal("JSON_EXTRACT(tokens_used, '$.total_tokens')")), 'total_tokens'],
        [sequelize.fn('SUM', sequelize.literal("JSON_EXTRACT(tokens_used, '$.prompt_tokens')")), 'prompt_tokens'],
        [sequelize.fn('SUM', sequelize.literal("JSON_EXTRACT(tokens_used, '$.completion_tokens')")), 'completion_tokens']
      ],
      raw: true
    });

    ctx.body = {
      success: true,
      message: '获取AI调用统计成功',
      data: {
        summary: {
          total_calls: totalCalls,
          success_calls: successCalls,
          error_calls: errorCalls,
          success_rate: totalCalls > 0 ? ((successCalls / totalCalls) * 100).toFixed(2) + '%' : '0%'
        },
        business_type_stats: businessTypeStats,
        model_stats: modelStats,
        token_stats: tokenStats[0] || {
          total_tokens: 0,
          prompt_tokens: 0,
          completion_tokens: 0
        }
      }
    };

  } catch (error) {
    logger.error('用户获取AI调用统计失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || '获取AI调用统计失败'
    };
  }
});

// ==================== 管理员接口 ====================

// 1. 管理员获取所有AI调用记录列表
adminRouter.get('/', requireAdmin, async (ctx) => {
  try {
    const {
      page = 1,
      limit = 20,
      business_type,
      model_id,
      status,
      start_date,
      end_date,
      user_id // 管理员可以筛选特定用户
    } = ctx.query;

    const offset = (page - 1) * limit;
    const where = {};

    // 管理员可以指定查看某个用户的记录
    if (user_id) {
      where.user_id = user_id;
    }

    // 业务类型筛选
    if (business_type) {
      where.business_type = business_type;
    }

    // 模型筛选
    if (model_id) {
      where.model_id = model_id;
    }

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 时间范围筛选
    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) {
        where.created_at[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        where.created_at[Op.lte] = new Date(end_date);
      }
    }

    const { count, rows } = await AiCallRecord.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        },
        {
          model: AiModel,
          as: 'aiModel',
          attributes: ['id', 'name', 'provider']
        },
        {
          model: Prompt,
          as: 'prompt',
          attributes: ['id', 'name', 'type'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    ctx.body = {
      success: true,
      message: '获取AI调用记录成功',
      data: {
        records: rows,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / limit)
        }
      }
    };

  } catch (error) {
    logger.error('管理员获取AI调用记录失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || '获取AI调用记录失败'
    };
  }
});

// 2. 管理员获取单个AI调用记录详情
adminRouter.get('/:id', requireAdmin, async (ctx) => {
  try {
    const { id } = ctx.params;

    const record = await AiCallRecord.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        },
        {
          model: AiModel,
          as: 'aiModel',
          attributes: ['id', 'name', 'provider', 'version']
        },
        {
          model: Prompt,
          as: 'prompt',
          attributes: ['id', 'name', 'type', 'content'],
          required: false
        }
      ]
    });

    if (!record) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'AI调用记录不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '获取AI调用记录详情成功',
      data: record
    };

  } catch (error) {
    logger.error('管理员获取AI调用记录详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || '获取AI调用记录详情失败'
    };
  }
});

// 3. 管理员获取AI调用统计信息
adminRouter.get('/stats/summary', requireAdmin, async (ctx) => {
  try {
    const {
      start_date,
      end_date,
      user_id // 管理员可以查看特定用户的统计
    } = ctx.query;

    const where = {};

    // 管理员可以指定查看某个用户的统计
    if (user_id) {
      where.user_id = user_id;
    }

    // 时间范围筛选
    if (start_date || end_date) {
      where.created_at = {};
      if (start_date) {
        where.created_at[Op.gte] = new Date(start_date);
      }
      if (end_date) {
        where.created_at[Op.lte] = new Date(end_date);
      }
    }

    // 总调用次数
    const totalCalls = await AiCallRecord.count({ where });

    // 成功调用次数
    const successCalls = await AiCallRecord.count({
      where: { ...where, status: 'success' }
    });

    // 失败调用次数
    const errorCalls = await AiCallRecord.count({
      where: { ...where, status: 'error' }
    });

    // 按业务类型统计
    const businessTypeStats = await AiCallRecord.findAll({
      where,
      attributes: [
        'business_type',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['business_type'],
      raw: true
    });

    // 按模型统计
    const modelStats = await AiCallRecord.findAll({
      where,
      include: [
        {
          model: AiModel,
          as: 'aiModel',
          attributes: ['name']
        }
      ],
      attributes: [
        'model_id',
        [sequelize.fn('COUNT', sequelize.col('AiCallRecord.id')), 'count']
      ],
      group: ['model_id', 'aiModel.id'],
      raw: true
    });

    // 按用户统计（仅管理员可见）
    const userStats = await AiCallRecord.findAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['username']
        }
      ],
      attributes: [
        'user_id',
        [sequelize.fn('COUNT', sequelize.col('AiCallRecord.id')), 'count']
      ],
      group: ['user_id', 'user.id'],
      raw: true
    });

    // Token使用统计（仅成功的调用）
    const tokenStats = await AiCallRecord.findAll({
      where: { ...where, status: 'success', tokens_used: { [Op.ne]: null } },
      attributes: [
        [sequelize.fn('SUM', sequelize.literal("JSON_EXTRACT(tokens_used, '$.total_tokens')")), 'total_tokens'],
        [sequelize.fn('SUM', sequelize.literal("JSON_EXTRACT(tokens_used, '$.prompt_tokens')")), 'prompt_tokens'],
        [sequelize.fn('SUM', sequelize.literal("JSON_EXTRACT(tokens_used, '$.completion_tokens')")), 'completion_tokens']
      ],
      raw: true
    });

    ctx.body = {
      success: true,
      message: '获取AI调用统计成功',
      data: {
        summary: {
          total_calls: totalCalls,
          success_calls: successCalls,
          error_calls: errorCalls,
          success_rate: totalCalls > 0 ? ((successCalls / totalCalls) * 100).toFixed(2) + '%' : '0%'
        },
        business_type_stats: businessTypeStats,
        model_stats: modelStats,
        user_stats: userStats,
        token_stats: tokenStats[0] || {
          total_tokens: 0,
          prompt_tokens: 0,
          completion_tokens: 0
        }
      }
    };

  } catch (error) {
    logger.error('管理员获取AI调用统计失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || '获取AI调用统计失败'
    };
  }
});

// 4. 管理员删除单个AI调用记录
adminRouter.delete('/:id', requireAdmin, async (ctx) => {
  try {
    const { id } = ctx.params;

    const record = await AiCallRecord.findByPk(id);
    if (!record) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'AI调用记录不存在'
      };
      return;
    }

    await record.destroy();

    ctx.body = {
      success: true,
      message: 'AI调用记录删除成功'
    };

  } catch (error) {
    logger.error('管理员删除AI调用记录失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || '删除AI调用记录失败'
    };
  }
});

// 5. 管理员批量删除AI调用记录
adminRouter.delete('/', requireAdmin, async (ctx) => {
  try {
    const { ids, older_than_days } = ctx.request.body;

    let where = {};

    if (ids && Array.isArray(ids)) {
      where.id = { [Op.in]: ids };
    } else if (older_than_days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - older_than_days);
      where.created_at = { [Op.lt]: cutoffDate };
    } else {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供要删除的记录ID列表或天数'
      };
      return;
    }

    const deletedCount = await AiCallRecord.destroy({ where });

    ctx.body = {
      success: true,
      message: `成功删除 ${deletedCount} 条AI调用记录`
    };

  } catch (error) {
    logger.error('批量删除AI调用记录失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || '批量删除AI调用记录失败'
    };
  }
});

module.exports = {
  userRouter,
  adminRouter
};