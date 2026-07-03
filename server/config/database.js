const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 数据目录
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 初始化数据库
const dbPath = path.join(dataDir, 'mozhang.db');
const db = new Database(dbPath);

// 启用 WAL 模式提升性能
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 创建表结构
function initDatabase() {
  // 用户表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 小说表
  db.exec(`
    CREATE TABLE IF NOT EXISTS novels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      genre TEXT,
      tags TEXT,
      status TEXT DEFAULT 'draft',
      cover_url TEXT,
      word_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 章节表
  db.exec(`
    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      novel_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      word_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'draft',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    )
  `);

  // 角色表
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      novel_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      role TEXT,
      attributes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    )
  `);

  // 世界观表
  db.exec(`
    CREATE TABLE IF NOT EXISTS world_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      novel_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      type TEXT,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
    )
  `);

  // 写作目标表
  db.exec(`
    CREATE TABLE IF NOT EXISTS writing_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      daily_target INTEGER DEFAULT 1000,
      weekly_target INTEGER DEFAULT 7000,
      monthly_target INTEGER DEFAULT 30000,
      streak_days INTEGER DEFAULT 0,
      last_write_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // API 配置表
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      provider TEXT NOT NULL,
      api_key TEXT NOT NULL,
      base_url TEXT,
      model TEXT,
      max_tokens INTEGER DEFAULT 2000,
      temperature REAL DEFAULT 0.7,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 提示词模板表
  db.exec(`
    CREATE TABLE IF NOT EXISTS prompt_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      content TEXT NOT NULL,
      variables TEXT,
      is_system INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_novels_user ON novels(user_id);
    CREATE INDEX IF NOT EXISTS idx_chapters_novel ON chapters(novel_id);
    CREATE INDEX IF NOT EXISTS idx_characters_novel ON characters(novel_id);
    CREATE INDEX IF NOT EXISTS idx_world_settings_novel ON world_settings(novel_id);
    CREATE INDEX IF NOT EXISTS idx_writing_goals_user ON writing_goals(user_id);
    CREATE INDEX IF NOT EXISTS idx_api_configs_user ON api_configs(user_id);
    CREATE INDEX IF NOT EXISTS idx_prompt_templates_user ON prompt_templates(user_id);
  `);

  console.log('Database initialized successfully');
}

// 初始化数据库
initDatabase();

module.exports = db;
