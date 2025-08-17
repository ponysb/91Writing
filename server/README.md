# 91写作助手 - AI小说创作平台后端

一个基于人工智能的网文创作辅助平台，提供智能续写、角色生成、剧情建议、世界观构建等功能，帮助作者提升创作效率。

## 🚀 功能特性

### 核心功能
- **AI智能续写** - 基于上下文的智能文本续写
- **角色生成** - 自动生成丰富的角色设定
- **剧情建议** - 智能剧情发展建议
- **世界观构建** - 完整的世界观设定生成
- **文本润色** - AI辅助文本优化和润色
- **大纲生成** - 智能小说大纲创建

### 管理功能
- **用户管理** - 完整的用户注册、登录、权限管理
- **会员系统** - 多层级会员权益管理
- **支付系统** - 集成第三方支付接口
- **内容管理** - 小说、章节、角色等内容管理
- **数据统计** - 详细的使用数据分析

### 系统特性
- **多AI模型支持** - 支持多种AI模型接入
- **分布式架构** - Redis缓存，MySQL数据库
- **RESTful API** - 标准化API接口
- **安全防护** - JWT认证，数据加密
- **日志监控** - 完整的日志记录和监控

## 🛠️ 技术栈

- **后端框架**: Node.js + Express
- **数据库**: MySQL + Sequelize ORM
- **缓存**: Redis
- **认证**: JWT
- **日志**: Winston
- **支付**: 蓝兔支付
- **AI服务**: 支持多种AI模型接入

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

## 🔧 配置说明

### 数据库配置

项目使用 MySQL 作为主数据库，配置文件位于 `config/database.js`。

### Redis配置

用于缓存和会话管理，配置文件位于 `config/redis.js`。

### AI模型配置

支持多种AI模型，可在管理后台动态配置API密钥和参数。

### 支付配置

集成蓝兔支付，支持扫码支付、订单查询等功能。

## 📁 项目结构

```
├── app.js                 # 应用入口文件
├── config/                # 配置文件目录
│   ├── database.js        # 数据库配置
│   ├── redis.js          # Redis配置
│   └── siteSettings.json  # 站点设置
├── models/                # 数据模型
├── router/                # 路由控制器
│   ├── ai-business/       # AI业务相关路由
│   └── ...
├── services/              # 业务服务层
├── utils/                 # 工具函数
├── scripts/               # 脚本文件
├── public/                # 静态资源
└── ...
```

## 🔐 安全说明

### 环境变量
- 所有敏感配置均通过环境变量管理
- 请勿将 `.env` 文件提交到版本控制
- 生产环境请使用强密码和安全的密钥

### 数据安全
- 用户密码使用bcrypt加密存储
- JWT token用于用户认证
- 敏感数据传输使用HTTPS

### API安全
- 实施了请求频率限制
- 输入数据验证和过滤
- SQL注入防护

## 🚀 部署指南

### Docker部署（推荐）

```bash
# 构建镜像
docker build -t ai-novel-backend .

# 运行容器
docker run -d \
  --name ai-novel-backend \
  -p 3000:3000 \
  --env-file .env \
  ai-novel-backend
```

### PM2部署

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start app.js --name "ai-novel-backend"

# 查看状态
pm2 status

# 查看日志
pm2 logs ai-novel-backend
```

## 📊 API文档

### 认证接口
- `POST /api/login` - 用户登录
- `POST /api/register` - 用户注册
- `POST /api/logout` - 用户登出

### AI功能接口
- `POST /api/ai/continue` - 智能续写
- `POST /api/ai/character` - 角色生成
- `POST /api/ai/plot` - 剧情建议
- `POST /api/ai/worldview` - 世界观构建

### 内容管理接口
- `GET /api/novels` - 获取小说列表
- `POST /api/novels` - 创建小说
- `PUT /api/novels/:id` - 更新小说
- `DELETE /api/novels/:id` - 删除小说

更多API详情请参考在线文档或联系开发团队。

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📝 开发规范

- 遵循 ESLint 代码规范
- 提交信息使用语义化格式
- 新功能需要添加相应测试
- 重要变更需要更新文档

## 🐛 问题反馈

如果您在使用过程中遇到问题，请通过以下方式反馈：

- 提交 GitHub Issue
- 发送邮件至：admin@example.com
- 加入技术交流群

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢所有为本项目做出贡献的开发者和用户。

---

**注意**: 本项目仅供学习和研究使用，请遵守相关法律法规，不得用于非法用途。