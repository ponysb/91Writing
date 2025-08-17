const Router = require('koa-router');
const router = new Router();
const logger = require('../../utils/logger');
const aiService = require('../../services/aiService');
const { getPromptContent, logDebugInfo, callAiWithRecord, validateRequired } = require('./shared');

// AI拆书功能
router.post('/ai-business/book-analyze/generate', validateRequired(['book_name', 'content_to_analyze', 'model_id']), async (ctx) => {
  try {
    const {
      book_name, // 书名
      content_to_analyze, // 要拆解的内容
      special_requirements = '', // 用户输入的特殊要求
      analysis_type = 'comprehensive', // 分析类型：comprehensive(综合分析)、structure(结构分析)、character(人物分析)、theme(主题分析)、writing(写作技巧分析)
      focus_points = [], // 关注要点
      analysis_depth = '中等', // 分析深度：简单、中等、深入
      target_audience = '一般读者', // 目标受众
      model_id,
      prompt_id, // 拆书promptId
      stream = true
    } = ctx.request.body;

    const userId = ctx.state.user?.id;

    // 记录调试信息
    logDebugInfo('拆书功能', {
      book_name, content_to_analyze: content_to_analyze.substring(0, 100) + '...', 
      special_requirements: special_requirements.substring(0, 100) + '...', analysis_type, 
      focus_points, analysis_depth, target_audience, model_id, prompt_id, stream, userId
    });

    let systemPrompt, userPrompt;
    
    // 如果提供了prompt_id，使用自定义prompt
    if (prompt_id) {
      const prompt = await getPromptContent(prompt_id);
      
      // 替换prompt中的变量
      systemPrompt = prompt.content
        .replace(/\{\{book_name\}\}/g, book_name)
        .replace(/\{\{content_to_analyze\}\}/g, content_to_analyze)
        .replace(/\{\{special_requirements\}\}/g, special_requirements)
        .replace(/\{\{analysis_type\}\}/g, analysis_type)
        .replace(/\{\{focus_points\}\}/g, focus_points.join('、'))
        .replace(/\{\{analysis_depth\}\}/g, analysis_depth)
        .replace(/\{\{target_audience\}\}/g, target_audience);
      
      // 即使使用自定义prompt，也要在userPrompt中包含具体的用户参数
      userPrompt = `请对《${book_name}》进行拆书分析：\n\n要拆解的内容：\n${content_to_analyze}\n\n${special_requirements ? `特殊要求：${special_requirements}\n` : ''}${focus_points.length > 0 ? `关注要点：${focus_points.join('、')}\n` : ''}\n请根据系统提示词的要求进行拆书分析：`;
      
      console.log('使用自定义拆书Prompt:', prompt.name);
      console.log('SystemPrompt:', systemPrompt);
      console.log('UserPrompt:', userPrompt);
      
      console.log('使用自定义Prompt:', prompt.name);
    } else {
      // 使用默认提示词
      const analysisTypeMap = {
        'comprehensive': '综合拆书分析',
        'structure': '结构分析',
        'character': '人物分析', 
        'theme': '主题分析',
        'writing': '写作技巧分析'
      };
      
      const analysisTypeName = analysisTypeMap[analysis_type] || analysis_type;
      
      systemPrompt = `你是一位专业的拆书专家。请对《${book_name}》的指定内容进行深入的${analysisTypeName}。

拆书要求：
1. 分析要客观准确，有理有据
2. 结合具体文本内容进行说明
3. 适合${target_audience}的理解水平
4. 分析深度：${analysis_depth}
5. 提供实用的见解和启发
6. 注重实际应用价值

请按以下格式输出：
## 内容概述
[对拆解内容的总体概况]

## 核心观点
[提炼出的核心观点和思想]

## 深度分析
[具体分析内容，分点阐述]

## 实用启发
[对读者的实际启发和应用建议]

## 金句摘录
[值得记住的精彩语句]

## 总结感悟
[拆书总结和核心收获]`;

      userPrompt = `请对《${book_name}》的以下内容进行拆书分析：

${content_to_analyze}

${special_requirements ? `特殊要求：${special_requirements}\n` : ''}
${focus_points.length > 0 ? `特别关注：${focus_points.join('、')}\n` : ''}

请开始拆书分析：`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    // 获取模型信息以确定max_tokens
    const aiModel = await aiService.getAvailableModel({ modelId: model_id });
    const modelMaxTokens = aiModel?.max_tokens;
    
    // 智能计算max_tokens：如果模型支持无限token则设置为null，否则使用模型限制
    let maxTokens;
    if (!modelMaxTokens || modelMaxTokens === 0) {
      // 模型支持无限token，设置为null让模型自由发挥
      maxTokens = null;
    } else {
      // 模型有token限制，使用模型的max_tokens设置
      maxTokens = modelMaxTokens;
    }
    
    logger.info(`拆书分析 - 模型max_tokens: ${modelMaxTokens}, 最终max_tokens: ${maxTokens}`);

    const callParams = {
      modelId: model_id,
      messages,
      stream,
      temperature: 0.7,
      max_tokens: maxTokens,
      userId,
      businessType: 'book_analyze'
    };

    console.log('AI调用参数:', JSON.stringify(callParams, null, 2));

    const response = await callAiWithRecord({
      ctx,
      businessType: 'book_analyze',
      modelId: model_id,
      promptId: prompt_id,
      requestParams: { book_name, content_to_analyze: content_to_analyze.substring(0, 200) + '...', special_requirements: special_requirements.substring(0, 100) + '...', analysis_type, focus_points, analysis_depth, target_audience },
      systemPrompt,
      userPrompt,
      callParams,
      stream
    });
    
    if (!stream && response) {
      // 记录返回结果
      logDebugInfo('拆书分析结果', callParams, {
        content: response.data.choices[0].message.content.substring(0, 200) + '...',
        usage: response.data.usage
      });
      
      ctx.body = {
        success: true,
        message: '拆书分析成功',
        data: {
          analysis: response.data.choices[0].message.content,
          usage: response.data.usage
        }
      };
    }

  } catch (error) {
    logger.error('AI拆书分析失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'AI拆书分析失败'
    };
  }
});

module.exports = router;