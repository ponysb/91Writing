const express = require('express');
const db = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// 获取写作目标
router.get('/', (req, res) => {
  try {
    let goal = db.prepare('SELECT * FROM writing_goals WHERE user_id = ?').get(req.user.id);
    
    if (!goal) {
      // 创建默认目标
      db.prepare('INSERT INTO writing_goals (user_id) VALUES (?)').run(req.user.id);
      goal = db.prepare('SELECT * FROM writing_goals WHERE user_id = ?').get(req.user.id);
    }

    res.json(goal);
  } catch (error) {
    console.error('获取写作目标失败:', error);
    res.status(500).json({ error: '获取写作目标失败' });
  }
});

// 更新写作目标
router.put('/', (req, res) => {
  try {
    const { daily_target, weekly_target, monthly_target } = req.body;

    const existing = db.prepare('SELECT * FROM writing_goals WHERE user_id = ?').get(req.user.id);

    if (!existing) {
      db.prepare(`
        INSERT INTO writing_goals (user_id, daily_target, weekly_target, monthly_target)
        VALUES (?, ?, ?, ?)
      `).run(
        req.user.id,
        daily_target || 1000,
        weekly_target || 7000,
        monthly_target || 30000
      );
    } else {
      db.prepare(`
        UPDATE writing_goals 
        SET daily_target = ?, weekly_target = ?, monthly_target = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(
        daily_target !== undefined ? daily_target : existing.daily_target,
        weekly_target !== undefined ? weekly_target : existing.weekly_target,
        monthly_target !== undefined ? monthly_target : existing.monthly_target,
        req.user.id
      );
    }

    const goal = db.prepare('SELECT * FROM writing_goals WHERE user_id = ?').get(req.user.id);

    res.json({
      message: '写作目标更新成功',
      goal
    });
  } catch (error) {
    console.error('更新写作目标失败:', error);
    res.status(500).json({ error: '更新写作目标失败' });
  }
});

// 记录写作活动（更新连续天数）
router.post('/activity', (req, res) => {
  try {
    const { word_count } = req.body;
    const today = new Date().toISOString().split('T')[0];

    let goal = db.prepare('SELECT * FROM writing_goals WHERE user_id = ?').get(req.user.id);

    if (!goal) {
      db.prepare('INSERT INTO writing_goals (user_id) VALUES (?)').run(req.user.id);
      goal = db.prepare('SELECT * FROM writing_goals WHERE user_id = ?').get(req.user.id);
    }

    let streakDays = goal.streak_days || 0;
    const lastWriteDate = goal.last_write_date;

    if (lastWriteDate === today) {
      // 今天已经记录过
      return res.json({ message: '今日已记录', goal });
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (lastWriteDate === yesterday) {
      // 连续写作
      streakDays += 1;
    } else {
      // 重新开始
      streakDays = 1;
    }

    db.prepare(`
      UPDATE writing_goals 
      SET streak_days = ?, last_write_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(streakDays, today, req.user.id);

    const updatedGoal = db.prepare('SELECT * FROM writing_goals WHERE user_id = ?').get(req.user.id);

    res.json({
      message: '写作活动已记录',
      goal: updatedGoal
    });
  } catch (error) {
    console.error('记录写作活动失败:', error);
    res.status(500).json({ error: '记录写作活动失败' });
  }
});

module.exports = router;
