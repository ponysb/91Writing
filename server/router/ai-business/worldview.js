const Router = require('koa-router');
const router = new Router();
const logger = require('../../utils/logger');
const { getPromptContent, logDebugInfo, callAiWithRecord, validateRequired } = require('./shared');

// AI世界观生成
router.post('/ai-business/worldview/generate', validateRequired(['world_name', 'genre', 'model_id']), async (ctx) => {
  try {
    const {
      world_name, // 世界名称
      genre, // 类型
      time_period = '', // 时代背景
      geography = '', // 地理环境
      technology_level = '', // 科技水平
      magic_system = '', // 魔法体系
      social_structure = '', // 社会结构
      key_elements = [], // 关键元素
      model_id,
      prompt_id,
      stream = true
    } = ctx.request.body;

    const userId = ctx.state.user?.id;

    // 记录调试信息
    logDebugInfo('世界观生成', {
      world_name, genre, time_period, geography, technology_level, 
      magic_system, social_structure, key_elements, model_id, prompt_id, stream, userId
    });

    let systemPrompt, userPrompt;
    
    // 如果提供了prompt_id，使用自定义prompt
    if (prompt_id) {
      const prompt = await getPromptContent(prompt_id);
      
      // 替换prompt中的变量
      systemPrompt = prompt.content
        .replace(/\{\{world_name\}\}/g, world_name)
        .replace(/\{\{genre\}\}/g, genre)
        .replace(/\{\{time_period\}\}/g, time_period)
        .replace(/\{\{geography\}\}/g, geography)
        .replace(/\{\{technology_level\}\}/g, technology_level)
        .replace(/\{\{magic_system\}\}/g, magic_system)
        .replace(/\{\{social_structure\}\}/g, social_structure)
        .replace(/\{\{key_elements\}\}/g, key_elements.join('、'));
      
      userPrompt = `请根据以上要求生成世界观设定。`;
      
      console.log('使用自定义Prompt:', prompt.name);
    } else {
      // 使用默认提示词
      systemPrompt = `你是一位专业的世界观设计师。请根据用户提供的信息，创建一个完整详细的虚构世界设定。

要求：
1. 世界观要自洽完整
2. 各个系统要相互协调
3. 具有独特性和吸引力
4. 适合${genre}类型作品
5. 为故事发展提供丰富背景

请按以下格式输出：
## 世界基本信息
- 世界名称：
- 类型：
- 时代背景：

## 地理环境
[详细描述地理、气候、地形等]

## 种族与文明
[描述主要种族、文明、国家等]

## 社会结构
[政治制度、社会阶层、经济体系等]

## 科技/魔法体系
[科技水平或魔法规则等]

## 历史背景
[重要历史事件、传说等]

## 文化特色
[宗教、习俗、语言等]

## 重要地点
[关键城市、遗迹、秘境等]`;

      userPrompt = `请创建以下世界的详细设定：

世界名称：${world_name}
世界类型：${genre}
${time_period ? `时代背景：${time_period}` : ''}
${geography ? `地理环境：${geography}` : ''}
${technology_level ? `科技水平：${technology_level}` : ''}
${magic_system ? `魔法体系：${magic_system}` : ''}
${social_structure ? `社会结构：${social_structure}` : ''}
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
      businessType: 'worldview'
    };

    console.log('AI调用参数:', JSON.stringify(callParams, null, 2));

    const response = await callAiWithRecord({
      ctx,
      businessType: 'worldview',
      modelId: model_id,
      promptId: prompt_id,
      requestParams: { world_name, genre, time_period, geography, technology_level, magic_system, social_structure, key_elements },
      systemPrompt,
      userPrompt,
      callParams,
      stream
    });
    
    if (!stream && response) {
      // 记录返回结果
      logDebugInfo('世界观生成结果', callParams, {
        content: response.data.choices[0].message.content.substring(0, 200) + '...',
        usage: response.data.usage
      });
      
      ctx.body = {
        success: true,
        message: '世界观生成成功',
        data: {
          worldview: response.data.choices[0].message.content,
          usage: response.data.usage
        }
      };
    }

  } catch (error) {
    logger.error('AI世界观生成失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || 'AI世界观生成失败'
    };
  }
});

module.exports = router;