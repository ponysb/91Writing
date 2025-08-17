const Router = require('koa-router');
const router = new Router();
const logger = require('../../utils/logger');
const { getPromptContent, logDebugInfo, callAiWithRecord, validateRequired } = require('./shared');

// AI人物生成
router.post('/ai-business/character/generate', validateRequired(['name', 'role', 'model_id']), async (ctx) => {
  try {
    const {
      name,
      role, // 主角、配角、反派等
      age_range = '',
      gender = '',
      personality_traits = [],
      background = '',
      story_context = '',
      model_id,
      prompt_id,
      stream = true
    } = ctx.request.body;

    const userId = ctx.state.user?.id;

    // 记录调试信息
    logDebugInfo('人物生成', {
      name, role, age_range, gender, personality_traits, background, 
      story_context, model_id, prompt_id, stream, userId
    });

    let systemPrompt, userPrompt;
    
    // 如果提供了prompt_id，使用自定义prompt
    if (prompt_id) {
      const prompt = await getPromptContent(prompt_id);
      
      // 替换prompt中的变量
      systemPrompt = prompt.content
        .replace(/\{\{name\}\}/g, name)
        .replace(/\{\{role\}\}/g, role)
        .replace(/\{\{age_range\}\}/g, age_range)
        .replace(/\{\{gender\}\}/g, gender)
        .replace(/\{\{personality_traits\}\}/g, personality_traits.join('、'))
        .replace(/\{\{background\}\}/g, background)
        .replace(/\{\{story_context\}\}/g, story_context);
      
      userPrompt = `请根据以上要求生成角色设定。`;
      
      console.log('使用自定义Prompt:', prompt.name);
    } else {
      // 使用默认提示词
      systemPrompt = `你是一位专业的小说角色设计师。请根据用户提供的信息，创建一个立体丰满的小说角色。

要求：
1. 角色性格要有层次感，包含优缺点
2. 背景故事要合理可信
3. 外貌描述要生动具体
4. 角色动机要明确
5. 与故事情节要有良好的契合度

请按以下格式输出：
## 基本信息
- 姓名：
- 年龄：
- 性别：
- 职业：

## 外貌特征
[详细描述外貌特点]

## 性格特点
[描述性格特征，包括优缺点]

## 背景故事
[角色的成长经历和重要事件]

## 能力特长
[角色的技能和特殊能力]

## 人际关系
[与其他角色的关系]

## 角色弧线
[在故事中的成长变化]`;

      userPrompt = `请创建以下角色的详细设定：

角色姓名：${name}
角色定位：${role}
${age_range ? `年龄范围：${age_range}` : ''}
${gender ? `性别：${gender}` : ''}
${personality_traits.length > 0 ? `性格特征：${personality_traits.join('、')}` : ''}
${background ? `背景信息：${background}` : ''}
${story_context ? `故事背景：${story_context}` : ''}`;
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
      max_tokens: 2500,
      userId,
      businessType: 'character'
    };

    console.log('AI调用参数:', JSON.stringify(callParams, null, 2));

    const response = await callAiWithRecord({
      ctx,
      businessType: 'character',
      modelId: model_id,
      promptId: prompt_id,
      requestParams: { name, role, age_range, gender, personality_traits, background, story_context },
      systemPrompt,
      userPrompt,
      callParams,
      stream
    });
    
    if (!stream && response) {
      // 记录返回结果
      logDebugInfo('人物生成结果', callParams, {
        content: response.data.choices[0].message.content.substring(0, 200) + '...',
        usage: response.data.usage
      });
      
      ctx.body = {
        success: true,
        message: '人物生成成功',
        data: {
          character: response.data.choices[0].message.content,
          usage: response.data.usage
        }
      };
    }

  } catch (error) {
    logger.error('AI人物生成失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'AI人物生成失败'
    };
  }
});

module.exports = router;