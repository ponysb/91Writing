const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(authMiddleware);

// 获取所有小说
router.get('/', (req, res) => {
  try {
    const novels = db.prepare(`
      SELECT n.*, 
             (SELECT COUNT(*) FROM chapters WHERE novel_id = n.id) as chapter_count
      FROM novels n
      WHERE n.user_id = ?
      ORDER BY n.updated_at DESC
    `).all(req.user.id);

    res.json(novels);
  } catch (error) {
    console.error('获取小说列表失败:', error);
    res.status(500).json({ error: '获取小说列表失败' });
  }
});

// 获取单个小说详情
router.get('/:id', (req, res) => {
  try {
    const novel = db.prepare(`
      SELECT n.*, 
             (SELECT COUNT(*) FROM chapters WHERE novel_id = n.id) as chapter_count
      FROM novels n
      WHERE n.id = ? AND n.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!novel) {
      return res.status(404).json({ error: '小说不存在' });
    }

    res.json(novel);
  } catch (error) {
    console.error('获取小说详情失败:', error);
    res.status(500).json({ error: '获取小说详情失败' });
  }
});

// 创建小说
router.post('/', (req, res) => {
  try {
    const { title, description, genre, tags, cover_url } = req.body;

    if (!title) {
      return res.status(400).json({ error: '小说标题不能为空' });
    }

    const result = db.prepare(`
      INSERT INTO novels (user_id, title, description, genre, tags, cover_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      req.user.id,
      title,
      description || '',
      genre || '',
      tags || '',
      cover_url || ''
    );

    const novel = db.prepare('SELECT * FROM novels WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: '小说创建成功',
      novel
    });
  } catch (error) {
    console.error('创建小说失败:', error);
    res.status(500).json({ error: '创建小说失败' });
  }
});

// 更新小说
router.put('/:id', (req, res) => {
  try {
    const { title, description, genre, tags, status, cover_url } = req.body;

    const novel = db.prepare('SELECT * FROM novels WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (!novel) {
      return res.status(404).json({ error: '小说不存在' });
    }

    db.prepare(`
      UPDATE novels 
      SET title = ?, description = ?, genre = ?, tags = ?, status = ?, cover_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || novel.title,
      description !== undefined ? description : novel.description,
      genre !== undefined ? genre : novel.genre,
      tags !== undefined ? tags : novel.tags,
      status || novel.status,
      cover_url !== undefined ? cover_url : novel.cover_url,
      req.params.id
    );

    const updatedNovel = db.prepare('SELECT * FROM novels WHERE id = ?').get(req.params.id);

    res.json({
      message: '小说更新成功',
      novel: updatedNovel
    });
  } catch (error) {
    console.error('更新小说失败:', error);
    res.status(500).json({ error: '更新小说失败' });
  }
});

// 删除小说
router.delete('/:id', (req, res) => {
  try {
    const novel = db.prepare('SELECT * FROM novels WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);

    if (!novel) {
      return res.status(404).json({ error: '小说不存在' });
    }

    db.prepare('DELETE FROM novels WHERE id = ?').run(req.params.id);

    res.json({ message: '小说删除成功' });
  } catch (error) {
    console.error('删除小说失败:', error);
    res.status(500).json({ error: '删除小说失败' });
  }
});

module.exports = router;
