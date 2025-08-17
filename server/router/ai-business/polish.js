const Router = require('koa-router');
const router = new Router();
const logger = require('../../utils/logger');
const { getPromptContent, logDebugInfo, callAiWithRecord, validateRequired } = require('./shared');

// AI文本润色
router.post('/ai-business/polish/text', validateRequired(['original_text', 'polish_type', 'model_id']), async (ctx) => {
  try {
    const {
      original_text, // 原始文本
      polish_type = 'comprehensive', // 润色类型：grammar, style, flow, comprehensive
      target_style = '', // 目标风格
      specific_requirements = '', // 具体要求
      preserve_meaning = true, // 是否保持原意
      model_id,
      prompt_id,
      stream = true
    } = ctx.request.body;

    const userId = ctx.state.user?.id;

    // 记录调试信息
    logDebugInfo('文本润色', {
      original_text: original_text.substring(0, 100) + '...', polish_type, 
      target_style, specific_requirements, preserve_meaning, model_id, prompt_id, stream, userId
    });

    const polishTypes = {
      grammar: '语法修正',
      style: '风格优化',
      flow: '流畅度提升',
      comprehensive: '综合润色'
    };

    let systemPrompt, userPrompt;
    
    // 如果提供了prompt_id，使用自定义prompt
    if (prompt_id) {
      const prompt = await getPromptContent(prompt_id);
      
      // 替换prompt中的变量
      systemPrompt = prompt.content
        .replace(/\{\{original_text\}\}/g, original_text)
        .replace(/\{\{polish_type\}\}/g, polishTypes[polish_type] || '综合润色')
        .replace(/\{\{target_style\}\}/g, target_style)
        .replace(/\{\{specific_requirements\}\}/g, specific_requirements)
        .replace(/\{\{preserve_meaning\}\}/g, preserve_meaning ? '是' : '否');
      
      userPrompt = `请根据以上要求进行文本润色。`;
      
      console.log('使用自定义Prompt:', prompt.name);
    } else {
      // 使用默认提示词
      systemPrompt = `你是一位专业的文本编辑师。请对用户提供的文本进行${polishTypes[polish_type] || '综合润色'}。

要求：
1. ${preserve_meaning ? '严格保持原文意思不变' : '可适当调整表达方式'}
2. 提升文本的可读性和流畅度
3. 修正语法错误和表达不当
4. 优化句式结构和用词选择
5. ${target_style ? `调整为${target_style}风格` : '保持原有风格基调'}
6. 保持文本的逻辑性和连贯性

请按以下格式输出：
## 润色后文本
[润色后的完整文本]

## 主要修改
[列出主要的修改点和原因]

## 润色说明
[简要说明润色的思路和效果]`;

      userPrompt = `请对以下文本进行${polishTypes[polish_type] || '综合润色'}：

${original_text}

润色类型：${polishTypes[polish_type] || '综合润色'}
${target_style ? `目标风格：${target_style}` : ''}
${specific_requirements ? `具体要求：${specific_requirements}` : ''}
保持原意：${preserve_meaning ? '是' : '否'}`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const callParams = {
      modelId: model_id,
      messages,
      stream,
      temperature: 0.7,
      max_tokens: Math.min(4000, original_text.length * 2),
      userId,
      businessType: 'polish'
    };

    console.log('AI调用参数:', JSON.stringify(callParams, null, 2));

    const response = await callAiWithRecord({
      ctx,
      businessType: 'polish',
      modelId: model_id,
      promptId: prompt_id,
      requestParams: { original_text: original_text.substring(0, 200) + '...', polish_type, target_style, specific_requirements, preserve_meaning },
      systemPrompt,
      userPrompt,
      callParams,
      stream
    });
    
    if (!stream && response) {
      // 记录返回结果
      logDebugInfo('文本润色结果', callParams, {
        content: response.data.choices[0].message.content.substring(0, 200) + '...',
        usage: response.data.usage
      });
      
      ctx.body = {
        success: true,
        message: '文本润色成功',
        data: {
          polished_text: response.data.choices[0].message.content,
          usage: response.data.usage
        }
      };
    }

  } catch (error) {
    logger.error('AI文本润色失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'AI文本润色失败'
    };
  }
});

module.exports = router;