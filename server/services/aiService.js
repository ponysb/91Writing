const axios = require('axios');
const { PassThrough } = require('stream');
const logger = require('../utils/logger');
const AiModel = require('../models/aimodel');
const User = require('../models/user');
const AiCallRecord = require('../models/aiCallRecord');
const MembershipService = require('./membershipService');
const geminiService = require('./geminiService');

/**
 * AI服务核心类 - 负责与各种AI模型进行通信
 */
class AIService {
  constructor() {
    this.activeConnections = new Map(); // 存储活跃的SSE连接
  }

  /**
   * 获取可用的AI模型
   * @param {Object} options - 筛选选项
   * @returns {Promise<Object>} AI模型信息
   */
  async getAvailableModel(options = {}) {
    const { modelId, modelType, provider } = options;
    
    let whereClause = {
      status: 'active'
    };
    
    if (modelId) {
      // 支持通过ID或名称查找模型
      whereClause = {
        ...whereClause,
        [require('sequelize').Op.or]: [
          { id: modelId },
          { name: modelId }
        ]
      };
    }
    if (modelType) {
      whereClause.model_type = modelType;
    }
    if (provider) {
      whereClause.provider = provider;
    }
    
    // 如果没有指定模型，获取默认模型或优先级最高的模型
    if (!modelId) {
      const model = await AiModel.findOne({
        where: whereClause,
        order: [['is_default', 'DESC'], ['priority', 'DESC'], ['id', 'ASC']]
      });
      return model;
    }
    
    const model = await AiModel.findOne({ where: whereClause });
    if (!model) {
      throw new Error(`未找到指定的AI模型: ${modelId}`);
    }
    
    return model;
  }

  /**
   * 调用AI模型 - 支持流式和非流式响应
   * @param {Object} params - 调用参数
   * @returns {Promise<Object|Stream>} 响应结果或流
   */
  async callAI(params) {
    const {
      modelId,
      messages,
      stream = true,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
      customParameters = {},
      userId,
      skipPermissionCheck = false,
      businessType = 'general',
      skipRecording = false
    } = params;

    // 获取AI模型配置
    const aiModel = await this.getAvailableModel({ modelId });
    if (!aiModel) {
      throw new Error('未找到可用的AI模型');
    }

    // 检查用户剩余次数（如果提供了userId且未跳过权限检查）
    if (userId && !skipPermissionCheck) {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('用户不存在');
      }
      
      const canUse = await MembershipService.canUseAI(userId);
      if (!canUse) {
        throw new Error('剩余次数不足，无法调用AI模型');
      }
    }

    // 如果是Gemini提供商，使用专门的Gemini服务
    if (aiModel.provider && aiModel.provider.toLowerCase().includes('gemini')) {
      return this.handleGeminiCall({
        aiModel,
        messages,
        stream,
        temperature,
        max_tokens,
        top_p,
        frequency_penalty,
        presence_penalty,
        customParameters,
        userId,
        businessType
      });
    }

    // 构建请求参数
    const requestData = {
      model: aiModel.version || aiModel.name,
      messages: messages,
      stream: stream,
      temperature: temperature !== undefined ? temperature : aiModel.temperature,
      top_p: top_p !== undefined ? top_p : aiModel.top_p,
      frequency_penalty: frequency_penalty !== undefined ? frequency_penalty : aiModel.frequency_penalty,
      presence_penalty: presence_penalty !== undefined ? presence_penalty : aiModel.presence_penalty,
      ...customParameters
    };
    
    // 只有当明确指定max_tokens时才添加到请求中，避免不必要的长度限制
    if (max_tokens !== undefined && max_tokens !== null) {
      requestData.max_tokens = max_tokens;
    }
    // 注意：不使用aiModel.max_tokens作为默认值，以避免意外的内容截断

    // 构建请求头
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${aiModel.api_key}`,
      ...aiModel.request_headers
    };

    // 构建请求配置
    // 对于思维模型，大幅增加超时时间以适应思考过程
    let timeoutMs = aiModel.timeout || 30000;
    
    // 检测是否为思维模型或包含思维相关内容
    const hasThinkingContent = messages.some(msg => 
      msg.content && (
        msg.content.includes('思维链') || 
        msg.content.includes('chain of thought') || 
        msg.content.includes('step by step') ||
        msg.content.includes('思考') ||
        msg.content.includes('thinking') ||
        msg.content.includes('reasoning')
      )
    );
    
    // 检测模型名称是否包含思维相关标识或需要长超时的模型
    const isThinkingModel = aiModel.name && (
      aiModel.name.toLowerCase().includes('thinking') ||
      aiModel.name.toLowerCase().includes('o1') ||
      aiModel.name.toLowerCase().includes('reasoning') ||
      aiModel.name.toLowerCase().includes('gemini-2.5-pro') || // Gemini 2.5 Pro需要更长超时
      aiModel.display_name?.toLowerCase().includes('思维') ||
      aiModel.display_name?.toLowerCase().includes('thinking')
    );
    
    if (hasThinkingContent || isThinkingModel) {
      timeoutMs = Math.max(timeoutMs, 300000); // 思维模型至少5分钟超时
      logger.info(`检测到思维模型或思维内容，设置超时时间为: ${timeoutMs}ms`);
    }
    
    const axiosConfig = {
      method: 'POST',
      url: aiModel.api_endpoint,
      headers: headers,
      data: requestData,
      timeout: timeoutMs,
      responseType: stream ? 'stream' : 'json'
    };

    // 如果配置了代理
    if (aiModel.proxy_url) {
      const proxyUrl = new URL(aiModel.proxy_url);
      axiosConfig.proxy = {
        host: proxyUrl.hostname,
        port: proxyUrl.port,
        protocol: proxyUrl.protocol
      };
    }

    const startTime = Date.now(); // 记录开始时间
    
    try {
      logger.info(`调用AI模型: ${aiModel.name}, 用户: ${userId}, 流式: ${stream}`);
      
      const response = await axios(axiosConfig);
      const responseTime = Date.now() - startTime; // 计算响应时间
      
      // 提取tokens使用情况（如果是非流式响应）
      let tokensUsed = null;
      if (!stream && response.data && response.data.usage) {
        tokensUsed = {
          prompt_tokens: response.data.usage.prompt_tokens || 0,
          completion_tokens: response.data.usage.completion_tokens || 0,
          total_tokens: response.data.usage.total_tokens || 0
        };
      }
      
      // 消费用户次数（仅在非流式响应时扣费，流式响应在aiChatService中统一扣费）
      if (userId && !stream) {
        await MembershipService.consumeAIUsage(userId);
        logger.info(`用户 ${userId} 调用AI模型，消费1次使用次数`);
      }
      
      // 更新模型使用统计
      await aiModel.increment('usage_count');
      await aiModel.update({ last_used_at: new Date() });
      
      // 记录AI调用
      if (userId && !skipRecording) {
        try {
          // 提取系统提示词和用户提示词
          const systemPrompt = messages.find(msg => msg.role === 'system')?.content || '';
          const userPrompt = messages.find(msg => msg.role === 'user')?.content || '';
          
          await AiCallRecord.create({
            user_id: userId,
            business_type: businessType,
            model_id: aiModel.id,
            request_params: JSON.stringify(requestData),
            system_prompt: systemPrompt,
            user_prompt: userPrompt,
            response_content: stream ? null : (response.data?.choices?.[0]?.message?.content || ''),
            tokens_used: tokensUsed,
            response_time: responseTime,
            status: 'success',
            error_message: null
          });
        } catch (recordError) {
          logger.error('记录AI调用失败:', recordError);
        }
      }
      
      // 在响应对象上添加统计信息，供上层调用者使用
      response.aiStats = {
        tokensUsed,
        responseTime,
        modelId: aiModel.id,
        modelName: aiModel.name
      };
      
      return response;
      
    } catch (error) {
      const responseTime = Date.now() - startTime; // 计算失败时的响应时间
      
      logger.error('AI模型调用失败:', error.message);
      
      // 重试逻辑
      if (params.currentRetry === undefined) {
        params.currentRetry = 0;
      }
      
      // 判断是否应该重试
      const isRetryableError = 
        error.code === 'ECONNABORTED' || // 超时错误
        error.code === 'ECONNRESET' || // 连接重置
        error.code === 'ENOTFOUND' || // DNS解析失败
        error.code === 'ETIMEDOUT' || // 连接超时
        (error.response && [502, 503, 504, 429].includes(error.response.status)); // 服务器临时错误
      
      const shouldRetry = params.currentRetry < aiModel.retry_count && isRetryableError;
      
      if (shouldRetry) {
        params.currentRetry++;
        
        // 根据错误类型和模型类型调整重试延迟
        let baseDelay = 1000;
        
        // 对于思维模型，使用更长的重试延迟（因为每次重试都会重新思考）
        if (hasThinkingContent || isThinkingModel) {
          baseDelay = 30000; // 思维模型基础延迟30秒，给足够时间重新思考
          if (error.response && [502, 503, 504].includes(error.response.status)) {
            baseDelay = 45000; // 思维模型服务器错误延迟45秒
          } else if (error.response && error.response.status === 429) {
            baseDelay = 60000; // 思维模型限流错误延迟60秒
          }
        } else {
          // 普通模型的延迟设置
          if (error.response && [502, 503, 504].includes(error.response.status)) {
            baseDelay = 3000; // 服务器错误使用更长延迟
          } else if (error.response && error.response.status === 429) {
            baseDelay = 5000; // 限流错误使用最长延迟
          }
        }
        
        const maxDelay = (hasThinkingContent || isThinkingModel) ? 180000 : 30000; // 思维模型最大延迟3分钟
        const retryDelay = Math.min(baseDelay * Math.pow(2, params.currentRetry - 1), maxDelay); // 指数退避
        logger.info(`重试调用AI模型，第 ${params.currentRetry}/${aiModel.retry_count} 次重试，${retryDelay}ms 后重试，错误: ${error.message}`);
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.callAI(params);
      }
      
      // 记录失败的AI调用
      if (userId && !skipRecording) {
        try {
          // 提取系统提示词和用户提示词
          const systemPrompt = messages.find(msg => msg.role === 'system')?.content || '';
          const userPrompt = messages.find(msg => msg.role === 'user')?.content || '';
          
          await AiCallRecord.create({
            user_id: userId,
            business_type: businessType,
            model_id: aiModel.id,
            request_params: JSON.stringify(requestData),
            system_prompt: systemPrompt,
            user_prompt: userPrompt,
            response_content: null,
            tokens_used: null,
            response_time: responseTime,
            status: 'error',
            error_message: error.message
          });
        } catch (recordError) {
          logger.error('记录AI调用失败:', recordError);
        }
      }
      
      // 在错误对象上添加统计信息
      error.aiStats = {
        tokensUsed: null,
        responseTime,
        modelId: aiModel.id,
        modelName: aiModel.name
      };
      
      throw error;
    }
  }

  /**
   * 处理Gemini API调用
   * @param {Object} params - 调用参数
   * @returns {Promise<Object>} 响应结果
   */
  async handleGeminiCall(params) {
    const {
      aiModel,
      messages,
      stream,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
      customParameters,
      userId,
      businessType
    } = params;

    const startTime = Date.now();

    try {
      logger.info(`调用Gemini模型: ${aiModel.name}, 用户: ${userId}, 流式: ${stream}`);
      
      // 计算超时时间（与主AI服务保持一致的逻辑）
      let timeoutMs = aiModel.timeout || 30000;
      
      // 检测是否为思维模型或包含思维相关内容
      const hasThinkingContent = messages.some(msg => 
        msg.content && (
          msg.content.includes('思维链') || 
          msg.content.includes('chain of thought') || 
          msg.content.includes('step by step') ||
          msg.content.includes('思考') ||
          msg.content.includes('thinking') ||
          msg.content.includes('reasoning')
        )
      );
      
      // 检测模型名称是否包含思维相关标识或需要长超时的模型
      const isThinkingModel = aiModel.name && (
        aiModel.name.toLowerCase().includes('thinking') ||
        aiModel.name.toLowerCase().includes('o1') ||
        aiModel.name.toLowerCase().includes('reasoning') ||
        aiModel.name.toLowerCase().includes('gemini-2.5-pro') || // Gemini 2.5 Pro需要更长超时
        aiModel.display_name?.toLowerCase().includes('思维') ||
        aiModel.display_name?.toLowerCase().includes('thinking')
      );
      
      if (hasThinkingContent || isThinkingModel) {
        timeoutMs = Math.max(timeoutMs, 300000); // 思维模型至少5分钟超时
        logger.info(`检测到Gemini思维模型或思维内容，设置超时时间为: ${timeoutMs}ms`);
      }
      
      // 调用Gemini专用服务，传递计算后的超时时间
      const response = await geminiService.callGeminiAPI({
        aiModel,
        messages,
        stream,
        temperature,
        max_tokens,
        top_p,
        frequency_penalty,
        presence_penalty,
        customParameters,
        timeoutMs // 传递计算后的超时时间
      });
      
      const responseTime = Date.now() - startTime;
      
      // 转换为OpenAI格式的响应
      const convertedResponse = geminiService.convertGeminiResponseToOpenAI(response, aiModel);
      
      // 提取tokens使用情况
      let tokensUsed = null;
      if (!stream && convertedResponse.data && convertedResponse.data.usage) {
        tokensUsed = {
          prompt_tokens: convertedResponse.data.usage.prompt_tokens || 0,
          completion_tokens: convertedResponse.data.usage.completion_tokens || 0,
          total_tokens: convertedResponse.data.usage.total_tokens || 0
        };
      }
      
      // 消费用户次数（仅在非流式响应时扣费，流式响应在aiChatService中统一扣费）
      if (userId && !stream) {
        await MembershipService.consumeAIUsage(userId);
        logger.info(`用户 ${userId} 调用Gemini模型，消费1次使用次数`);
      }
      
      // 更新模型使用统计
      await aiModel.increment('usage_count');
      await aiModel.update({ last_used_at: new Date() });
      
      // 记录AI调用
      if (userId) {
        try {
          // 提取系统提示词和用户提示词
          const systemPrompt = messages.find(msg => msg.role === 'system')?.content || '';
          const userPrompt = messages.find(msg => msg.role === 'user')?.content || '';
          
          await AiCallRecord.create({
            user_id: userId,
            business_type: businessType,
            model_id: aiModel.id,
            request_params: JSON.stringify({
              model: aiModel.name,
              messages,
              stream,
              temperature,
              max_tokens,
              top_p
            }),
            system_prompt: systemPrompt,
            user_prompt: userPrompt,
            response_content: stream ? null : (convertedResponse.data?.choices?.[0]?.message?.content || ''),
            tokens_used: tokensUsed,
            response_time: responseTime,
            status: 'success',
            error_message: null
          });
        } catch (recordError) {
          logger.error('记录Gemini调用失败:', recordError);
        }
      }
      
      // 在响应对象上添加统计信息
      convertedResponse.aiStats = {
        tokensUsed,
        responseTime,
        modelId: aiModel.id,
        modelName: aiModel.name
      };
      
      return convertedResponse;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      logger.error('Gemini模型调用失败:', error.message);
      
      // 记录失败的AI调用
      if (userId) {
        try {
          const systemPrompt = messages.find(msg => msg.role === 'system')?.content || '';
          const userPrompt = messages.find(msg => msg.role === 'user')?.content || '';
          
          await AiCallRecord.create({
            user_id: userId,
            business_type: businessType,
            model_id: aiModel.id,
            request_params: JSON.stringify({
              model: aiModel.name,
              messages,
              stream,
              temperature,
              max_tokens,
              top_p
            }),
            system_prompt: systemPrompt,
            user_prompt: userPrompt,
            response_content: null,
            tokens_used: null,
            response_time: responseTime,
            status: 'error',
            error_message: error.message
          });
        } catch (recordError) {
          logger.error('记录Gemini调用失败:', recordError);
        }
      }
      
      // 在错误对象上添加统计信息
      error.aiStats = {
        tokensUsed: null,
        responseTime,
        modelId: aiModel.id,
        modelName: aiModel.name
      };
      
      throw error;
    }
  }

  /**
   * 创建SSE流式响应
   * @param {Object} ctx - Koa上下文
   * @param {Object} params - 调用参数
   */
  async createSSEStream(ctx, params) {
    const { userId } = params;
    
    try {
      // 在设置SSE响应头之前进行所有必要的检查和验证
      
      // 检查用户权限（管理员跳过积分检查）
      if (userId) {
        const user = await User.findByPk(userId);
        if (!user) {
          ctx.status = 404;
          ctx.body = {
            success: false,
            message: '用户不存在'
          };
          return;
        }
        
        const canUse = await MembershipService.canUseAI(userId);
        if (!canUse) {
          ctx.status = 403;
          ctx.body = {
            success: false,
            message: '剩余次数不足，无法调用AI模型'
          };
          return;
        }
      }
      
      // 验证AI模型配置
      const aiModel = await this.getAvailableModel({ modelId: params.modelId });
      if (!aiModel) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '未找到可用的AI模型'
        };
        return;
      }
      
      // 验证必要参数
      if (!params.messages || !Array.isArray(params.messages) || params.messages.length === 0) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '消息参数无效'
        };
        return;
      }
      
    } catch (error) {
      logger.error('流式响应预检查失败:', error);
      ctx.status = 500;
      ctx.body = {
        success: false,
        message: '服务器内部错误'
      };
      return;
    }
    
    // 设置SSE响应头
    ctx.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // 创建PassThrough流
    const stream = new PassThrough();
    ctx.body = stream;

    // 存储连接
    const connectionId = `${userId}_${Date.now()}`;
    this.activeConnections.set(connectionId, stream);

    // 发送初始连接消息
    this.sendSSEMessage(stream, 'connected', { message: '连接已建立' });

    try {
      // 调用AI模型（此时权限已经检查过了，移除callAI中的重复检查）
      const response = await this.callAI({ ...params, stream: true, skipPermissionCheck: true, skipRecording: params.skipRecording });
      
      // 处理流式响应
      let isFinished = false; // 防止重复扣费
      
      response.data.on('data', async (chunk) => {
        const lines = chunk.toString().split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              if (!isFinished) {
                isFinished = true;
                
                // 注意：流式响应的扣费逻辑由上层调用者（如aiChatService）处理
                // 这里不进行扣费，避免重复扣费
                
                this.sendSSEMessage(stream, 'done', { message: '生成完成' });
                stream.end();
                this.activeConnections.delete(connectionId);
              }
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              if (parsed.choices && parsed.choices[0] && parsed.choices[0].delta) {
                const content = parsed.choices[0].delta.content;
                if (content) {
                  this.sendSSEMessage(stream, 'content', { content });
                }
              }
            } catch (parseError) {
              logger.warn('解析SSE数据失败:', parseError.message);
            }
          }
        }
      });

      response.data.on('end', async () => {
        if (!isFinished) {
          isFinished = true;
          
          // 注意：流式响应的扣费逻辑由上层调用者（如aiChatService）处理
          // 这里不进行扣费，避免重复扣费
          
          this.sendSSEMessage(stream, 'done', { message: '生成完成' });
          stream.end();
          this.activeConnections.delete(connectionId);
        }
      });

      response.data.on('error', (error) => {
        logger.error('SSE流错误:', error);
        
        // 根据错误类型发送不同的错误信息
        let errorType = 'stream_error';
        let errorMessage = error.message;
        
        if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
          errorType = 'connection_error';
          errorMessage = 'AI服务连接中断';
        } else if (error.code === 'ETIMEDOUT') {
          errorType = 'timeout_error';
          errorMessage = 'AI服务响应超时';
        }
        
        this.sendSSEMessage(stream, 'error', { 
          error: errorMessage,
          error_type: errorType,
          error_code: error.code
        });
        stream.end();
        this.activeConnections.delete(connectionId);
      });

    } catch (error) {
      logger.error('创建SSE流失败:', error);
      
      // 根据错误类型提供更详细的错误信息
      let errorType = 'creation_error';
      let errorMessage = error.message;
      
      if (error.message.includes('剩余次数不足')) {
        errorType = 'insufficient_credits';
      } else if (error.message.includes('未找到可用的AI模型')) {
        errorType = 'model_not_found';
      } else if (error.message.includes('用户不存在')) {
        errorType = 'user_not_found';
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        errorType = 'service_unavailable';
        errorMessage = 'AI服务暂时不可用';
      } else if (error.response && error.response.status) {
        errorType = 'api_error';
        errorMessage = `AI服务返回错误: ${error.response.status}`;
      }
      
      this.sendSSEMessage(stream, 'error', { 
        error: errorMessage,
        error_type: errorType,
        error_code: error.code
      });
      stream.end();
      this.activeConnections.delete(connectionId);
    }

    // 处理客户端断开连接
    ctx.req.on('close', () => {
      stream.end();
      this.activeConnections.delete(connectionId);
      logger.info(`SSE连接已断开: ${connectionId}`);
    });
  }

  /**
   * 发送SSE消息
   * @param {Stream} stream - 流对象
   * @param {string} event - 事件类型
   * @param {Object} data - 数据
   */
  sendSSEMessage(stream, event, data) {
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    stream.write(message);
  }

  /**
   * 关闭所有活跃连接
   */
  closeAllConnections() {
    for (const [connectionId, stream] of this.activeConnections) {
      stream.end();
      logger.info(`强制关闭SSE连接: ${connectionId}`);
    }
    this.activeConnections.clear();
  }
}

// 导出单例
module.exports = new AIService();