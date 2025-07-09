// 公告配置文件
export const announcements = [
  {
    id: 'v0.7.0',
    version: '0.7.0',
    title: '🎉 AI小说生成v0.7.0 重大更新',
    date: '2025-01-20',
    priority: 1, // 优先级，数字越大越重要
    content: `
# 🎉 欢迎使用AI小说生成工具 v0.7.0

## 📚 使用教程

### 🎬 视频教程
- [API配置教程](https://www.bilibili.com/video/BV1keKgzaER2)
- [本地部署教程](https://www.bilibili.com/video/BV1AYKgzAEne)

### 💡 快速开始
1. 选择 **91写作官方API** (推荐新手)
2. 购买API密钥并输入
3. 选择合适的AI模型

## 🛒 获取API密钥

点击配置页面的**前往购买**按钮，或访问：
[淘宝购买链接](https://item.taobao.com/item.htm?ft=t&id=938261705242)

## 💬 技术支持

遇到问题？加入我们的交流群：**QQ群：468734087**
<img src="../../image/qrcode_1749609318081.jpg" alt="QQ群" style="height: 300px;">

**微信公众号：**
<img src="../../image/qrcode_for_gh_3e35b4fbecbe_258.jpg" alt="微信公众号" style="width: 200px; height: 200px;">




## ✨ v0.7.0 更新内容

### 🔧 API配置优化
- **优化API配置新增官方默认API**: 新增91写作官方API服务，按次计费，价格透明
- **自定义API配置**: 支持所有OpenAI格式的API接口
- **智能配置向导**: 分为新手和高级用户模式，操作更简单

### 📢 系统功能增强
- **增加公告弹窗和教程说明**: 新用户引导更完善，使用更简单
- **新增切换模型参数下拉框**: 支持随时切换模型，使用更灵活

### ✍️ 短文创作全新升级
- **短篇小说改为短文创作**: 功能更全面，支持多种短文类型
- **新增短文写作及配置**: 提供更多创作选项和个性化设置
- **优化短篇小说ui和逻辑**: 界面更美观，操作更流畅

### 🛠️ 系统优化
- **修复若干bug问题**: 提升系统稳定性和用户体验

### 🤖 支持的AI模型
- **Claude-4 Sonnet**: ￥0.1/次 - 默认推荐，性能出色
- **Claude Opus 4**: ￥0.5/次 - 顶级性能，创作能力超强
- **Claude-3.7 Sonnet Thinking**: ￥0.2/次 - 具备思维链推理
- **Claude-3.7 Sonnet**: ￥0.1/次 - 经济实用选择

## 🚀 更多功能

- **智能章节生成**: AI帮您构思和生成章节内容
- **角色设定助手**: 快速创建丰富的角色设定
- **世界观构建**: 构建完整的小说世界观
- **语料库管理**: 个性化训练素材
- **写作目标跟踪**: 掌控您的创作进度

---

**感谢您使用AI小说生成工具！祝您创作愉快！** ✍️
    `
  },
  {
    id: 'v0.6.0',
    version: '0.6.0', 
    title: '🔧 系统优化更新',
    date: '2024-01-15',
    priority: 0,
    content: `
# 📋 系统优化更新 v0.6.0

## 🛠️ 主要改进

### 性能优化
- 提升AI生成速度
- 优化界面响应速度
- 减少内存占用

### 界面改进
- 优化用户体验
- 修复若干界面bug
- 增强移动端适配

### 功能增强
- 改进文本编辑器
- 增强导入导出功能
- 优化备份管理

感谢您的使用和反馈！
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