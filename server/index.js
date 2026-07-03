const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 导入路由
const authRoutes = require('./routes/auth');
const novelRoutes = require('./routes/novels');
const chapterRoutes = require('./routes/chapters');
const characterRoutes = require('./routes/characters');
const worldSettingsRoutes = require('./routes/worldSettings');
const goalsRoutes = require('./routes/goals');
const promptsRoutes = require('./routes/prompts');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = process.env.PORT || 3000;

// 确保数据目录存在
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 请求日志
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API 路由
app.use('/api/auth', authRoutes);
app.use('/api/novels', novelRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/world-settings', worldSettingsRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/prompts', promptsRoutes);
app.use('/api/ai', aiRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 静态文件服务（前端构建产物）
const frontendDist = path.join(__dirname, '../dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  
  // SPA 路由回退
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendDist, 'index.html'));
    }
  });
}

// 错误处理
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 墨章服务器运行在 http://0.0.0.0:${PORT}`);
  console.log(`📁 数据目录: ${dataDir}`);
});

module.exports = app;
