const Router = require('koa-router');
const router = new Router();
const logger = require('../../utils/logger');
const { getPromptContent, logDebugInfo, callAiWithRecord, validateRequired } = require('./shared');

// AI对话生成
router.post('/ai-business/dialogue/generate', validateRequired(['characters', 'scene', 'model_id']), async (ctx) => {
  try {
    const {
      characters, // 参与对话的角色
      scene_context, // 场景背景
      dialogue_purpose = '', // 对话目的
      emotion_tone = '中性', // 情感基调
      dialogue_length = '中等', // 对话长度
      style_requirements = '', // 风格要求
      model_id,
      prompt_id,
      stream = true
    } = ctx.request.body;

    const userId = ctx.state.user?.id;

    // 记录调试信息
    logDebugInfo('对话生成', {
      characters, scene_context, dialogue_purpose, emotion_tone, 
      dialogue_length, style_requirements, model_id, prompt_id, stream, userId
    });

    let systemPrompt, userPrompt;
    
    // 如果提供了prompt_id，使用自定义prompt
    if (prompt_id) {
      const prompt = await getPromptContent(prompt_id);
      
      // 替换prompt中的变量
      systemPrompt = prompt.content
        .replace(/\{\{characters\}\}/g, Array.isArray(characters) ? characters.join('、') : characters)
        .replace(/\{\{scene_context\}\}/g, scene_context)
        .replace(/\{\{dialogue_purpose\}\}/g, dialogue_purpose)
        .replace(/\{\{emotion_tone\}\}/g, emotion_tone)
        .replace(/\{\{dialogue_length\}\}/g, dialogue_length)
        .replace(/\{\{style_requirements\}\}/g, style_requirements);
      
      userPrompt = `请根据以上要求生成对话内容。`;
      
      console.log('使用自定义Prompt:', prompt.name);
    } else {
      // 使用默认提示词
      systemPrompt = `你是一位专业的对话创作师。请根据用户提供的信息，创作自然生动的对话内容。

要求：
1. 对话要符合角色性格特点
2. 语言要自然流畅，符合情境
3. 体现${emotion_tone}的情感基调
4. 对话长度控制在${dialogue_length}范围内
5. 推进情节发展或揭示角色内心
6. 避免冗余和重复

请按以下格式输出：
## 场景设定
[简要描述对话发生的场景]

## 对话内容
[角色名]："对话内容"
[角色名]："对话内容"
...

## 对话分析
[简要分析对话的作用和效果]`;

      userPrompt = `请为以下场景创作对话：

参与角色：${Array.isArray(characters) ? characters.join('、') : characters}
场景背景：${scene_context}
${dialogue_purpose ? `对话目的：${dialogue_purpose}` : ''}
情感基调：${emotion_tone}
对话长度：${dialogue_length}
${style_requirements ? `风格要求：${style_requirements}` : ''}`;
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
      max_tokens: 3000,
      userId,
      businessType: 'dialogue'
    };

    console.log('AI调用参数:', JSON.stringify(callParams, null, 2));

    const response = await callAiWithRecord({
      ctx,
      businessType: 'dialogue',
      modelId: model_id,
      promptId: prompt_id,
      requestParams: { characters, scene_context, dialogue_purpose, emotion_tone, dialogue_length, style_requirements },
      systemPrompt,
      userPrompt,
      callParams,
      stream
    });
    
    if (!stream && response) {
      // 记录返回结果
      logDebugInfo('对话生成结果', callParams, {
        content: response.data.choices[0].message.content.substring(0, 200) + '...',
        usage: response.data.usage
      });
      
      ctx.body = {
        success: true,
        message: '对话生成成功',
        data: {
          dialogue: response.data.choices[0].message.content,
          usage: response.data.usage
        }
      };
    }

  } catch (error) {
    logger.error('AI对话生成失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'AI对话生成失败'
    };
  }
});

module.exports = router;