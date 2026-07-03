// 公告配置文件
export const announcements = [
  {
    id: 'v0.7.0',
    version: '0.7.0',
    title: '墨章 v0.7.0 — UI 重设计与作品集导出',
    date: '2025-07-01',
    priority: 1,
    content: `
# 墨章 · AI 智能小说创作工具 v0.7.0

## 设计焕新

### 全新「墨章」视觉语言
- 暖纸背景 · 墨色文字 · 琥珀铜主色 · 衬线标题
- 文学书房美学的侧边栏与顶栏
- 首页采用文学封面式排版（Hero 封面 + 印谱统计 + 双栏面板 + 案头书架）

### 简化接口配置
- 移除官方 API 选项，仅保留单一 OpenAI 兼容配置
- 兼容任意 OpenAI 格式接口（OpenAI / Claude / DeepSeek / 国内代理等）
- 旧版自定义配置将自动迁移，无需重新填写

## 新功能

### 作品集导出
- 支持将所有作品集结为一个 PDF / Word / 纯文本
- 可调整正文字号、章节标题字号、行距
- 可选包含目录页、著者署名
- 全程本地渲染，PDF/Word 处理不依赖任何 CDN

## 使用指南

### 第一步：配置 API
进入「系统设置 → API 配置」，填入任意 OpenAI 兼容接口的密钥与地址。

### 第二步：开始创作
- 在首页点击「开卷新章」创建新小说
- 在编辑器中使用关键词生成大纲与章节
- AI 写作助手随时回答创作问题

### 第三步：导出作品集
在首页点击「导出作品集」，选择作品、调整字号，一键生成专属电子书。

## 已知支持模型
- GPT-4o / GPT-4o mini / GPT-3.5 Turbo
- Claude 3.7 Sonnet / Claude 4 Sonnet
- DeepSeek R1 / DeepSeek V3
- 任意 OpenAI 兼容接口

---

**墨章 · 让每一行思绪皆有归处。**
    `
  },
  {
    id: 'v0.6.0',
    version: '0.6.0',
    title: '系统优化更新',
    date: '2025-06-26',
    priority: 0,
    content: `
# 系统优化更新 v0.6.0

## 主要改进

### 性能优化
- 提升 AI 生成速度
- 优化界面响应速度
- 减少内存占用

### 界面改进
- 优化用户体验
- 修复若干界面 bug
- 增强移动端适配

### 功能增强
- 改进文本编辑器
- 增强导入导出功能
- 优化备份管理
    `
  }
]

// 获取最新公告
export function getLatestAnnouncement() {
  return announcements
    .sort((a, b) => b.priority - a.priority)
    .find(announcement => announcement.priority > 0) || announcements[0]
}

// 获取指定版本的公告
export function getAnnouncementByVersion(version) {
  return announcements.find(announcement => announcement.version === version)
}

// 检查是否有新版本公告
export function hasNewAnnouncement() {
  const lastReadVersion = localStorage.getItem('lastReadAnnouncementVersion')
  const latestAnnouncement = getLatestAnnouncement()

  if (!lastReadVersion) {
    return true
  }

  return lastReadVersion !== latestAnnouncement.version
}

// 标记公告为已读
export function markAnnouncementAsRead(version) {
  localStorage.setItem('lastReadAnnouncementVersion', version)
  localStorage.setItem('lastReadAnnouncementDate', new Date().toISOString())
}

// 获取用户统计信息
export function getAnnouncementStats() {
  return {
    lastReadVersion: localStorage.getItem('lastReadAnnouncementVersion'),
    lastReadDate: localStorage.getItem('lastReadAnnouncementDate')
  }
}
