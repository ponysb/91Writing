const Router = require('koa-router');
const Prompt = require('../../models/prompt');
const { Op } = require('sequelize');
const logger = require('../../utils/logger');

const router = new Router({
  prefix: '/api/external/prompts'
});

// 验证prompt专家权限中间件
const requirePromptExpert = async (ctx, next) => {
  if (!ctx.state.user) {
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: '用户未认证，请先登录'
    };
    return;
  }
  
  // 检查用户角色是否为prompt专家或管理员
  if (ctx.state.user.role !== 'prompt_expert' && !ctx.state.user.is_admin) {
    ctx.status = 403;
    ctx.body = {
      success: false,
      message: '需要prompt专家权限'
    };
    return;
  }
  
  await next();
};

// 应用权限中间件到所有路由
router.use(requirePromptExpert);

// 创建Prompt
router.post('/', async (ctx) => {
  try {
    const {
      name,
      content,
      description,
      category,
      tags,
      type = 'user',
      language = 'zh-CN',
      variables,
      examples,
      status = 'active',
      sort_order = 0,
      version = '1.0.0'
    } = ctx.request.body;

    const user_id = ctx.state.user.id;

    // 参数验证
    if (!name || !content) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Prompt名称和内容不能为空'
      };
      return;
    }

    // 验证名称长度
    if (name.length > 100) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Prompt名称不能超过100个字符'
      };
      return;
    }

    // 验证类型
    const validTypes = ['system', 'user', 'assistant', 'function'];
    if (!validTypes.includes(type)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Prompt类型无效，必须是: ' + validTypes.join(', ')
      };
      return;
    }

    // 验证状态
    const validStatuses = ['active', 'inactive', 'draft'];
    if (!validStatuses.includes(status)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Prompt状态无效，必须是: ' + validStatuses.join(', ')
      };
      return;
    }

    // 检查同名Prompt是否存在（仅在当前用户范围内）
    const existingPrompt = await Prompt.findOne({
      where: {
        name,
        user_id
      }
    });

    if (existingPrompt) {
      ctx.status = 409;
      ctx.body = {
        success: false,
        message: '您已存在同名Prompt'
      };
      return;
    }

    // 创建Prompt（外部专家创建的prompt默认公开，不是系统内置）
    const prompt = await Prompt.create({
      name,
      content,
      description,
      category,
      tags,
      type,
      language,
      variables,
      examples,
      is_public: true, // 外部专家创建的prompt默认公开
      is_system: false, // 外部专家不能创建系统内置prompt
      status,
      user_id,
      sort_order,
      version
    });

    logger.info(`外部专家创建Prompt成功: ${prompt.name}`, { 
      promptId: prompt.id, 
      userId: user_id,
      userRole: ctx.state.user.role 
    });

    ctx.body = {
      success: true,
      message: 'Prompt创建成功',
      data: {
        id: prompt.id,
        name: prompt.name,
        content: prompt.content,
        description: prompt.description,
        category: prompt.category,
        tags: prompt.tags,
        type: prompt.type,
        language: prompt.language,
        variables: prompt.variables,
        examples: prompt.examples,
        status: prompt.status,
        version: prompt.version,
        sort_order: prompt.sort_order,
        created_at: prompt.created_at
      }
    };
  } catch (error) {
    logger.error('外部专家创建Prompt失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建Prompt失败: ' + error.message
    };
  }
});

// 获取当前用户的Prompt列表
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      type,
      status,
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = ctx.query;

    const user_id = ctx.state.user.id;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 构建查询条件（只能查看自己的prompt）
    const whereCondition = {
      user_id // 强制限制为当前用户
    };

    if (category) {
      whereCondition.category = category;
    }

    if (type) {
      whereCondition.type = type;
    }

    if (status) {
      whereCondition.status = status;
    }

    if (search) {
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    // 验证排序字段
    const validSortFields = ['id', 'name', 'category', 'type', 'status', 'usage_count', 'like_count', 'created_at', 'updated_at', 'sort_order'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = ['ASC', 'DESC'].includes(sort_order.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';

    const { count, rows } = await Prompt.findAndCountAll({
      where: whereCondition,
      limit: parseInt(limit),
      offset: offset,
      order: [[sortField, sortDirection]],
      attributes: {
        exclude: ['deleted_at'] // 不返回软删除字段
      }
    });

    ctx.body = {
      success: true,
      message: '获取Prompt列表成功',
      data: {
        prompts: rows,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / parseInt(limit))
        }
      }
    };
  } catch (error) {
    logger.error('获取外部专家Prompt列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取Prompt列表失败: ' + error.message
    };
  }
});

// 获取单个Prompt详情
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const user_id = ctx.state.user.id;

    if (!id || isNaN(id)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Prompt ID无效'
      };
      return;
    }

    // 只能查看自己的prompt
    const prompt = await Prompt.findOne({
      where: {
        id,
        user_id // 强制限制为当前用户
      },
      attributes: {
        exclude: ['deleted_at']
      }
    });

    if (!prompt) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Prompt不存在或无权访问'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '获取Prompt详情成功',
      data: prompt
    };
  } catch (error) {
    logger.error('获取外部专家Prompt详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取Prompt详情失败: ' + error.message
    };
  }
});

// 更新Prompt
router.put('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const updateData = ctx.request.body;
    const user_id = ctx.state.user.id;

    if (!id || isNaN(id)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Prompt ID无效'
      };
      return;
    }

    // 只能更新自己的prompt
    const prompt = await Prompt.findOne({
      where: {
        id,
        user_id // 强制限制为当前用户
      }
    });

    if (!prompt) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Prompt不存在或无权访问'
      };
      return;
    }

    // 验证更新字段（外部专家不能修改某些系统字段）
    const allowedFields = [
      'name', 'content', 'description', 'category', 'tags', 'type',
      'language', 'variables', 'examples', 'status', 'sort_order', 'version'
    ];

    const filteredData = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        filteredData[key] = updateData[key];
      }
    });

    // 验证名称长度
    if (filteredData.name && filteredData.name.length > 100) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Prompt名称不能超过100个字符'
      };
      return;
    }

    // 验证类型
    if (filteredData.type) {
      const validTypes = ['system', 'user', 'assistant', 'function'];
      if (!validTypes.includes(filteredData.type)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Prompt类型无效，必须是: ' + validTypes.join(', ')
        };
        return;
      }
    }

    // 验证状态
    if (filteredData.status) {
      const validStatuses = ['active', 'inactive', 'draft'];
      if (!validStatuses.includes(filteredData.status)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'Prompt状态无效，必须是: ' + validStatuses.join(', ')
        };
        return;
      }
    }

    // 检查同名Prompt（如果更新了名称）
    if (filteredData.name && filteredData.name !== prompt.name) {
      const existingPrompt = await Prompt.findOne({
        where: {
          name: filteredData.name,
          user_id,
          id: { [Op.ne]: id }
        }
      });

      if (existingPrompt) {
        ctx.status = 409;
        ctx.body = {
          success: false,
          message: '您已存在同名Prompt'
        };
        return;
      }
    }

    // 更新Prompt
    await prompt.update(filteredData);

    logger.info(`外部专家更新Prompt成功: ${prompt.name}`, { 
      promptId: id, 
      userId: user_id,
      userRole: ctx.state.user.role 
    });

    ctx.body = {
      success: true,
      message: 'Prompt更新成功',
      data: {
        id: prompt.id,
        name: prompt.name,
        content: prompt.content,
        description: prompt.description,
        category: prompt.category,
        tags: prompt.tags,
        type: prompt.type,
        language: prompt.language,
        variables: prompt.variables,
        examples: prompt.examples,
        status: prompt.status,
        version: prompt.version,
        sort_order: prompt.sort_order,
        updated_at: prompt.updated_at
      }
    };
  } catch (error) {
    logger.error('外部专家更新Prompt失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新Prompt失败: ' + error.message
    };
  }
});

// 删除Prompt（软删除）
router.delete('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const user_id = ctx.state.user.id;

    if (!id || isNaN(id)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Prompt ID无效'
      };
      return;
    }

    // 只能删除自己的prompt
    const prompt = await Prompt.findOne({
      where: {
        id,
        user_id // 强制限制为当前用户
      }
    });

    if (!prompt) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Prompt不存在或无权访问'
      };
      return;
    }

    // 软删除
    await prompt.destroy();

    logger.info(`外部专家删除Prompt成功: ${prompt.name}`, { 
      promptId: id, 
      userId: user_id,
      userRole: ctx.state.user.role 
    });

    ctx.body = {
      success: true,
      message: 'Prompt删除成功'
    };
  } catch (error) {
    logger.error('外部专家删除Prompt失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除Prompt失败: ' + error.message
    };
  }
});

// 批量删除Prompt
router.delete('/', async (ctx) => {
  try {
    const { ids } = ctx.request.body;
    const user_id = ctx.state.user.id;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供要删除的Prompt ID数组'
      };
      return;
    }

    // 验证所有ID都是数字
    const invalidIds = ids.filter(id => isNaN(id));
    if (invalidIds.length > 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '包含无效的Prompt ID: ' + invalidIds.join(', ')
      };
      return;
    }

    // 查找属于当前用户的prompt
    const prompts = await Prompt.findAll({
      where: {
        id: { [Op.in]: ids },
        user_id // 强制限制为当前用户
      }
    });

    if (prompts.length === 0) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '没有找到可删除的Prompt'
      };
      return;
    }

    // 批量软删除
    const deletedCount = await Prompt.destroy({
      where: {
        id: { [Op.in]: prompts.map(p => p.id) },
        user_id // 再次确保安全性
      }
    });

    logger.info(`外部专家批量删除Prompt成功`, { 
      deletedCount, 
      userId: user_id,
      userRole: ctx.state.user.role,
      deletedIds: prompts.map(p => p.id)
    });

    ctx.body = {
      success: true,
      message: `成功删除 ${deletedCount} 个Prompt`,
      data: {
        deleted_count: deletedCount,
        deleted_ids: prompts.map(p => p.id)
      }
    };
  } catch (error) {
    logger.error('外部专家批量删除Prompt失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量删除Prompt失败: ' + error.message
    };
  }
});

// 获取统计信息
router.get('/stats/summary', async (ctx) => {
  try {
    const user_id = ctx.state.user.id;

    // 统计当前用户的prompt数据
    const totalCount = await Prompt.count({
      where: { user_id }
    });

    const activeCount = await Prompt.count({
      where: { user_id, status: 'active' }
    });

    const draftCount = await Prompt.count({
      where: { user_id, status: 'draft' }
    });

    const inactiveCount = await Prompt.count({
      where: { user_id, status: 'inactive' }
    });

    // 按分类统计
    const categoryStats = await Prompt.findAll({
      where: { user_id },
      attributes: [
        'category',
        [Prompt.sequelize.fn('COUNT', Prompt.sequelize.col('id')), 'count']
      ],
      group: ['category'],
      raw: true
    });

    // 按类型统计
    const typeStats = await Prompt.findAll({
      where: { user_id },
      attributes: [
        'type',
        [Prompt.sequelize.fn('COUNT', Prompt.sequelize.col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    ctx.body = {
      success: true,
      message: '获取统计信息成功',
      data: {
        total_count: totalCount,
        status_stats: {
          active: activeCount,
          draft: draftCount,
          inactive: inactiveCount
        },
        category_stats: categoryStats,
        type_stats: typeStats
      }
    };
  } catch (error) {
    logger.error('获取外部专家Prompt统计信息失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取统计信息失败: ' + error.message
    };
  }
});

module.exports = router;