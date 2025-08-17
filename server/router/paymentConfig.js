const Router = require('koa-router');
const router = new Router();
const PaymentConfig = require('../models/paymentConfig');
const { Op } = require('sequelize');

// 获取支付配置列表
router.get('/api/payment-configs', async (ctx) => {
  try {
    const { status, page = 1, limit = 10 } = ctx.query;
    
    const whereCondition = {};
    if (status !== undefined) {
      whereCondition.status = parseInt(status);
    }
    
    const offset = (page - 1) * limit;
    
    const { count, rows } = await PaymentConfig.findAndCountAll({
      where: whereCondition,
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
      limit: parseInt(limit),
      offset: offset
    });
    
    ctx.body = {
      success: true,
      data: {
        list: rows,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    };
  } catch (error) {
    console.error('获取支付配置列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取支付配置列表失败',
      error: error.message
    };
  }
});

// 获取启用的支付配置列表
router.get('/api/payment-configs/enabled', async (ctx) => {
  try {
    const configs = await PaymentConfig.findAll({
      where: { status: 1 },
      order: [['sort_order', 'ASC'], ['id', 'ASC']]
    });
    
    ctx.body = {
      success: true,
      data: configs
    };
  } catch (error) {
    console.error('获取启用支付配置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取启用支付配置失败',
      error: error.message
    };
  }
});

// 获取单个支付配置详情
router.get('/api/payment-configs/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const config = await PaymentConfig.findByPk(id);
    
    if (!config) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '支付配置不存在'
      };
      return;
    }
    
    ctx.body = {
      success: true,
      data: config
    };
  } catch (error) {
    console.error('获取支付配置详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取支付配置详情失败',
      error: error.message
    };
  }
});

// 创建支付配置
router.post('/api/payment-configs', async (ctx) => {
  try {
    const { name, code, config, status = 1, sort_order = 0, description } = ctx.request.body;
    
    // 验证必填字段
    if (!name || !code || !config) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '名称、代码和配置信息为必填项'
      };
      return;
    }
    
    // 检查代码是否已存在
    const existingConfig = await PaymentConfig.findOne({ where: { code } });
    if (existingConfig) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '支付配置代码已存在'
      };
      return;
    }
    
    const newConfig = await PaymentConfig.create({
      name,
      code,
      config: typeof config === 'string' ? config : JSON.stringify(config),
      status,
      sort_order,
      description
    });
    
    ctx.status = 201;
    ctx.body = {
      success: true,
      data: newConfig,
      message: '支付配置创建成功'
    };
  } catch (error) {
    console.error('创建支付配置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建支付配置失败',
      error: error.message
    };
  }
});

// 更新支付配置
router.put('/api/payment-configs/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const { name, code, config, status, sort_order, description } = ctx.request.body;
    
    const existingConfig = await PaymentConfig.findByPk(id);
    if (!existingConfig) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '支付配置不存在'
      };
      return;
    }
    
    // 如果更新代码，检查是否与其他记录冲突
    if (code && code !== existingConfig.code) {
      const duplicateConfig = await PaymentConfig.findOne({
        where: {
          code,
          id: { [Op.ne]: id }
        }
      });
      if (duplicateConfig) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '支付渠道代码已存在'
        };
        return;
      }
    }
    
    // 验证config是否为有效JSON
    let configData;
    if (config) {
      try {
        configData = typeof config === 'string' ? JSON.parse(config) : config;
      } catch (error) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '配置信息格式错误，必须为有效的JSON格式'
        };
        return;
      }
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (config !== undefined) updateData.config = configData;
    if (status !== undefined) updateData.status = parseInt(status);
    if (sort_order !== undefined) updateData.sort_order = parseInt(sort_order);
    if (description !== undefined) updateData.description = description;
    
    await existingConfig.update(updateData);
    
    ctx.body = {
      success: true,
      message: '支付配置更新成功',
      data: existingConfig
    };
  } catch (error) {
    console.error('更新支付配置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新支付配置失败',
      error: error.message
    };
  }
});

// 删除支付配置
router.delete('/api/payment-configs/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const config = await PaymentConfig.findByPk(id);
    if (!config) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '支付配置不存在'
      };
      return;
    }
    
    await config.destroy();
    
    ctx.body = {
      success: true,
      message: '支付配置删除成功'
    };
  } catch (error) {
    console.error('删除支付配置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除支付配置失败',
      error: error.message
    };
  }
});

// 切换支付配置状态
router.patch('/api/payment-configs/:id/toggle-status', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const config = await PaymentConfig.findByPk(id);
    if (!config) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '支付配置不存在'
      };
      return;
    }
    
    // 切换状态
    const newStatus = config.status === 1 ? 0 : 1;
    await config.update({ status: newStatus });
    
    ctx.body = {
      success: true,
      data: config,
      message: `支付配置已${newStatus === 1 ? '启用' : '禁用'}`
    };
  } catch (error) {
    console.error('切换支付配置状态失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '切换支付配置状态失败',
      error: error.message
    };
  }
});

module.exports = router;