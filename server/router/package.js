const Router = require('koa-router');
const router = new Router({ prefix: '/api/packages' });
const Package = require('../models/package');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// 获取套餐列表
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      search,
      sort = 'sort_order',
      order = 'ASC'
    } = ctx.query;

    const offset = (page - 1) * limit;
    const where = {};

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 类型筛选
    if (type) {
      where.type = type;
    }

    // 搜索功能
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Package.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]]
    });

    ctx.body = {
      success: true,
      message: '获取套餐列表成功',
      data: {
        packages: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    };
  } catch (error) {
    logger.error('获取套餐列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取套餐列表失败'
    };
  }
});

// 获取单个套餐详情
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const package = await Package.findByPk(id);
    
    if (!package) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '套餐不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '获取套餐详情成功',
      data: package
    };
  } catch (error) {
    logger.error('获取套餐详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取套餐详情失败'
    };
  }
});

// 创建套餐
router.post('/', async (ctx) => {
  try {
    const {
      name,
      description,
      credits,
      validity_days,
      price,
      original_price,
      discount,
      type = 'basic',
      features,
      max_activations,
      status = 'active',
      sort_order = 0,
      is_popular = false
    } = ctx.request.body;

    // 参数验证
    if (!name || !credits || !validity_days || !price) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少必需参数: name, credits, validity_days, price'
      };
      return;
    }

    // 检查套餐名称是否已存在
    const existingPackage = await Package.findOne({ where: { name } });
    if (existingPackage) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '套餐名称已存在'
      };
      return;
    }

    const newPackage = await Package.create({
      name,
      description,
      credits: parseInt(credits),
      validity_days: parseInt(validity_days),
      price: parseFloat(price),
      original_price: original_price ? parseFloat(original_price) : null,
      discount: discount ? parseFloat(discount) : null,
      type,
      features,
      max_activations: max_activations ? parseInt(max_activations) : null,
      status,
      sort_order: parseInt(sort_order),
      is_popular: Boolean(is_popular)
    });

    logger.info(`套餐创建成功: ${newPackage.id}`);
    
    ctx.body = {
      success: true,
      message: '套餐创建成功',
      data: newPackage
    };
  } catch (error) {
    logger.error('创建套餐失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建套餐失败'
    };
  }
});

// 更新套餐
router.put('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const updateData = ctx.request.body;

    const package = await Package.findByPk(id);
    if (!package) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '套餐不存在'
      };
      return;
    }

    // 如果更新名称，检查是否重复
    if (updateData.name && updateData.name !== package.name) {
      const existingPackage = await Package.findOne({ 
        where: { 
          name: updateData.name,
          id: { [Op.ne]: id }
        } 
      });
      if (existingPackage) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '套餐名称已存在'
        };
        return;
      }
    }

    // 数据类型转换
    if (updateData.credits) updateData.credits = parseInt(updateData.credits);
    if (updateData.validity_days) updateData.validity_days = parseInt(updateData.validity_days);
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.original_price) updateData.original_price = parseFloat(updateData.original_price);
    if (updateData.discount) updateData.discount = parseFloat(updateData.discount);
    if (updateData.max_activations) updateData.max_activations = parseInt(updateData.max_activations);
    if (updateData.sort_order) updateData.sort_order = parseInt(updateData.sort_order);
    if (updateData.is_popular !== undefined) updateData.is_popular = Boolean(updateData.is_popular);

    await package.update(updateData);

    logger.info(`套餐更新成功: ${id}`);
    
    ctx.body = {
      success: true,
      message: '套餐更新成功',
      data: package
    };
  } catch (error) {
    logger.error('更新套餐失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新套餐失败'
    };
  }
});

// 删除套餐
router.delete('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const package = await Package.findByPk(id);
    if (!package) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '套餐不存在'
      };
      return;
    }

    await package.destroy();

    logger.info(`套餐删除成功: ${id}`);
    
    ctx.body = {
      success: true,
      message: '套餐删除成功'
    };
  } catch (error) {
    logger.error('删除套餐失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除套餐失败'
    };
  }
});

// 批量删除套餐
router.delete('/', async (ctx) => {
  try {
    const { ids } = ctx.request.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供要删除的套餐ID数组'
      };
      return;
    }

    const deletedCount = await Package.destroy({
      where: {
        id: {
          [Op.in]: ids
        }
      }
    });

    logger.info(`批量删除套餐成功，删除数量: ${deletedCount}`);
    
    ctx.body = {
      success: true,
      message: `批量删除成功，删除了 ${deletedCount} 个套餐`
    };
  } catch (error) {
    logger.error('批量删除套餐失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量删除套餐失败'
    };
  }
});

// 获取可用套餐列表（前端展示用）
router.get('/public/available', async (ctx) => {
  try {
    const packages = await Package.findAll({
      where: {
        status: 'active'
      },
      order: [['sort_order', 'ASC'], ['created_at', 'DESC']]
    });

    ctx.body = {
      success: true,
      message: '获取可用套餐列表成功',
      data: packages
    };
  } catch (error) {
    logger.error('获取可用套餐列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取可用套餐列表失败'
    };
  }
});

module.exports = router;