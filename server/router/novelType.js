const Router = require('koa-router');
const router = new Router({ prefix: '/api/novel-types' });
const NovelType = require('../models/novelType');
const User = require('../models/user');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

// 获取小说类型列表
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      is_active,
      is_featured,
      difficulty_level,
      search,
      sort = 'sort_order',
      order = 'ASC'
    } = ctx.query;

    const offset = (page - 1) * limit;
    const where = {};

    // 状态筛选
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }

    // 推荐筛选
    if (is_featured !== undefined) {
      where.is_featured = is_featured === 'true';
    }

    // 难度等级筛选
    if (difficulty_level) {
      where.difficulty_level = difficulty_level;
    }

    // 搜索功能
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { target_audience: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await NovelType.findAndCountAll({
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
      message: '获取小说类型列表成功',
      data: {
        types: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(count / limit)
        }
      }
    };
  } catch (error) {
    logger.error('获取小说类型列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取小说类型列表失败'
    };
  }
});

// 获取单个小说类型详情
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const novelType = await NovelType.findByPk(id, {
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
    
    if (!novelType) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '小说类型不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '获取小说类型详情成功',
      data: novelType
    };
  } catch (error) {
    logger.error('获取小说类型详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取小说类型详情失败'
    };
  }
});

// 创建小说类型
router.post('/', async (ctx) => {
  try {
    const {
      name,
      description,
      prompt_template,
      writing_guidelines,
      character_guidelines,
      plot_guidelines,
      worldview_guidelines,
      style_keywords,
      common_themes,
      target_audience,
      difficulty_level = 'intermediate',
      typical_length,
      color_code,
      icon,
      sort_order = 0,
      is_active = true,
      is_featured = false
    } = ctx.request.body;

    // 参数验证
    if (!name) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '缺少必需参数: name'
      };
      return;
    }

    // 检查名称是否已存在
    const existingType = await NovelType.findOne({ where: { name } });
    if (existingType) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '小说类型名称已存在'
      };
      return;
    }

    const userId = ctx.state.user?.id;

    const novelType = await NovelType.create({
      name,
      description,
      prompt_template,
      writing_guidelines,
      character_guidelines,
      plot_guidelines,
      worldview_guidelines,
      style_keywords,
      common_themes,
      target_audience,
      difficulty_level,
      typical_length,
      color_code,
      icon,
      sort_order,
      is_active,
      is_featured,
      created_by: userId,
      updated_by: userId
    });

    logger.info(`小说类型创建成功: ${name}`);
    
    ctx.body = {
      success: true,
      message: '小说类型创建成功',
      data: novelType
    };
  } catch (error) {
    logger.error('创建小说类型失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建小说类型失败'
    };
  }
});

// 更新小说类型
router.put('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const updateData = ctx.request.body;
    
    const novelType = await NovelType.findByPk(id);
    if (!novelType) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '小说类型不存在'
      };
      return;
    }

    // 如果更新名称，检查是否重复
    if (updateData.name && updateData.name !== novelType.name) {
      const existingType = await NovelType.findOne({ 
        where: { 
          name: updateData.name,
          id: { [Op.ne]: id }
        } 
      });
      if (existingType) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '小说类型名称已存在'
        };
        return;
      }
    }

    const userId = ctx.state.user?.id;
    updateData.updated_by = userId;

    await novelType.update(updateData);

    logger.info(`小说类型更新成功: ${id}`);
    
    ctx.body = {
      success: true,
      message: '小说类型更新成功',
      data: novelType
    };
  } catch (error) {
    logger.error('更新小说类型失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新小说类型失败'
    };
  }
});

// 删除小说类型
router.delete('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const novelType = await NovelType.findByPk(id);
    if (!novelType) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '小说类型不存在'
      };
      return;
    }

    // 检查是否有小说使用此类型
    const Novel = require('../models/novel');
    const novelCount = await Novel.count({ where: { novel_type_id: id } });
    if (novelCount > 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: `无法删除，还有 ${novelCount} 部小说使用此类型`
      };
      return;
    }

    await novelType.destroy();

    logger.info(`小说类型删除成功: ${id}`);
    
    ctx.body = {
      success: true,
      message: '小说类型删除成功'
    };
  } catch (error) {
    logger.error('删除小说类型失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除小说类型失败'
    };
  }
});

// 批量删除小说类型
router.delete('/', async (ctx) => {
  try {
    const { ids } = ctx.request.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供要删除的小说类型ID数组'
      };
      return;
    }

    // 检查是否有小说使用这些类型
    const Novel = require('../models/novel');
    const novelCount = await Novel.count({ 
      where: { 
        novel_type_id: { [Op.in]: ids } 
      } 
    });
    
    if (novelCount > 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: `无法删除，还有 ${novelCount} 部小说使用这些类型`
      };
      return;
    }

    const deletedCount = await NovelType.destroy({ 
      where: { 
        id: { [Op.in]: ids } 
      } 
    });

    logger.info(`批量删除小说类型成功，删除数量: ${deletedCount}`);
    
    ctx.body = {
      success: true,
      message: `批量删除成功，删除了 ${deletedCount} 个小说类型`
    };
  } catch (error) {
    logger.error('批量删除小说类型失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量删除小说类型失败'
    };
  }
});

// 获取可用小说类型列表（简化版）
router.get('/available/list', async (ctx) => {
  try {
    const types = await NovelType.findAll({
      where: {
        is_active: true
      },
      attributes: [
        'id', 
        'name', 
        'description', 
        'difficulty_level', 
        'target_audience',
        'color_code',
        'icon',
        'is_featured'
      ],
      order: [['sort_order', 'ASC'], ['name', 'ASC']]
    });

    ctx.body = {
      success: true,
      message: '获取可用小说类型列表成功',
      data: types
    };
  } catch (error) {
    logger.error('获取可用小说类型列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取可用小说类型列表失败'
    };
  }
});

// 获取小说类型的提示词模板
router.get('/:id/prompt', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const novelType = await NovelType.findByPk(id, {
      attributes: [
        'id',
        'name',
        'prompt_template',
        'writing_guidelines',
        'character_guidelines',
        'plot_guidelines',
        'worldview_guidelines',
        'style_keywords',
        'common_themes'
      ]
    });
    
    if (!novelType) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '小说类型不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      message: '获取小说类型提示词成功',
      data: novelType
    };
  } catch (error) {
    logger.error('获取小说类型提示词失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取小说类型提示词失败'
    };
  }
});

// 增加小说类型使用次数
router.post('/:id/usage', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const novelType = await NovelType.findByPk(id);
    if (!novelType) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '小说类型不存在'
      };
      return;
    }

    await novelType.increment('usage_count');

    ctx.body = {
      success: true,
      message: '使用次数更新成功'
    };
  } catch (error) {
    logger.error('更新使用次数失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新使用次数失败'
    };
  }
});

module.exports = router;