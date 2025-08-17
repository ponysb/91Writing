const Router = require('koa-router');
const ShortStory = require('../models/shortStory');
const Prompt = require('../models/prompt');
const { Op, fn, col } = require('sequelize');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

const router = new Router({
  prefix: '/api/short-stories'
});

// 创建短文
router.post('/', async (ctx) => {
  try {
    const {
      title,
      content,
      type = 'short_novel',
      prompt_id,
      prompt_content,
      reference_article,
      protagonist,
      setting,
      genre,
      tags,
      summary,
      mood,
      target_audience,
      language = 'zh-CN',
      status = 'draft',
      ai_model_used,
      tokens_used = 0,
      generation_cost = 0,
      generation_time,
      is_public = false,
      is_original = true,
      copyright_info
    } = ctx.request.body;

    // 验证用户认证
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户未认证，请先登录'
      };
      return;
    }
    const user_id = ctx.state.user.id;

    // 参数验证
    if (!title) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '短文标题不能为空'
      };
      return;
    }

    if (!content) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '短文内容不能为空'
      };
      return;
    }

    // 验证标题长度
    if (title.length > 200) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '短文标题不能超过200个字符'
      };
      return;
    }

    // 验证短文类型
    const validTypes = ['short_novel', 'article', 'essay', 'poem', 'script', 'other'];
    if (!validTypes.includes(type)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '短文类型无效，必须是: ' + validTypes.join(', ')
      };
      return;
    }

    // 验证状态
    const validStatuses = ['draft', 'completed', 'published', 'archived'];
    if (!validStatuses.includes(status)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '短文状态无效，必须是: ' + validStatuses.join(', ')
      };
      return;
    }

    // 如果提供了prompt_id，验证提示词是否存在
    if (prompt_id) {
      const prompt = await Prompt.findByPk(prompt_id);
      if (!prompt) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: '指定的提示词不存在'
        };
        return;
      }
    }

    // 计算字数
    const word_count = content.length;

    // 创建短文
    const shortStory = await ShortStory.create({
      title,
      content,
      type,
      prompt_id,
      prompt_content,
      reference_article,
      word_count,
      protagonist,
      setting,
      genre,
      tags,
      summary,
      mood,
      target_audience,
      language,
      status,
      ai_model_used,
      tokens_used,
      generation_cost,
      generation_time,
      is_public,
      is_original,
      copyright_info,
      user_id
    });

    logger.info(`短文创建成功: ${title}`, { userId: user_id, shortStoryId: shortStory.id });

    ctx.body = {
      success: true,
      message: '短文创建成功',
      data: shortStory
    };
  } catch (error) {
    logger.error('创建短文失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建短文失败: ' + error.message
    };
  }
});

// 获取短文列表
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      type,
      genre,
      status,
      language,
      is_featured,
      user_id: queryUserId,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = ctx.query;

    // 构建查询条件
    const where = {};
    
    // 权限控制：普通用户只能查看自己的短文，管理员可以查看所有人的短文
    if (!ctx.state.user || !ctx.state.user.is_admin) {
      // 普通用户只能查看自己的短文
      if (!ctx.state.user) {
        ctx.status = 401;
        ctx.body = {
          success: false,
          message: '请先登录'
        };
        return;
      }
      where.user_id = ctx.state.user.id;
    } else if (queryUserId) {
      // 管理员可以查看指定用户的短文
      where.user_id = queryUserId;
    }
    // 如果管理员没有指定用户ID，则查看所有短文

    // 搜索条件
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
        { summary: { [Op.like]: `%${search}%` } }
      ];
    }

    // 筛选条件
    if (type) where.type = type;
    if (genre) where.genre = genre;
    if (status) where.status = status;
    if (language) where.language = language;
    // 移除is_public参数处理，由权限控制决定
    if (is_featured !== undefined) where.is_featured = is_featured === 'true';

    // 排序
    const validSortFields = ['created_at', 'updated_at', 'title', 'word_count', 'rating', 'view_count', 'like_count'];
    const orderField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const orderDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 分页
    const pageNum = Math.max(1, parseInt(page));
    const pageSize = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * pageSize;

    // 查询数据
    const { count, rows } = await ShortStory.findAndCountAll({
      where,
      order: [[orderField, orderDirection]],
      limit: pageSize,
      offset,
      // 暂时移除include，因为关联关系可能还未建立
      // include: [
      //   {
      //     model: Prompt,
      //     as: 'prompt',
      //     attributes: ['id', 'name', 'description'],
      //     required: false
      //   }
      // ]
    });

    ctx.body = {
      success: true,
      data: {
        list: rows,
        pagination: {
          current_page: pageNum,
          page_size: pageSize,
          total: count,
          total_pages: Math.ceil(count / pageSize)
        }
      }
    };
  } catch (error) {
    logger.error('获取短文列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取短文列表失败: ' + error.message
    };
  }
});

// 获取单个短文详情
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;

    const shortStory = await ShortStory.findByPk(id);
    // 暂时移除include，因为关联关系可能还未建立
    // const shortStory = await ShortStory.findByPk(id, {
    //   include: [
    //     {
    //       model: Prompt,
    //       as: 'prompt',
    //       attributes: ['id', 'name', 'description', 'content'],
    //       required: false
    //     }
    //   ]
    // });

    if (!shortStory) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '短文不存在'
      };
      return;
    }

    // 权限检查：只有作者、管理员或公开的短文才能查看
    if (!shortStory.is_public && 
        (!ctx.state.user || 
         (ctx.state.user.id !== shortStory.user_id && !ctx.state.user.is_admin))) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '没有权限查看此短文'
      };
      return;
    }

    // 增加查看次数
    await shortStory.increment('view_count');

    ctx.body = {
      success: true,
      data: shortStory
    };
  } catch (error) {
    logger.error('获取短文详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取短文详情失败: ' + error.message
    };
  }
});

// 更新短文
router.put('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const {
      title,
      content,
      type,
      prompt_id,
      prompt_content,
      reference_article,
      protagonist,
      setting,
      genre,
      tags,
      summary,
      mood,
      target_audience,
      language,
      status,
      ai_model_used,
      tokens_used,
      generation_cost,
      generation_time,
      is_public,
      is_original,
      copyright_info
    } = ctx.request.body;

    // 验证用户认证
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户未认证，请先登录'
      };
      return;
    }

    const shortStory = await ShortStory.findByPk(id);
    if (!shortStory) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '短文不存在'
      };
      return;
    }

    // 权限检查：只有作者或管理员才能修改
    if (ctx.state.user.id !== shortStory.user_id && !ctx.state.user.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '没有权限修改此短文'
      };
      return;
    }

    // 构建更新数据
    const updateData = {};
    if (title !== undefined) {
      if (!title) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '短文标题不能为空'
        };
        return;
      }
      if (title.length > 200) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '短文标题不能超过200个字符'
        };
        return;
      }
      updateData.title = title;
    }

    if (content !== undefined) {
      if (!content) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '短文内容不能为空'
        };
        return;
      }
      updateData.content = content;
      updateData.word_count = content.length;
    }

    if (type !== undefined) {
      const validTypes = ['short_novel', 'article', 'essay', 'poem', 'script', 'other'];
      if (!validTypes.includes(type)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '短文类型无效，必须是: ' + validTypes.join(', ')
        };
        return;
      }
      updateData.type = type;
    }

    if (status !== undefined) {
      const validStatuses = ['draft', 'completed', 'published', 'archived'];
      if (!validStatuses.includes(status)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '短文状态无效，必须是: ' + validStatuses.join(', ')
        };
        return;
      }
      updateData.status = status;
    }

    // 如果提供了prompt_id，验证提示词是否存在
    if (prompt_id !== undefined) {
      if (prompt_id) {
        const prompt = await Prompt.findByPk(prompt_id);
        if (!prompt) {
          ctx.status = 404;
          ctx.body = {
            success: false,
            message: '指定的提示词不存在'
          };
          return;
        }
      }
      updateData.prompt_id = prompt_id;
    }

    // 更新其他字段
    if (prompt_content !== undefined) updateData.prompt_content = prompt_content;
    if (reference_article !== undefined) updateData.reference_article = reference_article;
    if (protagonist !== undefined) updateData.protagonist = protagonist;
    if (setting !== undefined) updateData.setting = setting;
    if (genre !== undefined) updateData.genre = genre;
    if (tags !== undefined) updateData.tags = tags;
    if (summary !== undefined) updateData.summary = summary;
    if (mood !== undefined) updateData.mood = mood;
    if (target_audience !== undefined) updateData.target_audience = target_audience;
    if (language !== undefined) updateData.language = language;
    if (ai_model_used !== undefined) updateData.ai_model_used = ai_model_used;
    if (tokens_used !== undefined) updateData.tokens_used = tokens_used;
    if (generation_cost !== undefined) updateData.generation_cost = generation_cost;
    if (generation_time !== undefined) updateData.generation_time = generation_time;
    if (is_public !== undefined) updateData.is_public = is_public;
    if (is_original !== undefined) updateData.is_original = is_original;
    if (copyright_info !== undefined) updateData.copyright_info = copyright_info;

    // 执行更新
    await shortStory.update(updateData);

    logger.info(`短文更新成功: ${shortStory.title}`, { userId: ctx.state.user.id, shortStoryId: id });

    ctx.body = {
      success: true,
      message: '短文更新成功',
      data: shortStory
    };
  } catch (error) {
    logger.error('更新短文失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新短文失败: ' + error.message
    };
  }
});

// 删除短文
router.delete('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;

    // 验证用户认证
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户未认证，请先登录'
      };
      return;
    }

    const shortStory = await ShortStory.findByPk(id);
    if (!shortStory) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '短文不存在'
      };
      return;
    }

    // 权限检查：只有作者或管理员才能删除
    if (ctx.state.user.id !== shortStory.user_id && !ctx.state.user.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '没有权限删除此短文'
      };
      return;
    }

    // 软删除
    await shortStory.destroy();

    logger.info(`短文删除成功: ${shortStory.title}`, { userId: ctx.state.user.id, shortStoryId: id });

    ctx.body = {
      success: true,
      message: '短文删除成功'
    };
  } catch (error) {
    logger.error('删除短文失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除短文失败: ' + error.message
    };
  }
});

// 批量删除短文
router.delete('/', async (ctx) => {
  try {
    const { ids } = ctx.request.body;

    // 验证用户认证
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户未认证，请先登录'
      };
      return;
    }

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供要删除的短文ID列表'
      };
      return;
    }

    // 查找要删除的短文
    const shortStories = await ShortStory.findAll({
      where: {
        id: { [Op.in]: ids }
      }
    });

    if (shortStories.length === 0) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '没有找到要删除的短文'
      };
      return;
    }

    // 权限检查：只能删除自己的短文（管理员除外）
    if (!ctx.state.user.is_admin) {
      const unauthorizedStories = shortStories.filter(story => story.user_id !== ctx.state.user.id);
      if (unauthorizedStories.length > 0) {
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '没有权限删除部分短文'
        };
        return;
      }
    }

    // 批量软删除
    await ShortStory.destroy({
      where: {
        id: { [Op.in]: ids }
      }
    });

    logger.info(`批量删除短文成功`, { userId: ctx.state.user.id, deletedIds: ids });

    ctx.body = {
      success: true,
      message: `成功删除 ${shortStories.length} 篇短文`
    };
  } catch (error) {
    logger.error('批量删除短文失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量删除短文失败: ' + error.message
    };
  }
});

// 点赞短文
router.post('/:id/like', async (ctx) => {
  try {
    const { id } = ctx.params;

    const shortStory = await ShortStory.findByPk(id);
    if (!shortStory) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '短文不存在'
      };
      return;
    }

    // 增加点赞数
    await shortStory.increment('like_count');

    ctx.body = {
      success: true,
      message: '点赞成功',
      data: {
        like_count: shortStory.like_count + 1
      }
    };
  } catch (error) {
    logger.error('点赞短文失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '点赞失败: ' + error.message
    };
  }
});

// 获取短文统计信息
router.get('/stats/overview', async (ctx) => {
  try {
    // 验证用户认证
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户未认证，请先登录'
      };
      return;
    }

    const userId = ctx.state.user.id;
    const isAdmin = ctx.state.user.is_admin;

    // 构建查询条件
    const whereCondition = isAdmin ? {} : { user_id: userId };

    // 总数统计
    const totalCount = await ShortStory.count({ where: whereCondition });
    
    // 按状态统计
    const statusStats = await ShortStory.findAll({
      where: whereCondition,
      attributes: [
        'status',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // 按类型统计
    const typeStats = await ShortStory.findAll({
      where: whereCondition,
      attributes: [
        'type',
        [fn('COUNT', col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    // 总字数统计
    const totalWordCount = await ShortStory.sum('word_count', { where: whereCondition }) || 0;

    // 平均字数
    const avgWordCount = totalCount > 0 ? Math.round(totalWordCount / totalCount) : 0;

    ctx.body = {
      success: true,
      data: {
        total_count: totalCount,
        total_word_count: totalWordCount,
        avg_word_count: avgWordCount,
        status_stats: statusStats,
        type_stats: typeStats
      }
    };
  } catch (error) {
    logger.error('获取短文统计信息失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取统计信息失败: ' + error.message
    };
  }
});

module.exports = router;