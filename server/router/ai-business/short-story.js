const Router = require('koa-router');
const router = new Router();
const logger = require('../../utils/logger');
const aiService = require('../../services/aiService');
const { getPromptContent, logDebugInfo, callAiWithRecord, validateRequired } = require('./shared');

// AI短篇小说写作
router.post('/ai-business/short-story/generate', validateRequired(['title', 'word_count', 'model_id']), async (ctx) => {
  try {
    const {
      title, // 小说标题
      word_count, // 字数要求
      style = '现代', // 风格选择
      basic_setting = '', // 基础设定配置
      reference_content = '', // 参考内容
      genre = '现代小说', // 小说类型
      theme = '', // 主题
      protagonist = '', // 主角设定
      plot_outline = '', // 情节大纲
      tone = '中性', // 语调
      target_audience = '一般读者', // 目标读者
      model_id,
      prompt_id,
      stream = true
    } = ctx.request.body;

    const userId = ctx.state.user?.id;

    // 记录调试信息
    logDebugInfo('短篇小说写作', {
      title, word_count, style, basic_setting: basic_setting.substring(0, 100) + '...', 
      reference_content: reference_content.substring(0, 100) + '...', 
      genre, theme, protagonist, plot_outline: plot_outline.substring(0, 100) + '...', 
      tone, target_audience, model_id, prompt_id, stream, userId
    });

    let systemPrompt, userPrompt;
    
    // 如果提供了prompt_id，使用自定义prompt
    if (prompt_id) {
      const prompt = await getPromptContent(prompt_id);
      
      // 替换prompt中的变量
      systemPrompt = prompt.content
        .replace(/\{\{title\}\}/g, title)
        .replace(/\{\{word_count\}\}/g, word_count)
        .replace(/\{\{style\}\}/g, style)
        .replace(/\{\{basic_setting\}\}/g, basic_setting)
        .replace(/\{\{reference_content\}\}/g, reference_content)
        .replace(/\{\{genre\}\}/g, genre)
        .replace(/\{\{theme\}\}/g, theme)
        .replace(/\{\{protagonist\}\}/g, protagonist)
        .replace(/\{\{plot_outline\}\}/g, plot_outline)
        .replace(/\{\{tone\}\}/g, tone)
        .replace(/\{\{target_audience\}\}/g, target_audience);
      
      // 即使使用自定义prompt，也要在userPrompt中包含具体的用户参数
      userPrompt = `请为以下主题创作短篇小说：

小说标题：${title}

字数要求：${word_count}字

${basic_setting ? `基础设定：\n${basic_setting}\n` : ''}
${plot_outline ? `情节大纲：\n${plot_outline}\n` : ''}
${protagonist ? `主角设定：${protagonist}\n` : ''}
${theme ? `主题：${theme}\n` : ''}
${reference_content ? `参考内容：\n${reference_content}\n` : ''}

请根据系统提示词的要求开始创作短篇小说：`;
      
      console.log('使用自定义Prompt:', prompt.name);
      console.log('SystemPrompt:', systemPrompt);
      console.log('UserPrompt:', userPrompt);
    } else {
      // 使用默认提示词
      systemPrompt = `你是一位专业的短篇小说创作专家。请根据提供的标题、字数要求和相关信息，创作引人入胜的短篇小说。

要求：
1. 严格按照标题主题展开
2. 控制字数在${word_count}字左右
3. 情节紧凑，结构完整
4. 人物形象鲜明，对话生动
5. 语言优美，富有感染力
6. 具有明确的主题和深度

写作风格：${style}
小说类型：${genre}
语调基调：${tone}
目标读者：${target_audience}`;

      userPrompt = `请为以下主题创作短篇小说：

小说标题：${title}

字数要求：${word_count}字

${basic_setting ? `基础设定：\n${basic_setting}\n` : ''}
${plot_outline ? `情节大纲：\n${plot_outline}\n` : ''}
${protagonist ? `主角设定：${protagonist}\n` : ''}
${theme ? `主题：${theme}\n` : ''}
${reference_content ? `参考内容：\n${reference_content}\n` : ''}

请开始创作短篇小说：`;
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
    
    logger.info(`短篇小说生成 - 模型max_tokens: ${modelMaxTokens}, 最终max_tokens: ${maxTokens}`);

    const callParams = {
      modelId: model_id,
      messages,
      stream,
      temperature: 0.8, // 小说创作需要更高的创造性
      max_tokens: maxTokens,
      userId,
      businessType: 'short_story'
    };

    console.log('AI调用参数:', JSON.stringify(callParams, null, 2));

    const response = await callAiWithRecord({
      ctx,
      businessType: 'short_story',
      modelId: model_id,
      promptId: prompt_id,
      requestParams: { 
        title, 
        word_count, 
        style,
        basic_setting: basic_setting.substring(0, 200) + '...', 
        reference_content: reference_content.substring(0, 200) + '...', 
        genre,
        theme,
        protagonist,
        plot_outline: plot_outline.substring(0, 200) + '...', 
        tone,
        target_audience
      },
      systemPrompt,
      userPrompt,
      callParams,
      stream
    });
    
    if (!stream && response) {
      // 记录返回结果
      logDebugInfo('短篇小说写作结果', callParams, {
        content: response.data.choices[0].message.content.substring(0, 200) + '...',
        usage: response.data.usage
      });
      
      ctx.body = {
        success: true,
        message: '短篇小说生成成功',
        data: {
          content: response.data.choices[0].message.content,
          usage: response.data.usage
        }
      };
    }

  } catch (error) {
    logger.error('AI短篇小说写作失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'AI短篇小说写作失败'
    };
  }
});

module.exports = router;