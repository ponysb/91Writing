const Router = require('koa-router');
const router = new Router();
const logger = require('../../utils/logger');
const { getPromptContent, logDebugInfo, callAiWithRecord, validateRequired } = require('./shared');

// AI正文生成
router.post('/ai-business/content/generate', validateRequired(['chapter_title', 'outline', 'model_id']), async (ctx) => {
  try {
    const {
      chapter_title, // 章节标题
      outline, // 章节大纲
      characters = [], // 涉及角色
      previous_content = '', // 前文内容
      writing_style = '现代', // 写作风格
      target_length = '中等', // 目标长度
      tone = '中性', // 语调
      perspective = '第三人称', // 视角
      model_id,
      prompt_id,
      stream = true
    } = ctx.request.body;

    const userId = ctx.state.user?.id;

    // 记录调试信息
    logDebugInfo('正文生成', {
      chapter_title, outline: outline.substring(0, 100) + '...', characters, 
      previous_content: previous_content.substring(0, 100) + '...', writing_style, 
      target_length, tone, perspective, model_id, prompt_id, stream, userId
    });

    let systemPrompt, userPrompt;
    
    // 如果提供了prompt_id，使用自定义prompt
    if (prompt_id) {
      const prompt = await getPromptContent(prompt_id);
      
      // 替换prompt中的变量
      systemPrompt = prompt.content
        .replace(/\{\{chapter_title\}\}/g, chapter_title)
        .replace(/\{\{outline\}\}/g, outline)
        .replace(/\{\{characters\}\}/g, characters.join('、'))
        .replace(/\{\{previous_content\}\}/g, previous_content)
        .replace(/\{\{writing_style\}\}/g, writing_style)
        .replace(/\{\{target_length\}\}/g, target_length)
        .replace(/\{\{tone\}\}/g, tone)
        .replace(/\{\{perspective\}\}/g, perspective);
      
      userPrompt = `请根据以上要求生成章节正文。`;
      
      console.log('使用自定义Prompt:', prompt.name);
    } else {
      // 使用默认提示词
      systemPrompt = `你是一位专业的小说作家。请根据提供的章节大纲和相关信息，创作生动精彩的小说正文。

要求：
1. 严格按照大纲内容展开
2. 保持角色性格一致性
3. 语言生动流畅，富有感染力
4. 适当运用对话、动作、心理描写
5. 保持与前文的连贯性
6. 控制篇幅长度适中

写作风格：${writing_style}
叙述视角：${perspective}
语调基调：${tone}
目标长度：${target_length}`;

      userPrompt = `请为以下章节创作正文：

章节标题：${chapter_title}

章节大纲：
${outline}

${characters.length > 0 ? `涉及角色：${characters.join('、')}` : ''}
${previous_content ? `前文内容参考：\n${previous_content.substring(0, 500)}...` : ''}`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const callParams = {
      modelId: model_id,
      messages,
      stream,
      temperature: 0.8,
      max_tokens: 4000,
      userId,
      businessType: 'content'
    };

    console.log('AI调用参数:', JSON.stringify(callParams, null, 2));

    const response = await callAiWithRecord({
      ctx,
      businessType: 'content',
      modelId: model_id,
      promptId: prompt_id,
      requestParams: { chapter_title, outline: outline.substring(0, 200) + '...', characters, previous_content: previous_content.substring(0, 200) + '...', writing_style, target_length, tone, perspective },
      systemPrompt,
      userPrompt,
      callParams,
      stream
    });
    
    if (!stream && response) {
      // 记录返回结果
      logDebugInfo('正文生成结果', callParams, {
        content: response.data.choices[0].message.content.substring(0, 200) + '...',
        usage: response.data.usage
      });
      
      ctx.body = {
        success: true,
        message: '正文生成成功',
        data: {
          content: response.data.choices[0].message.content,
          usage: response.data.usage
        }
      };
    }

  } catch (error) {
    logger.error('AI正文生成失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'AI正文生成失败'
    };
  }
});

module.exports = router;