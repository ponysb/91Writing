const Router = require('koa-router');
const AiConversation = require('../models/aiConversation');
const AiAssistant = require('../models/aiAssistant');
const AiMessage = require('../models/aiMessage');
const AiModel = require('../models/aimodel');
const User = require('../models/user');
const Prompt = require('../models/prompt');
const AiCallRecord = require('../models/aiCallRecord');
const logger = require('../utils/logger');
const AIService = require('../services/aiService');
const aiChatService = require('../services/aiChatService');
const { getPromptContent, logDebugInfo, recordAiCall, callAiWithRecord, validateRequired } = require('./ai-business/shared');
const membershipService = require('../services/membershipService');

const router = new Router({
  prefix: '/api/ai-chat'
});

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

// AI服务实例
const aiService = AIService;

// 1. AI对话接口（单接口设计）POST /api/ai-chat/conversation
router.post('/conversation', validateRequired(['conversation_id', 'content']), async (ctx) => {
  try {
    const {
      conversation_id,
      content,
      content_type = 'text',
      stream = true,
      model_id,
      prompt_id,
      attachments,
      metadata,
      temperature,
      max_tokens
    } = ctx.request.body;
    
    const user = ctx.state.user;
    
    // 记录调试信息
    logDebugInfo('AI助手对话', {
      conversation_id, content: content.substring(0, 100) + '...', 
      content_type, stream, model_id, prompt_id, userId: user.id
    });
    
    // 验证对话权限
    const conversation = await AiConversation.findOne({
      where: { id: conversation_id },
      include: [
        {
          model: AiAssistant,
          as: 'assistant'
        }
      ]
    });
    
    if (!conversation) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '对话会话不存在'
      };
      return;
    }
    
    if (conversation.user_id !== user.id && !user.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权限访问此对话会话'
      };
      return;
    }
    
    // 检查用户剩余使用次数（使用新的会员系统）
    if (!user.is_admin) {
      const remainingCredits = await membershipService.getUserRemainingCredits(user.id);
      if (remainingCredits <= 0) {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '剩余使用次数不足'
        };
        return;
      }
    }
    
    // 获取自定义Prompt内容
    let customPrompt = null;
    if (prompt_id) {
      try {
        const promptRecord = await getPromptContent(prompt_id);
        customPrompt = promptRecord.content;
        logDebugInfo('获取自定义Prompt', { prompt_id, content: customPrompt });
      } catch (error) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: `获取Prompt失败: ${error.message}`
        };
        return;
      }
    }

    // 验证AI助手
    const assistant = await AiAssistant.findByPk(conversation.assistant_id);
    if (!assistant || assistant.status !== 'active') {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'AI助手不存在或已禁用'
      };
      return;
    }

    // 验证AI模型
    let selectedModel;
    try {
      selectedModel = await aiService.getAvailableModel({ modelId: model_id });
      if (!selectedModel) {
        throw new Error('未找到可用的AI模型');
      }
    } catch (error) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.message
      };
      return;
    }

    // 检查用户是否有使用权限（不扣费，只检查）
    if (!user.is_admin) {
      const canUse = await membershipService.canUseAI(user.id);
      if (!canUse) {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '剩余次数不足，无法调用AI模型'
        };
        return;
      }
    }
    
    try {
      if (stream) {
        // 流式响应（扣费逻辑在aiService中处理）
        await aiChatService.handleStreamConversation(ctx, {
          conversationId: conversation_id,
          userMessage: content,
          assistant,
          modelId: selectedModel.id,
          promptId: prompt_id,
          customPrompt,
          temperature,
          max_tokens,
          userId: user.id // 始终传递用户ID，管理员扣费逻辑在membershipService中处理
        });
      } else {
        // 传统响应（扣费逻辑在aiService中处理）
        const result = await aiChatService.handleTraditionalConversation({
          conversationId: conversation_id,
          userMessage: content,
          assistant,
          modelId: selectedModel.id,
          promptId: prompt_id,
          customPrompt,
          temperature,
          max_tokens,
          userId: user.id, // 始终传递用户ID，管理员扣费逻辑在membershipService中处理
          ctx
        });
        
        ctx.body = result;
      }
    } catch (error) {
      // AI调用失败时不需要恢复使用次数，因为还没有扣费
      
      logger.error('AI对话处理失败:', error);
      
      if (stream) {
        // 流式响应中的错误处理已在aiChatService中处理
        return;
      } else {
        ctx.status = 500;
        ctx.body = {
          success: false,
          message: `AI对话失败: ${error.message}`
        };
      }
    }
    
  } catch (error) {
    logger.error('AI助手对话失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'AI助手对话失败'
    };
  }
});

// 2. 发送消息（兼容旧版本）POST /api/ai-chat/send
router.post('/send', validateRequired(['conversation_id', 'content']), async (ctx) => {
  // 重定向到新的conversation接口，保持向后兼容
  ctx.request.body.stream = true; // 默认使用流式响应
  return router.routes()['/conversation'].call(this, ctx);
});

// 3. SSE流式连接（兼容旧版本）GET /api/ai-chat/stream/:conversation_id
router.get('/stream/:conversation_id', async (ctx) => {
  ctx.status = 410;
  ctx.body = {
    success: false,
    message: '此接口已废弃，请使用 POST /api/ai-chat/conversation 接口进行对话'
  };
});


// 4. 停止AI生成 POST /api/ai-chat/stop
router.post('/stop', validateRequired(['conversation_id', 'message_id']), async (ctx) => {
  try {
    const { conversation_id, message_id } = ctx.request.body;
    const user = ctx.state.user;
    
    // 验证权限
    const conversation = await AiConversation.findOne({
      where: { id: conversation_id }
    });
    
    if (!conversation) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '对话会话不存在'
      };
      return;
    }
    
    if (conversation.user_id !== user.id && !user.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权限操作此对话会话'
      };
      return;
    }
    
    // 查找消息
    const message = await AiMessage.findOne({
      where: {
        id: message_id,
        conversation_id,
        role: 'assistant',
        status: 'processing'
      }
    });
    
    if (!message) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '消息不存在或已完成'
      };
      return;
    }
    
    // 使用aiChatService停止生成
    const stopped = await aiChatService.stopGeneration(conversation_id, message_id, user.id);
    
    if (stopped) {
      ctx.body = {
        success: true,
        message: 'AI生成已停止'
      };
    } else {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '未找到正在生成的消息'
      };
    }
    
  } catch (error) {
    logger.error('停止AI生成失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '停止AI生成失败',
      error: error.message
    };
  }
});

// 5. 重新生成AI回复 POST /api/ai-chat/regenerate
router.post('/regenerate', validateRequired(['conversation_id', 'message_id']), async (ctx) => {
  try {
    const { conversation_id, message_id, model_id, prompt_id, temperature, max_tokens, stream = false } = ctx.request.body;
    const user = ctx.state.user;
    
    // 验证权限
    const conversation = await AiConversation.findOne({
      where: { id: conversation_id },
      include: [
        {
          model: AiAssistant,
          as: 'assistant'
        }
      ]
    });
    
    if (!conversation) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '对话会话不存在'
      };
      return;
    }
    
    if (conversation.user_id !== user.id && !user.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权限操作此对话会话'
      };
      return;
    }
    
    // 检查用户剩余使用次数（使用新的会员系统）
    if (!user.is_admin) {
      const remainingCredits = await membershipService.getUserRemainingCredits(user.id);
      if (remainingCredits <= 0) {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '剩余使用次数不足'
        };
        return;
      }
    }
    
    // 查找要重新生成的消息
    const aiMessage = await AiMessage.findOne({
      where: {
        id: message_id,
        conversation_id,
        role: 'assistant'
      }
    });
    
    if (!aiMessage) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'AI消息不存在'
      };
      return;
    }
    
    // 查找对应的用户消息
    const userMessage = await AiMessage.findOne({
      where: {
        conversation_id,
        sequence_number: aiMessage.sequence_number - 1,
        role: 'user'
      }
    });
    
    if (!userMessage) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '找不到对应的用户消息'
      };
      return;
    }
    
    // 检查并扣除使用次数（使用新的会员系统）
    if (!user.is_admin) {
      try {
        await membershipService.consumeCredits(user.id, 1);
      } catch (error) {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: error.message || 'AI助手使用次数已用完'
        };
        return;
      }
    }
    
    try {
      // 获取AI助手信息
      const assistant = await AiAssistant.findByPk(conversation.assistant_id);
      
      // 验证AI模型
      let selectedModel;
      try {
        selectedModel = await aiService.getAvailableModel({ modelId: model_id });
        if (!selectedModel) {
          throw new Error('未找到可用的AI模型');
        }
      } catch (error) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: error.message
        };
        return;
      }
      
      // 获取自定义Prompt内容
      let customPrompt = null;
      if (prompt_id) {
        try {
          const promptRecord = await getPromptContent(prompt_id);
          customPrompt = promptRecord.content;
        } catch (error) {
          ctx.status = 400;
          ctx.body = {
            success: false,
            message: `获取Prompt失败: ${error.message}`
          };
          return;
        }
      }
      
      // 使用aiChatService重新生成消息
      const newMessage = await aiChatService.regenerateMessage(conversation_id, message_id, user.id);
      
      if (stream) {
        // 流式重新生成
        await aiChatService.handleStreamConversation(ctx, {
          conversationId: conversation_id,
          userMessage: userMessage.content,
          assistant,
          modelId: selectedModel.id,
          promptId: prompt_id,
          customPrompt,
          temperature,
          max_tokens,
          userId: user.id
        });
      } else {
        // 传统重新生成
        const result = await aiChatService.handleTraditionalConversation({
          conversationId: conversation_id,
          userMessage: userMessage.content,
          assistant,
          modelId: selectedModel.id,
          promptId: prompt_id,
          customPrompt,
          temperature,
          max_tokens,
          userId: user.id,
          ctx
        });
        
        ctx.body = {
          success: true,
          message: '重新生成完成',
          data: result.data
        };
      }
      
    } catch (error) {
      // 如果重新生成失败，恢复使用次数
      await User.increment('ai_chat_remaining', {
        by: 1,
        where: { id: user.id }
      });
      
      throw error;
    }
    
  } catch (error) {
    logger.error('重新生成AI回复失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '重新生成AI回复失败',
      error: error.message
    };
  }
});

// 5. 获取活跃连接状态 GET /api/ai-chat/connections
router.get('/connections', async (ctx) => {
  try {
    const user = ctx.state.user;
    
    // 只有管理员可以查看所有连接
    if (!user.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权限查看连接状态'
      };
      return;
    }
    
    const connections = Array.from(aiService.activeConnections.entries()).map(([id, conn]) => ({
      connection_id: id,
      user_id: conn.user_id,
      conversation_id: conn.conversation_id,
      assistant_id: conn.assistant_id,
      created_at: conn.created_at,
      duration: Date.now() - conn.created_at.getTime()
    }));
    
    ctx.body = {
      success: true,
      message: '获取连接状态成功',
      data: {
        total_connections: connections.length,
        connections
      }
    };
    
  } catch (error) {
    logger.error('获取连接状态失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取连接状态失败',
      error: error.message
    };
  }
});

module.exports = router;