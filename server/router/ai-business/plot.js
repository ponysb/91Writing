const Router = require('koa-router');
const router = new Router();
const logger = require('../../utils/logger');
const { getPromptContent, logDebugInfo, callAiWithRecord, validateRequired } = require('./shared');

// AI情节生成
router.post('/ai-business/plot/generate', validateRequired(['plot_type', 'context', 'model_id']), async (ctx) => {
  try {
    const {
      plot_type, // 情节类型：冲突、转折、高潮、结局等
      context, // 故事背景
      characters_involved = [], // 涉及角色
      current_situation = '', // 当前情况
      desired_outcome = '', // 期望结果
      tension_level = '中等', // 紧张程度
      model_id,
      prompt_id,
      stream = true
    } = ctx.request.body;

    const userId = ctx.state.user?.id;

    // 记录调试信息
    logDebugInfo('情节生成', {
      plot_type, context, characters_involved, current_situation, 
      desired_outcome, tension_level, model_id, prompt_id, stream, userId
    });

    let systemPrompt, userPrompt;
    
    // 如果提供了prompt_id，使用自定义prompt
    if (prompt_id) {
      const prompt = await getPromptContent(prompt_id);
      
      // 替换prompt中的变量
      systemPrompt = prompt.content
        .replace(/\{\{plot_type\}\}/g, plot_type)
        .replace(/\{\{context\}\}/g, context)
        .replace(/\{\{characters_involved\}\}/g, characters_involved.join('、'))
        .replace(/\{\{current_situation\}\}/g, current_situation)
        .replace(/\{\{desired_outcome\}\}/g, desired_outcome)
        .replace(/\{\{tension_level\}\}/g, tension_level);
      
      userPrompt = `请根据以上要求生成情节内容。`;
      
      console.log('使用自定义Prompt:', prompt.name);
    } else {
      // 使用默认提示词
      systemPrompt = `你是一位专业的情节设计师。请根据用户提供的信息，设计引人入胜的故事情节。

要求：
1. 情节要有逻辑性和合理性
2. 符合${plot_type}类型的特点
3. 紧张程度控制在${tension_level}水平
4. 角色行为要符合其性格设定
5. 为后续情节发展留下伏笔
6. 增强故事的戏剧冲突

请按以下格式输出：
## 情节概述
[简要描述情节发展]

## 详细情节
[分步骤描述情节发展过程]

## 关键转折点
[列出重要的情节转折]

## 角色反应
[描述主要角色的反应和变化]

## 后续影响
[分析对后续情节的影响]`;

      userPrompt = `请设计以下情节：

情节类型：${plot_type}
故事背景：${context}
${characters_involved.length > 0 ? `涉及角色：${characters_involved.join('、')}` : ''}
${current_situation ? `当前情况：${current_situation}` : ''}
${desired_outcome ? `期望结果：${desired_outcome}` : ''}
紧张程度：${tension_level}`;
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
      max_tokens: 3500,
      userId,
      businessType: 'plot'
    };

    console.log('AI调用参数:', JSON.stringify(callParams, null, 2));

    const response = await callAiWithRecord({
      ctx,
      businessType: 'plot',
      modelId: model_id,
      promptId: prompt_id,
      requestParams: { plot_type, context, characters_involved, current_situation, desired_outcome, tension_level },
      systemPrompt,
      userPrompt,
      callParams,
      stream
    });
    
    if (!stream && response) {
      // 记录返回结果
      logDebugInfo('情节生成结果', callParams, {
        content: response.data.choices[0].message.content.substring(0, 200) + '...',
        usage: response.data.usage
      });
      
      ctx.body = {
        success: true,
        message: '情节生成成功',
        data: {
          plot: response.data.choices[0].message.content,
          usage: response.data.usage
        }
      };
    }

  } catch (error) {
    logger.error('AI情节生成失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'AI情节生成失败'
    };
  }
});

module.exports = router;