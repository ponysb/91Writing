const Router = require('koa-router');
const router = new Router({
  prefix: '/api/aimodels'
});
const AiModel = require('../models/aimodel');
const User = require('../models/user');
const logger = require('../utils/logger');
const { Op, sequelize } = require('sequelize');
const aiService = require('../services/aiService');
const geminiService = require('../services/geminiService');

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

// 1. 创建AI模型 POST /api/aimodels
router.post('/', validateRequired(['name', 'provider', 'model_type', 'api_endpoint']), async (ctx) => {
  try {
    // 检查管理员权限
    const isAdmin = ctx.state.user && (ctx.state.user.is_admin || ctx.state.user.role === 'admin');
    if (!isAdmin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，只有管理员可以创建AI模型'
      };
      return;
    }

    const {
      name, display_name, description, provider, model_type, version,
      api_endpoint, proxy_url, api_key, max_tokens, temperature, top_p,
      frequency_penalty, presence_penalty, custom_parameters, request_headers,
      timeout, retry_count, rate_limit, credits_per_call, status,
      is_default, is_public, priority, tags, capabilities, limitations
    } = ctx.request.body;

    // 检查模型名称是否已存在
    const existingModel = await AiModel.findOne({
      where: { name }
    });

    if (existingModel) {
      ctx.status = 409;
      ctx.body = {
        success: false,
        message: '模型名称已存在'
      };
      return;
    }

    // 处理标签（如果是数组，转换为逗号分隔的字符串）
    const processedTags = Array.isArray(tags) ? tags.join(', ') : tags;

    // 如果设置为默认模型，先取消其他默认模型
    if (is_default) {
      await AiModel.update(
        { is_default: false },
        { where: { is_default: true } }
      );
    }

    const modelData = {
      name,
      display_name: display_name || name,
      description,
      provider,
      model_type,
      version,
      api_endpoint,
      proxy_url,
      api_key,
      max_tokens: max_tokens || 4096,
      temperature: temperature !== undefined ? temperature : 0.7,
      top_p: top_p !== undefined ? top_p : 1.0,
      frequency_penalty: frequency_penalty || 0,
      presence_penalty: presence_penalty || 0,
      custom_parameters,
      request_headers,
      timeout: timeout || 30000,
      retry_count: retry_count || 3,
      rate_limit,
      credits_per_call: credits_per_call || 1,
      status: status || 'active',
      is_default: is_default || false,
      is_public: is_public !== undefined ? is_public : true,
      priority: priority || 0,
      tags: processedTags,
      capabilities,
      limitations,
      created_by: ctx.state.user?.id
    };

    const aiModel = await AiModel.create(modelData);

    // 重新获取创建的数据，排除api_key字段
    const createdModel = await AiModel.findByPk(aiModel.id, {
      attributes: {
        exclude: ['api_key']
      }
    });

    logger.info(`AI模型创建成功: ${name}`, { userId: ctx.state.user?.id });

    ctx.status = 201;
    ctx.body = {
      success: true,
      message: 'AI模型创建成功',
      data: createdModel
    };

  } catch (error) {
    logger.error('创建AI模型失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建AI模型失败: ' + error.message
    };
  }
});

// 2. 获取AI模型列表 GET /api/aimodels
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      provider,
      model_type,
      status,
      is_public,
      sort_by = 'priority',
      sort_order = 'DESC'
    } = ctx.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};

    // 检查用户权限
    const isAdmin = ctx.state.user && (ctx.state.user.is_admin || ctx.state.user.role === 'admin');
    
    // 非管理员只能看到公开的模型
    if (!isAdmin) {
      whereClause.is_public = true;
      whereClause.status = 'active';
    }

    // 搜索条件
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { display_name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { provider: { [Op.like]: `%${search}%` } }
      ];
    }

    // 提供商筛选
    if (provider) {
      whereClause.provider = provider;
    }

    // 模型类型筛选
    if (model_type) {
      whereClause.model_type = model_type;
    }

    // 状态筛选（仅管理员可用）
    if (status && isAdmin) {
      whereClause.status = status;
    }

    // 公开性筛选（仅管理员可用）
    if (is_public !== undefined && isAdmin) {
      whereClause.is_public = is_public === 'true';
    }

    // 根据权限设置返回字段
    const attributes = isAdmin ? 
      // 管理员可以看到除api_key外的所有字段
      {
        exclude: ['api_key']
      } :
      // 普通用户只能看到公开字段，隐藏敏感信息
      [
        'id', 'display_name', 'description'
      ];

    const { count, rows } = await AiModel.findAndCountAll({
      where: whereClause,
      attributes,
      limit: parseInt(limit),
      offset,
      order: [[sort_by, sort_order.toUpperCase()]],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'nickname'],
          required: false
        }
      ]
    });

    ctx.body = {
      success: true,
      message: '获取AI模型列表成功',
      data: {
        models: rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / parseInt(limit)),
          total_count: count,
          per_page: parseInt(limit)
        }
      }
    };

  } catch (error) {
    logger.error('获取AI模型列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取AI模型列表失败: ' + error.message
    };
  }
});

// 3. 获取单个AI模型 GET /api/aimodels/:id
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    // 检查用户权限
    const isAdmin = ctx.state.user && (ctx.state.user.is_admin || ctx.state.user.role === 'admin');
    
    // 根据权限设置查询条件和返回字段
    const whereClause = { id };
    const attributes = isAdmin ? 
      // 管理员可以看到除api_key外的所有字段
      {
        exclude: ['api_key']
      } :
      // 普通用户只能看到公开字段，隐藏敏感信息
      [
        'id', 'display_name', 'description'
      ];
    
    // 非管理员只能访问公开且激活的模型
    if (!isAdmin) {
      whereClause.is_public = true;
      whereClause.status = 'active';
    }

    const aiModel = await AiModel.findOne({
      where: whereClause,
      attributes,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'nickname'],
          required: false
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'username', 'nickname'],
          required: false
        }
      ]
    });

    if (!aiModel) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: isAdmin ? 'AI模型不存在' : 'AI模型不存在或无权限访问'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '获取AI模型详情成功',
      data: aiModel
    };

  } catch (error) {
    logger.error('获取AI模型详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取AI模型详情失败: ' + error.message
    };
  }
});

// 4. 更新AI模型 PUT /api/aimodels/:id
router.put('/:id', async (ctx) => {
  try {
    // 检查管理员权限
    const isAdmin = ctx.state.user && (ctx.state.user.is_admin || ctx.state.user.role === 'admin');
    if (!isAdmin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，只有管理员可以更新AI模型'
      };
      return;
    }

    const { id } = ctx.params;
    const updateData = { ...ctx.request.body };

    const aiModel = await AiModel.findByPk(id);
    if (!aiModel) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'AI模型不存在'
      };
      return;
    }

    // 检查名称是否与其他模型冲突
    if (updateData.name && updateData.name !== aiModel.name) {
      const existingModel = await AiModel.findOne({
        where: {
          name: updateData.name,
          id: { [Op.ne]: id }
        }
      });

      if (existingModel) {
        ctx.status = 409;
        ctx.body = {
          success: false,
          message: '模型名称已存在'
        };
        return;
      }
    }

    // 处理标签（如果是数组，转换为逗号分隔的字符串）
    if (updateData.tags && Array.isArray(updateData.tags)) {
      updateData.tags = updateData.tags.join(', ');
    }

    // 如果设置为默认模型，先取消其他默认模型
    if (updateData.is_default) {
      await AiModel.update(
        { is_default: false },
        { where: { is_default: true, id: { [Op.ne]: id } } }
      );
    }

    // 添加更新者信息
    updateData.updated_by = ctx.state.user?.id;

    await aiModel.update(updateData);

    // 重新获取更新后的数据，排除api_key字段
    const updatedModel = await AiModel.findByPk(id, {
      attributes: {
        exclude: ['api_key']
      },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'nickname'],
          required: false
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'username', 'nickname'],
          required: false
        }
      ]
    });

    logger.info(`AI模型更新成功: ${aiModel.name}`, { userId: ctx.state.user?.id });

    ctx.body = {
      success: true,
      message: 'AI模型更新成功',
      data: updatedModel
    };

  } catch (error) {
    logger.error('更新AI模型失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新AI模型失败: ' + error.message
    };
  }
});

// 5. 删除AI模型 DELETE /api/aimodels/:id
router.delete('/:id', async (ctx) => {
  try {
    // 检查管理员权限
    const isAdmin = ctx.state.user && (ctx.state.user.is_admin || ctx.state.user.role === 'admin');
    if (!isAdmin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，只有管理员可以删除AI模型'
      };
      return;
    }

    const { id } = ctx.params;

    const aiModel = await AiModel.findByPk(id);
    if (!aiModel) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'AI模型不存在'
      };
      return;
    }

    // 检查是否为默认模型
    if (aiModel.is_default) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '不能删除默认模型，请先设置其他模型为默认'
      };
      return;
    }

    await aiModel.destroy();

    logger.info(`AI模型删除成功: ${aiModel.name}`, { userId: ctx.state.user?.id });

    ctx.body = {
      success: true,
      message: 'AI模型删除成功'
    };

  } catch (error) {
    logger.error('删除AI模型失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除AI模型失败: ' + error.message
    };
  }
});

// 6. 设置默认模型 PUT /api/aimodels/:id/default
router.put('/:id/default', async (ctx) => {
  try {
    // 检查管理员权限
    const isAdmin = ctx.state.user && (ctx.state.user.is_admin || ctx.state.user.role === 'admin');
    if (!isAdmin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，只有管理员可以设置默认模型'
      };
      return;
    }

    const { id } = ctx.params;

    const aiModel = await AiModel.findByPk(id);
    if (!aiModel) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'AI模型不存在'
      };
      return;
    }

    if (aiModel.status !== 'active') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '只能设置活跃状态的模型为默认模型'
      };
      return;
    }

    // 取消其他默认模型
    await AiModel.update(
      { is_default: false },
      { where: { is_default: true } }
    );

    // 设置当前模型为默认
    await aiModel.update({ is_default: true });

    // 重新获取更新后的数据，排除api_key字段
    const updatedModel = await AiModel.findByPk(id, {
      attributes: {
        exclude: ['api_key']
      }
    });

    logger.info(`设置默认AI模型: ${aiModel.name}`, { userId: ctx.state.user?.id });

    ctx.body = {
      success: true,
      message: '默认模型设置成功',
      data: updatedModel
    };

  } catch (error) {
    logger.error('设置默认模型失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '设置默认模型失败: ' + error.message
    };
  }
});

// 7. 测试模型连接 POST /api/aimodels/:id/test
router.post('/:id/test', async (ctx) => {
  try {
    // 检查管理员权限
    const isAdmin = ctx.state.user && (ctx.state.user.is_admin || ctx.state.user.role === 'admin');
    if (!isAdmin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，只有管理员可以测试AI模型'
      };
      return;
    }

    const { id } = ctx.params;
    const { test_message = 'Hello, this is a test message. Please respond with "Test successful"' } = ctx.request.body;

    const aiModel = await AiModel.findByPk(id);
    if (!aiModel) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'AI模型不存在'
      };
      return;
    }

    if (aiModel.status !== 'active') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '模型状态不是活跃状态，无法测试'
      };
      return;
    }

    let testResult;
    
    try {
      // 根据提供商选择不同的测试方法
      if (aiModel.provider && aiModel.provider.toLowerCase().includes('gemini')) {
        // 使用Gemini专用测试
        logger.info(`开始测试Gemini模型: ${aiModel.name}`);
        testResult = await geminiService.testGeminiConnection(aiModel);
      } else {
        // 使用通用AI服务测试
        logger.info(`开始测试AI模型: ${aiModel.name}`);
        const startTime = Date.now();
        
        const response = await aiService.callAI({
          modelId: aiModel.id,
          messages: [{
            role: 'user',
            content: test_message
          }],
          stream: false,
          temperature: 0.7,
          skipPermissionCheck: true // 测试时跳过权限检查
        });
        
        const responseTime = Date.now() - startTime;
        
        testResult = {
          success: true,
          response_time: responseTime,
          test_message,
          model_response: response.data?.choices?.[0]?.message?.content || '无响应内容',
          timestamp: new Date(),
          usage: response.data?.usage || null
        };
      }
      
      // 更新最后使用时间
      await aiModel.update({ last_used_at: new Date() });
      
      logger.info(`AI模型测试完成: ${aiModel.name}, 成功: ${testResult.success}`, { 
        userId: ctx.state.user?.id,
        responseTime: testResult.response_time
      });
      
      ctx.body = {
        success: true,
        message: testResult.success ? '模型测试成功' : '模型测试失败',
        data: testResult
      };
      
    } catch (testError) {
      logger.error(`AI模型测试失败: ${aiModel.name}`, testError);
      
      // 构建失败的测试结果
      testResult = {
        success: false,
        error_message: testError.message,
        error_code: testError.code || 'UNKNOWN_ERROR',
        timestamp: new Date(),
        response_time: testError.aiStats?.responseTime || 0
      };
      
      ctx.body = {
        success: false,
        message: '模型测试失败',
        data: testResult
      };
    }

  } catch (error) {
    logger.error('模型测试接口错误:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '模型测试失败: ' + error.message
    };
  }
});

// 8. 获取模型统计信息 GET /api/aimodels/stats
router.get('/stats', async (ctx) => {
  try {
    // 检查用户权限
    const isAdmin = ctx.state.user && (ctx.state.user.is_admin || ctx.state.user.role === 'admin');
    
    if (isAdmin) {
      // 管理员可以看到完整统计信息
      const stats = await AiModel.findAll({
        attributes: [
          'provider',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          [sequelize.fn('SUM', sequelize.col('usage_count')), 'total_usage']
        ],
        group: ['provider'],
        raw: true
      });

      const totalModels = await AiModel.count();
      const activeModels = await AiModel.count({ where: { status: 'active' } });
      const publicModels = await AiModel.count({ where: { is_public: true, status: 'active' } });
      const defaultModel = await AiModel.findOne({ where: { is_default: true } });

      ctx.body = {
        success: true,
        message: '获取统计信息成功',
        data: {
          total_models: totalModels,
          active_models: activeModels,
          public_models: publicModels,
          default_model: defaultModel ? defaultModel.name : null,
          provider_stats: stats
        }
      };
    } else {
      // 普通用户只能看到公开模型的基本统计
      const publicStats = await AiModel.findAll({
        where: { is_public: true, status: 'active' },
        attributes: [
          'provider',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count']
        ],
        group: ['provider'],
        raw: true
      });

      const publicModels = await AiModel.count({ where: { is_public: true, status: 'active' } });
      const defaultModel = await AiModel.findOne({ 
        where: { is_default: true, is_public: true, status: 'active' },
        attributes: ['name']
      });

      ctx.body = {
        success: true,
        message: '获取统计信息成功',
        data: {
          public_models: publicModels,
          default_model: defaultModel ? defaultModel.name : null,
          provider_stats: publicStats
        }
      };
    }

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