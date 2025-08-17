const Router = require('koa-router');
const router = new Router({ prefix: '/api/activation-codes' });
const ActivationCode = require('../models/activationCode');
const Package = require('../models/package');
const User = require('../models/user');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const crypto = require('crypto');
const membershipService = require('../services/membershipService');

// 生成随机激活码
function generateActivationCode(length = 16) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 获取激活码列表
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      package_id,
      batch_id,
      search,
      sort = 'created_at',
      order = 'DESC'
    } = ctx.query;

    const offset = (page - 1) * limit;
    const where = {};

    // 状态筛选
    if (status) {
      where.status = status;
    }

    // 套餐筛选
    if (package_id) {
      where.package_id = package_id;
    }

    // 批次筛选
    if (batch_id) {
      where.batch_id = batch_id;
    }

    // 搜索功能
    if (search) {
      where[Op.or] = [
        { code: { [Op.like]: `%${search}%` } },
        { batch_id: { [Op.like]: `%${search}%` } },
        { notes: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await ActivationCode.findAndCountAll({
      where,
      include: [
        {
          model: Package,
          as: 'package',
          attributes: ['id', 'name', 'credits', 'validity_days', 'price']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sort, order.toUpperCase()]]
    });

    // 获取统计数据
    const [totalCount, usedCount, expiredCount, batchCount] = await Promise.all([
      // 激活码总数
      ActivationCode.count(),
      // 已使用数量
      ActivationCode.count({ where: { status: 'used' } }),
      // 已过期数量
      ActivationCode.count({ where: { status: 'expired' } }),
      // 总批次数
      ActivationCode.count({
        distinct: true,
        col: 'batch_id',
        where: {
          batch_id: {
            [Op.ne]: null
          }
        }
      })
    ]);

    ctx.body = {
      success: true,
      message: '获取激活码列表成功',
      data: {
        codes: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        },
        statistics: {
          total: totalCount,
          used: usedCount,
          expired: expiredCount,
          batches: batchCount
        }
      }
    };
  } catch (error) {
    logger.error('获取激活码列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取激活码列表失败'
    };
  }
});

// 获取单个激活码详情
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const code = await ActivationCode.findByPk(id, {
      include: [
        {
          model: Package,
          as: 'package'
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email'],
          required: false
        }
      ]
    });
    
    if (!code) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '激活码不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '获取激活码详情成功',
      data: code
    };
  } catch (error) {
    logger.error('获取激活码详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取激活码详情失败'
    };
  }
});

// 批量生成激活码
router.post('/generate', async (ctx) => {
  try {
    const {
      package_id,
      quantity = 1,
      expires_at,
      notes
    } = ctx.request.body;

    // 参数验证
    if (!package_id) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少必需参数: package_id'
      };
      return;
    }

    // 验证套餐是否存在
    const package = await Package.findByPk(package_id);
    if (!package) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '套餐不存在'
      };
      return;
    }

    // 验证数量限制
    const maxQuantity = 1000;
    if (quantity > maxQuantity) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: `单次生成数量不能超过 ${maxQuantity}`
      };
      return;
    }

    // 生成批次ID
    const batchId = `BATCH_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const userId = ctx.state.user?.id;

    // 批量生成激活码
    const codes = [];
    for (let i = 0; i < quantity; i++) {
      let code;
      let isUnique = false;
      
      // 确保生成的激活码唯一
      while (!isUnique) {
        code = generateActivationCode();
        const existing = await ActivationCode.findOne({ where: { code } });
        if (!existing) {
          isUnique = true;
        }
      }

      codes.push({
        code,
        package_id,
        batch_id: batchId,
        expires_at: expires_at ? new Date(expires_at) : null,
        created_by: userId,
        notes
      });
    }

    // 批量插入数据库
    const createdCodes = await ActivationCode.bulkCreate(codes);

    logger.info(`批量生成激活码成功，批次: ${batchId}，数量: ${quantity}`);
    
    ctx.body = {
      success: true,
      message: `成功生成 ${quantity} 个激活码`,
      data: {
        batch_id: batchId,
        quantity,
        codes: createdCodes
      }
    };
  } catch (error) {
    logger.error('批量生成激活码失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量生成激活码失败'
    };
  }
});

// 使用激活码
router.post('/activate', async (ctx) => {
  try {
    const { code } = ctx.request.body;
    const userId = ctx.state.user?.id;

    if (!code) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供激活码'
      };
      return;
    }

    // 查找激活码
    const activationCode = await ActivationCode.findOne({
      where: { code },
      include: [{
        model: Package,
        as: 'package'
      }]
    });

    if (!activationCode) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '激活码不存在'
      };
      return;
    }

    // 检查激活码状态
    if (activationCode.status !== 'unused') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '激活码已被使用或已失效'
      };
      return;
    }

    // 检查是否过期
    if (activationCode.expires_at && new Date() > activationCode.expires_at) {
      await activationCode.update({ status: 'expired' });
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '激活码已过期'
      };
      return;
    }

    // 获取用户信息
    const user = await User.findByPk(userId);
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }

    // 使用新的会员系统激活会员
    const userPackageRecord = await membershipService.activateByCode({
      userId: userId,
      activationCode: code,
      userIp: ctx.request.ip,
      userAgent: ctx.request.headers['user-agent']
    });

    logger.info(`激活码使用成功: ${code}, 用户: ${userId}, 获得积分: ${activationCode.package.credits}`);
    
    // 获取用户当前剩余次数
    const remainingCredits = await membershipService.getUserRemainingCredits(userId);
    
    ctx.body = {
      success: true,
      message: '激活码使用成功',
      data: {
        credits_added: activationCode.package.credits,
        remaining_credits: remainingCredits,
        package_info: {
          name: activationCode.package.name,
          credits: activationCode.package.credits,
          validity_days: activationCode.package.validity_days
        }
      }
    };
  } catch (error) {
    logger.error('使用激活码失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '使用激活码失败'
    };
  }
});

// 删除激活码
router.delete('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const code = await ActivationCode.findByPk(id);
    if (!code) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '激活码不存在'
      };
      return;
    }

    await code.destroy();

    logger.info(`激活码删除成功: ${id}`);
    
    ctx.body = {
      success: true,
      message: '激活码删除成功'
    };
  } catch (error) {
    logger.error('删除激活码失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除激活码失败'
    };
  }
});

// 批量删除激活码
router.delete('/', async (ctx) => {
  try {
    const { ids, batch_id } = ctx.request.body;
    
    let where = {};
    
    if (ids && Array.isArray(ids) && ids.length > 0) {
      where.id = { [Op.in]: ids };
    } else if (batch_id) {
      where.batch_id = batch_id;
    } else {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供要删除的激活码ID数组或批次ID'
      };
      return;
    }

    const deletedCount = await ActivationCode.destroy({ where });

    logger.info(`批量删除激活码成功，删除数量: ${deletedCount}`);
    
    ctx.body = {
      success: true,
      message: `批量删除成功，删除了 ${deletedCount} 个激活码`
    };
  } catch (error) {
    logger.error('批量删除激活码失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量删除激活码失败'
    };
  }
});

// 导出激活码（CSV格式）
router.get('/export/:batch_id', async (ctx) => {
  try {
    const { batch_id } = ctx.params;
    
    const codes = await ActivationCode.findAll({
      where: { batch_id },
      include: [{
        model: Package,
        as: 'package',
        attributes: ['name', 'credits', 'validity_days']
      }],
      order: [['created_at', 'ASC']]
    });

    if (codes.length === 0) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '未找到该批次的激活码'
      };
      return;
    }

    // 生成CSV内容
    let csvContent = '激活码,套餐名称,积分数量,有效期(天),状态,创建时间\n';
    
    codes.forEach(code => {
      csvContent += `${code.code},${code.package.name},${code.package.credits},${code.package.validity_days},${code.status},${code.created_at}\n`;
    });

    // 设置响应头
    ctx.set('Content-Type', 'text/csv; charset=utf-8');
    ctx.set('Content-Disposition', `attachment; filename="activation_codes_${batch_id}.csv"`);
    
    ctx.body = '\uFEFF' + csvContent; // 添加BOM以支持中文
  } catch (error) {
    logger.error('导出激活码失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '导出激活码失败'
    };
  }
});

// 获取批次列表
router.get('/batches/list', async (ctx) => {
  try {
    const batches = await ActivationCode.findAll({
      attributes: [
        'batch_id',
        [ActivationCode.sequelize.fn('COUNT', ActivationCode.sequelize.col('id')), 'total_count'],
        [ActivationCode.sequelize.fn('SUM', ActivationCode.sequelize.literal('CASE WHEN status = "unused" THEN 1 ELSE 0 END')), 'unused_count'],
        [ActivationCode.sequelize.fn('SUM', ActivationCode.sequelize.literal('CASE WHEN status = "used" THEN 1 ELSE 0 END')), 'used_count'],
        [ActivationCode.sequelize.fn('MIN', ActivationCode.sequelize.col('created_at')), 'created_at']
      ],
      where: {
        batch_id: { [Op.ne]: null }
      },
      group: ['batch_id'],
      order: [[ActivationCode.sequelize.fn('MIN', ActivationCode.sequelize.col('created_at')), 'DESC']]
    });

    ctx.body = {
      success: true,
      message: '获取批次列表成功',
      data: batches
    };
  } catch (error) {
    logger.error('获取批次列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取批次列表失败'
    };
  }
});

module.exports = router;