const Router = require('koa-router');
const router = new Router({
  prefix: '/api/corpus'
});
const Corpus = require('../models/corpus');
const Novel = require('../models/novel');
const User = require('../models/user');
// 认证中间件已在app.js中全局处理
const { Op } = require('sequelize');

// 创建语料
router.post('/', async (ctx) => {
  try {
    const {
      title, content, content_type, category, subcategory, genre_type,
      writing_style, tone, emotion, narrative_perspective, tense,
      language_level, target_audience, involved_characters, emotion_tags,
      theme_tags, keywords, context_background, usage_scenarios,
      source, original_author, source_link, copyright_info,
      quality_score, relevance_score, is_public, is_verified,
      is_featured, status, review_notes, tags, metadata, notes, novel_id
    } = ctx.request.body;

    // 验证必填字段
    if (!title || !content) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '语料标题和内容为必填项'
      };
      return;
    }

    // 如果指定了小说ID，验证小说是否存在且属于当前用户
    if (novel_id) {
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
    }

    // 处理数组类型字段，转换为字符串
    const processedUsageScenarios = Array.isArray(usage_scenarios) 
      ? usage_scenarios.join(', ') 
      : usage_scenarios;

    // 计算字数和字符数
    const word_count = content.split(/\s+/).length;
    const character_count = content.length;

    const corpus = await Corpus.create({
      title, content, content_type, category, subcategory, genre_type,
      writing_style, tone, emotion, narrative_perspective, tense,
      language_level, target_audience, involved_characters, emotion_tags,
      theme_tags, keywords, context_background, usage_scenarios: processedUsageScenarios,
      source, original_author, source_link, copyright_info,
      word_count, character_count, quality_score, relevance_score,
      is_public, is_verified, is_featured, status, review_notes,
      tags, metadata, notes, novel_id,
      user_id: ctx.state.user.id
    });

    // 返回创建的语料（包含关联的小说信息）
    const createdCorpus = await Corpus.findByPk(corpus.id, {
      include: novel_id ? [{
        model: Novel,
        as: 'novel',
        attributes: ['id', 'title']
      }] : []
    });

    ctx.status = 201;
    ctx.body = {
      success: true,
      message: '语料创建成功',
      data: createdCorpus
    };
  } catch (error) {
    console.error('创建语料失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 获取语料列表
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      novel_id,
      category,
      content_type,
      genre_type,
      writing_style,
      is_public,
      is_verified,
      is_featured,
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

    // 按分类筛选
    if (category) {
      whereCondition.category = category;
    }

    // 按内容类型筛选
    if (content_type) {
      whereCondition.content_type = content_type;
    }

    // 按题材类型筛选
    if (genre_type) {
      whereCondition.genre_type = genre_type;
    }

    // 按写作风格筛选
    if (writing_style) {
      whereCondition.writing_style = writing_style;
    }

    // 按公开状态筛选
    if (is_public !== undefined) {
      whereCondition.is_public = is_public === 'true';
    }

    // 按验证状态筛选
    if (is_verified !== undefined) {
      whereCondition.is_verified = is_verified === 'true';
    }

    // 按精选状态筛选
    if (is_featured !== undefined) {
      whereCondition.is_featured = is_featured === 'true';
    }

    // 按状态筛选
    if (status) {
      whereCondition.status = status;
    }

    // 搜索功能
    if (search) {
      whereCondition[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } },
        { keywords: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows } = await Corpus.findAndCountAll({
      where: whereCondition,
      include: [{
        model: Novel,
        as: 'novel',
        attributes: ['id', 'title'],
        required: false
      }],
      order: [[sort_by, sort_order.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    ctx.body = {
      success: true,
      data: {
        corpus: rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_count: count,
          per_page: parseInt(limit)
        }
      }
    };
  } catch (error) {
    console.error('获取语料列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 获取语料详情
router.get('/:id', async (ctx) => {
  try {
    const corpus = await Corpus.findOne({
      where: {
        id: ctx.params.id,
        user_id: ctx.state.user.id
      },
      include: [{
        model: Novel,
        as: 'novel',
        attributes: ['id', 'title'],
        required: false
      }]
    });

    if (!corpus) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '语料不存在'
      };
      return;
    }

    // 更新使用次数和最后使用时间
    await corpus.update({
      usage_count: corpus.usage_count + 1,
      last_used_at: new Date()
    });

    ctx.body = {
      success: true,
      data: corpus
    };
  } catch (error) {
    console.error('获取语料详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 更新语料
router.put('/:id', async (ctx) => {
  try {
    const {
      title, content, content_type, category, subcategory, genre_type,
      writing_style, tone, emotion, narrative_perspective, tense,
      language_level, target_audience, involved_characters, emotion_tags,
      theme_tags, keywords, context_background, usage_scenarios,
      source, original_author, source_link, copyright_info,
      quality_score, relevance_score, is_public, is_verified,
      is_featured, status, review_notes, tags, metadata, notes
    } = ctx.request.body;

    const corpus = await Corpus.findOne({
      where: {
        id: ctx.params.id,
        user_id: ctx.state.user.id
      }
    });

    if (!corpus) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '语料不存在'
      };
      return;
    }

    // 处理数组类型字段，转换为字符串
    const processedUsageScenarios = Array.isArray(usage_scenarios) 
      ? usage_scenarios.join(', ') 
      : usage_scenarios;

    // 如果更新了内容，重新计算字数和字符数
    let updateData = {
      title, content, content_type, category, subcategory, genre_type,
      writing_style, tone, emotion, narrative_perspective, tense,
      language_level, target_audience, involved_characters, emotion_tags,
      theme_tags, keywords, context_background, usage_scenarios: processedUsageScenarios,
      source, original_author, source_link, copyright_info,
      quality_score, relevance_score, is_public, is_verified,
      is_featured, status, review_notes, tags, metadata, notes
    };

    if (content && content !== corpus.content) {
      updateData.word_count = content.split(/\s+/).length;
      updateData.character_count = content.length;
    }

    await corpus.update(updateData);

    // 返回更新后的语料（包含关联的小说信息）
    const updatedCorpus = await Corpus.findByPk(corpus.id, {
      include: [{
        model: Novel,
        as: 'novel',
        attributes: ['id', 'title'],
        required: false
      }]
    });

    ctx.body = {
      success: true,
      message: '语料更新成功',
      data: updatedCorpus
    };
  } catch (error) {
    console.error('更新语料失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 删除语料
router.delete('/:id', async (ctx) => {
  try {
    const corpus = await Corpus.findOne({
      where: {
        id: ctx.params.id,
        user_id: ctx.state.user.id
      }
    });

    if (!corpus) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '语料不存在'
      };
      return;
    }

    await corpus.destroy();

    ctx.body = {
      success: true,
      message: '语料删除成功'
    };
  } catch (error) {
    console.error('删除语料失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 批量删除语料
router.delete('/batch/delete', async (ctx) => {
  try {
    const { ids } = ctx.request.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供要删除的语料ID列表'
      };
      return;
    }

    const deletedCount = await Corpus.destroy({
      where: {
        id: { [Op.in]: ids },
        user_id: ctx.state.user.id
      }
    });

    ctx.body = {
      success: true,
      message: `成功删除 ${deletedCount} 个语料`,
      data: { deleted_count: deletedCount }
    };
  } catch (error) {
    console.error('批量删除语料失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 获取语料统计信息
router.get('/stats/overview', async (ctx) => {
  try {
    const { novel_id } = ctx.query;
    const whereCondition = {
      user_id: ctx.state.user.id
    };

    if (novel_id) {
      whereCondition.novel_id = novel_id;
    }

    // 统计各种分类的语料数量
    const stats = await Corpus.findAll({
      where: whereCondition,
      attributes: [
        'category',
        'content_type',
        'genre_type',
        'writing_style',
        'is_public',
        'is_verified',
        'is_featured',
        'status'
      ]
    });

    const categoryCount = {};
    const contentTypeCount = {};
    const genreTypeCount = {};
    const styleCount = {};
    const statusCount = {};
    let publicCount = 0;
    let verifiedCount = 0;
    let featuredCount = 0;

    stats.forEach(corpus => {
      // 统计分类
      categoryCount[corpus.category] = (categoryCount[corpus.category] || 0) + 1;
      // 统计内容类型
      contentTypeCount[corpus.content_type] = (contentTypeCount[corpus.content_type] || 0) + 1;
      // 统计题材类型
      genreTypeCount[corpus.genre_type] = (genreTypeCount[corpus.genre_type] || 0) + 1;
      // 统计写作风格
      styleCount[corpus.writing_style] = (styleCount[corpus.writing_style] || 0) + 1;
      // 统计状态
      statusCount[corpus.status] = (statusCount[corpus.status] || 0) + 1;
      // 统计标记
      if (corpus.is_public) publicCount++;
      if (corpus.is_verified) verifiedCount++;
      if (corpus.is_featured) featuredCount++;
    });

    // 统计总字数
    const totalStats = await Corpus.findOne({
      where: whereCondition,
      attributes: [
        [Corpus.sequelize.fn('SUM', Corpus.sequelize.col('word_count')), 'total_words'],
        [Corpus.sequelize.fn('SUM', Corpus.sequelize.col('character_count')), 'total_characters'],
        [Corpus.sequelize.fn('AVG', Corpus.sequelize.col('quality_score')), 'avg_quality'],
        [Corpus.sequelize.fn('SUM', Corpus.sequelize.col('usage_count')), 'total_usage']
      ]
    });

    ctx.body = {
      success: true,
      data: {
        total_count: stats.length,
        category_distribution: categoryCount,
        content_type_distribution: contentTypeCount,
        genre_type_distribution: genreTypeCount,
        style_distribution: styleCount,
        status_distribution: statusCount,
        public_count: publicCount,
        verified_count: verifiedCount,
        featured_count: featuredCount,
        total_words: parseInt(totalStats.dataValues.total_words) || 0,
        total_characters: parseInt(totalStats.dataValues.total_characters) || 0,
        average_quality: parseFloat(totalStats.dataValues.avg_quality) || 0,
        total_usage: parseInt(totalStats.dataValues.total_usage) || 0
      }
    };
  } catch (error) {
    console.error('获取语料统计失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

// 搜索推荐语料
router.get('/search/recommend', async (ctx) => {
  try {
    const {
      keywords,
      category,
      writing_style,
      emotion,
      limit = 10
    } = ctx.query;

    if (!keywords) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供搜索关键词'
      };
      return;
    }

    const whereCondition = {
      user_id: ctx.state.user.id,
      [Op.or]: [
        { title: { [Op.like]: `%${keywords}%` } },
        { content: { [Op.like]: `%${keywords}%` } },
        { keywords: { [Op.like]: `%${keywords}%` } },
        { theme_tags: { [Op.like]: `%${keywords}%` } }
      ]
    };

    // 可选筛选条件
    if (category) {
      whereCondition.category = category;
    }
    if (writing_style) {
      whereCondition.writing_style = writing_style;
    }
    if (emotion) {
      whereCondition.emotion = emotion;
    }

    const recommendations = await Corpus.findAll({
      where: whereCondition,
      include: [{
        model: Novel,
        as: 'novel',
        attributes: ['id', 'title'],
        required: false
      }],
      order: [
        ['relevance_score', 'DESC'],
        ['quality_score', 'DESC'],
        ['usage_count', 'DESC']
      ],
      limit: parseInt(limit)
    });

    ctx.body = {
      success: true,
      data: {
        recommendations,
        count: recommendations.length
      }
    };
  } catch (error) {
    console.error('搜索推荐语料失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误'
    };
  }
});

module.exports = router;