// 加载环境变量
require('dotenv').config();

// koa服务
const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const cors = require('@koa/cors');
const serve = require('koa-static');
const path = require('path');
const app = new Koa();

// 中间件
app.use(cors({
  origin: '*', // 允许所有来源访问，生产环境中应该设置为特定域名
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true
}));
app.use(bodyParser({
  enableTypes: ['json', 'form'],
  jsonLimit: '10mb',
  formLimit: '10mb',
  textLimit: '10mb',
  onerror: function (err, ctx) {
    ctx.throw(422, 'body parse error');
  }
}));

// 静态文件服务
app.use(serve(path.join(__dirname, 'public')));

// 错误处理中间件
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    // 处理JSON解析错误
    if (err.status === 422 || err.message.includes('JSON')) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请求数据格式错误，请检查JSON格式是否正确'
      };
    } else {
      ctx.status = err.status || 500;
      ctx.body = {
        success: false,
        message: err.message || '服务器内部错误'
      };
    }
    console.error('Error:', err);
  }
});

// JWT验证中间件
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

app.use(async (ctx, next) => {

  // 跳过不需要验证的路径
  const skipPaths = [
    '/',
    '/api/users', // POST创建用户
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/payment/vip-packages', // 获取VIP套餐列表
    '/api/site-settings/public', // 获取公开的网站设置
    '/api/site-settings/announcements', // 获取有效公告
    '/api/invite-records/validate' // 验证邀请码
  ];

  
  const isSkipPath = skipPaths.some(path => {
    if (path === ctx.path) return true;
    if (path === '/api/users' && ctx.method === 'POST' && ctx.path === '/api/users') {
      return true;
    }
    return false;
  });

  if (isSkipPath) {
    await next();
    return;
  }
  
  // 获取token
  const token = ctx.request.header.authorization?.replace('Bearer ', '');
  
  if (!token) {
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: '未提供认证token'
    };
    return;
  }
  
  try {
    // 验证token
    const decoded = jwt.verify(token, JWT_SECRET);
    ctx.state.user = decoded;
    await next();
  } catch (error) {
    ctx.status = 401;
     ctx.body = {
       success: false,
       message: 'Token无效或已过期'
     };
     return;
   }
 });

// 路由
const userRouter = require('./router/user');
const promptRouter = require('./router/prompt');
const externalPromptsRouter = require('./router/external/prompts');
const promptExpertManagementRouter = require('./router/promptExpertManagement');
const loginRouter = require('./router/login');
const novelRouter = require('./router/novel');
const chapterRouter = require('./router/chapter');
const characterRouter = require('./router/character');
const worldviewRouter = require('./router/worldview');
const timelineRouter = require('./router/timeline');
const corpusRouter = require('./router/corpus');
const aiModelRouter = require('./router/aimodel');
const aiRouter = require('./router/ai');
const aiBusinessRouter = require('./router/ai-business');
const { userRouter: aiCallRecordUserRouter, adminRouter: aiCallRecordAdminRouter } = require('./router/aiCallRecord');
const packageRouter = require('./router/package');
const activationCodeRouter = require('./router/activationCode');
const novelTypeRouter = require('./router/novelType');
const announcementRouter = require('./router/announcement');
const systemSettingRouter = require('./router/systemSetting');
const inviteRecordRouter = require('./router/inviteRecord');
const commissionRecordRouter = require('./router/commissionRecord');
const shortStoryRouter = require('./router/shortStory');
const aiAssistantRouter = require('./router/aiAssistant');
const aiConversationRouter = require('./router/aiConversation');
const aiChatRouter = require('./router/aiChat');
const membershipRouter = require('./router/membership');
const paymentRouter = require('./router/payment');
const paymentConfigRouter = require('./router/paymentConfig');
const dashboardRouter = require('./router/dashboard');
const siteSettingsRouter = require('./router/siteSettings');
const distributionConfigRouter = require('./router/distributionConfig');
const withdrawalRequestRouter = require('./router/withdrawalRequest');
const distributionAccountRouter = require('./router/distributionAccount');
// const vipPackageRouter = require('./router/vipPackage'); // 已删除，统一使用Package管理
app.use(userRouter.routes());
app.use(userRouter.allowedMethods());
app.use(promptRouter.routes());
app.use(promptRouter.allowedMethods());
app.use(externalPromptsRouter.routes());
app.use(externalPromptsRouter.allowedMethods());
app.use(promptExpertManagementRouter.routes());
app.use(promptExpertManagementRouter.allowedMethods());
app.use(loginRouter.routes());
app.use(loginRouter.allowedMethods());
app.use(novelRouter.routes());
app.use(novelRouter.allowedMethods());
app.use(chapterRouter.routes());
app.use(chapterRouter.allowedMethods());
app.use(characterRouter.routes());
app.use(characterRouter.allowedMethods());
app.use(worldviewRouter.routes());
app.use(worldviewRouter.allowedMethods());
app.use(timelineRouter.routes());
app.use(timelineRouter.allowedMethods());
app.use(corpusRouter.routes());
app.use(corpusRouter.allowedMethods());
app.use(aiModelRouter.routes());
app.use(aiModelRouter.allowedMethods());
// 核心AI接口不对外暴露，仅供内部业务接口使用
// app.use(aiRouter.routes());
// app.use(aiRouter.allowedMethods());
app.use(aiBusinessRouter.routes());
app.use(aiBusinessRouter.allowedMethods());
app.use(aiCallRecordUserRouter.routes());
app.use(aiCallRecordUserRouter.allowedMethods());
app.use(aiCallRecordAdminRouter.routes());
app.use(aiCallRecordAdminRouter.allowedMethods());
app.use(packageRouter.routes());
app.use(packageRouter.allowedMethods());
app.use(activationCodeRouter.routes());
app.use(activationCodeRouter.allowedMethods());
app.use(novelTypeRouter.routes());
app.use(novelTypeRouter.allowedMethods());
app.use(announcementRouter.routes());
app.use(announcementRouter.allowedMethods());
app.use(systemSettingRouter.routes());
app.use(systemSettingRouter.allowedMethods());
app.use(inviteRecordRouter.routes());
app.use(inviteRecordRouter.allowedMethods());
app.use(commissionRecordRouter.routes());
app.use(commissionRecordRouter.allowedMethods());
app.use(shortStoryRouter.routes());
app.use(shortStoryRouter.allowedMethods());
app.use(aiAssistantRouter.routes());
app.use(aiAssistantRouter.allowedMethods());
app.use(aiConversationRouter.routes());
app.use(aiConversationRouter.allowedMethods());
app.use(aiChatRouter.routes());
app.use(aiChatRouter.allowedMethods());
app.use(membershipRouter.routes());
app.use(membershipRouter.allowedMethods());
app.use(paymentRouter.routes());
app.use(paymentRouter.allowedMethods());
app.use(paymentConfigRouter.routes());
app.use(paymentConfigRouter.allowedMethods());
app.use(dashboardRouter.routes());
app.use(dashboardRouter.allowedMethods());
app.use(siteSettingsRouter.routes());
app.use(siteSettingsRouter.allowedMethods());
app.use(distributionConfigRouter.routes());
app.use(distributionConfigRouter.allowedMethods());
app.use(withdrawalRequestRouter.routes());
app.use(withdrawalRequestRouter.allowedMethods());
app.use(distributionAccountRouter.routes());
app.use(distributionAccountRouter.allowedMethods());
// app.use(vipPackageRouter.routes()); // 已删除，统一使用Package管理
// app.use(vipPackageRouter.allowedMethods());

// 根路径
app.use(async (ctx) => {
  if (ctx.path === '/') {
    ctx.body = {
      success: true,
      message: 'AI小说平台 API 服务',
      version: '1.0.0',
      endpoints: {
        users: '/api/users',
        docs: '/api/docs'
      }
    };
  } else {
    ctx.status = 404;
    ctx.body = {
      success: false,
      message: '接口不存在'
    };
  }
});

// 初始化数据库
const { initDatabase } = require('./scripts/init-database');
initDatabase();

// 启动服务
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
  console.log(`API文档: http://localhost:${PORT}/api/users`);
});