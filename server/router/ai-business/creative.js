const Router = require('koa-router');
const router = new Router();
const logger = require('../../utils/logger');
const { getPromptContent, logDebugInfo, callAiWithRecord, validateRequired } = require('./shared');

// AI创意建议
router.post('/ai-business/creative/suggest', validateRequired(['creative_type', 'context', 'model_id']), async (ctx) => {
  try {
    const {
      creative_type, // 创意类型：plot_twist, character_development, world_building, theme_exploration
      context, // 当前故事背景
      current_elements = [], // 现有元素
      target_direction = '', // 期望方向
      creativity_level = '中等', // 创意程度
      constraints = [], // 限制条件
      model_id,
      prompt_id,
      stream = true
    } = ctx.request.body;

    const userId = ctx.state.user?.id;

    // 记录调试信息
    logDebugInfo('创意建议', {
      creative_type, context, current_elements, target_direction, 
      creativity_level, constraints, model_id, prompt_id, stream, userId
    });

    const creativeTypes = {
      plot_twist: '情节转折',
      character_development: '角色发展',
      world_building: '世界构建',
      theme_exploration: '主题探索',
      dialogue_innovation: '对话创新',
      scene_design: '场景设计'
    };

    let systemPrompt, userPrompt;
    
    // 如果提供了prompt_id，使用自定义prompt
    if (prompt_id) {
      const prompt = await getPromptContent(prompt_id);
      
      // 替换prompt中的变量
      systemPrompt = prompt.content
        .replace(/\{\{creative_type\}\}/g, creativeTypes[creative_type] || '综合创意')
        .replace(/\{\{context\}\}/g, context)
        .replace(/\{\{current_elements\}\}/g, current_elements.join('、'))
        .replace(/\{\{target_direction\}\}/g, target_direction)
        .replace(/\{\{creativity_level\}\}/g, creativity_level)
        .replace(/\{\{constraints\}\}/g, constraints.join('、'));
      
      userPrompt = `请根据以上要求提供创意建议。`;
      
      console.log('使用自定义Prompt:', prompt.name);
    } else {
      // 使用默认提示词
      systemPrompt = `你是一位富有创意的故事顾问。请根据用户提供的信息，为${creativeTypes[creative_type] || '故事创作'}提供有价值的创意建议。

要求：
1. 创意要新颖独特，避免陈词滥调
2. 符合${creativity_level}的创意程度
3. 与现有故事元素协调统一
4. 考虑实际可操作性
5. 提供多个可选方案
6. 分析每个建议的优缺点

请按以下格式输出：
## 创意建议概述
[简要说明建议的核心思路]

## 具体方案
### 方案一：[方案名称]
[详细描述]
**优点：**[列出优点]
**注意事项：**[需要注意的问题]

### 方案二：[方案名称]
[详细描述]
**优点：**[列出优点]
**注意事项：**[需要注意的问题]

### 方案三：[方案名称]
[详细描述]
**优点：**[列出优点]
**注意事项：**[需要注意的问题]

## 实施建议
[如何将创意融入故事的具体建议]`;

      userPrompt = `请为以下情况提供${creativeTypes[creative_type] || '创意'}建议：

创意类型：${creativeTypes[creative_type] || '综合创意'}
故事背景：${context}
${current_elements.length > 0 ? `现有元素：${current_elements.join('、')}` : ''}
${target_direction ? `期望方向：${target_direction}` : ''}
创意程度：${creativity_level}
${constraints.length > 0 ? `限制条件：${constraints.join('、')}` : ''}`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const callParams = {
      modelId: model_id,
      messages,
      stream,
      temperature: 0.9,
      max_tokens: 3500,
      userId,
      businessType: 'creative'
    };

    console.log('AI调用参数:', JSON.stringify(callParams, null, 2));

    const response = await callAiWithRecord({
      ctx,
      businessType: 'creative',
      modelId: model_id,
      promptId: prompt_id,
      requestParams: { creative_type, context, current_elements, target_direction, creativity_level, constraints },
      systemPrompt,
      userPrompt,
      callParams,
      stream
    });
    
    if (!stream && response) {
      // 记录返回结果
      logDebugInfo('创意建议结果', callParams, {
        content: response.data.choices[0].message.content.substring(0, 200) + '...',
        usage: response.data.usage
      });
      
      ctx.body = {
        success: true,
        message: '创意建议生成成功',
        data: {
          suggestions: response.data.choices[0].message.content,
          usage: response.data.usage
        }
      };
    }

  } catch (error) {
    logger.error('AI创意建议失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'AI创意建议失败'
    };
  }
});

module.exports = router;