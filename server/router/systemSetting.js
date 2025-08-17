const Router = require('koa-router');
const router = new Router({ prefix: '/api/system-settings' });
const SystemSetting = require('../models/systemSetting');
const User = require('../models/user');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// 获取系统设置列表
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 50,
      category,
      type,
      is_public,
      group_name,
      search,
      sort = 'sort_order',
      order = 'ASC'
    } = ctx.query;

    const offset = (page - 1) * limit;
    const where = {};

    // 非管理员只能查看公开设置
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      where.is_public = true;
    } else if (is_public !== undefined) {
      where.is_public = is_public === 'true';
    }

    // 分类筛选
    if (category) {
      where.category = category;
    }

    // 类型筛选
    if (type) {
      where.type = type;
    }

    // 分组筛选
    if (group_name) {
      where.group_name = group_name;
    }

    // 搜索功能
    if (search) {
      where[Op.or] = [
        { key: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await SystemSetting.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'nickname'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]]
    });

    ctx.body = {
      success: true,
      message: '获取系统设置列表成功',
      data: {
        settings: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    };
  } catch (error) {
    logger.error('获取系统设置列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取系统设置列表失败'
    };
  }
});

// 获取单个系统设置
router.get('/:key', async (ctx) => {
  try {
    const { key } = ctx.params;
    
    const setting = await SystemSetting.findOne({
      where: { key },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'nickname'],
          required: false
        },
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'username', 'nickname'],
          required: false
        }
      ]
    });
    
    if (!setting) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '系统设置不存在'
      };
      return;
    }

    // 检查访问权限
    if (!setting.is_public && (!ctx.state.user || ctx.state.user.role !== 'admin')) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权访问此设置'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '获取系统设置成功',
      data: setting
    };
  } catch (error) {
    logger.error('获取系统设置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取系统设置失败'
    };
  }
});

// 创建系统设置（管理员权限）
router.post('/', async (ctx) => {
  try {
    // 检查管理员权限
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，只有管理员可以创建系统设置'
      };
      return;
    }

    const {
      key,
      value,
      type = 'string',
      category = 'general',
      name,
      description,
      default_value,
      validation_rules,
      options,
      is_public = false,
      is_required = false,
      is_readonly = false,
      sort_order = 0,
      group_name
    } = ctx.request.body;

    // 参数验证
    if (!key || !name) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少必需参数: key, name'
      };
      return;
    }

    // 检查键名是否已存在
    const existingSetting = await SystemSetting.findOne({ where: { key } });
    if (existingSetting) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '设置键名已存在'
      };
      return;
    }

    const userId = ctx.state.user.id;

    const setting = await SystemSetting.create({
      key,
      value,
      type,
      category,
      name,
      description,
      default_value,
      validation_rules,
      options,
      is_public,
      is_required,
      is_readonly,
      sort_order,
      group_name,
      created_by: userId,
      updated_by: userId
    });

    logger.info(`系统设置创建成功: ${key}`);
    
    ctx.body = {
      success: true,
      message: '系统设置创建成功',
      data: setting
    };
  } catch (error) {
    logger.error('创建系统设置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建系统设置失败'
    };
  }
});

// 更新系统设置
router.put('/:key', async (ctx) => {
  try {
    const { key } = ctx.params;
    const updateData = ctx.request.body;
    
    const setting = await SystemSetting.findOne({ where: { key } });
    if (!setting) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '系统设置不存在'
      };
      return;
    }

    // 检查权限
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      // 非管理员只能更新公开且非只读的设置
      if (!setting.is_public || setting.is_readonly) {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '权限不足'
        };
        return;
      }
      // 非管理员只能更新value字段
      updateData = { value: updateData.value };
    }

    // 检查只读设置
    if (setting.is_readonly && !ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '此设置为只读，无法修改'
      };
      return;
    }

    const userId = ctx.state.user?.id;
    if (userId) {
      updateData.updated_by = userId;
    }

    await setting.update(updateData);

    logger.info(`系统设置更新成功: ${key}`);
    
    ctx.body = {
      success: true,
      message: '系统设置更新成功',
      data: setting
    };
  } catch (error) {
    logger.error('更新系统设置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新系统设置失败'
    };
  }
});

// 删除系统设置（管理员权限）
router.delete('/:key', async (ctx) => {
  try {
    // 检查管理员权限
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，只有管理员可以删除系统设置'
      };
      return;
    }

    const { key } = ctx.params;
    
    const setting = await SystemSetting.findOne({ where: { key } });
    if (!setting) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '系统设置不存在'
      };
      return;
    }

    // 检查是否为必需设置
    if (setting.is_required) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '此设置为必需设置，无法删除'
      };
      return;
    }

    await setting.destroy();

    logger.info(`系统设置删除成功: ${key}`);
    
    ctx.body = {
      success: true,
      message: '系统设置删除成功'
    };
  } catch (error) {
    logger.error('删除系统设置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除系统设置失败'
    };
  }
});

// 批量更新系统设置
router.put('/', async (ctx) => {
  try {
    const { settings } = ctx.request.body;
    
    if (!settings || !Array.isArray(settings) || settings.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供要更新的设置数组'
      };
      return;
    }

    const userId = ctx.state.user?.id;
    const results = [];

    for (const settingData of settings) {
      try {
        const { key, value } = settingData;
        if (!key) continue;

        const setting = await SystemSetting.findOne({ where: { key } });
        if (!setting) {
          results.push({ key, success: false, message: '设置不存在' });
          continue;
        }

        // 检查权限
        if (!ctx.state.user || ctx.state.user.role !== 'admin') {
          if (!setting.is_public || setting.is_readonly) {
            results.push({ key, success: false, message: '权限不足' });
            continue;
          }
        }

        await setting.update({
          value,
          updated_by: userId
        });

        results.push({ key, success: true, message: '更新成功' });
      } catch (error) {
        results.push({ key: settingData.key, success: false, message: error.message });
      }
    }

    logger.info(`批量更新系统设置完成，成功: ${results.filter(r => r.success).length}，失败: ${results.filter(r => !r.success).length}`);
    
    ctx.body = {
      success: true,
      message: '批量更新完成',
      data: results
    };
  } catch (error) {
    logger.error('批量更新系统设置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量更新系统设置失败'
    };
  }
});

// 获取分类列表
router.get('/categories/list', async (ctx) => {
  try {
    const where = {};
    
    // 非管理员只能查看公开设置的分类
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      where.is_public = true;
    }

    const categories = await SystemSetting.findAll({
      where,
      attributes: ['category'],
      group: ['category'],
      order: [['category', 'ASC']]
    });

    const categoryList = categories.map(item => item.category);

    ctx.body = {
      success: true,
      message: '获取分类列表成功',
      data: categoryList
    };
  } catch (error) {
    logger.error('获取分类列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取分类列表失败'
    };
  }
});

// 获取分组列表
router.get('/groups/list', async (ctx) => {
  try {
    const { category } = ctx.query;
    const where = {};
    
    // 非管理员只能查看公开设置的分组
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      where.is_public = true;
    }

    if (category) {
      where.category = category;
    }

    const groups = await SystemSetting.findAll({
      where: {
        ...where,
        group_name: { [Op.ne]: null }
      },
      attributes: ['group_name'],
      group: ['group_name'],
      order: [['group_name', 'ASC']]
    });

    const groupList = groups.map(item => item.group_name);

    ctx.body = {
      success: true,
      message: '获取分组列表成功',
      data: groupList
    };
  } catch (error) {
    logger.error('获取分组列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取分组列表失败'
    };
  }
});

// 获取公开设置（用于前端配置）
router.get('/public/config', async (ctx) => {
  try {
    const settings = await SystemSetting.findAll({
      where: {
        is_public: true
      },
      attributes: ['key', 'value', 'type'],
      order: [['sort_order', 'ASC']]
    });

    // 转换为键值对格式
    const config = {};
    settings.forEach(setting => {
      let value = setting.value;
      
      // 根据类型转换值
      switch (setting.type) {
        case 'number':
          value = parseFloat(value) || 0;
          break;
        case 'boolean':
          value = value === 'true' || value === true;
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch (e) {
            value = null;
          }
          break;
        default:
          // string, text, url, email, color, file 保持原值
          break;
      }
      
      config[setting.key] = value;
    });

    ctx.body = {
      success: true,
      message: '获取公开配置成功',
      data: config
    };
  } catch (error) {
    logger.error('获取公开配置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取公开配置失败'
    };
  }
});

// 重置设置为默认值（管理员权限）
router.post('/:key/reset', async (ctx) => {
  try {
    // 检查管理员权限
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，只有管理员可以重置设置'
      };
      return;
    }

    const { key } = ctx.params;
    
    const setting = await SystemSetting.findOne({ where: { key } });
    if (!setting) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '系统设置不存在'
      };
      return;
    }

    await setting.update({
      value: setting.default_value,
      updated_by: ctx.state.user.id
    });

    logger.info(`系统设置重置成功: ${key}`);
    
    ctx.body = {
      success: true,
      message: '设置重置成功',
      data: setting
    };
  } catch (error) {
    logger.error('重置系统设置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '重置系统设置失败'
    };
  }
});

module.exports = router;