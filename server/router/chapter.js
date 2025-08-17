const Router = require('koa-router');
const Chapter = require('../models/chapter');
const Novel = require('../models/novel');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const router = new Router({
  prefix: '/api/chapters'
});

// 批量创建章节
router.post('/batch', async (ctx) => {
  try {
    const { chapters, novel_id } = ctx.request.body;

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
    if (!novel_id) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '小说ID不能为空'
      };
      return;
    }

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '章节数据不能为空，必须是数组格式'
      };
      return;
    }

    if (chapters.length > 50) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '单次批量创建章节数量不能超过50个'
      };
      return;
    }

    // 验证小说是否存在且用户有权限
    const novel = await Novel.findByPk(novel_id);
    if (!novel) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '小说不存在'
      };
      return;
    }

    // 检查用户是否有权限操作该小说
    if (novel.user_id !== user_id && !ctx.state.user.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '没有权限操作该小说的章节'
      };
      return;
    }

    // 验证每个章节的数据
    const validStatuses = ['draft', 'generating', 'completed', 'published', 'failed'];
    const validatedChapters = [];
    
    // 使用事务确保批量创建的原子性
    const transaction = await Chapter.sequelize.transaction();
    
    try {
      // 使用 SELECT FOR UPDATE 锁定小说记录，防止并发冲突
      await Novel.findByPk(novel_id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      
      // 在事务中获取当前小说的最大章节号（包括软删除的记录），确保章节号唯一
      const maxChapterResult = await Chapter.findOne({
        where: { novel_id },
        attributes: [[Chapter.sequelize.fn('MAX', Chapter.sequelize.col('chapter_number')), 'maxChapterNumber']],
        paranoid: false, // 包括软删除的记录
        transaction,
        raw: true
      });
      const maxChapterNumber = maxChapterResult?.maxChapterNumber || 0;
      
      let nextChapterNumber = maxChapterNumber + 1;

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const errors = [];

        // 验证必填字段
        if (!chapter.title) {
          errors.push('章节标题不能为空');
        }

        // 验证标题长度
        if (chapter.title && chapter.title.length > 200) {
          errors.push('章节标题不能超过200个字符');
        }

        // 验证状态
        if (chapter.status && !validStatuses.includes(chapter.status)) {
          errors.push('章节状态无效，必须是: ' + validStatuses.join(', '));
        }

        // 章节序号将自动生成，无需检查重复

        if (errors.length > 0) {
           await transaction.rollback();
           ctx.status = 400;
           ctx.body = {
             success: false,
             message: `第${i + 1}个章节数据验证失败: ${errors.join(', ')}`
           };
           return;
         }

        // 计算字数和字符数
        const content = chapter.content || '';
        const word_count = content.replace(/\s/g, '').length;
        const character_count = content.length;
        const reading_time = Math.ceil(word_count / 300);

        validatedChapters.push({
          title: chapter.title,
          content: content,
          summary: chapter.summary || '',
          outline: chapter.outline || '',
          chapter_number: nextChapterNumber++,
          word_count,
          character_count,
          reading_time,
          status: chapter.status || 'draft',
          generation_params: chapter.generation_params || null,
          prompt_used: chapter.prompt_used || null,
          model_used: chapter.model_used || null,
          is_free: chapter.is_free !== undefined ? chapter.is_free : true,
          price: chapter.price || 0.00,
          novel_id,
          user_id,
          metadata: chapter.metadata || null
        });
      }

    // 章节序号已自动生成，无需检查重复

    // 批量创建章节
    const createdChapters = await Chapter.bulkCreate(validatedChapters, { transaction });

    // 更新小说的章节数和字数
    const totalWordCount = validatedChapters.reduce((sum, ch) => sum + ch.word_count, 0);
    await Novel.increment('chapter_count', { by: chapters.length, where: { id: novel_id }, transaction });
    await Novel.increment('current_word_count', { by: totalWordCount, where: { id: novel_id }, transaction });
    
    // 提交事务
    await transaction.commit();
    
    logger.info(`批量创建章节成功: ${chapters.length}个章节`, { 
      userId: user_id, 
      novelId: novel_id, 
      chapterCount: chapters.length,
      totalWordCount 
    });

    ctx.body = {
      success: true,
      message: `成功批量创建${chapters.length}个章节`,
      data: {
        created_count: createdChapters.length,
        total_word_count: totalWordCount,
        chapters: createdChapters.map(chapter => ({
          id: chapter.id,
          title: chapter.title,
          chapter_number: chapter.chapter_number,
          word_count: chapter.word_count,
          status: chapter.status,
          created_at: chapter.created_at
        }))
      }
    };
  } catch (transactionError) {
    // 回滚事务
    await transaction.rollback();
    throw transactionError;
  }
  } catch (error) {
    logger.error('批量创建章节失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量创建章节失败: ' + error.message
    };
  }
});

// 创建章节
router.post('/', async (ctx) => {
  try {
    const {
      title,
      content,
      summary,
      outline,
      novel_id,
      status = 'draft',
      generation_params,
      prompt_used,
      model_used,
      is_free = true,
      price = 0.00,
      metadata
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
        message: '章节标题不能为空'
      };
      return;
    }

    if (!novel_id) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '小说ID不能为空'
      };
      return;
    }

    // 使用事务确保章节号生成的原子性
    const transaction = await Chapter.sequelize.transaction();
    
    try {
      // 使用 SELECT FOR UPDATE 锁定小说记录，防止并发冲突
      await Novel.findByPk(novel_id, {
        transaction,
        lock: transaction.LOCK.UPDATE
      });
      
      // 在事务中查询最大章节号并生成新章节号（包括软删除的记录）
      const maxChapterResult = await Chapter.findOne({
        where: { novel_id },
        attributes: [[Chapter.sequelize.fn('MAX', Chapter.sequelize.col('chapter_number')), 'maxChapterNumber']],
        paranoid: false, // 包括软删除的记录
        transaction,
        raw: true
      });
      const maxChapterNumber = maxChapterResult?.maxChapterNumber || 0;
      
      const chapter_number = maxChapterNumber + 1;

      // 验证标题长度
      if (title.length > 200) {
        await transaction.rollback();
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '章节标题不能超过200个字符'
        };
        return;
      }

      // 验证状态
      const validStatuses = ['draft', 'generating', 'completed', 'published', 'failed'];
      if (!validStatuses.includes(status)) {
        await transaction.rollback();
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '章节状态无效，必须是: ' + validStatuses.join(', ')
        };
        return;
      }

      // 验证小说是否存在且用户有权限
      const novel = await Novel.findByPk(novel_id, { transaction });
      if (!novel) {
        await transaction.rollback();
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: '小说不存在'
        };
        return;
      }

      // 检查用户是否有权限操作该小说
      if (novel.user_id !== user_id && !ctx.state.user.is_admin) {
        await transaction.rollback();
        ctx.status = 403;
        ctx.body = {
          success: false,
          message: '没有权限操作该小说的章节'
        };
        return;
      }

      // 由于章节序号是自动生成的，不需要检查重复

      // 计算字数和字符数
      const word_count = content ? content.replace(/\s/g, '').length : 0;
      const character_count = content ? content.length : 0;
      const reading_time = Math.ceil(word_count / 300); // 假设每分钟阅读300字

      // 创建章节
       const chapter = await Chapter.create({
        title,
        content,
        summary,
        outline,
        chapter_number,
        word_count,
        character_count,
        reading_time,
        status,
        generation_params,
        prompt_used,
        model_used,
        is_free,
        price,
        novel_id,
        user_id,
        metadata
      }, { transaction });

      // 更新小说的章节数
      await Novel.increment('chapter_count', { where: { id: novel_id }, transaction });
      await Novel.increment('current_word_count', { by: word_count, where: { id: novel_id }, transaction });

      // 提交事务
      await transaction.commit();

      logger.info(`章节创建成功: ${title}`, { userId: user_id, chapterId: chapter.id, novelId: novel_id });

      ctx.body = {
        success: true,
        message: '章节创建成功',
        data: {
          id: chapter.id,
          title: chapter.title,
          content: chapter.content,
          summary: chapter.summary,
          outline: chapter.outline,
          chapter_number: chapter.chapter_number,
          word_count: chapter.word_count,
          character_count: chapter.character_count,
          reading_time: chapter.reading_time,
          status: chapter.status,
          generation_params: chapter.generation_params,
          prompt_used: chapter.prompt_used,
          model_used: chapter.model_used,
          is_free: chapter.is_free,
          price: chapter.price,
          novel_id: chapter.novel_id,
          user_id: chapter.user_id,
          metadata: chapter.metadata,
          created_at: chapter.created_at
        }
      };
    } catch (transactionError) {
      // 回滚事务
      await transaction.rollback();
      throw transactionError;
    }
  } catch (error) {
    logger.error('创建章节失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建章节失败: ' + error.message
    };
  }
});

// 获取章节列表
router.get('/', async (ctx) => {
  try {
    const {
      page = 1,
      limit = 10,
      novel_id,
      status,
      search,
      is_free,
      sort_by = 'chapter_number',
      sort_order = 'ASC'
    } = ctx.query;

    // 参数验证
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // 构建查询条件
    const whereConditions = {};

    if (novel_id) {
      whereConditions.novel_id = parseInt(novel_id);
    }

    if (status) {
      whereConditions.status = status;
    }

    if (search) {
      whereConditions[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { summary: { [Op.like]: `%${search}%` } },
        { outline: { [Op.like]: `%${search}%` } }
      ];
    }

    if (is_free !== undefined) {
      whereConditions.is_free = is_free === 'true';
    }

    // 权限控制：只能查看自己的章节或公开小说的章节
    if (!ctx.state.user?.is_admin) {
      if (ctx.state.user) {
        // 已登录用户：可以查看自己的章节或公开小说的章节
        whereConditions[Op.or] = [
          { user_id: ctx.state.user.id },
          { '$novel.is_public$': true }
        ];
      } else {
        // 未登录用户：只能查看公开小说的章节
        whereConditions['$novel.is_public$'] = true;
      }
    }

    // 验证排序字段
    const validSortFields = [
      'id', 'title', 'chapter_number', 'word_count', 'reading_time',
      'status', 'view_count', 'like_count', 'created_at', 'updated_at', 'published_at'
    ];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'chapter_number';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 查询章节列表
    const { count, rows: chapters } = await Chapter.findAndCountAll({
      where: whereConditions,
      include: [{
        model: Novel,
        as: 'novel',
        attributes: ['id', 'title', 'is_public'],
        required: true
      }],
      order: [[sortField, sortDirection]],
      limit: limitNum,
      offset: offset,
      attributes: {
        exclude: ['deleted_at', 'content'] // 列表不返回内容和软删除字段
      }
    });

    // 计算分页信息
    const totalPages = Math.ceil(count / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    ctx.body = {
      success: true,
      message: '获取章节列表成功',
      data: {
        chapters: chapters.map(chapter => ({
          id: chapter.id,
          title: chapter.title,
          summary: chapter.summary,
          outline: chapter.outline,
          chapter_number: chapter.chapter_number,
          word_count: chapter.word_count,
          character_count: chapter.character_count,
          reading_time: chapter.reading_time,
          status: chapter.status,
          is_free: chapter.is_free,
          price: chapter.price,
          view_count: chapter.view_count,
          like_count: chapter.like_count,
          comment_count: chapter.comment_count,
          unlock_count: chapter.unlock_count,
          novel_id: chapter.novel_id,
          user_id: chapter.user_id,
          published_at: chapter.published_at,
          created_at: chapter.created_at,
          updated_at: chapter.updated_at,
          novel: chapter.novel ? {
            id: chapter.novel.id,
            title: chapter.novel.title,
            is_public: chapter.novel.is_public
          } : null
        })),
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_count: count,
          limit: limitNum,
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage
        }
      }
    };
  } catch (error) {
    logger.error('获取章节列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取章节列表失败: ' + error.message
    };
  }
});

// 获取章节详情
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;

    // 参数验证
    if (!id || isNaN(parseInt(id))) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '无效的章节ID'
      };
      return;
    }

    // 查询章节
    const chapter = await Chapter.findByPk(parseInt(id), {
      include: [{
        model: Novel,
        as: 'novel',
        attributes: ['id', 'title', 'is_public', 'user_id']
      }],
      attributes: {
        exclude: ['deleted_at']
      }
    });

    if (!chapter) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '章节不存在'
      };
      return;
    }

    // 权限控制：检查是否有权限查看该章节
    const isOwner = ctx.state.user && chapter.user_id === ctx.state.user.id;
    const isAdmin = ctx.state.user && ctx.state.user.is_admin;
    const isPublicNovel = chapter.novel && chapter.novel.is_public;

    if (!isOwner && !isAdmin && !isPublicNovel) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '没有权限查看该章节'
      };
      return;
    }

    // 如果不是免费章节且不是作者或管理员，需要检查是否已解锁
    if (!chapter.is_free && !isOwner && !isAdmin) {
      // 这里可以添加解锁逻辑检查
      // 暂时返回提示需要解锁
      ctx.body = {
        success: true,
        message: '获取章节详情成功',
        data: {
          id: chapter.id,
          title: chapter.title,
          summary: chapter.summary,
          chapter_number: chapter.chapter_number,
          word_count: chapter.word_count,
          character_count: chapter.character_count,
          reading_time: chapter.reading_time,
          status: chapter.status,
          is_free: chapter.is_free,
          price: chapter.price,
          view_count: chapter.view_count,
          like_count: chapter.like_count,
          comment_count: chapter.comment_count,
          novel_id: chapter.novel_id,
          published_at: chapter.published_at,
          created_at: chapter.created_at,
          updated_at: chapter.updated_at,
          content: null, // 付费章节不返回内容
          need_unlock: true,
          novel: chapter.Novel ? {
            id: chapter.Novel.id,
            title: chapter.Novel.title,
            is_public: chapter.Novel.is_public
          } : null
        }
      };
      return;
    }

    // 增加查看次数
    await Chapter.increment('view_count', { where: { id: chapter.id } });

    ctx.body = {
      success: true,
      message: '获取章节详情成功',
      data: {
        id: chapter.id,
        title: chapter.title,
        content: chapter.content,
        summary: chapter.summary,
        outline: chapter.outline,
        chapter_number: chapter.chapter_number,
        word_count: chapter.word_count,
        character_count: chapter.character_count,
        reading_time: chapter.reading_time,
        status: chapter.status,
        generation_params: chapter.generation_params,
        prompt_used: chapter.prompt_used,
        model_used: chapter.model_used,
        generation_time: chapter.generation_time,
        tokens_used: chapter.tokens_used,
        cost: chapter.cost,
        view_count: chapter.view_count,
        like_count: chapter.like_count,
        comment_count: chapter.comment_count,
        is_free: chapter.is_free,
        price: chapter.price,
        unlock_count: chapter.unlock_count,
        novel_id: chapter.novel_id,
        user_id: chapter.user_id,
        previous_chapter_id: chapter.previous_chapter_id,
        next_chapter_id: chapter.next_chapter_id,
        error_message: chapter.error_message,
        metadata: chapter.metadata,
        published_at: chapter.published_at,
        created_at: chapter.created_at,
        updated_at: chapter.updated_at,
        novel: chapter.Novel ? {
          id: chapter.Novel.id,
          title: chapter.Novel.title,
          is_public: chapter.Novel.is_public
        } : null
      }
    };
  } catch (error) {
    logger.error('获取章节详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取章节详情失败: ' + error.message
    };
  }
});

// 更新章节
router.put('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const {
      title,
      content,
      summary,
      outline,
      chapter_number,
      status,
      generation_params,
      prompt_used,
      model_used,
      generation_time,
      tokens_used,
      cost,
      is_free,
      price,
      previous_chapter_id,
      next_chapter_id,
      error_message,
      metadata
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

    // 参数验证
    if (!id || isNaN(parseInt(id))) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '无效的章节ID'
      };
      return;
    }

    // 查询章节
    const chapter = await Chapter.findByPk(parseInt(id));
    if (!chapter) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '章节不存在'
      };
      return;
    }

    // 检查用户是否有权限操作该章节
    if (chapter.user_id !== ctx.state.user.id && !ctx.state.user.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '没有权限操作该章节'
      };
      return;
    }

    // 验证标题长度
    if (title && title.length > 200) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '章节标题不能超过200个字符'
      };
      return;
    }

    // 验证状态
    if (status) {
      const validStatuses = ['draft', 'generating', 'completed', 'published', 'failed'];
      if (!validStatuses.includes(status)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '章节状态无效，必须是: ' + validStatuses.join(', ')
        };
        return;
      }
    }

    // 如果更新了章节序号，检查是否与同一小说下的其他章节冲突
    if (chapter_number && chapter_number !== chapter.chapter_number) {
      const existingChapter = await Chapter.findOne({
        where: {
          novel_id: chapter.novel_id,
          chapter_number,
          id: { [Op.ne]: chapter.id }
        }
      });

      if (existingChapter) {
        ctx.status = 409;
        ctx.body = {
          success: false,
          message: '该小说已存在相同序号的章节'
        };
        return;
      }
    }

    // 准备更新数据
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) {
      updateData.content = content;
      // 重新计算字数和字符数
      updateData.word_count = content ? content.replace(/\s/g, '').length : 0;
      updateData.character_count = content ? content.length : 0;
      updateData.reading_time = Math.ceil(updateData.word_count / 300);
    }
    if (summary !== undefined) updateData.summary = summary;
    if (outline !== undefined) updateData.outline = outline;
    if (chapter_number !== undefined) updateData.chapter_number = chapter_number;
    if (status !== undefined) updateData.status = status;
    if (generation_params !== undefined) updateData.generation_params = generation_params;
    if (prompt_used !== undefined) updateData.prompt_used = prompt_used;
    if (model_used !== undefined) updateData.model_used = model_used;
    if (generation_time !== undefined) updateData.generation_time = generation_time;
    if (tokens_used !== undefined) updateData.tokens_used = tokens_used;
    if (cost !== undefined) updateData.cost = cost;
    if (is_free !== undefined) updateData.is_free = is_free;
    if (price !== undefined) updateData.price = price;
    if (previous_chapter_id !== undefined) updateData.previous_chapter_id = previous_chapter_id;
    if (next_chapter_id !== undefined) updateData.next_chapter_id = next_chapter_id;
    if (error_message !== undefined) updateData.error_message = error_message;
    if (metadata !== undefined) updateData.metadata = metadata;

    // 更新章节
    await chapter.update(updateData);

    // 如果更新了内容，需要更新小说的总字数
    if (content !== undefined) {
      const oldWordCount = chapter.word_count || 0;
      const newWordCount = updateData.word_count || 0;
      const wordCountDiff = newWordCount - oldWordCount;
      
      if (wordCountDiff !== 0) {
        await Novel.increment('current_word_count', { 
          by: wordCountDiff, 
          where: { id: chapter.novel_id } 
        });
      }
    }

    logger.info(`章节更新成功: ${chapter.title}`, { 
      userId: ctx.state.user.id, 
      chapterId: chapter.id, 
      novelId: chapter.novel_id 
    });

    // 重新查询更新后的章节
    const updatedChapter = await Chapter.findByPk(chapter.id, {
      attributes: {
        exclude: ['deleted_at']
      }
    });

    ctx.body = {
      success: true,
      message: '章节更新成功',
      data: {
        id: updatedChapter.id,
        title: updatedChapter.title,
        content: updatedChapter.content,
        summary: updatedChapter.summary,
        outline: updatedChapter.outline,
        chapter_number: updatedChapter.chapter_number,
        word_count: updatedChapter.word_count,
        character_count: updatedChapter.character_count,
        reading_time: updatedChapter.reading_time,
        status: updatedChapter.status,
        generation_params: updatedChapter.generation_params,
        prompt_used: updatedChapter.prompt_used,
        model_used: updatedChapter.model_used,
        generation_time: updatedChapter.generation_time,
        tokens_used: updatedChapter.tokens_used,
        cost: updatedChapter.cost,
        is_free: updatedChapter.is_free,
        price: updatedChapter.price,
        previous_chapter_id: updatedChapter.previous_chapter_id,
        next_chapter_id: updatedChapter.next_chapter_id,
        error_message: updatedChapter.error_message,
        metadata: updatedChapter.metadata,
        novel_id: updatedChapter.novel_id,
        user_id: updatedChapter.user_id,
        updated_at: updatedChapter.updated_at
      }
    };
  } catch (error) {
    logger.error('更新章节失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新章节失败: ' + error.message
    };
  }
});

// 删除章节
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

    // 参数验证
    if (!id || isNaN(parseInt(id))) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '无效的章节ID'
      };
      return;
    }

    // 查询章节
    const chapter = await Chapter.findByPk(parseInt(id));
    if (!chapter) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '章节不存在'
      };
      return;
    }

    // 检查用户是否有权限操作该章节
    if (chapter.user_id !== ctx.state.user.id && !ctx.state.user.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '没有权限操作该章节'
      };
      return;
    }

    // 软删除章节
    await chapter.destroy();

    // 更新小说的章节数和字数
    await Novel.decrement('chapter_count', { where: { id: chapter.novel_id } });
    if (chapter.word_count > 0) {
      await Novel.decrement('current_word_count', { 
        by: chapter.word_count, 
        where: { id: chapter.novel_id } 
      });
    }

    logger.info(`章节删除成功: ${chapter.title}`, { 
      userId: ctx.state.user.id, 
      chapterId: chapter.id, 
      novelId: chapter.novel_id 
    });

    ctx.body = {
      success: true,
      message: '章节删除成功'
    };
  } catch (error) {
    logger.error('删除章节失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除章节失败: ' + error.message
    };
  }
});

// 批量删除章节
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

    // 参数验证
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供要删除的章节ID数组'
      };
      return;
    }

    // 验证所有ID都是数字
    const chapterIds = ids.map(id => parseInt(id)).filter(id => !isNaN(id));
    if (chapterIds.length !== ids.length) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '包含无效的章节ID'
      };
      return;
    }

    // 查询所有章节
    const chapters = await Chapter.findAll({
      where: {
        id: { [Op.in]: chapterIds }
      }
    });

    if (chapters.length === 0) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '没有找到要删除的章节'
      };
      return;
    }

    // 检查用户是否有权限操作所有章节
    const unauthorizedChapters = chapters.filter(chapter => 
      chapter.user_id !== ctx.state.user.id && !ctx.state.user.is_admin
    );

    if (unauthorizedChapters.length > 0) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '没有权限操作部分章节'
      };
      return;
    }

    // 统计各小说的章节数和字数变化
    const novelStats = {};
    chapters.forEach(chapter => {
      if (!novelStats[chapter.novel_id]) {
        novelStats[chapter.novel_id] = {
          chapterCount: 0,
          wordCount: 0
        };
      }
      novelStats[chapter.novel_id].chapterCount += 1;
      novelStats[chapter.novel_id].wordCount += chapter.word_count || 0;
    });

    // 批量软删除章节
    await Chapter.destroy({
      where: {
        id: { [Op.in]: chapterIds }
      }
    });

    // 更新各小说的统计数据
    for (const [novelId, stats] of Object.entries(novelStats)) {
      await Novel.decrement('chapter_count', { 
        by: stats.chapterCount, 
        where: { id: parseInt(novelId) } 
      });
      if (stats.wordCount > 0) {
        await Novel.decrement('current_word_count', { 
          by: stats.wordCount, 
          where: { id: parseInt(novelId) } 
        });
      }
    }

    logger.info(`批量删除章节成功`, { 
      userId: ctx.state.user.id, 
      chapterIds: chapterIds,
      count: chapters.length
    });

    ctx.body = {
      success: true,
      message: `成功删除 ${chapters.length} 个章节`
    };
  } catch (error) {
    logger.error('批量删除章节失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量删除章节失败: ' + error.message
    };
  }
});

// 章节点赞
router.post('/:id/like', async (ctx) => {
  try {
    const { id } = ctx.params;

    // 参数验证
    if (!id || isNaN(parseInt(id))) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '无效的章节ID'
      };
      return;
    }

    // 查询章节
    const chapter = await Chapter.findByPk(parseInt(id));
    if (!chapter) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '章节不存在'
      };
      return;
    }

    // 增加点赞数
    await Chapter.increment('like_count', { where: { id: chapter.id } });

    ctx.body = {
      success: true,
      message: '点赞成功',
      data: {
        like_count: chapter.like_count + 1
      }
    };
  } catch (error) {
    logger.error('章节点赞失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '章节点赞失败: ' + error.message
    };
  }
});

// 获取小说的章节列表
router.get('/novel/:novel_id', async (ctx) => {
  try {
    const { novel_id } = ctx.params;
    const {
      page = 1,
      limit = 20,
      status,
      is_free,
      sort_by = 'chapter_number',
      sort_order = 'ASC'
    } = ctx.query;

    // 参数验证
    if (!novel_id || isNaN(parseInt(novel_id))) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '无效的小说ID'
      };
      return;
    }

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // 验证小说是否存在
    const novel = await Novel.findByPk(parseInt(novel_id));
    if (!novel) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '小说不存在'
      };
      return;
    }

    // 权限控制
    const isOwner = ctx.state.user && novel.user_id === ctx.state.user.id;
    const isAdmin = ctx.state.user && ctx.state.user.is_admin;
    const isPublicNovel = novel.is_public;

    if (!isOwner && !isAdmin && !isPublicNovel) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '没有权限查看该小说的章节'
      };
      return;
    }

    // 构建查询条件
    const whereConditions = {
      novel_id: parseInt(novel_id)
    };

    if (status) {
      whereConditions.status = status;
    }

    if (is_free !== undefined) {
      whereConditions.is_free = is_free === 'true';
    }

    // 验证排序字段
    const validSortFields = [
      'id', 'title', 'chapter_number', 'word_count', 'reading_time',
      'status', 'view_count', 'like_count', 'created_at', 'updated_at', 'published_at'
    ];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'chapter_number';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 查询章节列表
    const { count, rows: chapters } = await Chapter.findAndCountAll({
      where: whereConditions,
      order: [[sortField, sortDirection]],
      limit: limitNum,
      offset: offset,
      attributes: {
        exclude: ['deleted_at', 'content'] // 列表不返回内容和软删除字段
      }
    });

    // 计算分页信息
    const totalPages = Math.ceil(count / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    ctx.body = {
      success: true,
      message: '获取章节列表成功',
      data: {
        novel: {
          id: novel.id,
          title: novel.title,
          is_public: novel.is_public
        },
        chapters: chapters.map(chapter => ({
          id: chapter.id,
          title: chapter.title,
          summary: chapter.summary,
          outline: chapter.outline,
          chapter_number: chapter.chapter_number,
          word_count: chapter.word_count,
          character_count: chapter.character_count,
          reading_time: chapter.reading_time,
          status: chapter.status,
          is_free: chapter.is_free,
          price: chapter.price,
          view_count: chapter.view_count,
          like_count: chapter.like_count,
          comment_count: chapter.comment_count,
          unlock_count: chapter.unlock_count,
          published_at: chapter.published_at,
          created_at: chapter.created_at,
          updated_at: chapter.updated_at
        })),
        pagination: {
          current_page: pageNum,
          total_pages: totalPages,
          total_count: count,
          limit: limitNum,
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage
        }
      }
    };
  } catch (error) {
    logger.error('获取小说章节列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取小说章节列表失败: ' + error.message
    };
  }
});

module.exports = router;