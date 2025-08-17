const Router = require('koa-router');
const router = new Router({
  prefix: '/api/characters'
});
const Character = require('../models/character');
const Novel = require('../models/novel');
// Koa中间件：用户认证
const authenticateUser = async (ctx, next) => {
  if (!ctx.state.user) {
    ctx.status = 401;
    ctx.body = {
      success: false,
      message: '未授权访问'
    };
    return;
  }
  await next();
};
const { Op } = require('sequelize');

// 创建人物
router.post('/', authenticateUser, async (ctx) => {
  try {
    const {
      name,
      nickname,
      role,
      gender,
      age,
      age_range,
      occupation,
      title,
      description,
      appearance,
      personality,
      background,
      motivation,
      skills,
      relationships,
      character_arc,
      dialogue_style,
      catchphrase,
      strengths,
      weaknesses,
      fears,
      desires,
      avatar_url,
      importance_level,
      first_appearance_chapter,
      last_appearance_chapter,
      status,
      tags,
      notes,
      novel_id
    } = ctx.request.body;

    // 验证必填字段
    if (!name || !novel_id) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '人物姓名和小说ID为必填项'
      };
      return;
    }

    console.log(novel_id,ctx.state.user.id)
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

    // 检查同一小说中是否已存在同名人物
    const existingCharacter = await Character.findOne({
      where: {
        name,
        novel_id,
        deleted_at: null
      }
    });

    if (existingCharacter) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '该小说中已存在同名人物'
      };
      return;
    }

    // 处理年龄字段：如果是数字则使用，否则设为null并将描述存入age_range
    let processedAge = null;
    let processedAgeRange = age_range;
    
    if (age !== undefined && age !== null) {
      // 尝试转换为数字
      const ageNum = parseInt(age);
      if (!isNaN(ageNum) && ageNum > 0) {
        processedAge = ageNum;
      } else {
        // 如果不是有效数字，将其作为年龄段描述
        processedAgeRange = age;
      }
    }

    // 处理gender字段：空字符串转换为null
    const processedGender = gender === '' ? null : gender;

    // 创建人物
    const character = await Character.create({
      name,
      nickname,
      role: role || 'supporting',
      gender: processedGender,
      age: processedAge,
      age_range: processedAgeRange,
      occupation,
      title,
      description,
      appearance,
      personality,
      background,
      motivation,
      skills,
      relationships,
      character_arc,
      dialogue_style,
      catchphrase,
      strengths,
      weaknesses,
      fears,
      desires,
      avatar_url,
      importance_level: importance_level || 1,
      first_appearance_chapter,
      last_appearance_chapter,
      status: status || 'active',
      tags,
      notes,
      novel_id,
      user_id: ctx.state.user.id
    });

    ctx.status = 201;
    ctx.body = {
      success: true,
      message: '人物创建成功',
      data: character
    };

  } catch (error) {
    console.error('创建人物失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误',
      error: error.message
    };
  }
});

// 批量创建人物
router.post('/batch', authenticateUser, async (ctx) => {
  try {
    const { characters, novel_id } = ctx.request.body;

    // 验证必填字段
    if (!characters || !Array.isArray(characters) || characters.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供要创建的人物列表'
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

    if (characters.length > 20) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '单次最多创建20个人物'
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

    // 验证每个人物的必填字段
    const validationErrors = [];
    const characterNames = [];
    
    for (let i = 0; i < characters.length; i++) {
      const character = characters[i];
      
      if (!character.name) {
        validationErrors.push(`第${i + 1}个人物缺少姓名`);
      } else {
        // 检查批量数据中是否有重名
        if (characterNames.includes(character.name)) {
          validationErrors.push(`第${i + 1}个人物姓名"${character.name}"在批量数据中重复`);
        } else {
          characterNames.push(character.name);
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

    // 检查数据库中是否已存在同名人物
    const existingCharacters = await Character.findAll({
      where: {
        name: { [Op.in]: characterNames },
        novel_id,
        deleted_at: null
      },
      attributes: ['name']
    });

    if (existingCharacters.length > 0) {
      const existingNames = existingCharacters.map(c => c.name);
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '以下人物姓名已存在',
        existing_names: existingNames
      };
      return;
    }

    // 准备批量创建的数据
    const charactersToCreate = characters.map(character => {
      // 处理年龄字段：如果是数字则使用，否则设为null并将描述存入age_range
      let age = null;
      let age_range = character.age_range;
      
      if (character.age !== undefined && character.age !== null) {
        // 尝试转换为数字
        const ageNum = parseInt(character.age);
        if (!isNaN(ageNum) && ageNum > 0) {
          age = ageNum;
        } else {
          // 如果不是有效数字，将其作为年龄段描述
          age_range = character.age;
        }
      }

      // 处理gender字段：空字符串转换为null
      const processedGender = character.gender === '' ? null : character.gender;
      
      return {
        name: character.name,
        nickname: character.nickname,
        role: character.role || 'supporting',
        gender: processedGender,
        age: age,
        age_range: age_range,
      occupation: character.occupation,
      title: character.title,
      description: character.description,
      appearance: character.appearance,
      personality: character.personality,
      background: character.background,
      motivation: character.motivation,
      skills: character.skills,
      relationships: character.relationships,
      character_arc: character.character_arc,
      dialogue_style: character.dialogue_style,
      catchphrase: character.catchphrase,
      strengths: character.strengths,
      weaknesses: character.weaknesses,
      fears: character.fears,
      desires: character.desires,
      avatar_url: character.avatar_url,
      importance_level: character.importance_level || 1,
      first_appearance_chapter: character.first_appearance_chapter,
      last_appearance_chapter: character.last_appearance_chapter,
      status: character.status || 'active',
      tags: character.tags,
      notes: character.notes,
      novel_id,
      user_id: ctx.state.user.id
    };
    });

    // 批量创建人物
    const createdCharacters = await Character.bulkCreate(charactersToCreate, {
      returning: true
    });

    ctx.status = 201;
    ctx.body = {
      success: true,
      message: `成功创建${createdCharacters.length}个人物`,
      data: {
        created_count: createdCharacters.length,
        characters: createdCharacters
      }
    };

  } catch (error) {
    console.error('批量创建人物失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误',
      error: error.message
    };
  }
});

// 获取人物列表
router.get('/', authenticateUser, async (ctx) => {
  try {
    const {
      novel_id,
      role,
      status,
      gender,
      importance_level,
      search,
      page = 1,
      limit = 20,
      sort_by = 'importance_level',
      sort_order = 'DESC'
    } = ctx.query;

    // 构建查询条件
    const whereConditions = {
      user_id: ctx.state.user.id,
      deleted_at: null
    };

    if (novel_id) {
      whereConditions.novel_id = novel_id;
    }

    if (role) {
      whereConditions.role = role;
    }

    if (status) {
      whereConditions.status = status;
    }

    if (gender) {
      whereConditions.gender = gender;
    }

    if (importance_level) {
      whereConditions.importance_level = importance_level;
    }

    if (search) {
      whereConditions[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { nickname: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } },
        { occupation: { [Op.like]: `%${search}%` } },
        { title: { [Op.like]: `%${search}%` } }
      ];
    }

    // 分页参数
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 查询人物列表
    const { count, rows: characters } = await Character.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Novel,
          as: 'novel',
          attributes: ['id', 'title', 'status']
        }
      ],
      order: [[sort_by, sort_order.toUpperCase()]],
      limit: parseInt(limit),
      offset: offset
    });

    // 计算分页信息
    const totalPages = Math.ceil(count / parseInt(limit));

    ctx.body = {
      success: true,
      data: {
        characters: characters.map(character => ({
          id: character.id,
          name: character.name,
          nickname: character.nickname,
          role: character.role,
          gender: character.gender,
          age: character.age,
          age_range: character.age_range,
          occupation: character.occupation,
          title: character.title,
          description: character.description,
          appearance: character.appearance,
          personality: character.personality,
          background: character.background,
          motivation: character.motivation,
          skills: character.skills,
          relationships: character.relationships,
          character_arc: character.character_arc,
          dialogue_style: character.dialogue_style,
          catchphrase: character.catchphrase,
          strengths: character.strengths,
          weaknesses: character.weaknesses,
          fears: character.fears,
          desires: character.desires,
          avatar_url: character.avatar_url,
          importance_level: character.importance_level,
          first_appearance_chapter: character.first_appearance_chapter,
          last_appearance_chapter: character.last_appearance_chapter,
          status: character.status,
          tags: character.tags,
          notes: character.notes,
          novel_id: character.novel_id,
          novel: character.novel,
          created_at: character.created_at,
          updated_at: character.updated_at
        })),
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_count: count,
          per_page: parseInt(limit),
          has_next: parseInt(page) < totalPages,
          has_prev: parseInt(page) > 1
        }
      }
    };

  } catch (error) {
    console.error('获取人物列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误',
      error: error.message
    };
  }
});

// 获取人物详情
router.get('/:id', authenticateUser, async (ctx) => {
  try {
    const { id } = ctx.params;

    const character = await Character.findOne({
      where: {
        id,
        user_id: ctx.state.user.id,
        deleted_at: null
      },
      include: [
        {
          model: Novel,
          as: 'novel',
          attributes: ['id', 'title', 'status', 'description']
        }
      ]
    });

    if (!character) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '人物不存在或无权限访问'
      };
      return;
    }

    ctx.body = {
      success: true,
      data: character
    };

  } catch (error) {
    console.error('获取人物详情失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误',
      error: error.message
    };
  }
});

// 更新人物
router.put('/:id', authenticateUser, async (ctx) => {
  try {
    const { id } = ctx.params;
    const updateData = ctx.request.body;

    // 查找人物
    const character = await Character.findOne({
      where: {
        id,
        user_id: ctx.state.user.id,
        deleted_at: null
      }
    });

    if (!character) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '人物不存在或无权限访问'
      };
      return;
    }

    // 如果更新了姓名，检查是否与同一小说中的其他人物重名
    if (updateData.name && updateData.name !== character.name) {
      const existingCharacter = await Character.findOne({
        where: {
          name: updateData.name,
          novel_id: character.novel_id,
          id: { [Op.ne]: id },
          deleted_at: null
        }
      });

      if (existingCharacter) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '该小说中已存在同名人物'
        };
        return;
      }
    }

    // 如果更新了小说ID，验证新小说是否存在且用户有权限
    if (updateData.novel_id && updateData.novel_id !== character.novel_id) {
      const novel = await Novel.findOne({
        where: {
          id: updateData.novel_id,
          user_id: ctx.state.user.id
        }
      });

      if (!novel) {
        ctx.status = 404;
        ctx.body = {
          success: false,
          message: '目标小说不存在或无权限访问'
        };
        return;
      }
    }

    // 处理年龄字段：如果更新数据中包含age字段，需要进行处理
    if (updateData.age !== undefined) {
      if (updateData.age === null) {
        // 如果明确设置为null，则保持null
        updateData.age = null;
      } else {
        // 尝试转换为数字
        const ageNum = parseInt(updateData.age);
        if (!isNaN(ageNum) && ageNum > 0) {
          updateData.age = ageNum;
        } else {
          // 如果不是有效数字，将其作为年龄段描述，age设为null
          updateData.age_range = updateData.age;
          updateData.age = null;
        }
      }
    }

    // 处理gender字段：空字符串转换为null
    if (updateData.gender !== undefined && updateData.gender === '') {
      updateData.gender = null;
    }

    // 更新人物
    await character.update(updateData);

    // 重新获取更新后的人物信息
    const updatedCharacter = await Character.findOne({
      where: { id },
      include: [
        {
          model: Novel,
          as: 'novel',
          attributes: ['id', 'title', 'status']
        }
      ]
    });

    ctx.body = {
      success: true,
      message: '人物更新成功',
      data: updatedCharacter
    };

  } catch (error) {
    console.error('更新人物失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误',
      error: error.message
    };
  }
});

// 删除人物（软删除）
router.delete('/:id', authenticateUser, async (ctx) => {
  try {
    const { id } = ctx.params;

    const character = await Character.findOne({
      where: {
        id,
        user_id: ctx.state.user.id,
        deleted_at: null
      }
    });

    if (!character) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '人物不存在或无权限访问'
      };
      return;
    }

    // 软删除
    await character.destroy();

    ctx.body = {
      success: true,
      message: '人物删除成功'
    };

  } catch (error) {
    console.error('删除人物失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误',
      error: error.message
    };
  }
});

// 批量删除人物
router.delete('/batch', authenticateUser, async (ctx) => {
  try {
    const { character_ids } = ctx.request.body;

    if (!character_ids || !Array.isArray(character_ids) || character_ids.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供要删除的人物ID列表'
      };
      return;
    }

    if (character_ids.length > 50) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '单次最多删除50个人物'
      };
      return;
    }

    // 查找用户拥有的人物
    const characters = await Character.findAll({
      where: {
        id: { [Op.in]: character_ids },
        user_id: ctx.state.user.id,
        deleted_at: null
      }
    });

    if (characters.length === 0) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '未找到可删除的人物'
      };
      return;
    }

    // 批量软删除
    await Character.destroy({
      where: {
        id: { [Op.in]: characters.map(c => c.id) }
      }
    });

    ctx.body = {
      success: true,
      message: `成功删除${characters.length}个人物`,
      data: {
        deleted_count: characters.length,
        deleted_ids: characters.map(c => c.id)
      }
    };

  } catch (error) {
    console.error('批量删除人物失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误',
      error: error.message
    };
  }
});

// 获取小说的人物列表
router.get('/novel/:novel_id', authenticateUser, async (ctx) => {
  try {
    const { novel_id } = ctx.params;
    const {
      role,
      status,
      importance_level,
      sort_by = 'importance_level',
      sort_order = 'DESC'
    } = ctx.query;

    // 验证小说是否存在且用户有权限
    const novel = await Novel.findOne({
      where: {
        id: novel_id,
        [Op.or]: [
          { user_id: ctx.state.user.id },
          { is_public: true }
        ]
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

    // 构建查询条件
    const whereConditions = {
      novel_id,
      deleted_at: null
    };

    // 如果不是公开小说，只能查看自己的人物
    if (!novel.is_public || novel.user_id === ctx.state.user.id) {
      whereConditions.user_id = ctx.state.user.id;
    }

    if (role) {
      whereConditions.role = role;
    }

    if (status) {
      whereConditions.status = status;
    }

    if (importance_level) {
      whereConditions.importance_level = importance_level;
    }

    // 查询人物列表
    const characters = await Character.findAll({
      where: whereConditions,
      order: [[sort_by, sort_order.toUpperCase()]],
      attributes: [
        'id', 'name', 'nickname', 'role', 'gender', 'age', 'age_range',
        'occupation', 'title', 'description', 'appearance', 'personality',
        'avatar_url', 'importance_level', 'status', 'tags',
        'first_appearance_chapter', 'last_appearance_chapter'
      ]
    });

    ctx.body = {
      success: true,
      data: {
        novel: {
          id: novel.id,
          title: novel.title,
          status: novel.status
        },
        characters,
        total_count: characters.length
      }
    };

  } catch (error) {
    console.error('获取小说人物列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '服务器内部错误',
      error: error.message
    };
  }
});

module.exports = router;