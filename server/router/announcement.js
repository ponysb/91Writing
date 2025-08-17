const Router = require('koa-router');
const router = new Router({ prefix: '/api/announcements' });
const Announcement = require('../models/announcement');
const User = require('../models/user');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// 获取公告列表
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      priority,
      target_audience,
      is_pinned,
      is_popup,
      search,
      sort = 'sort_order',
      order = 'DESC'
    } = ctx.query;

    const offset = (page - 1) * limit;
    const where = {};

    // 类型筛选
    if (type) {
      where.type = type;
    }

    // 状态筛选
    if (status) {
      where.status = status;
    } else {
      // 默认只显示已发布的公告（对普通用户）
      if (!ctx.state.user || ctx.state.user.role !== 'admin') {
        where.status = 'published';
        where.publish_time = { [Op.lte]: new Date() };
        where[Op.or] = [
          { expire_time: null },
          { expire_time: { [Op.gte]: new Date() } }
        ];
      }
    }

    // 优先级筛选
    if (priority) {
      where.priority = priority;
    }

    // 目标受众筛选
    if (target_audience) {
      where.target_audience = target_audience;
    } else if (ctx.state.user) {
      // 根据用户角色筛选
      const userRole = ctx.state.user.role;
      if (userRole === 'admin') {
        where.target_audience = { [Op.in]: ['all', 'admin'] };
      } else if (ctx.state.user.is_vip) {
        where.target_audience = { [Op.in]: ['all', 'users', 'vip'] };
      } else {
        where.target_audience = { [Op.in]: ['all', 'users'] };
      }
    } else {
      where.target_audience = 'all';
    }

    // 置顶筛选
    if (is_pinned !== undefined) {
      where.is_pinned = is_pinned === 'true';
    }

    // 弹窗筛选
    if (is_popup !== undefined) {
      where.is_popup = is_popup === 'true';
    }

    // 搜索功能
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Announcement.findAndCountAll({
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
      order: [
        ['is_pinned', 'DESC'],
        [sort, order.toUpperCase()],
        ['created_at', 'DESC']
      ]
    });

    ctx.body = {
      success: true,
      message: '获取公告列表成功',
      data: {
        announcements: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    };
  } catch (error) {
    logger.error('获取公告列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取公告列表失败'
    };
  }
});

// 获取单个公告详情
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const announcement = await Announcement.findByPk(id, {
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
    
    if (!announcement) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '公告不存在'
      };
      return;
    }

    // 检查访问权限
    if (announcement.status !== 'published' && 
        (!ctx.state.user || ctx.state.user.role !== 'admin')) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权访问此公告'
      };
      return;
    }

    // 增加查看次数
    await announcement.increment('view_count');

    ctx.body = {
      success: true,
      message: '获取公告详情成功',
      data: announcement
    };
  } catch (error) {
    logger.error('获取公告详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取公告详情失败'
    };
  }
});

// 创建公告（管理员权限）
router.post('/', async (ctx) => {
  try {
    // 检查管理员权限
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，只有管理员可以创建公告'
      };
      return;
    }

    const {
      title,
      content,
      type = 'notice',
      priority = 'normal',
      status = 'draft',
      is_pinned = false,
      is_popup = false,
      target_audience = 'all',
      publish_time,
      expire_time,
      sort_order = 0,
      tags,
      attachments,
      metadata
    } = ctx.request.body;

    // 参数验证
    if (!title || !content) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少必需参数: title, content'
      };
      return;
    }

    const userId = ctx.state.user.id;

    const announcement = await Announcement.create({
      title,
      content,
      type,
      priority,
      status,
      is_pinned,
      is_popup,
      target_audience,
      publish_time: publish_time ? new Date(publish_time) : (status === 'published' ? new Date() : null),
      expire_time: expire_time ? new Date(expire_time) : null,
      sort_order,
      tags,
      attachments,
      metadata,
      created_by: userId,
      updated_by: userId
    });

    logger.info(`公告创建成功: ${title}`);
    
    ctx.body = {
      success: true,
      message: '公告创建成功',
      data: announcement
    };
  } catch (error) {
    logger.error('创建公告失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建公告失败'
    };
  }
});

// 更新公告（管理员权限）
router.put('/:id', async (ctx) => {
  try {
    // 检查管理员权限
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，只有管理员可以更新公告'
      };
      return;
    }

    const { id } = ctx.params;
    const updateData = ctx.request.body;
    
    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '公告不存在'
      };
      return;
    }

    const userId = ctx.state.user.id;
    updateData.updated_by = userId;

    // 如果状态改为已发布且没有发布时间，设置发布时间
    if (updateData.status === 'published' && !announcement.publish_time && !updateData.publish_time) {
      updateData.publish_time = new Date();
    }

    // 处理时间字段
    if (updateData.publish_time) {
      updateData.publish_time = new Date(updateData.publish_time);
    }
    if (updateData.expire_time) {
      updateData.expire_time = new Date(updateData.expire_time);
    }

    await announcement.update(updateData);

    logger.info(`公告更新成功: ${id}`);
    
    ctx.body = {
      success: true,
      message: '公告更新成功',
      data: announcement
    };
  } catch (error) {
    logger.error('更新公告失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新公告失败'
    };
  }
});

// 删除公告（管理员权限）
router.delete('/:id', async (ctx) => {
  try {
    // 检查管理员权限
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，只有管理员可以删除公告'
      };
      return;
    }

    const { id } = ctx.params;
    
    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '公告不存在'
      };
      return;
    }

    await announcement.destroy();

    logger.info(`公告删除成功: ${id}`);
    
    ctx.body = {
      success: true,
      message: '公告删除成功'
    };
  } catch (error) {
    logger.error('删除公告失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除公告失败'
    };
  }
});

// 批量删除公告（管理员权限）
router.delete('/', async (ctx) => {
  try {
    // 检查管理员权限
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，只有管理员可以删除公告'
      };
      return;
    }

    const { ids } = ctx.request.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供要删除的公告ID数组'
      };
      return;
    }

    const deletedCount = await Announcement.destroy({ 
      where: { 
        id: { [Op.in]: ids } 
      } 
    });

    logger.info(`批量删除公告成功，删除数量: ${deletedCount}`);
    
    ctx.body = {
      success: true,
      message: `批量删除成功，删除了 ${deletedCount} 个公告`
    };
  } catch (error) {
    logger.error('批量删除公告失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量删除公告失败'
    };
  }
});

// 发布公告（管理员权限）
router.post('/:id/publish', async (ctx) => {
  try {
    // 检查管理员权限
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，只有管理员可以发布公告'
      };
      return;
    }

    const { id } = ctx.params;
    
    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '公告不存在'
      };
      return;
    }

    await announcement.update({
      status: 'published',
      publish_time: new Date(),
      updated_by: ctx.state.user.id
    });

    logger.info(`公告发布成功: ${id}`);
    
    ctx.body = {
      success: true,
      message: '公告发布成功',
      data: announcement
    };
  } catch (error) {
    logger.error('发布公告失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '发布公告失败'
    };
  }
});

// 归档公告（管理员权限）
router.post('/:id/archive', async (ctx) => {
  try {
    // 检查管理员权限
    if (!ctx.state.user || ctx.state.user.role !== 'admin') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，只有管理员可以归档公告'
      };
      return;
    }

    const { id } = ctx.params;
    
    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '公告不存在'
      };
      return;
    }

    await announcement.update({
      status: 'archived',
      updated_by: ctx.state.user.id
    });

    logger.info(`公告归档成功: ${id}`);
    
    ctx.body = {
      success: true,
      message: '公告归档成功',
      data: announcement
    };
  } catch (error) {
    logger.error('归档公告失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '归档公告失败'
    };
  }
});

// 获取弹窗公告
router.get('/popup/list', async (ctx) => {
  try {
    const where = {
      status: 'published',
      is_popup: true,
      publish_time: { [Op.lte]: new Date() }
    };

    // 检查过期时间
    where[Op.or] = [
      { expire_time: null },
      { expire_time: { [Op.gte]: new Date() } }
    ];

    // 根据用户角色筛选
    if (ctx.state.user) {
      const userRole = ctx.state.user.role;
      if (userRole === 'admin') {
        where.target_audience = { [Op.in]: ['all', 'admin'] };
      } else if (ctx.state.user.is_vip) {
        where.target_audience = { [Op.in]: ['all', 'users', 'vip'] };
      } else {
        where.target_audience = { [Op.in]: ['all', 'users'] };
      }
    } else {
      where.target_audience = 'all';
    }

    const announcements = await Announcement.findAll({
      where,
      attributes: ['id', 'title', 'content', 'type', 'priority', 'publish_time'],
      order: [
        ['priority', 'DESC'],
        ['publish_time', 'DESC']
      ],
      limit: 5 // 最多显示5个弹窗公告
    });

    ctx.body = {
      success: true,
      message: '获取弹窗公告成功',
      data: announcements
    };
  } catch (error) {
    logger.error('获取弹窗公告失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取弹窗公告失败'
    };
  }
});

module.exports = router;