const Router = require('koa-router');
const router = new Router();
const logger = require('../../utils/logger');
const { getPromptContent, logDebugInfo, callAiWithRecord, validateRequired } = require('./shared');
const aiService = require('../../services/aiService');

// AI短文写作
router.post('/ai-business/short-article/generate', validateRequired(['title', 'word_count', 'model_id']), async (ctx) => {
  try {
    const {
      title, // 文章标题
      word_count, // 字数要求
      reference_content = '', // 参考内容
      writing_style = '现代', // 写作风格
      tone = '中性', // 语调
      target_audience = '一般读者', // 目标读者
      article_type = '通用文章', // 文章类型
      outline = '', // 文章大纲
      keywords = [], // 关键词
      model_id,
      prompt_id,
      stream = true
    } = ctx.request.body;

    const userId = ctx.state.user?.id;

    // 记录调试信息
    logDebugInfo('短文写作', {
      title, word_count, reference_content: reference_content.substring(0, 100) + '...', 
      writing_style, tone, target_audience, article_type, outline: outline.substring(0, 100) + '...', 
      keywords, model_id, prompt_id, stream, userId
    });

    let systemPrompt, userPrompt;
    
    // 如果提供了prompt_id，使用自定义prompt
    if (prompt_id) {
      const prompt = await getPromptContent(prompt_id);
      
      // 替换prompt中的变量
      systemPrompt = prompt.content
        .replace(/\{\{title\}\}/g, title)
        .replace(/\{\{word_count\}\}/g, word_count)
        .replace(/\{\{reference_content\}\}/g, reference_content)
        .replace(/\{\{writing_style\}\}/g, writing_style)
        .replace(/\{\{tone\}\}/g, tone)
        .replace(/\{\{target_audience\}\}/g, target_audience)
        .replace(/\{\{article_type\}\}/g, article_type)
        .replace(/\{\{outline\}\}/g, outline)
        .replace(/\{\{keywords\}\}/g, keywords.join('、'));
      
      // 即使使用自定义prompt，也要在userPrompt中包含具体的用户参数
      userPrompt = `请为以下主题创作短文：

短文标题：${title}

字数要求：${word_count}字

${outline ? `短文大纲：\n${outline}\n` : ''}
${keywords.length > 0 ? `关键词：${keywords.join('、')}\n` : ''}
${reference_content ? `参考内容：\n${reference_content}\n` : ''}

请根据系统提示词的要求开始创作短文内容：`;
      
      console.log('使用自定义Prompt:', prompt.name);
      console.log('SystemPrompt:', systemPrompt);
      console.log('UserPrompt:', userPrompt);
    } else {
      // 使用默认提示词
      systemPrompt = `你是一位专业的短文写作专家。请根据提供的标题、字数要求和相关信息，创作精炼高质量的短文内容。

要求：
1. 严格按照标题主题展开
2. 控制字数在${word_count}字左右
3. 语言简洁有力，表达精准
4. 结构紧凑，重点突出
5. 内容精炼，观点鲜明
6. 适合快速阅读和理解

写作风格：${writing_style}
语调基调：${tone}
目标读者：${target_audience}
短文类型：${article_type}`;

      userPrompt = `请为以下主题创作短文：

短文标题：${title}

字数要求：${word_count}字

${outline ? `短文大纲：\n${outline}\n` : ''}
${keywords.length > 0 ? `关键词：${keywords.join('、')}\n` : ''}
${reference_content ? `参考内容：\n${reference_content}\n` : ''}

请开始创作短文内容：`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    // 获取模型信息以使用其max_tokens
    const modelInfo = await aiService.getAvailableModel({ modelId: model_id });
    const modelMaxTokens = modelInfo?.max_tokens;
    
    // 如果模型max_tokens为null、0或undefined，表示无限制，设置为null
    // 否则使用模型的max_tokens设置
    const finalMaxTokens = (!modelMaxTokens || modelMaxTokens <= 0) 
      ? null 
      : modelMaxTokens;

    const callParams = {
      modelId: model_id,
      messages,
      stream,
      temperature: 0.7,
      max_tokens: finalMaxTokens,
      userId,
      businessType: 'short_article'
    };
    
    logger.info(`短篇文章生成 - 模型max_tokens: ${modelMaxTokens}, 最终max_tokens: ${finalMaxTokens}`);

    console.log('AI调用参数:', JSON.stringify(callParams, null, 2));

    const response = await callAiWithRecord({
      ctx,
      businessType: 'short_article',
      modelId: model_id,
      promptId: prompt_id,
      requestParams: { 
        title, 
        word_count, 
        reference_content: reference_content.substring(0, 200) + '...', 
        writing_style, 
        tone, 
        target_audience, 
        article_type, 
        outline: outline.substring(0, 200) + '...', 
        keywords 
      },
      systemPrompt,
      userPrompt,
      callParams,
      stream
    });
    
    if (!stream && response) {
      // 记录返回结果
      logDebugInfo('短文写作结果', callParams, {
        content: response.data.choices[0].message.content.substring(0, 200) + '...',
        usage: response.data.usage
      });
      
      ctx.body = {
        success: true,
        message: '短文生成成功',
        data: {
          content: response.data.choices[0].message.content,
          usage: response.data.usage
        }
      };
    }

  } catch (error) {
    logger.error('AI短文写作失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'AI短文写作失败'
    };
  }
});

module.exports = router;