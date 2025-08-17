const Router = require('koa-router');
const router = new Router({
  prefix: '/api/ai'
});
const aiService = require('../services/aiService');
const logger = require('../utils/logger');

/**
 * 核心AI调用接口 - 兼容OpenAI格式
 */

// 参数验证中间件
function validateRequired(fields) {
  return async (ctx, next) => {
    const missingFields = fields.filter(field => {
      const value = ctx.request.body[field];
      return value === undefined || value === null || value === '';
    });
    
    if (missingFields.length > 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: `缺少必需参数: ${missingFields.join(', ')}`
      };
      return;
    }
    
    await next();
  };
}

// 1. 聊天完成接口 - 兼容OpenAI格式
router.post('/chat/completions', validateRequired(['messages']), async (ctx) => {
  try {
    const {
      model,
      messages,
      stream = false,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
      stop,
      presence_penalty: presencePenalty,
      frequency_penalty: frequencyPenalty,
      ...otherParams
    } = ctx.request.body;

    const userId = ctx.state.user?.id;

    // 验证消息格式
    if (!Array.isArray(messages) || messages.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'messages必须是非空数组'
      };
      return;
    }

    // 验证消息结构
    for (const message of messages) {
      if (!message.role || !message.content) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '每条消息必须包含role和content字段'
        };
        return;
      }
      if (!['system', 'user', 'assistant'].includes(message.role)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: 'role必须是system、user或assistant之一'
        };
        return;
      }
    }

    const callParams = {
      modelId: model, // 如果提供了model参数，作为modelId使用
      messages,
      stream,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      customParameters: {
        stop,
        ...otherParams
      },
      userId
    };

    if (stream) {
      // 流式响应
      await aiService.createSSEStream(ctx, callParams);
    } else {
      // 非流式响应
      const response = await aiService.callAI(callParams);
      
      // 转换为OpenAI格式响应
      const openaiResponse = {
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: response.data.model || 'unknown',
        choices: response.data.choices || [{
          index: 0,
          message: {
            role: 'assistant',
            content: response.data.content || ''
          },
          finish_reason: 'stop'
        }],
        usage: response.data.usage || {
          prompt_tokens: 0,
          completion_tokens: 0,
          total_tokens: 0
        }
      };

      ctx.body = openaiResponse;
    }

  } catch (error) {
    logger.error('AI聊天完成接口调用失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'AI调用失败'
    };
  }
});

// 2. 获取可用模型列表
router.get('/models', async (ctx) => {
  try {
    const { provider, model_type, status = 'active' } = ctx.query;
    
    const AiModel = require('../models/aimodel');
    const { Op } = require('sequelize');
    
    let whereClause = { status };
    
    if (provider) {
      whereClause.provider = provider;
    }
    if (model_type) {
      whereClause.model_type = model_type;
    }
    
    const models = await AiModel.findAll({
      where: whereClause,
      attributes: ['id', 'name', 'display_name', 'description', 'provider', 'model_type', 'version', 'max_tokens', 'credits_per_call', 'is_default', 'priority'],
      order: [['is_default', 'DESC'], ['priority', 'DESC'], ['name', 'ASC']]
    });
    
    // 转换为OpenAI格式
    const openaiModels = models.map(model => ({
      id: model.name,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: model.provider.toLowerCase(),
      permission: [],
      root: model.name,
      parent: null
    }));
    
    ctx.body = {
      object: 'list',
      data: openaiModels
    };
    
  } catch (error) {
    logger.error('获取模型列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取模型列表失败'
    };
  }
});

// 3. 获取单个模型信息
router.get('/models/:model', async (ctx) => {
  try {
    const { model } = ctx.params;
    
    const AiModel = require('../models/aimodel');
    
    const aiModel = await AiModel.findOne({
      where: {
        name: model,
        status: 'active'
      },
      attributes: ['id', 'name', 'display_name', 'description', 'provider', 'model_type', 'version', 'max_tokens', 'credits_per_call']
    });
    
    if (!aiModel) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '模型不存在'
      };
      return;
    }
    
    // 转换为OpenAI格式
    const openaiModel = {
      id: aiModel.name,
      object: 'model',
      created: Math.floor(Date.now() / 1000),
      owned_by: aiModel.provider.toLowerCase(),
      permission: [],
      root: aiModel.name,
      parent: null
    };
    
    ctx.body = openaiModel;
    
  } catch (error) {
    logger.error('获取模型信息失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取模型信息失败'
    };
  }
});

// 4. 健康检查接口
router.get('/health', async (ctx) => {
  try {
    const AiModel = require('../models/aimodel');
    
    const activeModels = await AiModel.count({
      where: { status: 'active' }
    });
    
    ctx.body = {
      success: true,
      message: 'AI服务运行正常',
      data: {
        active_models: activeModels,
        active_connections: aiService.activeConnections.size,
        timestamp: new Date().toISOString()
      }
    };
    
  } catch (error) {
    logger.error('健康检查失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务异常'
    };
  }
});

// 5. 停止所有活跃连接（管理接口）
router.post('/admin/stop-connections', async (ctx) => {
  try {
    const connectionCount = aiService.activeConnections.size;
    aiService.closeAllConnections();
    
    ctx.body = {
      success: true,
      message: `已停止 ${connectionCount} 个活跃连接`
    };
    
  } catch (error) {
    logger.error('停止连接失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '停止连接失败'
    };
  }
});

module.exports = router;