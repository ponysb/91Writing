const Router = require('koa-router');
const Prompt = require('../models/prompt');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const router = new Router({
  prefix: '/api/prompts'
});

// 创建Prompt
router.post('/', async (ctx) => {
  try {
    console.log(ctx.request.body);
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
      is_public = false,
      is_system = false,
      status = 'active',
      parent_id,
      sort_order = 0,
      version = '1.0.0'
    } = ctx.request.body;

    // 从JWT token中获取用户ID
    console.log(ctx.state.user);
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户未认证，请先登录'
      };
      return;
    }
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

    // 检查同名Prompt是否存在
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
        message: '该用户已存在同名Prompt'
      };
      return;
    }

    // 创建Prompt
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
      is_public,
      is_system,
      status,
      user_id,
      parent_id,
      sort_order,
      version
    });

    logger.info(`Prompt创建成功: ${name}`, { userId: user_id });

    ctx.body = {
      success: true,
      message: 'Prompt创建成功',
      data: {
        name: prompt.name,
        content: prompt.content,
        description: prompt.description,
        category: prompt.category,
        tags: prompt.tags,
        type: prompt.type,
        language: prompt.language,
        variables: prompt.variables,
        examples: prompt.examples,
        is_public: prompt.is_public,
        is_system: prompt.is_system,
        status: prompt.status,
        version: prompt.version,
        user_id: prompt.user_id,
        parent_id: prompt.parent_id,
        sort_order: prompt.sort_order,
        created_at: prompt.created_at
      }
    };
  } catch (error) {
    logger.error('创建Prompt失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建Prompt失败: ' + error.message
    };
  }
});

// 获取Prompt列表
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      type,
      status,
      language,
      is_public,
      is_system,
      user_id,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = ctx.query;

    // 参数验证
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // 构建查询条件
    const whereConditions = {};

    if (search) {
      whereConditions[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    if (category) {
      whereConditions.category = category;
    }

    if (type) {
      whereConditions.type = type;
    }

    if (status) {
      whereConditions.status = status;
    }

    if (language) {
      whereConditions.language = language;
    }

    if (is_public !== undefined) {
      whereConditions.is_public = is_public === 'true';
    }

    if (is_system !== undefined) {
      whereConditions.is_system = is_system === 'true';
    }

    if (user_id) {
      whereConditions.user_id = user_id;
    }

    // 排序字段验证
    const validSortFields = ['id', 'name', 'category', 'type', 'status', 'usage_count', 'like_count', 'created_at', 'updated_at', 'sort_order'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 查询Prompt列表
    const { count, rows: prompts } = await Prompt.findAndCountAll({
      where: whereConditions,
      order: [[sortField, sortDirection]],
      limit: limitNum,
      offset: offset,
      attributes: {
        exclude: ['deleted_at']
      }
    });

    const totalPages = Math.ceil(count / limitNum);

    ctx.body = {
      success: true,
      message: '获取Prompt列表成功',
      data: {
        prompts: prompts.map(prompt => ({
          id: prompt.id,
          name: prompt.name,
          description: prompt.description,
          category: prompt.category,
          tags: prompt.tags,
          type: prompt.type,
          language: prompt.language,
          is_public: prompt.is_public,
          is_system: prompt.is_system,
          status: prompt.status,
          usage_count: prompt.usage_count,
          like_count: prompt.like_count,
          version: prompt.version,
          user_id: prompt.user_id,
          parent_id: prompt.parent_id,
          sort_order: prompt.sort_order,
          created_at: prompt.created_at,
          updated_at: prompt.updated_at
        })),
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalCount: count,
          limit: limitNum
        }
      }
    };
  } catch (error) {
    logger.error('获取Prompt列表失败:', error);
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

    if (!id || isNaN(id)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Prompt ID无效'
      };
      return;
    }

    const prompt = await Prompt.findByPk(id, {
      attributes: {
        exclude: ['deleted_at']
      }
    });

    if (!prompt) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Prompt不存在'
      };
      return;
    }

    // 增加使用次数
    await prompt.increment('usage_count');

    ctx.body = {
      success: true,
      message: '获取Prompt详情成功',
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
        is_public: prompt.is_public,
        is_system: prompt.is_system,
        status: prompt.status,
        usage_count: prompt.usage_count + 1,
        like_count: prompt.like_count,
        version: prompt.version,
        user_id: prompt.user_id,
        parent_id: prompt.parent_id,
        sort_order: prompt.sort_order,
        created_at: prompt.created_at,
        updated_at: prompt.updated_at
      }
    };
  } catch (error) {
    logger.error('获取Prompt详情失败:', error);
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

    if (!id || isNaN(id)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Prompt ID无效'
      };
      return;
    }

    const prompt = await Prompt.findByPk(id);
    if (!prompt) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Prompt不存在'
      };
      return;
    }

    // 验证更新字段
    const allowedFields = [
      'name', 'content', 'description', 'category', 'tags', 'type',
      'language', 'variables', 'examples', 'is_public', 'status',
      'sort_order', 'version'
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
          user_id: prompt.user_id,
          id: { [Op.ne]: id }
        }
      });

      if (existingPrompt) {
        ctx.status = 409;
        ctx.body = {
          success: false,
          message: '该用户已存在同名Prompt'
        };
        return;
      }
    }

    // 更新Prompt
    await prompt.update(filteredData);

    logger.info(`Prompt更新成功: ${prompt.name}`, { promptId: id, userId: prompt.user_id });

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
        is_public: prompt.is_public,
        is_system: prompt.is_system,
        status: prompt.status,
        usage_count: prompt.usage_count,
        like_count: prompt.like_count,
        version: prompt.version,
        user_id: prompt.user_id,
        parent_id: prompt.parent_id,
        sort_order: prompt.sort_order,
        updated_at: prompt.updated_at
      }
    };
  } catch (error) {
    logger.error('更新Prompt失败:', error);
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

    if (!id || isNaN(id)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Prompt ID无效'
      };
      return;
    }

    const prompt = await Prompt.findByPk(id);
    if (!prompt) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Prompt不存在'
      };
      return;
    }

    // 检查是否为系统内置Prompt
    if (prompt.is_system) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '系统内置Prompt不能删除'
      };
      return;
    }

    // 软删除
    await prompt.destroy();

    logger.info(`Prompt删除成功: ${prompt.name}`, { promptId: id, userId: prompt.user_id });

    ctx.body = {
      success: true,
      message: 'Prompt删除成功'
    };
  } catch (error) {
    logger.error('删除Prompt失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除Prompt失败: ' + error.message
    };
  }
});

// 批量删除Prompt
router.delete('/batch', async (ctx) => {
  try {
    const { promptIds } = ctx.request.body;

    if (!promptIds || !Array.isArray(promptIds) || promptIds.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Prompt ID列表不能为空'
      };
      return;
    }

    // 验证ID格式
    const validIds = promptIds.filter(id => !isNaN(id));
    if (validIds.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '没有有效的Prompt ID'
      };
      return;
    }

    // 查找要删除的Prompt（排除系统内置）
    const prompts = await Prompt.findAll({
      where: {
        id: { [Op.in]: validIds },
        is_system: false
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
    await Prompt.destroy({
      where: {
        id: { [Op.in]: prompts.map(p => p.id) }
      }
    });

    logger.info(`批量删除Prompt成功，共删除${prompts.length}个`, { promptIds: prompts.map(p => p.id) });

    ctx.body = {
      success: true,
      message: `批量删除成功，共删除${prompts.length}个Prompt`
    };
  } catch (error) {
    logger.error('批量删除Prompt失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量删除Prompt失败: ' + error.message
    };
  }
});

// 恢复Prompt
router.put('/:id/restore', async (ctx) => {
  try {
    const { id } = ctx.params;

    if (!id || isNaN(id)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Prompt ID无效'
      };
      return;
    }

    const prompt = await Prompt.findByPk(id, {
      paranoid: false
    });

    if (!prompt) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Prompt不存在'
      };
      return;
    }

    if (!prompt.deleted_at) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Prompt未被删除，无需恢复'
      };
      return;
    }

    // 恢复Prompt
    await prompt.restore();

    logger.info(`Prompt恢复成功: ${prompt.name}`, { promptId: id, userId: prompt.user_id });

    ctx.body = {
      success: true,
      message: 'Prompt恢复成功',
      data: {
        id: prompt.id,
        name: prompt.name,
        status: prompt.status
      }
    };
  } catch (error) {
    logger.error('恢复Prompt失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '恢复Prompt失败: ' + error.message
    };
  }
});

// 点赞/取消点赞Prompt
router.put('/:id/like', async (ctx) => {
  try {
    const { id } = ctx.params;
    const { action = 'like' } = ctx.request.body; // 'like' 或 'unlike'

    if (!id || isNaN(id)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Prompt ID无效'
      };
      return;
    }

    const prompt = await Prompt.findByPk(id);
    if (!prompt) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Prompt不存在'
      };
      return;
    }

    if (action === 'like') {
      await prompt.increment('like_count');
    } else if (action === 'unlike') {
      await prompt.decrement('like_count');
    } else {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '操作类型无效，必须是 like 或 unlike'
      };
      return;
    }

    await prompt.reload();

    ctx.body = {
      success: true,
      message: action === 'like' ? '点赞成功' : '取消点赞成功',
      data: {
        id: prompt.id,
        name: prompt.name,
        like_count: prompt.like_count
      }
    };
  } catch (error) {
    logger.error('点赞操作失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '点赞操作失败: ' + error.message
    };
  }
});

// 复制Prompt
router.post('/:id/copy', async (ctx) => {
  try {
    const { id } = ctx.params;
    const { name_suffix = '_copy' } = ctx.request.body;
    // 从JWT token中获取用户ID
    const user_id = ctx.state.user.id;

    if (!id || isNaN(id)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Prompt ID无效'
      };
      return;
    }



    const originalPrompt = await Prompt.findByPk(id);
    if (!originalPrompt) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'Prompt不存在'
      };
      return;
    }

    // 生成新的名称
    let newName = originalPrompt.name + name_suffix;
    let counter = 1;
    while (await Prompt.findOne({ where: { name: newName, user_id } })) {
      newName = originalPrompt.name + name_suffix + '_' + counter;
      counter++;
    }

    // 复制Prompt
    const copiedPrompt = await Prompt.create({
      name: newName,
      content: originalPrompt.content,
      description: originalPrompt.description,
      category: originalPrompt.category,
      tags: originalPrompt.tags,
      type: originalPrompt.type,
      language: originalPrompt.language,
      variables: originalPrompt.variables,
      examples: originalPrompt.examples,
      is_public: false, // 复制的Prompt默认为私有
      is_system: false, // 复制的Prompt不是系统内置
      status: 'draft', // 复制的Prompt默认为草稿状态
      user_id: user_id,
      parent_id: originalPrompt.id, // 设置父级ID
      sort_order: originalPrompt.sort_order,
      version: '1.0.0' // 重置版本号
    });

    logger.info(`Prompt复制成功: ${newName}`, { originalId: id, copiedId: copiedPrompt.id, userId: user_id });

    ctx.body = {
      success: true,
      message: 'Prompt复制成功',
      data: {
        id: copiedPrompt.id,
        name: copiedPrompt.name,
        content: copiedPrompt.content,
        description: copiedPrompt.description,
        category: copiedPrompt.category,
        tags: copiedPrompt.tags,
        type: copiedPrompt.type,
        language: copiedPrompt.language,
        variables: copiedPrompt.variables,
        examples: copiedPrompt.examples,
        is_public: copiedPrompt.is_public,
        is_system: copiedPrompt.is_system,
        status: copiedPrompt.status,
        version: copiedPrompt.version,
        user_id: copiedPrompt.user_id,
        parent_id: copiedPrompt.parent_id,
        sort_order: copiedPrompt.sort_order,
        created_at: copiedPrompt.created_at
      }
    };
  } catch (error) {
    logger.error('复制Prompt失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '复制Prompt失败: ' + error.message
    };
  }
});

// 获取Prompt统计信息
router.get('/stats', async (ctx) => {
  try {
    const { user_id } = ctx.query;

    const whereCondition = user_id ? { user_id } : {};

    const [totalPrompts, activePrompts, draftPrompts, inactivePrompts, publicPrompts, systemPrompts] = await Promise.all([
      Prompt.count({ where: whereCondition }),
      Prompt.count({ where: { ...whereCondition, status: 'active' } }),
      Prompt.count({ where: { ...whereCondition, status: 'draft' } }),
      Prompt.count({ where: { ...whereCondition, status: 'inactive' } }),
      Prompt.count({ where: { ...whereCondition, is_public: true } }),
      Prompt.count({ where: { ...whereCondition, is_system: true } })
    ]);

    // 获取分类统计
    const categoryStats = await Prompt.findAll({
      where: whereCondition,
      attributes: [
        'category',
        [Prompt.sequelize.fn('COUNT', Prompt.sequelize.col('id')), 'count']
      ],
      group: ['category'],
      raw: true
    });

    // 获取类型统计
    const typeStats = await Prompt.findAll({
      where: whereCondition,
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
        totalPrompts,
        activePrompts,
        draftPrompts,
        inactivePrompts,
        publicPrompts,
        systemPrompts,
        categoryStats: categoryStats.reduce((acc, item) => {
          acc[item.category || '未分类'] = parseInt(item.count);
          return acc;
        }, {}),
        typeStats: typeStats.reduce((acc, item) => {
          acc[item.type] = parseInt(item.count);
          return acc;
        }, {})
      }
    };
  } catch (error) {
    logger.error('获取统计信息失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取统计信息失败: ' + error.message
    };
  }
});

module.exports = router;