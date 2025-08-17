const Router = require('koa-router');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const multer = require('@koa/multer');
const crypto = require('crypto');

const router = new Router({
  prefix: '/api/site-settings'
});

// 配置文件路径
const SETTINGS_FILE_PATH = path.join(__dirname, '../config/siteSettings.json');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../public/uploads');
const logoDir = path.join(uploadDir, 'logos');
const iconDir = path.join(uploadDir, 'icons');

// 创建目录
const createDirIfNotExists = async (dir) => {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

// 初始化上传目录
const initUploadDirs = async () => {
  await createDirIfNotExists(uploadDir);
  await createDirIfNotExists(logoDir);
  await createDirIfNotExists(iconDir);
};

// Logo上传配置
const logoStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await initUploadDirs();
    cb(null, logoDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, 'logo-' + uniqueSuffix + ext);
  }
});

// Icon上传配置
const iconStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await initUploadDirs();
    cb(null, iconDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, 'icon-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持上传 JPEG, PNG, GIF, WebP, SVG 格式的图片文件'), false);
  }
};

// 创建上传中间件
const uploadLogo = multer({
  storage: logoStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
}).single('logo');

const uploadIcon = multer({
  storage: iconStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1
  }
}).single('icon');

// 删除旧文件的工具函数
const deleteOldFile = async (filePath) => {
  if (!filePath) return;
  try {
    let absolutePath = filePath;
    if (!path.isAbsolute(filePath)) {
      absolutePath = path.join(__dirname, '../public', filePath);
    }
    await fs.unlink(absolutePath);
  } catch (error) {
    // 忽略文件不存在的错误
    if (error.code !== 'ENOENT') {
      console.error('删除旧文件失败:', error);
    }
  }
};

// 管理员权限中间件（JWT认证已在app.js中全局处理）
const requireAdmin = async (ctx, next) => {
  if (!ctx.state.user || !ctx.state.user.is_admin) {
    ctx.status = 403;
    ctx.body = { success: false, message: '需要管理员权限' };
    return;
  }
  await next();
};

// 读取配置文件
const readSettings = async () => {
  try {
    const data = await fs.readFile(SETTINGS_FILE_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取配置文件失败:', error);
    throw new Error('读取配置文件失败');
  }
};

// 写入配置文件
const writeSettings = async (settings) => {
  try {
    settings.lastUpdated = new Date().toISOString();
    await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), 'utf8');
    return settings;
  } catch (error) {
    console.error('写入配置文件失败:', error);
    throw new Error('写入配置文件失败');
  }
};

// 获取公开的网站设置（无需认证）
router.get('/public', async (ctx) => {
  try {
    const settings = await readSettings();
    
    // 只返回公开信息，过滤敏感数据
    const publicSettings = {
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      siteKeywords: settings.siteKeywords,
      siteLogo: settings.siteLogo,
      siteIcon: settings.siteIcon,
      icp: settings.icp,
      contactEmail: settings.contactEmail,
      cardPlatformUrl: settings.cardPlatformUrl,
      privacyPolicy: settings.privacyPolicy,
      userAgreement: settings.userAgreement,
      membershipAgreement: settings.membershipAgreement,
      aboutUs: settings.aboutUs,
      copyright: settings.copyright,
      version: settings.version,
      maintenanceMode: settings.maintenanceMode,
      registrationEnabled: settings.registrationEnabled,
      supportedImageFormats: settings.supportedImageFormats,
      socialMedia: settings.socialMedia,
      seo: settings.seo,
      features: settings.features,
      limits: {
        freeUserDailyAiCalls: settings.limits.freeUserDailyAiCalls,
        maxNovelLength: settings.limits.maxNovelLength,
        maxChapterLength: settings.limits.maxChapterLength
      },
      // 只返回当前有效的公告
      announcements: settings.announcements.filter(announcement => {
        const now = new Date();
        const startDate = new Date(announcement.startDate);
        const endDate = new Date(announcement.endDate);
        return announcement.isActive && now >= startDate && now <= endDate;
      }).sort((a, b) => {
        // 按优先级和创建时间排序
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      })
    };

    ctx.body = {
      success: true,
      data: publicSettings
    };
  } catch (error) {
    console.error('获取公开设置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取网站设置失败'
    };
  }
});

// 获取完整的网站设置（需要管理员权限）
router.get('/admin', requireAdmin, async (ctx) => {
  try {
    const settings = await readSettings();
    ctx.body = {
      success: true,
      data: settings
    };
  } catch (error) {
    console.error('获取管理员设置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取网站设置失败'
    };
  }
});

// 更新网站基础设置（需要管理员权限）
router.put('/admin', requireAdmin, async (ctx) => {
  try {
    const currentSettings = await readSettings();
    const {
      siteName,
      siteDescription,
      siteKeywords,
      siteLogo,
      siteIcon,
      icp,
      contactEmail,
      contactQQ,
      contactWechat,
      cardPlatformUrl,
      privacyPolicy,
      userAgreement,
      membershipAgreement,
      aboutUs,
      copyright,
      version,
      maintenanceMode,
      registrationEnabled,
      maxFileUploadSize,
      supportedImageFormats,
      socialMedia,
      seo,
      features,
      limits
    } = ctx.request.body;

    // 更新设置
    const updatedSettings = {
      ...currentSettings,
      siteName: siteName !== undefined ? siteName : currentSettings.siteName,
      siteDescription: siteDescription !== undefined ? siteDescription : currentSettings.siteDescription,
      siteKeywords: siteKeywords !== undefined ? siteKeywords : currentSettings.siteKeywords,
      siteLogo: siteLogo !== undefined ? siteLogo : currentSettings.siteLogo,
      siteIcon: siteIcon !== undefined ? siteIcon : currentSettings.siteIcon,
      icp: icp !== undefined ? icp : currentSettings.icp,
      contactEmail: contactEmail !== undefined ? contactEmail : currentSettings.contactEmail,
      contactQQ: contactQQ !== undefined ? contactQQ : currentSettings.contactQQ,
      contactWechat: contactWechat !== undefined ? contactWechat : currentSettings.contactWechat,
      cardPlatformUrl: cardPlatformUrl !== undefined ? cardPlatformUrl : currentSettings.cardPlatformUrl,
      privacyPolicy: privacyPolicy !== undefined ? privacyPolicy : currentSettings.privacyPolicy,
      userAgreement: userAgreement !== undefined ? userAgreement : currentSettings.userAgreement,
      membershipAgreement: membershipAgreement !== undefined ? membershipAgreement : currentSettings.membershipAgreement,
      aboutUs: aboutUs !== undefined ? aboutUs : currentSettings.aboutUs,
      copyright: copyright !== undefined ? copyright : currentSettings.copyright,
      version: version !== undefined ? version : currentSettings.version,
      maintenanceMode: maintenanceMode !== undefined ? maintenanceMode : currentSettings.maintenanceMode,
      registrationEnabled: registrationEnabled !== undefined ? registrationEnabled : currentSettings.registrationEnabled,
      maxFileUploadSize: maxFileUploadSize !== undefined ? maxFileUploadSize : currentSettings.maxFileUploadSize,
      supportedImageFormats: supportedImageFormats !== undefined ? supportedImageFormats : currentSettings.supportedImageFormats,
      socialMedia: socialMedia !== undefined ? { ...currentSettings.socialMedia, ...socialMedia } : currentSettings.socialMedia,
      seo: seo !== undefined ? { ...currentSettings.seo, ...seo } : currentSettings.seo,
      features: features !== undefined ? { ...currentSettings.features, ...features } : currentSettings.features,
      limits: limits !== undefined ? { ...currentSettings.limits, ...limits } : currentSettings.limits
    };

    const savedSettings = await writeSettings(updatedSettings);

    ctx.body = {
      success: true,
      message: '网站设置更新成功',
      data: savedSettings
    };
  } catch (error) {
    console.error('更新网站设置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新网站设置失败'
    };
  }
});

// 获取所有公告（需要管理员权限）
router.get('/admin/announcements', requireAdmin, async (ctx) => {
  try {
    const settings = await readSettings();
    ctx.body = {
      success: true,
      data: settings.announcements
    };
  } catch (error) {
    console.error('获取公告列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取公告列表失败'
    };
  }
});

// 创建新公告（需要管理员权限）
router.post('/admin/announcements', requireAdmin, async (ctx) => {
  try {
    const settings = await readSettings();
    const {
      title,
      content,
      type = 'info',
      priority = 'medium',
      startDate,
      endDate,
      isActive = true
    } = ctx.request.body;

    if (!title || !content) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '标题和内容不能为空'
      };
      return;
    }

    // 生成新的公告ID
    const maxId = settings.announcements.length > 0 
      ? Math.max(...settings.announcements.map(a => a.id))
      : 0;
    
    const newAnnouncement = {
      id: maxId + 1,
      title,
      content,
      type,
      priority,
      startDate: startDate || new Date().toISOString(),
      endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 默认30天后过期
      isActive,
      createdAt: new Date().toISOString()
    };

    settings.announcements.push(newAnnouncement);
    const savedSettings = await writeSettings(settings);

    ctx.body = {
      success: true,
      message: '公告创建成功',
      data: newAnnouncement
    };
  } catch (error) {
    console.error('创建公告失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建公告失败'
    };
  }
});

// 更新公告（需要管理员权限）
router.put('/admin/announcements/:id', requireAdmin, async (ctx) => {
  try {
    const settings = await readSettings();
    const announcementId = parseInt(ctx.params.id);
    const {
      title,
      content,
      type,
      priority,
      startDate,
      endDate,
      isActive
    } = ctx.request.body;

    const announcementIndex = settings.announcements.findIndex(a => a.id === announcementId);
    if (announcementIndex === -1) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '公告不存在'
      };
      return;
    }

    // 更新公告
    const announcement = settings.announcements[announcementIndex];
    settings.announcements[announcementIndex] = {
      ...announcement,
      title: title || announcement.title,
      content: content || announcement.content,
      type: type || announcement.type,
      priority: priority || announcement.priority,
      startDate: startDate || announcement.startDate,
      endDate: endDate || announcement.endDate,
      isActive: isActive !== undefined ? isActive : announcement.isActive
    };

    const savedSettings = await writeSettings(settings);

    ctx.body = {
      success: true,
      message: '公告更新成功',
      data: settings.announcements[announcementIndex]
    };
  } catch (error) {
    console.error('更新公告失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新公告失败'
    };
  }
});

// 删除公告（需要管理员权限）
router.delete('/admin/announcements/:id', requireAdmin, async (ctx) => {
  try {
    const settings = await readSettings();
    const announcementId = parseInt(ctx.params.id);

    const announcementIndex = settings.announcements.findIndex(a => a.id === announcementId);
    if (announcementIndex === -1) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '公告不存在'
      };
      return;
    }

    settings.announcements.splice(announcementIndex, 1);
    const savedSettings = await writeSettings(settings);

    ctx.body = {
      success: true,
      message: '公告删除成功'
    };
  } catch (error) {
    console.error('删除公告失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除公告失败'
    };
  }
});

// 获取有效公告（公开接口）
router.get('/announcements', async (ctx) => {
  try {
    const settings = await readSettings();
    
    // 只返回当前有效的公告
    const activeAnnouncements = settings.announcements.filter(announcement => {
      const now = new Date();
      const startDate = new Date(announcement.startDate);
      const endDate = new Date(announcement.endDate);
      return announcement.isActive && now >= startDate && now <= endDate;
    }).sort((a, b) => {
      // 按优先级和创建时间排序
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    ctx.body = {
      success: true,
      data: activeAnnouncements
    };
  } catch (error) {
    console.error('获取有效公告失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取公告失败'
    };
  }
});

// 上传网站Logo（管理员）
router.post('/admin/upload-logo', requireAdmin, uploadLogo, async (ctx) => {
  try {
    if (!ctx.request.file) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请选择要上传的Logo文件'
      };
      return;
    }

    const settings = await readSettings();
    const oldLogoPath = settings.siteLogo;
    
    // 生成新的Logo路径
    const newLogoPath = `/uploads/logos/${ctx.request.file.filename}`;
    
    // 更新配置
    settings.siteLogo = newLogoPath;
    await writeSettings(settings);
    
    // 删除旧Logo文件
    if (oldLogoPath && oldLogoPath !== newLogoPath) {
      await deleteOldFile(oldLogoPath);
    }

    ctx.body = {
      success: true,
      message: '网站Logo上传成功',
      data: {
        logoPath: newLogoPath,
        filename: ctx.request.file.filename
      }
    };
  } catch (error) {
    console.error('上传Logo失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || '上传Logo失败'
    };
  }
});

// 上传网站Icon（管理员）
router.post('/admin/upload-icon', requireAdmin, uploadIcon, async (ctx) => {
  try {
    if (!ctx.request.file) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请选择要上传的Icon文件'
      };
      return;
    }

    const settings = await readSettings();
    const oldIconPath = settings.siteIcon;
    
    // 生成新的Icon路径
    const newIconPath = `/uploads/icons/${ctx.request.file.filename}`;
    
    // 更新配置
    settings.siteIcon = newIconPath;
    await writeSettings(settings);
    
    // 删除旧Icon文件
    if (oldIconPath && oldIconPath !== newIconPath) {
      await deleteOldFile(oldIconPath);
    }

    ctx.body = {
      success: true,
      message: '网站Icon上传成功',
      data: {
        iconPath: newIconPath,
        filename: ctx.request.file.filename
      }
    };
  } catch (error) {
    console.error('上传Icon失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: error.message || '上传Icon失败'
    };
  }
});

module.exports = router;