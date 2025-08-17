# 91写作 - AI智能小说创作平台

一个基于Vue 3和AI技术的智能小说创作平台，为作者提供全方位的创作辅助工具和管理功能。
[![Vue](https://img.shields.io/badge/Vue-3.3.8-4FC08D?style=flat-square&logo=vue.js)](https://vuejs.org/)
[![Element Plus](https://img.shields.io/badge/Element%20Plus-2.4.2-409EFF?style=flat-square&logo=element)](https://element-plus.org/)
[![Vite](https://img.shields.io/badge/Vite-4.5.0-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

<img src=".\image\wechat_2025-08-17_203829_968.png" />

## ✨ 项目特色

- 🤖 **AI智能创作** - 集成多种AI模型，提供智能写作辅助
- 📚 **完整创作流程** - 从大纲到章节，全流程创作管理
- 👥 **角色管理** - 智能角色设定和关系管理
- 🌍 **世界观构建** - 完整的世界观和时间线管理
- 💰 **商业化支持** - 会员体系、支付系统、分销推广
- 📊 **数据统计** - 详细的创作数据和用户行为分析

## 🧩 QQ社群
<img src=".\image\qrcode_1749609318081.jpg" style="width: 200px;" />

## 🏢 有偿技术咨询、定制化方案&商务合作
- 微信：1090879115
- 邮箱：<1090879115@qq.com>

## 功能点思维导图
<img src=".\image\91写作商用版简洁思维导图.png" style="width: 200px;" />

## 🛠️ 技术栈

### 前端框架
- **Vue 3** - 渐进式JavaScript框架
- **Vite** - 现代化构建工具
- **Vue Router** - 官方路由管理器
- **Pinia** - 状态管理库

### UI组件库
- **Element Plus** - Vue 3组件库
- **@element-plus/icons-vue** - Element Plus图标库

### 开发工具
- **Axios** - HTTP客户端
- **Vue I18n** - 国际化支持
- **Vditor** - Markdown编辑器
- **Vite Plugin Legacy** - 兼容性支持
- **Rollup Plugin Gzip** - Gzip压缩

## 🚀 功能模块

### 用户端功能
- **小说创作**
  - 智能大纲生成
  - 章节内容创作
  - AI写作辅助
  - 角色和世界观管理
  - 时间线管理

- **AI助手**
  - 多模型支持（GPT、Claude等）
  - 智能对话
  - 创作建议
  - 文本润色

- **会员服务**
  - VIP套餐购买
  - 积分充值
  - 邀请返佣
  - 使用记录查询

### 管理端功能
- **用户管理**
  - 用户信息管理
  - 权限控制
  - 使用统计

- **内容管理**
  - 小说审核
  - 提示词管理
  - 语料库管理

- **AI模型管理**
  - 模型配置
  - 接口管理
  - 调用统计

- **商业化管理**
  - 支付配置
  - VIP套餐管理
  - 分销系统
  - 数据统计

## 📦 安装和运行

### 环境要求
- Node.js >= 16.0.0
- pnpm >= 7.0.0 (推荐)

### 安装依赖
```bash
# 使用pnpm安装依赖
pnpm install

# 或使用npm
npm install
```

### 环境配置
复制并配置环境变量文件：
```bash
cp .env.example .env
```

编辑 `.env` 文件，配置API地址：
```env
# API服务地址
VITE_API_BASE_URL=http://localhost:7020/api
# 图片服务地址
VITE_IMAGE_BASE_URL=http://localhost:7020
```

### 开发模式
```bash
# 启动开发服务器
pnpm dev

# 或使用npm
npm run dev
```

访问 http://localhost:5173 查看应用

### 生产构建
```bash
# 构建生产版本
pnpm build

# 预览构建结果
pnpm preview
```

## 📁 项目结构

```
src/
├── api/                 # API接口定义
│   ├── index.js        # 主要API接口
│   ├── siteSettings.js # 站点设置API
│   └── distribution.js # 分销API
├── assets/             # 静态资源
├── components/         # 公共组件
├── composables/        # 组合式函数
├── layouts/            # 布局组件
├── locales/            # 国际化文件
├── router/             # 路由配置
├── stores/             # Pinia状态管理
├── utils/              # 工具函数
├── views/              # 页面组件
│   ├── admin/         # 管理后台页面
│   ├── client/        # 用户端页面
│   └── auth/          # 认证相关页面
├── App.vue            # 根组件
├── main.js            # 应用入口
└── style.css          # 全局样式
```

## 🔧 开发指南

### 代码规范
- 使用 Vue 3 Composition API
- 遵循 Element Plus 设计规范
- 使用 Pinia 进行状态管理
- API调用统一使用 axios 实例

### 路由结构
- `/` - 用户端首页
- `/admin` - 管理后台
- `/login` - 用户登录
- `/register` - 用户注册

### 状态管理
使用 Pinia 管理全局状态：
- `useUserStore` - 用户信息和认证状态
- 其他业务相关的 store

## 🌐 部署说明

### 构建配置
项目使用 Vite 进行构建，支持：
- Gzip压缩
- 代码分割
- 资源优化
- 环境变量配置

### 部署步骤
1. 构建生产版本：`pnpm build`
2. 将 `dist` 目录部署到Web服务器
3. 配置反向代理指向后端API服务
4. 确保静态资源正确访问

---

# 后端 - 环境配置指南

## 📦 安装部署

### 环境要求

- Node.js >= 16.0.0
- MySQL >= 5.7
- Redis >= 5.0
- npm 或 pnpm

### 快速开始

1. **克隆项目**
```bash
git clone <repository-url>
cd 91写作商业版后端
```

2. **安装依赖**
```bash
npm install
# 或使用 pnpm
pnpm install
```

3. **环境配置**
```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量文件
vim .env
```

4. **配置环境变量**

编辑 `.env` 文件，配置以下关键参数：

```env
# 应用配置
APP_SECRET=your-app-secret-key
JWT_SECRET=your-jwt-secret-key
ENCRYPT_SECRET=your-encrypt-secret-key

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=ai_novel
DB_USER=root
DB_PASSWORD=your-database-password

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# 管理员账户（用于初始化）
ADMIN_PASSWORD=your-admin-password
TEST_USER_PASSWORD=your-test-password
```

5. **数据库初始化**
```bash
# 运行数据库初始化脚本
node scripts/init-database.js
```

6. **启动服务**
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

## 🔧 详细配置说明

### 数据库配置

项目使用 MySQL 作为主数据库，配置文件位于 `config/database.js`。

**必需配置项：**
- `DB_HOST`: 数据库主机地址
- `DB_PORT`: 数据库端口（默认3306）
- `DB_NAME`: 数据库名称
- `DB_USER`: 数据库用户名
- `DB_PASSWORD`: 数据库密码

### Redis配置

用于缓存和会话管理，配置文件位于 `config/redis.js`。

**必需配置项：**
- `REDIS_HOST`: Redis主机地址
- `REDIS_PORT`: Redis端口（默认6379）
- `REDIS_PASSWORD`: Redis密码
- `REDIS_KEY_PREFIX`: Redis键前缀

---

**91写作** - 让AI成为你的创作伙伴 ✍️