const Router = require('koa-router');
const Novel = require('../models/novel');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { uploadCover, getFileUrl, deleteFile } = require('../utils/upload');

const router = new Router({
  prefix: '/api/novels'
});



// 创建小说（支持封面上传）
router.post('/', async (ctx, next) => {
  try {
    // 处理文件上传
    await uploadCover(ctx, next);
    
    const {
      title,
      subtitle,
      description,
      protagonist,
      characters,
      world_setting,
      plot_outline,
      chapter_outline,
      genre,
      sub_genre,
      atmosphere,
      target_word_count,
      tags,
      style,
      tone,
      target_audience,
      language = 'zh-CN',
      status = 'planning',
      generation_settings,
      ai_model_used,
      is_public = false,
      is_original = true,
      copyright_info,
      category_id,
      writing_style_id,
      novel_type_id,
      metadata
    } = ctx.request.body;

    // 验证用户认证
    if (!ctx.state.user) {
      // 如果上传了文件但认证失败，删除已上传的文件
      if (ctx.file) {
        try {
          await deleteFile(ctx.file.path);
        } catch (deleteError) {
          logger.error('删除上传文件失败:', deleteError);
        }
      }
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
      // 如果上传了文件但验证失败，删除已上传的文件
      if (ctx.file) {
        try {
          await deleteFile(ctx.file.path);
        } catch (deleteError) {
          logger.error('删除上传文件失败:', deleteError);
        }
      }
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '小说标题不能为空'
      };
      return;
    }

    // 验证标题长度
    if (title.length > 200) {
      if (ctx.file) {
        try {
          await deleteFile(ctx.file.path);
        } catch (deleteError) {
          logger.error('删除上传文件失败:', deleteError);
        }
      }
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '小说标题不能超过200个字符'
      };
      return;
    }

    // 验证状态
    const validStatuses = ['planning', 'writing', 'paused', 'completed', 'published', 'archived'];
    if (!validStatuses.includes(status)) {
      if (ctx.file) {
        try {
          await deleteFile(ctx.file.path);
        } catch (deleteError) {
          logger.error('删除上传文件失败:', deleteError);
        }
      }
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '小说状态无效，必须是: ' + validStatuses.join(', ')
      };
      return;
    }

    // 检查同名小说是否存在
    const existingNovel = await Novel.findOne({
      where: {
        title,
        user_id
      }
    });

    if (existingNovel) {
      if (ctx.file) {
        try {
          await deleteFile(ctx.file.path);
        } catch (deleteError) {
          logger.error('删除上传文件失败:', deleteError);
        }
      }
      ctx.status = 409;
      ctx.body = {
        success: false,
        message: '该用户已存在同名小说'
      };
      return;
    }

    // 处理封面图片
    let cover_image = null;
    if (ctx.file) {
      cover_image = getFileUrl(ctx.file.filename);
    }

    // 创建小说
    const novel = await Novel.create({
      title,
      subtitle,
      description,
      cover_image,
      protagonist,
      characters,
      world_setting,
      plot_outline,
      chapter_outline,
      genre,
      sub_genre,
      atmosphere,
      target_word_count,
      tags,
      style,
      tone,
      target_audience,
      language,
      status,
      generation_settings,
      ai_model_used,
      is_public,
      is_original,
      copyright_info,
      user_id,
      category_id,
      writing_style_id,
      novel_type_id,
      metadata
    });

    logger.info(`小说创建成功: ${title}`, { userId: user_id, novelId: novel.id, hasCover: !!cover_image });

    ctx.status = 201;
    ctx.body = {
      success: true,
      message: '小说创建成功',
      data: {
        id: novel.id,
        title: novel.title,
        subtitle: novel.subtitle,
        description: novel.description,
        cover_image: novel.cover_image,
        protagonist: novel.protagonist,
        characters: novel.characters,
        world_setting: novel.world_setting,
        plot_outline: novel.plot_outline,
        chapter_outline: novel.chapter_outline,
        genre: novel.genre,
        sub_genre: novel.sub_genre,
        atmosphere: novel.atmosphere,
        target_word_count: novel.target_word_count,
        current_word_count: novel.current_word_count,
        chapter_count: novel.chapter_count,
        tags: novel.tags,
        style: novel.style,
        tone: novel.tone,
        target_audience: novel.target_audience,
        language: novel.language,
        status: novel.status,
        writing_progress: novel.writing_progress,
        generation_settings: novel.generation_settings,
        ai_model_used: novel.ai_model_used,
        is_public: novel.is_public,
        is_original: novel.is_original,
        copyright_info: novel.copyright_info,
        user_id: novel.user_id,
        category_id: novel.category_id,
        writing_style_id: novel.writing_style_id,
        novel_type_id: novel.novel_type_id,
        metadata: novel.metadata,
        created_at: novel.created_at
      }
    };
  } catch (error) {
    // 如果出错且上传了文件，删除已上传的文件
    if (ctx.file) {
      try {
        await deleteFile(ctx.file.path);
      } catch (deleteError) {
        logger.error('删除上传文件失败:', deleteError);
      }
    }
    
    logger.error('创建小说失败:', error);
    
    // 处理文件上传相关错误
    if (error.code === 'LIMIT_FILE_SIZE') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '封面文件大小不能超过5MB'
      };
      return;
    }
    
    if (error.message.includes('只支持上传')) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: error.message
      };
      return;
    }
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建小说失败: ' + error.message
    };
  }
});

// 管理员获取所有小说列表
router.get('/admin', async (ctx) => {
  try {
    // 验证管理员权限
    if (!ctx.state.user?.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '权限不足，仅管理员可访问'
      };
      return;
    }

    const {
      page = 1,
      limit = 10,
      search,
      genre,
      sub_genre,
      atmosphere,
      status,
      language,
      is_public,
      is_featured,
      is_original,
      user_id,
      category_id,
      writing_style_id,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = ctx.query;

    // 参数验证
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // 构建查询条件
    const whereConditions = {};

    if (search) {
      whereConditions[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { subtitle: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { protagonist: { [Op.like]: `%${search}%` } }
      ];
    }

    if (genre) {
      whereConditions.genre = genre;
    }

    if (sub_genre) {
      whereConditions.sub_genre = sub_genre;
    }

    if (atmosphere) {
      whereConditions.atmosphere = atmosphere;
    }

    if (status) {
      whereConditions.status = status;
    }

    if (language) {
      whereConditions.language = language;
    }

    if (is_public !== undefined) {
      whereConditions.is_public = is_public === 'true';
    }

    if (is_featured !== undefined) {
      whereConditions.is_featured = is_featured === 'true';
    }

    if (is_original !== undefined) {
      whereConditions.is_original = is_original === 'true';
    }

    if (user_id) {
      whereConditions.user_id = parseInt(user_id);
    }

    if (category_id) {
      whereConditions.category_id = parseInt(category_id);
    }

    if (writing_style_id) {
      whereConditions.writing_style_id = parseInt(writing_style_id);
    }

    // 验证排序字段
    const validSortFields = [
      'id', 'title', 'created_at', 'updated_at', 'published_at',
      'rating', 'view_count', 'like_count', 'favorite_count',
      'writing_progress', 'current_word_count', 'chapter_count'
    ];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 查询小说列表（管理员可以看到所有小说）
    const { count, rows: novels } = await Novel.findAndCountAll({
      where: whereConditions,
      order: [[sortField, sortDirection]],
      limit: limitNum,
      offset: offset,
      attributes: {
        exclude: ['deleted_at'] // 不返回软删除字段
      }
    });

    // 计算分页信息
    const totalPages = Math.ceil(count / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    ctx.body = {
      success: true,
      message: '获取小说列表成功',
      data: {
        novels: novels.map(novel => ({
          id: novel.id,
          title: novel.title,
          subtitle: novel.subtitle,
          description: novel.description,
          cover_image: novel.cover_image,
          protagonist: novel.protagonist,
          genre: novel.genre,
          sub_genre: novel.sub_genre,
          atmosphere: novel.atmosphere,
          target_word_count: novel.target_word_count,
          current_word_count: novel.current_word_count,
          chapter_count: novel.chapter_count,
          tags: novel.tags,
          style: novel.style,
          tone: novel.tone,
          target_audience: novel.target_audience,
          language: novel.language,
          status: novel.status,
          writing_progress: novel.writing_progress,
          rating: novel.rating,
          rating_count: novel.rating_count,
          view_count: novel.view_count,
          like_count: novel.like_count,
          favorite_count: novel.favorite_count,
          is_public: novel.is_public,
          is_featured: novel.is_featured,
          is_original: novel.is_original,
          user_id: novel.user_id,
          category_id: novel.category_id,
          writing_style_id: novel.writing_style_id,
          last_chapter_at: novel.last_chapter_at,
          published_at: novel.published_at,
          completed_at: novel.completed_at,
          created_at: novel.created_at,
          updated_at: novel.updated_at
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
    logger.error('获取小说列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取小说列表失败: ' + error.message
    };
  }
});

// 用户获取自己的小说列表
router.get('/my', async (ctx) => {
  try {
    // 验证用户认证
    if (!ctx.state.user) {
      // 如果上传了文件但认证失败，删除已上传的文件
      if (ctx.file) {
        try {
          await deleteFile(ctx.file.path);
        } catch (deleteError) {
          logger.error('删除上传文件失败:', deleteError);
        }
      }
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户未认证，请先登录'
      };
      return;
    }

    const {
      page = 1,
      limit = 10,
      search,
      genre,
      sub_genre,
      atmosphere,
      status,
      language,
      is_public,
      is_featured,
      is_original,
      category_id,
      writing_style_id,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = ctx.query;

    // 参数验证
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    // 构建查询条件（只能查看自己的小说）
    const whereConditions = {
      user_id: ctx.state.user.id
    };

    if (search) {
      whereConditions[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { subtitle: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { protagonist: { [Op.like]: `%${search}%` } }
      ];
    }

    if (genre) {
      whereConditions.genre = genre;
    }

    if (sub_genre) {
      whereConditions.sub_genre = sub_genre;
    }

    if (atmosphere) {
      whereConditions.atmosphere = atmosphere;
    }

    if (status) {
      whereConditions.status = status;
    }

    if (language) {
      whereConditions.language = language;
    }

    if (is_public !== undefined) {
      whereConditions.is_public = is_public === 'true';
    }

    if (is_featured !== undefined) {
      whereConditions.is_featured = is_featured === 'true';
    }

    if (is_original !== undefined) {
      whereConditions.is_original = is_original === 'true';
    }

    if (category_id) {
      whereConditions.category_id = parseInt(category_id);
    }

    if (writing_style_id) {
      whereConditions.writing_style_id = parseInt(writing_style_id);
    }

    // 验证排序字段
    const validSortFields = [
      'id', 'title', 'created_at', 'updated_at', 'published_at',
      'rating', 'view_count', 'like_count', 'favorite_count',
      'writing_progress', 'current_word_count', 'chapter_count'
    ];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 查询用户自己的小说列表
    const { count, rows: novels } = await Novel.findAndCountAll({
      where: whereConditions,
      order: [[sortField, sortDirection]],
      limit: limitNum,
      offset: offset,
      attributes: {
        exclude: ['deleted_at'] // 不返回软删除字段
      }
    });

    // 计算分页信息
    const totalPages = Math.ceil(count / limitNum);
    const hasNextPage = pageNum < totalPages;
    const hasPrevPage = pageNum > 1;

    ctx.body = {
      success: true,
      message: '获取我的小说列表成功',
      data: {
        novels: novels.map(novel => ({
          id: novel.id,
          title: novel.title,
          subtitle: novel.subtitle,
          description: novel.description,
          cover_image: novel.cover_image,
          protagonist: novel.protagonist,
          genre: novel.genre,
          sub_genre: novel.sub_genre,
          atmosphere: novel.atmosphere,
          target_word_count: novel.target_word_count,
          current_word_count: novel.current_word_count,
          chapter_count: novel.chapter_count,
          tags: novel.tags,
          style: novel.style,
          tone: novel.tone,
          target_audience: novel.target_audience,
          language: novel.language,
          status: novel.status,
          writing_progress: novel.writing_progress,
          rating: novel.rating,
          rating_count: novel.rating_count,
          view_count: novel.view_count,
          like_count: novel.like_count,
          favorite_count: novel.favorite_count,
          is_public: novel.is_public,
          is_featured: novel.is_featured,
          is_original: novel.is_original,
          user_id: novel.user_id,
          category_id: novel.category_id,
          writing_style_id: novel.writing_style_id,
          last_chapter_at: novel.last_chapter_at,
          published_at: novel.published_at,
          completed_at: novel.completed_at,
          created_at: novel.created_at,
          updated_at: novel.updated_at
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
    logger.error('获取我的小说列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取我的小说列表失败: ' + error.message
    };
  }
});

// 获取小说详情
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;

    // 参数验证
    if (!id || isNaN(parseInt(id))) {
      if (ctx.file) {
        try {
          await deleteFile(ctx.file.path);
        } catch (deleteError) {
          logger.error('删除上传文件失败:', deleteError);
        }
      }
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '无效的小说ID'
      };
      return;
    }

    // 查询小说
    const novel = await Novel.findByPk(parseInt(id), {
      attributes: {
        exclude: ['deleted_at']
      }
    });

    if (!novel) {
      if (ctx.file) {
        try {
          await deleteFile(ctx.file.path);
        } catch (deleteError) {
          logger.error('删除上传文件失败:', deleteError);
        }
      }
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '小说不存在'
      };
      return;
    }

    // 权限检查：如果不是公开小说，只有作者和管理员可以查看
    if (!novel.is_public && 
        novel.user_id !== ctx.state.user?.id && 
        !ctx.state.user?.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权访问该小说'
      };
      return;
    }

    // 增加查看次数（异步执行，不影响响应）
    Novel.increment('view_count', { where: { id: novel.id } }).catch(err => {
      logger.error('更新查看次数失败:', err);
    });

    ctx.body = {
      success: true,
      message: '获取小说详情成功',
      data: {
        id: novel.id,
        title: novel.title,
        subtitle: novel.subtitle,
        description: novel.description,
        cover_image: novel.cover_image,
        protagonist: novel.protagonist,
        characters: novel.characters,
        world_setting: novel.world_setting,
        plot_outline: novel.plot_outline,
        chapter_outline: novel.chapter_outline,
        genre: novel.genre,
        sub_genre: novel.sub_genre,
        atmosphere: novel.atmosphere,
        target_word_count: novel.target_word_count,
        current_word_count: novel.current_word_count,
        chapter_count: novel.chapter_count,
        tags: novel.tags,
        style: novel.style,
        tone: novel.tone,
        target_audience: novel.target_audience,
        language: novel.language,
        status: novel.status,
        writing_progress: novel.writing_progress,
        generation_settings: novel.generation_settings,
        ai_model_used: novel.ai_model_used,
        total_tokens_used: novel.total_tokens_used,
        total_cost: novel.total_cost,
        rating: novel.rating,
        rating_count: novel.rating_count,
        view_count: novel.view_count,
        like_count: novel.like_count,
        favorite_count: novel.favorite_count,
        share_count: novel.share_count,
        comment_count: novel.comment_count,
        is_public: novel.is_public,
        is_featured: novel.is_featured,
        is_original: novel.is_original,
        copyright_info: novel.copyright_info,
        user_id: novel.user_id,
        category_id: novel.category_id,
        writing_style_id: novel.writing_style_id,
        last_chapter_at: novel.last_chapter_at,
        published_at: novel.published_at,
        completed_at: novel.completed_at,
        metadata: novel.metadata,
        created_at: novel.created_at,
        updated_at: novel.updated_at
      }
    };
  } catch (error) {
    logger.error('获取小说详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取小说详情失败: ' + error.message
    };
  }
});

// 更新小说
router.put('/:id', async (ctx, next) => {
  try {
    // 处理文件上传
    await uploadCover(ctx, next);
    
    const { id } = ctx.params;
    const updateData = { ...ctx.request.body };

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
        message: '无效的小说ID'
      };
      return;
    }

    // 查询小说
    const novel = await Novel.findByPk(parseInt(id));

    if (!novel) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '小说不存在'
      };
      return;
    }

    // 权限检查：只有作者和管理员可以修改
    if (novel.user_id !== ctx.state.user.id && !ctx.state.user.is_admin) {
      if (ctx.file) {
        try {
          await deleteFile(ctx.file.path);
        } catch (deleteError) {
          logger.error('删除上传文件失败:', deleteError);
        }
      }
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权修改该小说'
      };
      return;
    }

    // 过滤不允许更新的字段
    const allowedFields = [
      'title', 'subtitle', 'description', 'cover_image', 'protagonist',
      'characters', 'world_setting', 'plot_outline', 'chapter_outline',
      'genre', 'sub_genre', 'atmosphere', 'target_word_count',
      'current_word_count', 'chapter_count', 'tags', 'style', 'tone',
      'target_audience', 'language', 'status', 'writing_progress',
      'generation_settings', 'ai_model_used', 'total_tokens_used',
      'total_cost', 'is_public', 'is_original', 'copyright_info',
      'category_id', 'writing_style_id', 'last_chapter_at',
      'published_at', 'completed_at', 'metadata'
    ];

    // 管理员可以修改额外字段
    if (ctx.state.user.is_admin) {
      allowedFields.push('is_featured', 'rating', 'rating_count');
    }

    // 处理上传的封面文件
    if (ctx.file) {
      updateData.cover_image = getFileUrl(ctx.file.filename);
    }

    const filteredUpdateData = {};
    for (const field of allowedFields) {
      if (updateData.hasOwnProperty(field)) {
        filteredUpdateData[field] = updateData[field];
      }
    }

    // 验证状态
    if (filteredUpdateData.status) {
      const validStatuses = ['planning', 'writing', 'paused', 'completed', 'published', 'archived'];
      if (!validStatuses.includes(filteredUpdateData.status)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '小说状态无效，必须是: ' + validStatuses.join(', ')
        };
        return;
      }
    }

    // 验证标题长度
    if (filteredUpdateData.title && filteredUpdateData.title.length > 200) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '小说标题不能超过200个字符'
      };
      return;
    }

    // 检查同名小说（如果修改了标题）
    if (filteredUpdateData.title && filteredUpdateData.title !== novel.title) {
      const existingNovel = await Novel.findOne({
        where: {
          title: filteredUpdateData.title,
          user_id: novel.user_id,
          id: { [Op.ne]: novel.id }
        }
      });

      if (existingNovel) {
        ctx.status = 409;
        ctx.body = {
          success: false,
          message: '该用户已存在同名小说'
        };
        return;
      }
    }

    // 更新小说
    await novel.update(filteredUpdateData);

    logger.info(`小说更新成功: ${novel.title}`, { 
      userId: ctx.state.user.id, 
      novelId: novel.id,
      updatedFields: Object.keys(filteredUpdateData)
    });

    // 重新查询获取最新数据
    const updatedNovel = await Novel.findByPk(novel.id, {
      attributes: {
        exclude: ['deleted_at']
      }
    });

    ctx.status = 200;
    ctx.body = {
      success: true,
      message: '小说更新成功',
      data: {
        id: updatedNovel.id,
        title: updatedNovel.title,
        subtitle: updatedNovel.subtitle,
        description: updatedNovel.description,
        cover_image: updatedNovel.cover_image,
        protagonist: updatedNovel.protagonist,
        characters: updatedNovel.characters,
        world_setting: updatedNovel.world_setting,
        plot_outline: updatedNovel.plot_outline,
        chapter_outline: updatedNovel.chapter_outline,
        genre: updatedNovel.genre,
        sub_genre: updatedNovel.sub_genre,
        atmosphere: updatedNovel.atmosphere,
        target_word_count: updatedNovel.target_word_count,
        current_word_count: updatedNovel.current_word_count,
        chapter_count: updatedNovel.chapter_count,
        tags: updatedNovel.tags,
        style: updatedNovel.style,
        tone: updatedNovel.tone,
        target_audience: updatedNovel.target_audience,
        language: updatedNovel.language,
        status: updatedNovel.status,
        writing_progress: updatedNovel.writing_progress,
        generation_settings: updatedNovel.generation_settings,
        ai_model_used: updatedNovel.ai_model_used,
        total_tokens_used: updatedNovel.total_tokens_used,
        total_cost: updatedNovel.total_cost,
        rating: updatedNovel.rating,
        rating_count: updatedNovel.rating_count,
        view_count: updatedNovel.view_count,
        like_count: updatedNovel.like_count,
        favorite_count: updatedNovel.favorite_count,
        share_count: updatedNovel.share_count,
        comment_count: updatedNovel.comment_count,
        is_public: updatedNovel.is_public,
        is_featured: updatedNovel.is_featured,
        is_original: updatedNovel.is_original,
        copyright_info: updatedNovel.copyright_info,
        user_id: updatedNovel.user_id,
        category_id: updatedNovel.category_id,
        writing_style_id: updatedNovel.writing_style_id,
        last_chapter_at: updatedNovel.last_chapter_at,
        published_at: updatedNovel.published_at,
        completed_at: updatedNovel.completed_at,
        metadata: updatedNovel.metadata,
        created_at: updatedNovel.created_at,
        updated_at: updatedNovel.updated_at
      }
    };
  } catch (error) {
    // 如果上传了文件但更新失败，删除已上传的文件
    if (ctx.file) {
      try {
        await deleteFile(ctx.file.path);
      } catch (deleteError) {
        logger.error('删除上传文件失败:', deleteError);
      }
    }
    
    logger.error('更新小说失败:', error);
    
    // 处理特定的文件上传错误
    if (error.code === 'LIMIT_FILE_SIZE') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '文件大小超过限制（最大5MB）'
      };
      return;
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '不支持的文件类型，请上传图片文件'
      };
      return;
    }
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新小说失败: ' + error.message
    };
  }
});

// 删除小说
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
        message: '无效的小说ID'
      };
      return;
    }

    // 查询小说
    const novel = await Novel.findByPk(parseInt(id));

    if (!novel) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '小说不存在'
      };
      return;
    }

    // 权限检查：只有作者和管理员可以删除
    if (novel.user_id !== ctx.state.user.id && !ctx.state.user.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权删除该小说'
      };
      return;
    }

    // 软删除小说
    await novel.destroy();

    logger.info(`小说删除成功: ${novel.title}`, { 
      userId: ctx.state.user.id, 
      novelId: novel.id 
    });

    ctx.body = {
      success: true,
      message: '小说删除成功',
      data: {
        id: novel.id,
        title: novel.title
      }
    };
  } catch (error) {
    logger.error('删除小说失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除小说失败: ' + error.message
    };
  }
});

// 批量删除小说
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
        message: '请提供要删除的小说ID数组'
      };
      return;
    }

    // 验证ID格式
    const validIds = ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
    if (validIds.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '无效的小说ID'
      };
      return;
    }

    // 查询要删除的小说
    const whereCondition = {
      id: { [Op.in]: validIds }
    };

    // 如果不是管理员，只能删除自己的小说
    if (!ctx.state.user.is_admin) {
      whereCondition.user_id = ctx.state.user.id;
    }

    const novels = await Novel.findAll({
      where: whereCondition,
      attributes: ['id', 'title', 'user_id']
    });

    if (novels.length === 0) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '没有找到可删除的小说'
      };
      return;
    }

    // 批量软删除
    const deletedCount = await Novel.destroy({
      where: whereCondition
    });

    logger.info(`批量删除小说成功`, { 
      userId: ctx.state.user.id, 
      deletedCount,
      novelIds: novels.map(n => n.id)
    });

    ctx.body = {
      success: true,
      message: `成功删除 ${deletedCount} 部小说`,
      data: {
        deleted_count: deletedCount,
        deleted_novels: novels.map(novel => ({
          id: novel.id,
          title: novel.title
        }))
      }
    };
  } catch (error) {
    logger.error('批量删除小说失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量删除小说失败: ' + error.message
    };
  }
});

// 小说统计信息
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

    // 获取统计数据
    const [totalCount, statusStats, genreStats] = await Promise.all([
      // 总数统计
      Novel.count({ where: whereCondition }),
      
      // 状态统计
      Novel.findAll({
        where: whereCondition,
        attributes: [
          'status',
          [Novel.sequelize.fn('COUNT', Novel.sequelize.col('id')), 'count']
        ],
        group: ['status'],
        raw: true
      }),
      
      // 题材统计
      Novel.findAll({
        where: {
          ...whereCondition,
          genre: { [Op.ne]: null }
        },
        attributes: [
          'genre',
          [Novel.sequelize.fn('COUNT', Novel.sequelize.col('id')), 'count']
        ],
        group: ['genre'],
        order: [[Novel.sequelize.fn('COUNT', Novel.sequelize.col('id')), 'DESC']],
        limit: 10,
        raw: true
      })
    ]);

    // 获取总字数和平均进度
    const aggregateStats = await Novel.findOne({
      where: whereCondition,
      attributes: [
        [Novel.sequelize.fn('SUM', Novel.sequelize.col('current_word_count')), 'total_words'],
        [Novel.sequelize.fn('AVG', Novel.sequelize.col('writing_progress')), 'avg_progress']
      ],
      raw: true
    });

    ctx.body = {
      success: true,
      message: '获取小说统计信息成功',
      data: {
        total_novels: totalCount,
        total_words: parseInt(aggregateStats.total_words) || 0,
        average_progress: parseFloat(aggregateStats.avg_progress) || 0,
        status_distribution: statusStats.reduce((acc, item) => {
          acc[item.status] = parseInt(item.count);
          return acc;
        }, {}),
        genre_distribution: genreStats.map(item => ({
          genre: item.genre,
          count: parseInt(item.count)
        }))
      }
    };
  } catch (error) {
    logger.error('获取小说统计信息失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取小说统计信息失败: ' + error.message
    };
  }
});

module.exports = router;