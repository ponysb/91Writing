const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Gemini API 专用服务类
 * 处理Google Gemini API的特殊格式和要求
 */
class GeminiService {
  constructor() {
    this.name = 'GeminiService';
  }

  /**
   * 将OpenAI格式的消息转换为Gemini格式
   * @param {Array} messages - OpenAI格式的消息数组
   * @returns {Object} Gemini格式的请求体
   */
  convertMessagesToGeminiFormat(messages) {
    const contents = [];
    let systemInstruction = '';
    
    // 处理系统消息
    const systemMessage = messages.find(msg => msg.role === 'system');
    if (systemMessage) {
      systemInstruction = systemMessage.content;
    }
    
    // 处理用户和助手消息
    const conversationMessages = messages.filter(msg => msg.role !== 'system');
    
    for (const message of conversationMessages) {
      let role;
      switch (message.role) {
        case 'user':
          role = 'user';
          break;
        case 'assistant':
          role = 'model';
          break;
        default:
          role = 'user';
      }
      
      contents.push({
        role: role,
        parts: [{
          text: message.content
        }]
      });
    }
    
    const requestBody = {
      contents: contents
    };
    
    // 如果有系统指令，添加到请求中
    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{
          text: systemInstruction
        }]
      };
    }
    
    return requestBody;
  }

  /**
   * 构建Gemini API的生成配置
   * @param {Object} params - 参数对象
   * @returns {Object} Gemini格式的生成配置
   */
  buildGenerationConfig(params) {
    const {
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty
    } = params;
    
    const generationConfig = {};
    
    if (temperature !== undefined) {
      generationConfig.temperature = temperature;
    }
    
    if (max_tokens !== undefined && max_tokens !== null) {
      generationConfig.maxOutputTokens = max_tokens;
    }
    
    if (top_p !== undefined) {
      generationConfig.topP = top_p;
    }
    
    // Gemini不直接支持frequency_penalty和presence_penalty
    // 可以通过其他方式实现类似效果，这里先记录日志
    if (frequency_penalty !== undefined || presence_penalty !== undefined) {
      logger.info('Gemini API不支持frequency_penalty和presence_penalty参数，已忽略');
    }
    
    return generationConfig;
  }

  /**
   * 构建Gemini API请求URL
   * @param {Object} aiModel - AI模型配置
   * @param {boolean} stream - 是否流式响应
   * @returns {string} 完整的API URL
   */
  buildApiUrl(apiEndpoint, apiKey, stream = false) {
    // 如果传入的是完整的aiModel对象
    if (typeof apiEndpoint === 'object') {
      const aiModel = apiEndpoint;
      apiEndpoint = aiModel.api_endpoint;
      apiKey = aiModel.api_key;
      stream = apiKey || false; // 第二个参数是stream
    }
    
    // 如果api_endpoint已经包含完整路径，直接添加key参数
    if (apiEndpoint.includes('generateContent')) {
      return `${apiEndpoint}?key=${apiKey}`;
    }
    
    // 否则构建完整的URL
    const method = stream ? 'streamGenerateContent' : 'generateContent';
    const modelName = 'gemini-pro'; // 默认模型
    return `${apiEndpoint}/v1/models/${modelName}:${method}?key=${apiKey}`;
  }

  /**
   * 调用Gemini API
   * @param {Object} params - 调用参数
   * @returns {Promise<Object>} API响应
   */
  async callGeminiAPI(params) {
    const {
      aiModel,
      messages,
      stream = false,
      temperature,
      max_tokens,
      top_p,
      frequency_penalty,
      presence_penalty,
      customParameters = {},
      timeoutMs // 接受外部传递的超时时间
    } = params;

    try {
      // 转换消息格式
      const requestBody = this.convertMessagesToGeminiFormat(messages);
      
      // 构建生成配置
      const generationConfig = this.buildGenerationConfig({
        temperature,
        max_tokens,
        top_p,
        frequency_penalty,
        presence_penalty
      });
      
      if (Object.keys(generationConfig).length > 0) {
        requestBody.generationConfig = generationConfig;
      }
      
      // 添加自定义参数
      if (customParameters && Object.keys(customParameters).length > 0) {
        Object.assign(requestBody, customParameters);
      }
      
      // 构建API URL
      const apiUrl = this.buildApiUrl(aiModel.api_endpoint, aiModel.api_key, stream);
      
      // 构建请求头
      const headers = {
        'Content-Type': 'application/json',
        ...aiModel.request_headers
      };
      
      // 构建axios配置
      const axiosConfig = {
        method: 'POST',
        url: apiUrl,
        headers: headers,
        data: requestBody,
        timeout: timeoutMs || aiModel.timeout || 30000, // 优先使用传递的超时时间
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
      
      logger.info(`调用Gemini API: ${aiModel.name}, 流式: ${stream}`);
      logger.debug('Gemini请求体:', JSON.stringify(requestBody, null, 2));
      
      const response = await axios(axiosConfig);
      
      logger.info(`Gemini API调用成功: ${aiModel.name}`);
      
      return response;
      
    } catch (error) {
      logger.error('Gemini API调用失败:', error.message);
      
      // 处理Gemini特有的错误格式
      if (error.response && error.response.data) {
        const errorData = error.response.data;
        if (errorData.error) {
          const geminiError = new Error(errorData.error.message || 'Gemini API调用失败');
          geminiError.code = errorData.error.code;
          geminiError.status = errorData.error.status;
          geminiError.response = error.response;
          throw geminiError;
        }
      }
      
      throw error;
    }
  }

  /**
   * 将Gemini响应转换为OpenAI格式
   * @param {Object} geminiResponse - Gemini API响应
   * @param {Object} aiModel - AI模型配置
   * @returns {Object} OpenAI格式的响应
   */
  convertGeminiResponseToOpenAI(geminiResponse, aiModel = {}) {
    try {
      // 处理不同的输入格式
      const data = geminiResponse.data || geminiResponse;
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('Gemini响应中没有候选结果');
      }
      
      const candidate = data.candidates[0];
      const content = candidate.content;
      
      if (!content || !content.parts || content.parts.length === 0) {
        throw new Error('Gemini响应中没有内容');
      }
      
      const text = content.parts[0].text || '';
      
      // 构建OpenAI格式的响应
      const openaiResponse = {
        data: {
          id: `gemini-${Date.now()}`,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: aiModel.name || 'gemini-pro',
          choices: [{
            index: 0,
            message: {
              role: 'assistant',
              content: text
            },
            finish_reason: this.mapGeminiFinishReason(candidate.finishReason)
          }],
          usage: this.extractUsageFromGemini(data)
        }
      };
      
      return openaiResponse;
      
    } catch (error) {
      logger.error('转换Gemini响应失败:', error.message);
      throw error;
    }
  }

  /**
   * 映射Gemini的完成原因到OpenAI格式
   * @param {string} geminiFinishReason - Gemini的完成原因
   * @returns {string} OpenAI格式的完成原因
   */
  mapGeminiFinishReason(geminiFinishReason) {
    const mapping = {
      'STOP': 'stop',
      'MAX_TOKENS': 'length',
      'SAFETY': 'content_filter',
      'RECITATION': 'content_filter',
      'OTHER': 'stop'
    };
    
    return mapping[geminiFinishReason] || 'stop';
  }

  /**
   * 从Gemini响应中提取使用情况
   * @param {Object} geminiData - Gemini响应数据
   * @returns {Object} 使用情况统计
   */
  extractUsageFromGemini(geminiData) {
    // Gemini API可能在usageMetadata中提供token使用情况
    if (geminiData.usageMetadata) {
      return {
        prompt_tokens: geminiData.usageMetadata.promptTokenCount || 0,
        completion_tokens: geminiData.usageMetadata.candidatesTokenCount || 0,
        total_tokens: geminiData.usageMetadata.totalTokenCount || 0
      };
    }
    
    // 如果没有使用情况数据，返回默认值
    return {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    };
  }

  /**
   * 测试Gemini模型连接
   * @param {Object} aiModel - AI模型配置
   * @returns {Promise<Object>} 测试结果
   */
  async testGeminiConnection(aiModel) {
    const testMessage = {
      role: 'user',
      content: 'Hello, this is a test message. Please respond with "Test successful"'
    };
    
    try {
      const startTime = Date.now();
      
      const response = await this.callGeminiAPI({
        aiModel,
        messages: [testMessage],
        stream: false,
        temperature: 0.7
      });
      
      const responseTime = Date.now() - startTime;
      const convertedResponse = this.convertGeminiResponseToOpenAI(response, aiModel);
      
      return {
        success: true,
        response_time: responseTime,
        test_message: testMessage.content,
        model_response: convertedResponse.data.choices[0].message.content,
        timestamp: new Date(),
        raw_response: response.data
      };
      
    } catch (error) {
      return {
        success: false,
        error_message: error.message,
        error_code: error.code,
        timestamp: new Date()
      };
    }
  }
}

module.exports = new GeminiService();