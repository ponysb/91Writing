const Router = require('koa-router');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Prompt = require('../models/prompt');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const crypto = require('crypto');

// 设置模型关联关系
User.hasMany(Prompt, { foreignKey: 'user_id' });
Prompt.belongsTo(User, { foreignKey: 'user_id' });

const router = new Router({
  prefix: '/api/admin/prompt-experts'
});

// 验证管理员权限中间件
const requireAdmin = async (ctx, next) => {
  if (!ctx.state.user || !ctx.state.user.is_admin) {
    ctx.status = 403;
    ctx.body = {
      success: false,
      message: '需要管理员权限'
    };
    return;
  }
  await next();
};

// 应用管理员权限中间件到所有路由
router.use(requireAdmin);

// 创建prompt专家账户
router.post('/', async (ctx) => {
  try {
    const {
      username,
      email,
      password,
      nickname,
      phone
    } = ctx.request.body;

    // 参数验证
    if (!username || !email || !password) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '用户名、邮箱和密码不能为空'
      };
      return;
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '邮箱格式无效'
      };
      return;
    }

    // 验证用户名长度
    if (username.length < 3 || username.length > 50) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '用户名长度必须在3-50个字符之间'
      };
      return;
    }

    // 验证密码强度
    if (password.length < 6) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '密码长度至少6个字符'
      };
      return;
    }

    // 检查用户名是否已存在
    const existingUsername = await User.findOne({
      where: { username }
    });

    if (existingUsername) {
      ctx.status = 409;
      ctx.body = {
        success: false,
        message: '用户名已存在'
      };
      return;
    }

    // 检查邮箱是否已存在
    const existingEmail = await User.findOne({
      where: { email }
    });

    if (existingEmail) {
      ctx.status = 409;
      ctx.body = {
        success: false,
        message: '邮箱已存在'
      };
      return;
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 生成邀请码
    const inviteCode = crypto.randomBytes(16).toString('hex');

    // 创建prompt专家用户
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      nickname: nickname || username,
      phone,
      role: 'prompt_expert',
      status: 'active',
      email_verified: true, // 管理员创建的账户默认已验证
      invite_code: inviteCode
    });

    logger.info(`管理员创建prompt专家账户成功`, {
      adminId: ctx.state.user.id,
      expertId: user.id,
      expertUsername: user.username,
      expertEmail: user.email
    });

    ctx.body = {
      success: true,
      message: 'Prompt专家账户创建成功',
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        phone: user.phone,
        role: user.role,
        status: user.status,
        created_at: user.created_at
      }
    };
  } catch (error) {
    logger.error('创建prompt专家账户失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建账户失败: ' + error.message
    };
  }
});

// 获取prompt专家列表
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = ctx.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 构建查询条件
    const whereCondition = {
      role: 'prompt_expert'
    };

    if (status) {
      whereCondition.status = status;
    }

    if (search) {
      whereCondition[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { nickname: { [Op.like]: `%${search}%` } }
      ];
    }

    // 验证排序字段
    const validSortFields = ['id', 'username', 'email', 'nickname', 'status', 'created_at', 'last_login_time'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = ['ASC', 'DESC'].includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';

    const { count, rows } = await User.findAndCountAll({
      where: whereCondition,
      limit: parseInt(limit),
      offset: offset,
      order: [[sortField, sortDirection]],
      attributes: {
        exclude: ['password', 'deleted_at']
      }
    });

    // 为每个专家获取prompt统计信息
    const expertsWithStats = await Promise.all(
      rows.map(async (expert) => {
        const promptCount = await Prompt.count({
          where: { user_id: expert.id }
        });
        
        const activePromptCount = await Prompt.count({
          where: { user_id: expert.id, status: 'active' }
        });

        return {
          ...expert.toJSON(),
          prompt_stats: {
            total_prompts: promptCount,
            active_prompts: activePromptCount
          }
        };
      })
    );

    ctx.body = {
      success: true,
      message: '获取prompt专家列表成功',
      data: {
        experts: expertsWithStats,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / parseInt(limit))
        }
      }
    };
  } catch (error) {
    logger.error('获取prompt专家列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取专家列表失败: ' + error.message
    };
  }
});

// 获取单个prompt专家详情
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;

    if (!id || isNaN(id)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '专家ID无效'
      };
      return;
    }

    const expert = await User.findOne({
      where: {
        id,
        role: 'prompt_expert'
      },
      attributes: {
        exclude: ['password', 'deleted_at']
      }
    });

    if (!expert) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Prompt专家不存在'
      };
      return;
    }

    // 获取专家的prompt统计信息
    const totalPrompts = await Prompt.count({
      where: { user_id: expert.id }
    });

    const activePrompts = await Prompt.count({
      where: { user_id: expert.id, status: 'active' }
    });

    const draftPrompts = await Prompt.count({
      where: { user_id: expert.id, status: 'draft' }
    });

    const inactivePrompts = await Prompt.count({
      where: { user_id: expert.id, status: 'inactive' }
    });

    // 获取最近的prompt
    const recentPrompts = await Prompt.findAll({
      where: { user_id: expert.id },
      limit: 5,
      order: [['created_at', 'DESC']],
      attributes: ['id', 'name', 'category', 'status', 'created_at']
    });

    ctx.body = {
      success: true,
      message: '获取专家详情成功',
      data: {
        expert: expert.toJSON(),
        prompt_stats: {
          total_prompts: totalPrompts,
          active_prompts: activePrompts,
          draft_prompts: draftPrompts,
          inactive_prompts: inactivePrompts
        },
        recent_prompts: recentPrompts
      }
    };
  } catch (error) {
    logger.error('获取prompt专家详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取专家详情失败: ' + error.message
    };
  }
});

// 更新prompt专家信息
router.put('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const updateData = ctx.request.body;

    if (!id || isNaN(id)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '专家ID无效'
      };
      return;
    }

    const expert = await User.findOne({
      where: {
        id,
        role: 'prompt_expert'
      }
    });

    if (!expert) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Prompt专家不存在'
      };
      return;
    }

    // 验证更新字段
    const allowedFields = ['nickname', 'phone', 'status', 'email_verified', 'phone_verified'];
    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    // 如果要更新邮箱验证状态，需要验证
    if (filteredData.hasOwnProperty('email_verified') && typeof filteredData.email_verified !== 'boolean') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '邮箱验证状态必须是布尔值'
      };
      return;
    }

    // 如果要更新手机验证状态，需要验证
    if (filteredData.hasOwnProperty('phone_verified') && typeof filteredData.phone_verified !== 'boolean') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '手机验证状态必须是布尔值'
      };
      return;
    }

    // 验证状态
    if (filteredData.status) {
      const validStatuses = ['active', 'inactive', 'banned', 'pending'];
      if (!validStatuses.includes(filteredData.status)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '用户状态无效，必须是: ' + validStatuses.join(', ')
        };
        return;
      }
    }

    // 更新专家信息
    await expert.update(filteredData);

    logger.info(`管理员更新prompt专家信息成功`, {
      adminId: ctx.state.user.id,
      expertId: expert.id,
      expertUsername: expert.username,
      updatedFields: Object.keys(filteredData)
    });

    ctx.body = {
      success: true,
      message: '专家信息更新成功',
      data: {
        id: expert.id,
        username: expert.username,
        email: expert.email,
        nickname: expert.nickname,
        phone: expert.phone,
        status: expert.status,
        email_verified: expert.email_verified,
        phone_verified: expert.phone_verified,
        updated_at: expert.updated_at
      }
    };
  } catch (error) {
    logger.error('更新prompt专家信息失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新专家信息失败: ' + error.message
    };
  }
});

// 重置prompt专家密码
router.post('/:id/reset-password', async (ctx) => {
  try {
    const { id } = ctx.params;
    const { new_password } = ctx.request.body;

    if (!id || isNaN(id)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '专家ID无效'
      };
      return;
    }

    if (!new_password) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '新密码不能为空'
      };
      return;
    }

    // 验证密码强度
    if (new_password.length < 6) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '密码长度至少6个字符'
      };
      return;
    }

    const expert = await User.findOne({
      where: {
        id,
        role: 'prompt_expert'
      }
    });

    if (!expert) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Prompt专家不存在'
      };
      return;
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(new_password, 12);

    // 更新密码
    await expert.update({ password: hashedPassword });

    logger.info(`管理员重置prompt专家密码成功`, {
      adminId: ctx.state.user.id,
      expertId: expert.id,
      expertUsername: expert.username
    });

    ctx.body = {
      success: true,
      message: '密码重置成功'
    };
  } catch (error) {
    logger.error('重置prompt专家密码失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '重置密码失败: ' + error.message
    };
  }
});

// 删除prompt专家（软删除）
router.delete('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;

    if (!id || isNaN(id)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '专家ID无效'
      };
      return;
    }

    const expert = await User.findOne({
      where: {
        id,
        role: 'prompt_expert'
      }
    });

    if (!expert) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Prompt专家不存在'
      };
      return;
    }

    // 软删除专家账户
    await expert.destroy();

    // 同时软删除该专家的所有prompt
    await Prompt.destroy({
      where: { user_id: expert.id }
    });

    logger.info(`管理员删除prompt专家成功`, {
      adminId: ctx.state.user.id,
      expertId: expert.id,
      expertUsername: expert.username
    });

    ctx.body = {
      success: true,
      message: 'Prompt专家删除成功'
    };
  } catch (error) {
    logger.error('删除prompt专家失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除专家失败: ' + error.message
    };
  }
});

// 获取prompt专家统计信息
router.get('/stats/overview', async (ctx) => {
  try {
    // 统计专家数量
    const totalExperts = await User.count({
      where: { role: 'prompt_expert' }
    });

    const activeExperts = await User.count({
      where: { role: 'prompt_expert', status: 'active' }
    });

    const inactiveExperts = await User.count({
      where: { role: 'prompt_expert', status: 'inactive' }
    });

    const bannedExperts = await User.count({
      where: { role: 'prompt_expert', status: 'banned' }
    });

    // 统计prompt数量
    const totalPrompts = await Prompt.count({
      include: [{
        model: User,
        where: { role: 'prompt_expert' },
        attributes: []
      }]
    });

    const activePrompts = await Prompt.count({
      where: { status: 'active' },
      include: [{
        model: User,
        where: { role: 'prompt_expert' },
        attributes: []
      }]
    });

    // 最近7天新增的专家
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const newExpertsThisWeek = await User.count({
      where: {
        role: 'prompt_expert',
        created_at: { [Op.gte]: sevenDaysAgo }
      }
    });

    // 最近7天新增的prompt
    const newPromptsThisWeek = await Prompt.count({
      where: {
        created_at: { [Op.gte]: sevenDaysAgo }
      },
      include: [{
        model: User,
        where: { role: 'prompt_expert' },
        attributes: []
      }]
    });

    ctx.body = {
      success: true,
      message: '获取统计信息成功',
      data: {
        expert_stats: {
          total: totalExperts,
          active: activeExperts,
          inactive: inactiveExperts,
          banned: bannedExperts,
          new_this_week: newExpertsThisWeek
        },
        prompt_stats: {
          total: totalPrompts,
          active: activePrompts,
          new_this_week: newPromptsThisWeek
        }
      }
    };
  } catch (error) {
    logger.error('获取prompt专家统计信息失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取统计信息失败: ' + error.message
    };
  }
});

module.exports = router;