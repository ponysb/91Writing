const Router = require('koa-router');
const router = new Router();
const aiService = require('../../services/aiService');
const logger = require('../../utils/logger');
const { getPromptContent, logDebugInfo, callAiWithRecord, validateRequired } = require('./shared');

// AI大纲生成
router.post('/ai-business/outline/generate', validateRequired(['title', 'genre', 'model_id']), async (ctx) => {
  try {
    const {
      title,
      genre,
      description = '',
      target_length = '中篇',
      style = '现代',
      target_audience = '成人',
      key_elements = [],
      model_id,
      prompt_id,
      stream = true
    } = ctx.request.body;

    console.log('请求参数:', ctx.request.body);

    const userId = ctx.state.user?.id;

    // 记录调试信息
    logDebugInfo('大纲生成', {
      title, genre, description, target_length, style, target_audience, 
      key_elements, model_id, prompt_id, stream, userId
    });

    let systemPrompt, userPrompt;
    
    // 如果提供了prompt_id，使用自定义prompt
    if (prompt_id) {
      const prompt = await getPromptContent(prompt_id);
      
      // 替换prompt中的变量
      systemPrompt = prompt.content
        .replace(/\{\{title\}\}/g, title)
        .replace(/\{\{genre\}\}/g, genre)
        .replace(/\{\{description\}\}/g, description)
        .replace(/\{\{target_length\}\}/g, target_length)
        .replace(/\{\{style\}\}/g, style)
        .replace(/\{\{target_audience\}\}/g, target_audience)
        .replace(/\{\{key_elements\}\}/g, key_elements.join('、'));
      
      userPrompt = `请根据以上要求生成小说大纲。`;
      
      console.log('使用自定义Prompt:', prompt.name);
    } else {
      // 使用默认提示词
      systemPrompt = `你是一位专业的小说大纲创作助手。请根据用户提供的信息，生成一个详细的小说大纲。

要求：
1. 大纲应该包含主要情节线和关键转折点
2. 角色设定要丰富立体
3. 情节发展要有逻辑性和吸引力
4. 适合${target_audience}读者群体
5. 体现${genre}类型的特色

请按以下格式输出：
## 基本信息
- 标题：
- 类型：
- 风格：
- 目标长度：

## 故事概要
[简要描述整个故事]

## 主要角色
[列出主要角色及其特点]

## 情节大纲
[按章节或重要情节点展开]

## 主题思想
[作品想要表达的主题]`;

      userPrompt = `请为以下小说创作详细大纲：

标题：${title}
类型：${genre}
描述：${description}
目标长度：${target_length}
风格：${style}
目标读者：${target_audience}
${key_elements.length > 0 ? `关键元素：${key_elements.join('、')}` : ''}`;
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
      businessType: 'outline'
    };

    console.log('AI调用参数:', JSON.stringify(callParams, null, 2));

    const response = await callAiWithRecord({
      ctx,
      businessType: 'outline',
      modelId: model_id,
      promptId: prompt_id,
      requestParams: { title, genre, description, target_length, style, target_audience, key_elements },
      systemPrompt,
      userPrompt,
      callParams,
      stream
    });
    
    if (!stream && response) {
      // 记录返回结果
      logDebugInfo('大纲生成结果', callParams, {
        content: response.data.choices[0].message.content,
        usage: response.data.usage
      });
      
      ctx.body = {
        success: true,
        message: '大纲生成成功',
        data: {
          outline: response.data.choices[0].message.content,
          usage: response.data.usage
        }
      };
    }

  } catch (error) {
    logger.error('AI大纲生成失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'AI大纲生成失败'
    };
  }
});

module.exports = router;