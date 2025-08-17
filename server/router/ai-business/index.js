const Router = require('koa-router');
const router = new Router({ prefix: '/api' });

// 导入各个业务模块
const outlineRouter = require('./outline');
const characterRouter = require('./character');
const dialogueRouter = require('./dialogue');
const plotRouter = require('./plot');
const polishRouter = require('./polish');
const creativeRouter = require('./creative');
const contentRouter = require('./content');
const worldviewRouter = require('./worldview');
const bookAnalyzeRouter = require('./book-analyze');
const shortArticleRouter = require('./short-article');
const shortStoryRouter = require('./short-story');

// 注册各个业务模块的路由
router.use(outlineRouter.routes(), outlineRouter.allowedMethods());
router.use(characterRouter.routes(), characterRouter.allowedMethods());
router.use(dialogueRouter.routes(), dialogueRouter.allowedMethods());
router.use(plotRouter.routes(), plotRouter.allowedMethods());
router.use(polishRouter.routes(), polishRouter.allowedMethods());
router.use(creativeRouter.routes(), creativeRouter.allowedMethods());
router.use(contentRouter.routes(), contentRouter.allowedMethods());
router.use(worldviewRouter.routes(), worldviewRouter.allowedMethods());
router.use(bookAnalyzeRouter.routes(), bookAnalyzeRouter.allowedMethods());
router.use(shortArticleRouter.routes(), shortArticleRouter.allowedMethods());
router.use(shortStoryRouter.routes(), shortStoryRouter.allowedMethods());

module.exports = router;