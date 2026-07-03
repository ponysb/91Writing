const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// 获取所有提示词模板
router.get('/', (req, res) => {
  try {
    const { category } = req.query;
    
    let templates;
    if (category) {
      templates = db.prepare(`
        SELECT * FROM prompt_templates 
        WHERE (user_id = ? OR is_system = 1) AND category = ?
        ORDER BY is_system DESC, created_at DESC
      `).all(req.user.id, category);
    } else {
      templates = db.prepare(`
        SELECT * FROM prompt_templates 
        WHERE user_id = ? OR is_system = 1
        ORDER BY is_system DESC, created_at DESC
      `).all(req.user.id);
    }

    res.json(templates);
  } catch (error) {
    console.error('获取提示词模板失败:', error);
    res.status(500).json({ error: '获取提示词模板失败' });
  }
});

// 获取单个提示词模板
router.get('/:id', (req, res) => {
  try {
    const template = db.prepare(`
      SELECT * FROM prompt_templates 
      WHERE id = ? AND (user_id = ? OR is_system = 1)
    `).get(req.params.id, req.user.id);

    if (!template) {
      return res.status(404).json({ error: '提示词模板不存在' });
    }

    res.json(template);
  } catch (error) {
    console.error('获取提示词模板详情失败:', error);
    res.status(500).json({ error: '获取提示词模板详情失败' });
  }
});

// 创建提示词模板
router.post('/', (req, res) => {
  try {
    const { name, category, content, variables } = req.body;

    if (!name || !category || !content) {
      return res.status(400).json({ error: '名称、分类和内容不能为空' });
    }

    const result = db.prepare(`
      INSERT INTO prompt_templates (user_id, name, category, content, variables)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      name,
      category,
      content,
      variables || '[]'
    );

    const template = db.prepare('SELECT * FROM prompt_templates WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: '提示词模板创建成功',
      template
    });
  } catch (error) {
    console.error('创建提示词模板失败:', error);
    res.status(500).json({ error: '创建提示词模板失败' });
  }
});

// 更新提示词模板
router.put('/:id', (req, res) => {
  try {
    const { name, category, content, variables } = req.body;

    const template = db.prepare(`
      SELECT * FROM prompt_templates 
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!template) {
      return res.status(404).json({ error: '提示词模板不存在或无权修改' });
    }

    db.prepare(`
      UPDATE prompt_templates 
      SET name = ?, category = ?, content = ?, variables = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || template.name,
      category || template.category,
      content || template.content,
      variables !== undefined ? variables : template.variables,
      req.params.id
    );

    const updatedTemplate = db.prepare('SELECT * FROM prompt_templates WHERE id = ?').get(req.params.id);

    res.json({
      message: '提示词模板更新成功',
      template: updatedTemplate
    });
  } catch (error) {
    console.error('更新提示词模板失败:', error);
    res.status(500).json({ error: '更新提示词模板失败' });
  }
});

// 删除提示词模板
router.delete('/:id', (req, res) => {
  try {
    const template = db.prepare(`
      SELECT * FROM prompt_templates 
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!template) {
      return res.status(404).json({ error: '提示词模板不存在或无权删除' });
    }

    if (template.is_system) {
      return res.status(403).json({ error: '系统模板不能删除' });
    }

    db.prepare('DELETE FROM prompt_templates WHERE id = ?').run(req.params.id);

    res.json({ message: '提示词模板删除成功' });
  } catch (error) {
    console.error('删除提示词模板失败:', error);
    res.status(500).json({ error: '删除提示词模板失败' });
  }
});

module.exports = router;
