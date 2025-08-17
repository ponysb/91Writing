const Router = require('koa-router');
const { Op } = require('sequelize');
const AiAssistant = require('../models/aiAssistant');
const Novel = require('../models/novel');
const User = require('../models/user');
const logger = require('../utils/logger');

const router = new Router({
  prefix: '/api/ai-assistants'
});

// 参数验证中间件
const validateRequired = (fields) => {
  return async (ctx, next) => {
    const missing = fields.filter(field => !ctx.request.body[field]);
    if (missing.length > 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: `缺少必填字段: ${missing.join(', ')}`
      };
      return;
    }
    await next();
  };
};

// 验证用户登录中间件
const requireAuth = async (ctx, next) => {
  if (!ctx.state.user) {
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: '请先登录'
    };
    return;
  }
  await next();
};

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

// 应用认证中间件
router.use(requireAuth);

// 1. 创建AI助手 POST /api/ai-assistants（仅管理员）
router.post('/', requireAdmin, validateRequired(['name']), async (ctx) => {
  try {
    const {
      name, description, avatar, personality, system_prompt, context_prompt,
      model_config, capabilities, type, status, is_public, is_default
    } = ctx.request.body;
    
    const user = ctx.state.user;
    
    // 如果设置为默认助手，先取消其他默认助手
    if (is_default) {
      await AiAssistant.update(
        { is_default: false },
        {
          where: {
            is_default: true
          }
        }
      );
    }
    
    const assistantData = {
      name,
      description,
      avatar,
      personality,
      system_prompt,
      context_prompt,
      model_config: model_config ? JSON.stringify(model_config) : null,
      capabilities: capabilities ? JSON.stringify(capabilities) : null,
      created_by: user.id,
      type: type || 'general',
      status: status || 'active',
      is_public: is_public !== undefined ? is_public : true,
      is_default: is_default || false
    };
    
    const assistant = await AiAssistant.create(assistantData);
    
    ctx.status = 201;
    ctx.body = {
      success: true,
      message: 'AI助手创建成功',
      data: assistant
    };
    
  } catch (error) {
    logger.error('创建AI助手失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建AI助手失败',
      error: error.message
    };
  }
});

// 2. 获取AI助手列表 GET /api/ai-assistants
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      status,
      novel_id,
      is_public,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = ctx.query;
    
    const user = ctx.state.user;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 构建查询条件
    const whereConditions = {};
    
    // 普通用户只能查看公开的助手，管理员可以查看全部
    if (!user.is_admin) {
      whereConditions.is_public = true;
    }
    
    // 搜索条件
    if (search) {
      whereConditions[Op.and] = whereConditions[Op.and] || [];
      whereConditions[Op.and].push({
        [Op.or]: [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } },
          { personality: { [Op.like]: `%${search}%` } }
        ]
      });
    }
    
    // 筛选条件
    if (type) whereConditions.type = type;
    if (status) whereConditions.status = status;
    if (is_public !== undefined) whereConditions.is_public = is_public === 'true';
    
    // 根据用户权限设置返回字段
    const attributes = user.is_admin ? undefined : [
      'id', 'name', 'description', 'avatar', 'type', 'status', 
      'is_public', 'usage_count', 'rating', 'rating_count', 
      'created_at', 'updated_at'
    ];

    // 根据用户权限设置关联查询
    const include = user.is_admin ? [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'nickname', 'avatar']
      }
    ] : [];

    const { count, rows } = await AiAssistant.findAndCountAll({
      where: whereConditions,
      attributes,
      include,
      order: [[sort_by, sort_order.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset
    });
    
    ctx.body = {
      success: true,
      message: '获取AI助手列表成功',
      data: {
        assistants: rows,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / parseInt(limit))
        }
      }
    };
    
  } catch (error) {
    logger.error('获取AI助手列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取AI助手列表失败',
      error: error.message
    };
  }
});

// 3. 获取AI助手详情 GET /api/ai-assistants/:id
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const user = ctx.state.user;
    
    // 根据用户权限设置返回字段
    const attributes = user.is_admin ? undefined : [
      'id', 'name', 'description', 'avatar', 'type', 'status', 
      'is_public', 'usage_count', 'rating', 'rating_count', 
      'created_at', 'updated_at'
    ];

    // 根据用户权限设置关联查询
    const include = user.is_admin ? [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'nickname', 'avatar']
      }
    ] : [];

    const assistant = await AiAssistant.findOne({
      where: { id },
      attributes,
      include
    });
    
    if (!assistant) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'AI助手不存在'
      };
      return;
    }
    
    // 权限检查：管理员可以查看全部，普通用户只能查看公开的助手
    if (!user.is_admin && !assistant.is_public) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权限访问此AI助手'
      };
      return;
    }
    
    // 增加使用次数
    await assistant.increment('usage_count');
    
    ctx.body = {
      success: true,
      message: '获取AI助手详情成功',
      data: assistant
    };
    
  } catch (error) {
    logger.error('获取AI助手详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取AI助手详情失败',
      error: error.message
    };
  }
});

// 4. 更新AI助手 PUT /api/ai-assistants/:id（仅管理员）
router.put('/:id', requireAdmin, async (ctx) => {
  try {
    const { id } = ctx.params;
    const user = ctx.state.user;
    
    const assistant = await AiAssistant.findOne({
      where: { id }
    });
    
    if (!assistant) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'AI助手不存在'
      };
      return;
    }
    
    const {
      name, description, avatar, personality, system_prompt, context_prompt,
      model_config, capabilities, type, status, is_public, is_default
    } = ctx.request.body;
    
    // 如果设置为默认助手，先取消其他默认助手
    if (is_default && !assistant.is_default) {
      await AiAssistant.update(
        { is_default: false },
        {
          where: {
            is_default: true
          }
        }
      );
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (personality !== undefined) updateData.personality = personality;
    if (system_prompt !== undefined) updateData.system_prompt = system_prompt;
    if (context_prompt !== undefined) updateData.context_prompt = context_prompt;
    if (model_config !== undefined) updateData.model_config = JSON.stringify(model_config);
    if (capabilities !== undefined) updateData.capabilities = JSON.stringify(capabilities);
    if (type !== undefined) updateData.type = type;
    if (status !== undefined) updateData.status = status;
    if (is_public !== undefined) updateData.is_public = is_public;
    if (is_default !== undefined) updateData.is_default = is_default;
    
    await assistant.update(updateData);
    
    // 重新获取更新后的数据
    const updatedAssistant = await AiAssistant.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'nickname', 'avatar']
        }
      ]
    });
    
    ctx.body = {
      success: true,
      message: 'AI助手更新成功',
      data: updatedAssistant
    };
    
  } catch (error) {
    logger.error('更新AI助手失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新AI助手失败',
      error: error.message
    };
  }
});

// 5. 删除AI助手 DELETE /api/ai-assistants/:id（仅管理员）
router.delete('/:id', requireAdmin, async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const assistant = await AiAssistant.findOne({
      where: { id }
    });
    
    if (!assistant) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'AI助手不存在'
      };
      return;
    }
    
    await assistant.destroy();
    
    ctx.body = {
      success: true,
      message: 'AI助手删除成功'
    };
    
  } catch (error) {
    logger.error('删除AI助手失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除AI助手失败',
      error: error.message
    };
  }
});

// 6. 批量删除AI助手 DELETE /api/ai-assistants（仅管理员）
router.delete('/', requireAdmin, validateRequired(['ids']), async (ctx) => {
  try {
    const { ids } = ctx.request.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'ids必须是非空数组'
      };
      return;
    }
    
    const deletedCount = await AiAssistant.destroy({
      where: {
        id: { [Op.in]: ids }
      }
    });
    
    ctx.body = {
      success: true,
      message: `成功删除${deletedCount}个AI助手`
    };
    
  } catch (error) {
    logger.error('批量删除AI助手失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量删除AI助手失败',
      error: error.message
    };
  }
});



module.exports = router;