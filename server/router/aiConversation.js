const Router = require('koa-router');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const AiConversation = require('../models/aiConversation');
const AiAssistant = require('../models/aiAssistant');
const AiMessage = require('../models/aiMessage');
const Novel = require('../models/novel');
const User = require('../models/user');
const logger = require('../utils/logger');
const AIService = require('../services/aiService');

const router = new Router({
  prefix: '/api/ai-conversations'
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

// 1. 创建对话会话 POST /api/ai-conversations
router.post('/', validateRequired(['assistant_id']), async (ctx) => {
  try {
    const { assistant_id, novel_id, title, description, context, metadata } = ctx.request.body;
    const user = ctx.state.user;
    
    // 验证AI助手
    const assistant = await AiAssistant.findOne({
      where: {
        id: assistant_id,
        [Op.or]: [
          { created_by: user.id },
          { is_public: true }
        ]
      }
    });
    
    if (!assistant) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: 'AI助手不存在或无权限访问'
      };
      return;
    }
    
    // 验证小说ID（如果提供）
    if (novel_id) {
      const novel = await Novel.findOne({
        where: {
          id: novel_id,
          user_id: user.id
        }
      });
      
      if (!novel) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: '小说不存在或无权限访问'
        };
        return;
      }
    }
    
    const conversationData = {
      title: title || `与${assistant.name}的对话`,
      description,
      user_id: user.id,
      assistant_id,
      novel_id: novel_id || null,
      session_id: uuidv4(),
      context: context ? JSON.stringify(context) : null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      status: 'active'
    };
    
    const conversation = await AiConversation.create(conversationData);
    
    // 获取完整的对话信息
    const fullConversation = await AiConversation.findOne({
      where: { id: conversation.id },
      include: [
        {
          model: AiAssistant,
          as: 'assistant',
          attributes: ['id', 'name', 'description', 'avatar', 'type']
        },
        {
          model: Novel,
          as: 'novel',
          attributes: ['id', 'title', 'description'],
          required: false
        }
      ]
    });
    
    ctx.status = 201;
    ctx.body = {
      success: true,
      message: '对话会话创建成功',
      data: fullConversation
    };
    
  } catch (error) {
    logger.error('创建对话会话失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建对话会话失败',
      error: error.message
    };
  }
});

// 2. 获取对话会话列表 GET /api/ai-conversations
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      assistant_id,
      novel_id,
      status,
      is_pinned,
      is_favorite,
      sort_by = 'last_message_at',
      sort_order = 'DESC'
    } = ctx.query;
    
    const user = ctx.state.user;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 构建查询条件
    const whereConditions = {
      user_id: user.id
    };
    
    // 管理员可以查看所有对话
    if (user.is_admin && ctx.query.all_users === 'true') {
      delete whereConditions.user_id;
    }
    
    // 搜索条件
    if (search) {
      whereConditions[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // 筛选条件
    if (assistant_id) whereConditions.assistant_id = assistant_id;
    if (novel_id) whereConditions.novel_id = novel_id;
    if (status) whereConditions.status = status;
    if (is_pinned !== undefined) whereConditions.is_pinned = is_pinned === 'true';
    if (is_favorite !== undefined) whereConditions.is_favorite = is_favorite === 'true';
    
    const { count, rows } = await AiConversation.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'nickname', 'avatar']
        },
        {
          model: AiAssistant,
          as: 'assistant',
          attributes: ['id', 'name', 'description', 'avatar', 'type']
        },
        {
          model: Novel,
          as: 'novel',
          attributes: ['id', 'title', 'description'],
          required: false
        }
      ],
      order: [
        ['is_pinned', 'DESC'], // 置顶的在前
        [sort_by, sort_order.toUpperCase()]
      ],
      limit: parseInt(limit),
      offset: offset
    });
    
    ctx.body = {
      success: true,
      message: '获取对话会话列表成功',
      data: {
        conversations: rows,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / parseInt(limit))
        }
      }
    };
    
  } catch (error) {
    logger.error('获取对话会话列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取对话会话列表失败',
      error: error.message
    };
  }
});

// 3. 获取对话会话详情 GET /api/ai-conversations/:id
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const { include_messages = 'true', message_limit = 50 } = ctx.query;
    const user = ctx.state.user;
    
    const conversation = await AiConversation.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'nickname', 'avatar']
        },
        {
          model: AiAssistant,
          as: 'assistant',
          attributes: ['id', 'name', 'description', 'avatar', 'type', 'personality', 'system_prompt']
        },
        {
          model: Novel,
          as: 'novel',
          attributes: ['id', 'title', 'description'],
          required: false
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
    
    // 权限检查：只有创建者和管理员可以查看
    if (conversation.user_id !== user.id && !user.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权限访问此对话会话'
      };
      return;
    }
    
    let result = conversation.toJSON();
    
    // 如果需要包含消息
    if (include_messages === 'true') {
      const messages = await AiMessage.findAll({
        where: { conversation_id: id },
        order: [['sequence_number', 'ASC']],
        limit: parseInt(message_limit)
      });
      
      result.messages = messages;
    }
    
    ctx.body = {
      success: true,
      message: '获取对话会话详情成功',
      data: result
    };
    
  } catch (error) {
    logger.error('获取对话会话详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取对话会话详情失败',
      error: error.message
    };
  }
});

// 4. 更新对话会话 PUT /api/ai-conversations/:id
router.put('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const user = ctx.state.user;
    
    const conversation = await AiConversation.findOne({
      where: { id }
    });
    
    if (!conversation) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '对话会话不存在'
      };
      return;
    }
    
    // 权限检查：只有创建者和管理员可以修改
    if (conversation.user_id !== user.id && !user.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权限修改此对话会话'
      };
      return;
    }
    
    const {
      title, description, context, metadata, status, is_pinned, is_favorite
    } = ctx.request.body;
    
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (context !== undefined) updateData.context = JSON.stringify(context);
    if (metadata !== undefined) updateData.metadata = JSON.stringify(metadata);
    if (status !== undefined) updateData.status = status;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
    if (is_favorite !== undefined) updateData.is_favorite = is_favorite;
    
    await conversation.update(updateData);
    
    // 重新获取更新后的数据
    const updatedConversation = await AiConversation.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'nickname', 'avatar']
        },
        {
          model: AiAssistant,
          as: 'assistant',
          attributes: ['id', 'name', 'description', 'avatar', 'type']
        },
        {
          model: Novel,
          as: 'novel',
          attributes: ['id', 'title', 'description'],
          required: false
        }
      ]
    });
    
    ctx.body = {
      success: true,
      message: '对话会话更新成功',
      data: updatedConversation
    };
    
  } catch (error) {
    logger.error('更新对话会话失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新对话会话失败',
      error: error.message
    };
  }
});

// 5. 删除对话会话 DELETE /api/ai-conversations/:id
router.delete('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const user = ctx.state.user;
    
    const conversation = await AiConversation.findOne({
      where: { id }
    });
    
    if (!conversation) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '对话会话不存在'
      };
      return;
    }
    
    // 权限检查：只有创建者和管理员可以删除
    if (conversation.user_id !== user.id && !user.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权限删除此对话会话'
      };
      return;
    }
    
    // 删除对话会话（会级联删除相关消息）
    await conversation.destroy();
    
    ctx.body = {
      success: true,
      message: '对话会话删除成功'
    };
    
  } catch (error) {
    logger.error('删除对话会话失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除对话会话失败',
      error: error.message
    };
  }
});

// 6. 批量删除对话会话 DELETE /api/ai-conversations
router.delete('/', validateRequired(['ids']), async (ctx) => {
  try {
    const { ids } = ctx.request.body;
    const user = ctx.state.user;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'ids必须是非空数组'
      };
      return;
    }
    
    // 查找要删除的对话
    const conversations = await AiConversation.findAll({
      where: {
        id: { [Op.in]: ids }
      }
    });
    
    // 权限检查：只能删除自己的对话（管理员除外）
    const unauthorizedConversations = conversations.filter(conversation => 
      conversation.user_id !== user.id && !user.is_admin
    );
    
    if (unauthorizedConversations.length > 0) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权限删除部分对话会话'
      };
      return;
    }
    
    const deletedCount = await AiConversation.destroy({
      where: {
        id: { [Op.in]: ids }
      }
    });
    
    ctx.body = {
      success: true,
      message: `成功删除${deletedCount}个对话会话`
    };
    
  } catch (error) {
    logger.error('批量删除对话会话失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量删除对话会话失败',
      error: error.message
    };
  }
});

// 7. 发送消息并获取AI回复 POST /api/ai-conversations/:id/messages
router.post('/:id/messages', validateRequired(['content']), async (ctx) => {
  try {
    const { id } = ctx.params;
    const { content, content_type = 'text', attachments, metadata } = ctx.request.body;
    const user = ctx.state.user;
    
    const conversation = await AiConversation.findOne({
      where: { id },
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
    
    // 权限检查
    if (conversation.user_id !== user.id && !user.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权限访问此对话会话'
      };
      return;
    }
    
    // 获取下一个序号
    const lastMessage = await AiMessage.findOne({
      where: { conversation_id: id },
      order: [['sequence_number', 'DESC']]
    });
    
    const nextSequenceNumber = lastMessage ? lastMessage.sequence_number + 1 : 1;
    
    // 创建用户消息
    const userMessage = await AiMessage.create({
      conversation_id: id,
      user_id: user.id,
      role: 'user',
      content,
      content_type,
      attachments: attachments ? JSON.stringify(attachments) : null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      sequence_number: nextSequenceNumber,
      status: 'completed'
    });
    
    // 更新对话的消息数量和最后消息时间
    await conversation.update({
      message_count: conversation.message_count + 1,
      last_message_at: new Date()
    });
    
    ctx.body = {
      success: true,
      message: '消息发送成功',
      data: {
        user_message: userMessage,
        conversation_id: id,
        session_id: conversation.session_id
      }
    };
    
  } catch (error) {
    logger.error('发送消息失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '发送消息失败',
      error: error.message
    };
  }
});

// 8. 获取对话消息列表 GET /api/ai-conversations/:id/messages
router.get('/:id/messages', async (ctx) => {
  try {
    const { id } = ctx.params;
    const {
      page = 1,
      limit = 50,
      role,
      status,
      sort_order = 'ASC'
    } = ctx.query;
    
    const user = ctx.state.user;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // 验证对话权限
    const conversation = await AiConversation.findOne({
      where: { id }
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
    
    // 构建查询条件
    const whereConditions = {
      conversation_id: id
    };
    
    if (role) whereConditions.role = role;
    if (status) whereConditions.status = status;
    
    const { count, rows } = await AiMessage.findAndCountAll({
      where: whereConditions,
      order: [['sequence_number', sort_order.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset
    });
    
    ctx.body = {
      success: true,
      message: '获取消息列表成功',
      data: {
        messages: rows,
        pagination: {
          current_page: parseInt(page),
          per_page: parseInt(limit),
          total: count,
          total_pages: Math.ceil(count / parseInt(limit))
        }
      }
    };
    
  } catch (error) {
    logger.error('获取消息列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取消息列表失败',
      error: error.message
    };
  }
});

module.exports = router;