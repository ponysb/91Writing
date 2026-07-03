const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// 获取小说的所有世界观设定
router.get('/novel/:novelId', (req, res) => {
  try {
    const novel = db.prepare('SELECT * FROM novels WHERE id = ? AND user_id = ?')
      .get(req.params.novelId, req.user.id);

    if (!novel) {
      return res.status(404).json({ error: '小说不存在' });
    }

    const settings = db.prepare('SELECT * FROM world_settings WHERE novel_id = ? ORDER BY created_at DESC')
      .all(req.params.novelId);

    res.json(settings);
  } catch (error) {
    console.error('获取世界观设定失败:', error);
    res.status(500).json({ error: '获取世界观设定失败' });
  }
});

// 创建世界观设定
router.post('/novel/:novelId', (req, res) => {
  try {
    const { name, description, type, details } = req.body;

    if (!name) {
      return res.status(400).json({ error: '设定名称不能为空' });
    }

    const novel = db.prepare('SELECT * FROM novels WHERE id = ? AND user_id = ?')
      .get(req.params.novelId, req.user.id);

    if (!novel) {
      return res.status(404).json({ error: '小说不存在' });
    }

    const result = db.prepare(`
      INSERT INTO world_settings (novel_id, name, description, type, details)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.novelId, name, description || '', type || '', details || '{}');

    const setting = db.prepare('SELECT * FROM world_settings WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: '世界观设定创建成功',
      setting
    });
  } catch (error) {
    console.error('创建世界观设定失败:', error);
    res.status(500).json({ error: '创建世界观设定失败' });
  }
});

// 更新世界观设定
router.put('/:id', (req, res) => {
  try {
    const { name, description, type, details } = req.body;

    const setting = db.prepare(`
      SELECT ws.* FROM world_settings ws
      JOIN novels n ON ws.novel_id = n.id
      WHERE ws.id = ? AND n.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!setting) {
      return res.status(404).json({ error: '世界观设定不存在' });
    }

    db.prepare(`
      UPDATE world_settings 
      SET name = ?, description = ?, type = ?, details = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || setting.name,
      description !== undefined ? description : setting.description,
      type !== undefined ? type : setting.type,
      details !== undefined ? details : setting.details,
      req.params.id
    );

    const updatedSetting = db.prepare('SELECT * FROM world_settings WHERE id = ?').get(req.params.id);

    res.json({
      message: '世界观设定更新成功',
      setting: updatedSetting
    });
  } catch (error) {
    console.error('更新世界观设定失败:', error);
    res.status(500).json({ error: '更新世界观设定失败' });
  }
});

// 删除世界观设定
router.delete('/:id', (req, res) => {
  try {
    const setting = db.prepare(`
      SELECT ws.* FROM world_settings ws
      JOIN novels n ON ws.novel_id = n.id
      WHERE ws.id = ? AND n.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!setting) {
      return res.status(404).json({ error: '世界观设定不存在' });
    }

    db.prepare('DELETE FROM world_settings WHERE id = ?').run(req.params.id);

    res.json({ message: '世界观设定删除成功' });
  } catch (error) {
    console.error('删除世界观设定失败:', error);
    res.status(500).json({ error: '删除世界观设定失败' });
  }
});

module.exports = router;
