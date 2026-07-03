const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(authMiddleware);

// 获取小说的所有章节
router.get('/novel/:novelId', (req, res) => {
  try {
    const novel = db.prepare('SELECT * FROM novels WHERE id = ? AND user_id = ?')
      .get(req.params.novelId, req.user.id);

    if (!novel) {
      return res.status(404).json({ error: '小说不存在' });
    }

    const chapters = db.prepare(`
      SELECT * FROM chapters 
      WHERE novel_id = ? 
      ORDER BY sort_order ASC, created_at ASC
    `).all(req.params.novelId);

    res.json(chapters);
  } catch (error) {
    console.error('获取章节列表失败:', error);
    res.status(500).json({ error: '获取章节列表失败' });
  }
});

// 获取单个章节
router.get('/:id', (req, res) => {
  try {
    const chapter = db.prepare(`
      SELECT c.* FROM chapters c
      JOIN novels n ON c.novel_id = n.id
      WHERE c.id = ? AND n.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!chapter) {
      return res.status(404).json({ error: '章节不存在' });
    }

    res.json(chapter);
  } catch (error) {
    console.error('获取章节详情失败:', error);
    res.status(500).json({ error: '获取章节详情失败' });
  }
});

// 创建章节
router.post('/novel/:novelId', (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title) {
      return res.status(400).json({ error: '章节标题不能为空' });
    }

    const novel = db.prepare('SELECT * FROM novels WHERE id = ? AND user_id = ?')
      .get(req.params.novelId, req.user.id);

    if (!novel) {
      return res.status(404).json({ error: '小说不存在' });
    }

    // 获取当前最大排序值
    const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM chapters WHERE novel_id = ?')
      .get(req.params.novelId);
    const sortOrder = (maxOrder.max || 0) + 1;

    const wordCount = content ? content.length : 0;

    const result = db.prepare(`
      INSERT INTO chapters (novel_id, title, content, word_count, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.novelId, title, content || '', wordCount, sortOrder);

    // 更新小说字数
    db.prepare(`
      UPDATE novels 
      SET word_count = (SELECT COALESCE(SUM(word_count), 0) FROM chapters WHERE novel_id = ?),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(req.params.novelId, req.params.novelId);

    const chapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({
      message: '章节创建成功',
      chapter
    });
  } catch (error) {
    console.error('创建章节失败:', error);
    res.status(500).json({ error: '创建章节失败' });
  }
});

// 更新章节
router.put('/:id', (req, res) => {
  try {
    const { title, content, status } = req.body;

    const chapter = db.prepare(`
      SELECT c.* FROM chapters c
      JOIN novels n ON c.novel_id = n.id
      WHERE c.id = ? AND n.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!chapter) {
      return res.status(404).json({ error: '章节不存在' });
    }

    const wordCount = content !== undefined ? content.length : chapter.word_count;

    db.prepare(`
      UPDATE chapters 
      SET title = ?, content = ?, word_count = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title || chapter.title,
      content !== undefined ? content : chapter.content,
      wordCount,
      status || chapter.status,
      req.params.id
    );

    // 更新小说字数
    db.prepare(`
      UPDATE novels 
      SET word_count = (SELECT COALESCE(SUM(word_count), 0) FROM chapters WHERE novel_id = ?),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(chapter.novel_id, chapter.novel_id);

    const updatedChapter = db.prepare('SELECT * FROM chapters WHERE id = ?').get(req.params.id);

    res.json({
      message: '章节更新成功',
      chapter: updatedChapter
    });
  } catch (error) {
    console.error('更新章节失败:', error);
    res.status(500).json({ error: '更新章节失败' });
  }
});

// 删除章节
router.delete('/:id', (req, res) => {
  try {
    const chapter = db.prepare(`
      SELECT c.* FROM chapters c
      JOIN novels n ON c.novel_id = n.id
      WHERE c.id = ? AND n.user_id = ?
    `).get(req.params.id, req.user.id);

    if (!chapter) {
      return res.status(404).json({ error: '章节不存在' });
    }

    db.prepare('DELETE FROM chapters WHERE id = ?').run(req.params.id);

    // 更新小说字数
    db.prepare(`
      UPDATE novels 
      SET word_count = (SELECT COALESCE(SUM(word_count), 0) FROM chapters WHERE novel_id = ?),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(chapter.novel_id, chapter.novel_id);

    res.json({ message: '章节删除成功' });
  } catch (error) {
    console.error('删除章节失败:', error);
    res.status(500).json({ error: '删除章节失败' });
  }
});

// 重新排序章节
router.put('/novel/:novelId/reorder', (req, res) => {
  try {
    const { chapterIds } = req.body; // 数组，表示新的排序顺序

    if (!Array.isArray(chapterIds)) {
      return res.status(400).json({ error: 'chapterIds 必须是数组' });
    }

    const novel = db.prepare('SELECT * FROM novels WHERE id = ? AND user_id = ?')
      .get(req.params.novelId, req.user.id);

    if (!novel) {
      return res.status(404).json({ error: '小说不存在' });
    }

    const updateMany = db.transaction((ids) => {
      ids.forEach((id, index) => {
        db.prepare('UPDATE chapters SET sort_order = ? WHERE id = ? AND novel_id = ?')
          .run(index + 1, id, req.params.novelId);
      });
    });

    updateMany(chapterIds);

    res.json({ message: '章节排序更新成功' });
  } catch (error) {
    console.error('章节排序失败:', error);
    res.status(500).json({ error: '章节排序失败' });
  }
});

module.exports = router;
