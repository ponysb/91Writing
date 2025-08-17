const Router = require('koa-router');
const router = new Router({
  prefix: '/api/timelines'
});

// 批量创建事件线
router.post('/batch', async (ctx) => {
  try {
    const { timelines, novel_id } = ctx.request.body;

    // 验证必填字段
    if (!timelines || !Array.isArray(timelines) || timelines.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供要创建的事件线列表'
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

    if (timelines.length > 20) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '单次最多创建20个事件线'
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

    // 验证每个事件线的必填字段
    const validationErrors = [];
    const timelineNames = [];
    
    for (let i = 0; i < timelines.length; i++) {
      const timeline = timelines[i];
      
      if (!timeline.name) {
        validationErrors.push(`第${i + 1}个事件线缺少名称`);
      } else {
        // 检查批量数据中是否有重名
        if (timelineNames.includes(timeline.name)) {
          validationErrors.push(`第${i + 1}个事件线名称"${timeline.name}"在批量数据中重复`);
        } else {
          timelineNames.push(timeline.name);
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

    // 检查数据库中是否已存在同名事件线
    const existingTimelines = await Timeline.findAll({
      where: {
        name: { [Op.in]: timelineNames },
        novel_id,
        user_id: ctx.state.user.id
      },
      attributes: ['name']
    });

    if (existingTimelines.length > 0) {
      const existingNames = existingTimelines.map(t => t.name);
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '以下事件线名称已存在',
        existing_names: existingNames
      };
      return;
    }

    // 准备批量创建的数据
    const timelinesToCreate = timelines.map(timeline => {
      const data = {
        name: timeline.name,
        description: timeline.description,
        event_type: timeline.event_type,
        priority: timeline.priority || 'medium',
        status: timeline.status || 'planned',
        start_chapter: timeline.start_chapter,
        end_chapter: timeline.end_chapter,
        estimated_duration: timeline.estimated_duration,
        actual_duration: timeline.actual_duration,
        trigger_event: timeline.trigger_event,
        trigger_conditions: timeline.trigger_conditions ? JSON.stringify(timeline.trigger_conditions) : null,
        main_characters: timeline.main_characters ? JSON.stringify(timeline.main_characters) : null,
        supporting_characters: timeline.supporting_characters ? JSON.stringify(timeline.supporting_characters) : null,
        locations: timeline.locations ? JSON.stringify(timeline.locations) : null,
        key_events: timeline.key_events ? JSON.stringify(timeline.key_events) : null,
        plot_points: timeline.plot_points ? JSON.stringify(timeline.plot_points) : null,
        conflicts: timeline.conflicts ? JSON.stringify(timeline.conflicts) : null,
        resolutions: timeline.resolutions ? JSON.stringify(timeline.resolutions) : null,
        consequences: timeline.consequences,
        character_development: timeline.character_development ? JSON.stringify(timeline.character_development) : null,
        world_changes: timeline.world_changes,
        themes: timeline.themes ? JSON.stringify(timeline.themes) : null,
        foreshadowing: timeline.foreshadowing ? JSON.stringify(timeline.foreshadowing) : null,
        callbacks: timeline.callbacks ? JSON.stringify(timeline.callbacks) : null,
        parallel_events: timeline.parallel_events ? JSON.stringify(timeline.parallel_events) : null,
        dependencies: timeline.dependencies ? JSON.stringify(timeline.dependencies) : null,
        emotional_arc: timeline.emotional_arc,
        pacing_notes: timeline.pacing_notes,
        research_notes: timeline.research_notes,
        inspiration_sources: timeline.inspiration_sources ? JSON.stringify(timeline.inspiration_sources) : null,
        completion_percentage: timeline.completion_percentage || 0,
        word_count_estimate: timeline.word_count_estimate || 0,
        actual_word_count: timeline.actual_word_count || 0,
        tags: timeline.tags ? JSON.stringify(timeline.tags) : null,
        notes: timeline.notes,
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

    // 批量创建事件线
    const createdTimelines = await Timeline.bulkCreate(timelinesToCreate, {
      returning: true
    });

    ctx.status = 201;
    ctx.body = {
      success: true,
      message: `成功创建${createdTimelines.length}个事件线`,
      data: {
        created_count: createdTimelines.length,
        timelines: createdTimelines
      }
    };

  } catch (error) {
    console.error('批量创建事件线失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误',
      error: error.message
    };
  }
});
const Timeline = require('../models/timeline');
const Novel = require('../models/novel');
const User = require('../models/user');
// 认证中间件已在app.js中全局处理
const { Op } = require('sequelize');

// 创建事件线
router.post('/', async (ctx) => {
  try {
    const {
      name, description, event_type, priority, status, start_chapter, end_chapter,
      estimated_duration, actual_duration, trigger_event, trigger_conditions,
      main_characters, supporting_characters, locations, key_events, plot_points,
      conflicts, resolutions, consequences, character_development, world_changes,
      themes, foreshadowing, callbacks, parallel_events, dependencies,
      emotional_arc, pacing_notes, research_notes, inspiration_sources,
      completion_percentage, word_count_estimate, actual_word_count,
      tags, notes, novel_id
    } = ctx.request.body;

    // 验证必填字段
    if (!name || !novel_id) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '事件线名称和小说ID为必填项'
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

    // 检查同一小说下是否已存在同名事件线
    const existingTimeline = await Timeline.findOne({
      where: {
        name,
        novel_id,
        user_id: ctx.state.user.id
      }
    });

    if (existingTimeline) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '该小说下已存在同名事件线'
      };
      return;
    }

    const timeline = await Timeline.create({
      name, description, event_type, priority, status, start_chapter, end_chapter,
      estimated_duration, actual_duration, trigger_event, trigger_conditions,
      main_characters, supporting_characters, locations, key_events, plot_points,
      conflicts, resolutions, consequences, character_development, world_changes,
      themes, foreshadowing, callbacks, parallel_events, dependencies,
      emotional_arc, pacing_notes, research_notes, inspiration_sources,
      completion_percentage, word_count_estimate, actual_word_count,
      tags, notes, novel_id,
      user_id: ctx.state.user.id
    });

    // 返回创建的事件线（包含关联的小说信息）
    const createdTimeline = await Timeline.findByPk(timeline.id, {
      include: [{
        model: Novel,
        as: 'novel',
        attributes: ['id', 'title']
      }]
    });

    ctx.status = 201;
    ctx.body = {
      success: true,
      message: '事件线创建成功',
      data: createdTimeline
    };
  } catch (error) {
    console.error('创建事件线失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 获取事件线列表
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      novel_id,
      event_type,
      priority,
      status,
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

    // 按事件类型筛选
    if (event_type) {
      whereCondition.event_type = event_type;
    }

    // 按优先级筛选
    if (priority) {
      whereCondition.priority = priority;
    }

    // 按状态筛选
    if (status) {
      whereCondition.status = status;
    }

    // 搜索功能
    if (search) {
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Timeline.findAndCountAll({
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
        timelines: rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_count: count,
          per_page: parseInt(limit)
        }
      }
    };
  } catch (error) {
    console.error('获取事件线列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 获取事件线详情
router.get('/:id', async (ctx) => {
  try {
    const timeline = await Timeline.findOne({
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

    if (!timeline) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '事件线不存在'
      };
      return;
    }

    ctx.body = {
      success: true,
      data: timeline
    };
  } catch (error) {
    console.error('获取事件线详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 更新事件线
router.put('/:id', async (ctx) => {
  try {
    const {
      name, description, event_type, priority, status, start_chapter, end_chapter,
      estimated_duration, actual_duration, trigger_event, trigger_conditions,
      main_characters, supporting_characters, locations, key_events, plot_points,
      conflicts, resolutions, consequences, character_development, world_changes,
      themes, foreshadowing, callbacks, parallel_events, dependencies,
      emotional_arc, pacing_notes, research_notes, inspiration_sources,
      completion_percentage, word_count_estimate, actual_word_count,
      tags, notes
    } = ctx.request.body;

    const timeline = await Timeline.findOne({
      where: {
        id: ctx.params.id,
        user_id: ctx.state.user.id
      }
    });

    if (!timeline) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '事件线不存在'
      };
      return;
    }

    // 如果更新名称，检查是否与同一小说下的其他事件线重名
    if (name && name !== timeline.name) {
      const existingTimeline = await Timeline.findOne({
        where: {
          name,
          novel_id: timeline.novel_id,
          user_id: ctx.state.user.id,
          id: { [Op.ne]: ctx.params.id }
        }
      });

      if (existingTimeline) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '该小说下已存在同名事件线'
        };
        return;
      }
    }

    await timeline.update({
      name, description, event_type, priority, status, start_chapter, end_chapter,
      estimated_duration, actual_duration, trigger_event, trigger_conditions,
      main_characters, supporting_characters, locations, key_events, plot_points,
      conflicts, resolutions, consequences, character_development, world_changes,
      themes, foreshadowing, callbacks, parallel_events, dependencies,
      emotional_arc, pacing_notes, research_notes, inspiration_sources,
      completion_percentage, word_count_estimate, actual_word_count,
      tags, notes
    });

    // 返回更新后的事件线（包含关联的小说信息）
    const updatedTimeline = await Timeline.findByPk(timeline.id, {
      include: [{
        model: Novel,
        as: 'novel',
        attributes: ['id', 'title']
      }]
    });

    ctx.body = {
      success: true,
      message: '事件线更新成功',
      data: updatedTimeline
    };
  } catch (error) {
    console.error('更新事件线失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 删除事件线
router.delete('/:id', async (ctx) => {
  try {
    const timeline = await Timeline.findOne({
      where: {
        id: ctx.params.id,
        user_id: ctx.state.user.id
      }
    });

    if (!timeline) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '事件线不存在'
      };
      return;
    }

    await timeline.destroy();

    ctx.body = {
      success: true,
      message: '事件线删除成功'
    };
  } catch (error) {
    console.error('删除事件线失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 批量删除事件线
router.delete('/batch/:novel_id', async (ctx) => {
  try {
    const { ids } = ctx.request.body;
    const novel_id = ctx.params.novel_id;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供要删除的事件线ID列表'
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

    const deletedCount = await Timeline.destroy({
      where: {
        id: { [Op.in]: ids },
        novel_id: novel_id,
        user_id: ctx.state.user.id
      }
    });

    ctx.body = {
      success: true,
      message: `成功删除 ${deletedCount} 个事件线`,
      data: { deleted_count: deletedCount }
    };
  } catch (error) {
    console.error('批量删除事件线失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 获取事件线统计信息
router.get('/stats/:novel_id', async (ctx) => {
  try {
    const novel_id = ctx.params.novel_id;

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

    // 统计各种状态的事件线数量
    const stats = await Timeline.findAll({
      where: {
        novel_id: novel_id,
        user_id: ctx.state.user.id
      },
      attributes: [
        'status',
        'event_type',
        'priority'
      ]
    });

    const statusCount = {};
    const typeCount = {};
    const priorityCount = {};

    stats.forEach(timeline => {
      // 统计状态
      statusCount[timeline.status] = (statusCount[timeline.status] || 0) + 1;
      // 统计类型
      typeCount[timeline.event_type] = (typeCount[timeline.event_type] || 0) + 1;
      // 统计优先级
      priorityCount[timeline.priority] = (priorityCount[timeline.priority] || 0) + 1;
    });

    ctx.body = {
      success: true,
      data: {
        total_count: stats.length,
        status_distribution: statusCount,
        type_distribution: typeCount,
        priority_distribution: priorityCount
      }
    };
  } catch (error) {
    console.error('获取事件线统计失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

module.exports = router;