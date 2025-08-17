const Router = require('koa-router');
const router = new Router({
  prefix: '/api/worldviews'
});

// 批量创建世界观
router.post('/batch', async (ctx) => {
  try {
    const { worldviews, novel_id } = ctx.request.body;

    // 验证必填字段
    if (!worldviews || !Array.isArray(worldviews) || worldviews.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供要创建的世界观列表'
      };
      return;
    }

    if (!novel_id) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '小说ID为必填项'
      };
      return;
    }

    if (worldviews.length > 20) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '单次最多创建20个世界观'
      };
      return;
    }

    // 验证小说是否存在且用户有权限
    const novel = await Novel.findOne({
      where: {
        id: novel_id,
        user_id: ctx.state.user.id
      }
    });

    if (!novel) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '小说不存在或无权限访问'
      };
      return;
    }

    // 验证每个世界观的必填字段
    const validationErrors = [];
    const worldviewNames = [];
    
    for (let i = 0; i < worldviews.length; i++) {
      const worldview = worldviews[i];
      
      if (!worldview.name) {
        validationErrors.push(`第${i + 1}个世界观缺少名称`);
      } else {
        // 检查批量数据中是否有重名
        if (worldviewNames.includes(worldview.name)) {
          validationErrors.push(`第${i + 1}个世界观名称"${worldview.name}"在批量数据中重复`);
        } else {
          worldviewNames.push(worldview.name);
        }
      }
    }

    if (validationErrors.length > 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '数据验证失败',
        errors: validationErrors
      };
      return;
    }

    // 检查数据库中是否已存在同名世界观
    const existingWorldviews = await Worldview.findAll({
      where: {
        name: { [Op.in]: worldviewNames },
        novel_id,
        user_id: ctx.state.user.id
      },
      attributes: ['name']
    });

    if (existingWorldviews.length > 0) {
      const existingNames = existingWorldviews.map(w => w.name);
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '以下世界观名称已存在',
        existing_names: existingNames
      };
      return;
    }

    // 准备批量创建的数据
    const worldviewsToCreate = worldviews.map(worldview => {
      const data = {
        name: worldview.name,
        description: worldview.description,
        world_type: worldview.type || 'fantasy',
        geography: worldview.geography,
        climate: worldview.climate,
        history: worldview.history,
        culture: worldview.culture,
        society: worldview.society,
        politics: worldview.politics,
        economy: worldview.economy,
        technology: worldview.technology,
        magic_system: worldview.magic_system,
        power_system: worldview.power_system,
        races: worldview.races ? JSON.stringify(worldview.races) : null,
        organizations: worldview.organizations ? JSON.stringify(worldview.organizations) : null,
        locations: worldview.locations ? JSON.stringify(worldview.locations) : null,
        languages: worldview.languages ? JSON.stringify(worldview.languages) : null,
        religions: worldview.religions ? JSON.stringify(worldview.religions) : null,
        laws_rules: worldview.laws,
        special_elements: worldview.special_elements ? JSON.stringify(worldview.special_elements) : null,
        timeline: worldview.timeline ? JSON.stringify(worldview.timeline) : null,
        conflicts: typeof worldview.conflicts === 'object' && worldview.conflicts !== null ? JSON.stringify(worldview.conflicts) : worldview.conflicts,
        themes: worldview.themes ? JSON.stringify(worldview.themes) : null,
        inspiration_sources: worldview.inspiration_sources ? JSON.stringify(worldview.inspiration_sources) : null,
        visual_style: worldview.visual_style,
        mood_tone: worldview.emotional_tone,
        complexity_level: worldview.complexity_level || 1,
        completeness: worldview.completeness_level || 0,
        tags: worldview.tags ? JSON.stringify(worldview.tags) : null,
        notes: worldview.notes,
        novel_id,
        user_id: ctx.state.user.id
      };
      
      // 移除undefined值
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });
      
      return data;
    });

    // 调试：打印要创建的数据
    console.log('准备批量创建的世界观数据:', JSON.stringify(worldviewsToCreate, null, 2));
    
    // 批量创建世界观
    const createdWorldviews = await Worldview.bulkCreate(worldviewsToCreate, {
      returning: true
    });

    ctx.status = 201;
    ctx.body = {
      success: true,
      message: `成功创建${createdWorldviews.length}个世界观`,
      data: {
        created_count: createdWorldviews.length,
        worldviews: createdWorldviews
      }
    };

  } catch (error) {
    console.error('批量创建世界观失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误',
      error: error.message
    };
  }
});
const Worldview = require('../models/worldview');
const Novel = require('../models/novel');
const User = require('../models/user');
// 认证中间件已在app.js中全局处理
const { Op } = require('sequelize');

// 创建世界观
router.post('/', async (ctx) => {
  try {
    const {
      name, description, type, geography, climate, history, culture,
      society, politics, economy, technology, magic_system, power_system,
      races, organizations, locations, languages, religions, laws,
      special_elements, timeline, conflicts, themes, inspiration_sources,
      visual_style, emotional_tone, complexity_level, completeness_level,
      tags, notes, novel_id
    } = ctx.request.body;

    // 验证必填字段
    if (!name || !novel_id) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '世界观名称和小说ID为必填项'
      };
      return;
    }

    // 验证小说是否存在且属于当前用户
    const novel = await Novel.findOne({
      where: {
        id: novel_id,
        user_id: ctx.state.user.id
      }
    });

    if (!novel) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '小说不存在或无权限访问'
      };
      return;
    }

    // 检查同一小说下是否已存在同名世界观
    const existingWorldview = await Worldview.findOne({
      where: {
        name,
        novel_id,
        user_id: ctx.state.user.id
      }
    });

    if (existingWorldview) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '该小说下已存在同名世界观'
      };
      return;
    }

    const worldview = await Worldview.create({
      name, description, type, geography, climate, history, culture,
      society, politics, economy, technology, magic_system, power_system,
      races, organizations, locations, languages, religions, laws,
      special_elements, timeline, conflicts, themes, inspiration_sources,
      visual_style, emotional_tone, complexity_level, completeness_level,
      tags, notes, novel_id,
      user_id: ctx.state.user.id
    });

    // 返回创建的世界观（包含关联的小说信息）
    const createdWorldview = await Worldview.findByPk(worldview.id, {
      include: [{
        model: Novel,
        as: 'novel',
        attributes: ['id', 'title']
      }]
    });

    ctx.status = 201;
    ctx.body = {
      success: true,
      message: '世界观创建成功',
      data: createdWorldview
    };
  } catch (error) {
    console.error('创建世界观失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 获取世界观列表
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      novel_id,
      type,
      search,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = ctx.query;

    const offset = (page - 1) * limit;
    const whereCondition = {
      user_id: ctx.state.user.id
    };

    // 按小说筛选
    if (novel_id) {
      whereCondition.novel_id = novel_id;
    }

    // 按类型筛选
    if (type) {
      whereCondition.type = type;
    }

    // 搜索功能
    if (search) {
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Worldview.findAndCountAll({
      where: whereCondition,
      include: [{
        model: Novel,
        as: 'novel',
        attributes: ['id', 'title']
      }],
      order: [[sort_by, sort_order.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    ctx.body = {
      success: true,
      data: {
        worldviews: rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_count: count,
          per_page: parseInt(limit)
        }
      }
    };
  } catch (error) {
    console.error('获取世界观列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 获取世界观详情
router.get('/:id', async (ctx) => {
  try {
    const worldview = await Worldview.findOne({
      where: {
        id: ctx.params.id,
        user_id: ctx.state.user.id
      },
      include: [{
        model: Novel,
        as: 'novel',
        attributes: ['id', 'title']
      }]
    });

    if (!worldview) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '世界观不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      data: worldview
    };
  } catch (error) {
    console.error('获取世界观详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 更新世界观
router.put('/:id', async (ctx) => {
  try {
    const {
      name, description, type, geography, climate, history, culture,
      society, politics, economy, technology, magic_system, power_system,
      races, organizations, locations, languages, religions, laws,
      special_elements, timeline, conflicts, themes, inspiration_sources,
      visual_style, emotional_tone, complexity_level, completeness_level,
      tags, notes
    } = ctx.request.body;

    const worldview = await Worldview.findOne({
      where: {
        id: ctx.params.id,
        user_id: ctx.state.user.id
      }
    });

    if (!worldview) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '世界观不存在'
      };
      return;
    }

    // 如果更新名称，检查是否与同一小说下的其他世界观重名
    if (name && name !== worldview.name) {
      const existingWorldview = await Worldview.findOne({
        where: {
          name,
          novel_id: worldview.novel_id,
          user_id: ctx.state.user.id,
          id: { [Op.ne]: ctx.params.id }
        }
      });

      if (existingWorldview) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '该小说下已存在同名世界观'
        };
        return;
      }
    }

    await worldview.update({
      name, description, type, geography, climate, history, culture,
      society, politics, economy, technology, magic_system, power_system,
      races, organizations, locations, languages, religions, laws,
      special_elements, timeline, conflicts, themes, inspiration_sources,
      visual_style, emotional_tone, complexity_level, completeness_level,
      tags, notes
    });

    // 返回更新后的世界观（包含关联的小说信息）
    const updatedWorldview = await Worldview.findByPk(worldview.id, {
      include: [{
        model: Novel,
        as: 'novel',
        attributes: ['id', 'title']
      }]
    });

    ctx.body = {
      success: true,
      message: '世界观更新成功',
      data: updatedWorldview
    };
  } catch (error) {
    console.error('更新世界观失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 删除世界观
router.delete('/:id', async (ctx) => {
  try {
    const worldview = await Worldview.findOne({
      where: {
        id: ctx.params.id,
        user_id: ctx.state.user.id
      }
    });

    if (!worldview) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '世界观不存在'
      };
      return;
    }

    await worldview.destroy();

    ctx.body = {
      success: true,
      message: '世界观删除成功'
    };
  } catch (error) {
    console.error('删除世界观失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 批量删除世界观
router.delete('/batch/:novel_id', async (ctx) => {
  try {
    const { ids } = ctx.request.body;
    const novel_id = ctx.params.novel_id;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供要删除的世界观ID列表'
      };
      return;
    }

    // 验证小说是否属于当前用户
    const novel = await Novel.findOne({
      where: {
        id: novel_id,
        user_id: ctx.state.user.id
      }
    });

    if (!novel) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '小说不存在或无权限访问'
      };
      return;
    }

    const deletedCount = await Worldview.destroy({
      where: {
        id: { [Op.in]: ids },
        novel_id: novel_id,
        user_id: ctx.state.user.id
      }
    });

    ctx.body = {
      success: true,
      message: `成功删除 ${deletedCount} 个世界观`,
      data: { deleted_count: deletedCount }
    };
  } catch (error) {
    console.error('批量删除世界观失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

module.exports = router;