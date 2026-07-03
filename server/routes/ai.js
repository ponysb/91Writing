const express = require('express');
const axios = require('axios');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(authMiddleware);

// 获取用户 API 配置
router.get('/config', (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM api_configs WHERE user_id = ?')
      .get(req.user.id);

    if (!config) {
      return res.json(null);
    }

    // 不返回完整的 API key
    const safeConfig = {
      ...config,
      api_key: config.api_key.substring(0, 8) + '***'
    };

    res.json(safeConfig);
  } catch (error) {
    console.error('获取 API 配置失败:', error);
    res.status(500).json({ error: '获取 API 配置失败' });
  }
});

// 保存 API 配置
router.post('/config', (req, res) => {
  try {
    const { provider, api_key, base_url, model, max_tokens, temperature } = req.body;

    if (!provider || !api_key) {
      return res.status(400).json({ error: '提供商和 API key 不能为空' });
    }

    const existing = db.prepare('SELECT * FROM api_configs WHERE user_id = ?')
      .get(req.user.id);

    if (existing) {
      db.prepare(`
        UPDATE api_configs 
        SET provider = ?, api_key = ?, base_url = ?, model = ?, 
            max_tokens = ?, temperature = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(provider, api_key, base_url, model, max_tokens || 2000, temperature || 0.7, req.user.id);
    } else {
      db.prepare(`
        INSERT INTO api_configs (user_id, provider, api_key, base_url, model, max_tokens, temperature)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(req.user.id, provider, api_key, base_url, model, max_tokens || 2000, temperature || 0.7);
    }

    res.json({ message: 'API 配置保存成功' });
  } catch (error) {
    console.error('保存 API 配置失败:', error);
    res.status(500).json({ error: '保存 API 配置失败' });
  }
});

// AI 聊天完成
router.post('/chat/completions', async (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM api_configs WHERE user_id = ?')
      .get(req.user.id);

    if (!config) {
      return res.status(400).json({ error: '请先配置 API' });
    }

    const { messages, stream = false } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages 必须是数组' });
    }

    // 构建请求
    const baseUrl = config.base_url || 'https://api.openai.com/v1';
    const url = `${baseUrl}/chat/completions`;

    const response = await axios.post(url, {
      model: config.model || 'gpt-3.5-turbo',
      messages,
      max_tokens: config.max_tokens || 2000,
      temperature: config.temperature || 0.7,
      stream
    }, {
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000,
      responseType: stream ? 'stream' : 'json'
    });

    if (stream) {
      // 流式响应
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      response.data.on('data', (chunk) => {
        res.write(chunk);
      });

      response.data.on('end', () => {
        res.end();
      });
    } else {
      res.json(response.data);
    }
  } catch (error) {
    console.error('AI 请求失败:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'AI 请求失败',
      details: error.response?.data || error.message 
    });
  }
});

// 生成大纲
router.post('/generate/outline', async (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM api_configs WHERE user_id = ?')
      .get(req.user.id);

    if (!config) {
      return res.status(400).json({ error: '请先配置 API' });
    }

    const { keywords, genre, template } = req.body;

    if (!keywords) {
      return res.status(400).json({ error: '关键词不能为空' });
    }

    const prompt = `请为以下小说生成详细大纲：
类型：${genre || '通用'}
关键词：${keywords}
${template ? `模板要求：${template}` : ''}

请生成包含以下内容的完整大纲：
1. 故事背景
2. 主要人物设定
3. 核心冲突
4. 章节结构（至少5章）
5. 故事高潮和结局

请用中文回答，格式清晰。`;

    const baseUrl = config.base_url || 'https://api.openai.com/v1';
    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '你是一位专业的小说作家，擅长创作各种类型的小说。' },
        { role: 'user', content: prompt }
      ],
      max_tokens: config.max_tokens || 2000,
      temperature: config.temperature || 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    res.json({
      outline: response.data.choices[0].message.content
    });
  } catch (error) {
    console.error('生成大纲失败:', error.response?.data || error.message);
    res.status(500).json({ 
      error: '生成大纲失败',
      details: error.response?.data || error.message 
    });
  }
});

// 生成章节内容
router.post('/generate/chapter', async (req, res) => {
  try {
    const config = db.prepare('SELECT * FROM api_configs WHERE user_id = ?')
      .get(req.user.id);

    if (!config) {
      return res.status(400).json({ error: '请先配置 API' });
    }

    const { novelId, chapterTitle, outline, previousContent, direction, wordCount } = req.body;

    if (!chapterTitle) {
      return res.status(400).json({ error: '章节标题不能为空' });
    }

    let prompt = `请为小说章节"${chapterTitle}"生成内容。`;
    
    if (outline) {
      prompt += `\n\n大纲：${outline}`;
    }
    
    if (previousContent) {
      prompt += `\n\n前文内容：${previousContent.substring(0, 1000)}...`;
    }
    
    if (direction) {
      prompt += `\n\n创作方向：${direction}`;
    }
    
    prompt += `\n\n请生成约${wordCount || 2000}字的章节内容，要求：
1. 情节连贯，逻辑清晰
2. 人物形象鲜明
3. 文笔流畅，富有感染力
4. 符合小说整体风格`;

    const baseUrl = config.base_url || 'https://api.openai.com/v1';
    const response = await axios.post(`${baseUrl}/chat/completions`, {
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: '你是一位专业的小说作家，擅长创作各种类型的小说。' },
        { role: 'user', content: prompt }
      ],
      max_tokens: config.max_tokens || 2000,
      temperature: config.temperature || 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000
    });

    res.json({
      content: response.data.choices[0].message.content
    });
  } catch (error) {
    console.error('生成章节失败:', error.response?.data || error.message);
    res.status(500).json({ 
      error: '生成章节失败',
      details: error.response?.data || error.message 
    });
  }
});

module.exports = router;
