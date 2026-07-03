const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// 获取小说的所有角色
router.get('/novel/:novelId', (req, res) => {
  try {
    const novel = db.prepare('SELECT * FROM novels WHERE id = ? AND user_id = ?')
      .get(req.params.novelId, req.user.id);

    if (!novel) {
      return res.status(404).json({ error: '小说不存在' });
    }

    const characters = db.prepare('SELECT * FROM characters WHERE novel_id = ? ORDER BY created_at DESC')
      .all(req.params.novelId);

    res.json(characters);
  } catch (error) {
    console.error('获取角色列表失败:', error);
    res.status(500).json({ error: '获取角色列表失败' });
  }
});

// 创建角色
router.post('/novel/:novelId', (req, res) => {
  try {
    const { name, description, role, attributes } = req.body;

    if (!name) {
      return res.status(400).json({ error: '角色名称不能为空' });
    }

    const novel = db.prepare('SELECT * FROM novels WHERE id = ? AND user_id = ?')
      .get(req.params.novelId, req.user.id);

    if (!novel) {
      return res.status(404).json({ error: '小说不存在' });
    }

    const result = db.prepare(`
      INSERT INTO characters (novel_id, name, description, role, attributes)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.novelId, name, description || '', role || '', attributes || '{}');

    const character = db.prepare('SELECT * FROM characters WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: '角色创建成功',
      character
    });
  } catch (error) {
    console.error('创建角色失败:', error);
    res.status(500).json({ error: '创建角色失败' });
  }
});

// 更新角色
router.put('/:id', (req, res) => {
  try {
    const { name, description, role, attributes } = req.body;

    const character = db.prepare(`
      SELECT c.* FROM characters c
      JOIN novels n ON c.novel_id = n.id
      WHERE c.id = ? AND n.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!character) {
      return res.status(404).json({ error: '角色不存在' });
    }

    db.prepare(`
      UPDATE characters 
      SET name = ?, description = ?, role = ?, attributes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name || character.name,
      description !== undefined ? description : character.description,
      role !== undefined ? role : character.role,
      attributes !== undefined ? attributes : character.attributes,
      req.params.id
    );

    const updatedCharacter = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id);

    res.json({
      message: '角色更新成功',
      character: updatedCharacter
    });
  } catch (error) {
    console.error('更新角色失败:', error);
    res.status(500).json({ error: '更新角色失败' });
  }
});

// 删除角色
router.delete('/:id', (req, res) => {
  try {
    const character = db.prepare(`
      SELECT c.* FROM characters c
      JOIN novels n ON c.novel_id = n.id
      WHERE c.id = ? AND n.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!character) {
      return res.status(404).json({ error: '角色不存在' });
    }

    db.prepare('DELETE FROM characters WHERE id = ?').run(req.params.id);

    res.json({ message: '角色删除成功' });
  } catch (error) {
    console.error('删除角色失败:', error);
    res.status(500).json({ error: '删除角色失败' });
  }
});

module.exports = router;
