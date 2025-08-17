const Router = require('koa-router');
const User = require('../models/user');
const InviteRecord = require('../models/inviteRecord');
const Novel = require('../models/novel');
const Chapter = require('../models/chapter');
const ShortStory = require('../models/shortStory');
const Character = require('../models/character');
const Worldview = require('../models/worldview');
const Corpus = require('../models/corpus');
const Timeline = require('../models/timeline');
const cryptoUtils = require('../utils/crypto');
const logger = require('../utils/logger');
const { Op } = require('sequelize');
const MembershipService = require('../services/membershipService');

const router = new Router({
  prefix: '/api/users'
});

// 参数验证中间件
const validateRequired = (fields) => {
  return async (ctx, next) => {
    const missing = fields.filter(field => !ctx.request.body[field]);
    if (missing.length > 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: `缺少必填字段: ${missing.join(', ')}`
      };
      return;
    }
    await next();
  };
};

// 邮箱格式验证
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// 1. 创建用户 POST /api/users
router.post('/', validateRequired(['username', 'email', 'password']), async (ctx) => {
  try {
    const { username, email, password, phone, nickname, gender, birthday, role = 'user', invite_code } = ctx.request.body;
    
    // 验证邮箱格式
    if (!validateEmail(email)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '邮箱格式不正确'
      };
      return;
    }
    
    // 检查用户名和邮箱是否已存在
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });
    
    if (existingUser) {
      ctx.status = 409;
      ctx.body = {
        success: false,
        message: existingUser.username === username ? '用户名已存在' : '邮箱已存在'
      };
      return;
    }
    
    // 验证邀请码（如果提供）
    let inviteRecord = null;
    let inviterUser = null;
    if (invite_code) {
      // 首先在InviteRecord表中查找邀请码
      inviteRecord = await InviteRecord.findOne({
        where: {
          invite_code,
          status: 'pending',
          expire_time: {
            [Op.gt]: new Date()
          }
        },
        include: [{
          model: User,
          as: 'inviter',
          attributes: ['id', 'username', 'nickname']
        }]
      });
      
      // 如果在InviteRecord表中没找到，在User表中查找
      if (!inviteRecord) {
        inviterUser = await User.findOne({
          where: { invite_code },
          attributes: ['id', 'username', 'nickname']
        });
        
        if (!inviterUser) {
          ctx.status = 400;
          ctx.body = {
            success: false,
            message: '邀请码无效或已过期'
          };
          return;
        }
      }
    }
    
    // 加密密码
    const hashedPassword = await cryptoUtils.hashPassword(password);
    
    // 创建用户
    const userData = {
      username,
      email,
      password: hashedPassword,
      phone,
      nickname: nickname || username,
      gender: gender || 'unknown',
      birthday,
      role: ['user', 'vip', 'admin'].includes(role) ? role : 'user',
      status: 'active'
    };
    
    const user = await User.create(userData);
    
    // 为新用户生成邀请码
    const inviteCode = cryptoUtils.generateInviteCode(user.id);
    await user.update({ invite_code: inviteCode });
    user.invite_code = inviteCode;
    
    // 更新邀请记录（如果使用了邀请码）
    if (inviteRecord) {
      // 如果是InviteRecord表中的邀请码，更新记录
      await inviteRecord.update({
        invitee_id: user.id,
        invitee_username: user.username,
        invitee_email: user.email,
        invitee_phone: user.phone,
        status: 'registered',
        register_time: new Date(),
        register_ip: ctx.request.ip || ctx.request.header['x-forwarded-for'] || ctx.request.header['x-real-ip']
      });
      
      logger.info(`用户 ${username} 通过邀请码 ${invite_code} 注册成功`);
    } else if (inviterUser) {
      // 如果是User表中的邀请码，创建新的邀请记录
      // 生成新的唯一邀请码用于记录，避免重复
      let recordInviteCode;
      let isUnique = false;
      while (!isUnique) {
        recordInviteCode = cryptoUtils.generateInviteCode(user.id);
        const existingRecord = await InviteRecord.findOne({
          where: { invite_code: recordInviteCode }
        });
        if (!existingRecord) {
          isUnique = true;
        }
      }
      await InviteRecord.create({
        inviter_id: inviterUser.id,
        invitee_id: user.id,
        invitee_username: user.username,
        invitee_email: user.email,
        invitee_phone: user.phone,
        invite_code: recordInviteCode, // 使用新生成的唯一邀请码
        status: 'registered',
        commission_rate: 0.1, // 默认佣金比例
        register_time: new Date(),
        register_ip: ctx.request.ip || ctx.request.header['x-forwarded-for'] || ctx.request.header['x-real-ip'],
        source: 'user_invite_code',
        metadata: {
          original_invite_code: invite_code // 保存原始邀请码用于追踪
        }
      });
      
      logger.info(`用户 ${username} 通过用户邀请码 ${invite_code} 注册成功`);
    }
    
    // 移除密码字段
    const { password: _, ...userResponse } = user.toJSON();
    
    logger.info(`用户创建成功: ${username}`);
    
    ctx.status = 201;
    ctx.body = {
      success: true,
      message: '用户创建成功',
      data: {
        ...userResponse,
        invite_info: inviteRecord ? {
          inviter: inviteRecord.inviter,
          commission_rate: inviteRecord.commission_rate
        } : inviterUser ? {
          inviter: {
            id: inviterUser.id,
            username: inviterUser.username,
            nickname: inviterUser.nickname
          },
          commission_rate: 0.1
        } : null
      }
    };
    
  } catch (error) {
    logger.error('创建用户失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '创建用户失败',
      error: error.message
    };
  }
});

// 2. 获取用户列表 GET /api/users
router.get('/', async (ctx) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search, 
      role, 
      status,
      sortBy = 'created_at',
      sortOrder = 'DESC'
    } = ctx.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = {};
    
    // 搜索条件
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { nickname: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // 角色筛选
    if (role) {
      whereClause.role = role;
    }
    
    // 状态筛选
    if (status) {
      whereClause.status = status;
    }
    
    const { count, rows } = await User.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]]
    });
    
    // 为每个用户添加剩余次数信息
    const usersWithCredits = await Promise.all(rows.map(async (user) => {
      try {
        const remainingCredits = await MembershipService.getUserRemainingCredits(user.id);
        return {
          ...user.toJSON(),
          remaining_credits: remainingCredits
        };
      } catch (error) {
        logger.error(`获取用户 ${user.id} 剩余次数失败:`, error);
        return {
          ...user.toJSON(),
          remaining_credits: 0
        };
      }
    }));
    
    ctx.body = {
      success: true,
      data: {
        users: usersWithCredits,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }
    };
    
  } catch (error) {
    logger.error('获取用户列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取用户列表失败',
      error: error.message
    };
  }
});

// 3. 获取单个用户 GET /api/users/:id
router.get('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }
    
    // 验证用户权限：只能修改自己的密码或管理员可以修改任何用户密码
    if (currentUser.username !== username && !currentUser.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权限修改此用户密码'
      };
      return;
    }
    
    ctx.body = {
      success: true,
      data: user
    };
    
  } catch (error) {
    logger.error('获取用户信息失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取用户信息失败',
      error: error.message
    };
  }
});

// 4. 更新用户 PUT /api/users/:id
router.put('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const updateData = ctx.request.body;
    
    // 查找用户
    const user = await User.findByPk(id);
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }
    
    // 不允许直接更新的字段
    const restrictedFields = ['id', 'created_at', 'updated_at', 'deleted_at'];
    restrictedFields.forEach(field => delete updateData[field]);
    
    // 如果更新邮箱，检查是否已存在
    if (updateData.email && updateData.email !== user.email) {
      if (!validateEmail(updateData.email)) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '邮箱格式不正确'
        };
        return;
      }
      
      const existingEmail = await User.findOne({
        where: { 
          email: updateData.email,
          id: { [Op.ne]: id }
        }
      });
      
      if (existingEmail) {
        ctx.status = 409;
        ctx.body = {
          success: false,
          message: '邮箱已存在'
        };
        return;
      }
    }
    
    // 如果更新用户名，检查是否已存在
    if (updateData.username && updateData.username !== user.username) {
      const existingUsername = await User.findOne({
        where: { 
          username: updateData.username,
          id: { [Op.ne]: id }
        }
      });
      
      if (existingUsername) {
        ctx.status = 409;
        ctx.body = {
          success: false,
          message: '用户名已存在'
        };
        return;
      }
    }
    
    // 如果更新密码，进行加密
    if (updateData.password) {
      updateData.password = await cryptoUtils.hashPassword(updateData.password);
    }
    
    // 验证角色字段
    if (updateData.role && !['user', 'vip', 'admin', 'prompt_expert'].includes(updateData.role)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '无效的用户角色'
      };
      return;
    }
    
    // 验证状态字段
    if (updateData.status && !['active', 'inactive', 'banned', 'pending'].includes(updateData.status)) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '无效的用户状态'
      };
      return;
    }
    
    // 更新用户
    await user.update(updateData);
    
    // 获取更新后的用户信息（不包含密码）
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    
    logger.info(`用户更新成功: ${user.username}`);
    
    ctx.body = {
      success: true,
      message: '用户更新成功',
      data: updatedUser
    };
    
  } catch (error) {
    logger.error('更新用户失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '更新用户失败',
      error: error.message
    };
  }
});

// 5. 修改密码 PUT /api/users/:username/password
router.put('/:username/password', validateRequired(['current_password', 'new_password']), async (ctx) => {
  try {
    const { username } = ctx.params;
    const { current_password, new_password } = ctx.request.body;
    const currentUser = ctx.state.user;
    
    // 查找目标用户
    const user = await User.findOne({ where: { username } });
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }
    
    // 验证新密码格式
    if (new_password.length < 6) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '新密码长度不能少于6位'
      };
      return;
    }
    
    // 非管理员需要验证当前密码
    if (!currentUser.is_admin || currentUser.username === username) {
      const isCurrentPasswordValid = await cryptoUtils.verifyPassword(current_password, user.password);
      if (!isCurrentPasswordValid) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '当前密码错误'
        };
        return;
      }
    }
    
    // 加密新密码
    const hashedNewPassword = await cryptoUtils.hashPassword(new_password);
    
    // 更新密码
    await user.update({ password: hashedNewPassword });
    
    logger.info(`用户密码修改成功: ${user.username}`);
    
    ctx.body = {
      success: true,
      message: '密码修改成功'
    };
    
  } catch (error) {
    logger.error('修改密码失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '修改密码失败',
      error: error.message
    };
  }
});

// 6. 删除用户 DELETE /api/users/:id
router.delete('/:id', async (ctx) => {
  try {
    const { id } = ctx.params;
    const { force = false } = ctx.query; // 是否强制删除（物理删除）
    
    const user = await User.findByPk(id);
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }
    
    // 防止删除管理员
    if (user.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '不能删除管理员账户'
      };
      return;
    }
    
    if (force === 'true') {
      // 物理删除
      await user.destroy({ force: true });
      logger.warn(`用户被物理删除: ${user.username}`);
    } else {
      // 软删除
      await user.destroy();
      logger.info(`用户被软删除: ${user.username}`);
    }
    
    ctx.body = {
      success: true,
      message: force === 'true' ? '用户已永久删除' : '用户已删除'
    };
    
  } catch (error) {
    logger.error('删除用户失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除用户失败',
      error: error.message
    };
  }
});

// 6. 设置用户为管理员 POST /api/users/:id/set-admin
router.post('/:id/set-admin', async (ctx) => {
  try {
    const { id } = ctx.params;
    const { isAdmin = true } = ctx.request.body;
    
    const user = await User.findByPk(id);
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }
    
    // 更新管理员状态和角色
    await user.update({
      is_admin: isAdmin,
      role: isAdmin ? 'admin' : 'user',
      remaining_usage: isAdmin ? 999999 : 10 // 管理员无限制使用
    });
    
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    
    logger.info(`用户管理员权限更新: ${user.username} -> ${isAdmin ? '管理员' : '普通用户'}`);
    
    ctx.body = {
      success: true,
      message: `用户已${isAdmin ? '设置为' : '取消'}管理员权限`,
      data: updatedUser
    };
    
  } catch (error) {
    logger.error('设置管理员权限失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '设置管理员权限失败',
      error: error.message
    };
  }
});

// 7. 批量删除用户 DELETE /api/users/batch
router.delete('/batch', validateRequired(['ids']), async (ctx) => {
  try {
    const { ids, force = false } = ctx.request.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'ids 必须是非空数组'
      };
      return;
    }
    
    // 检查是否包含管理员
    const adminUsers = await User.findAll({
      where: {
        id: { [Op.in]: ids },
        is_admin: true
      }
    });
    
    if (adminUsers.length > 0) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '不能删除管理员账户',
        adminUsers: adminUsers.map(u => ({ id: u.id, username: u.username }))
      };
      return;
    }
    
    const deleteOptions = force ? { force: true } : {};
    const deletedCount = await User.destroy({
      where: { id: { [Op.in]: ids } },
      ...deleteOptions
    });
    
    logger.info(`批量删除用户: ${deletedCount} 个用户被${force ? '物理' : '软'}删除`);
    
    ctx.body = {
      success: true,
      message: `成功删除 ${deletedCount} 个用户`,
      deletedCount
    };
    
  } catch (error) {
    logger.error('批量删除用户失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '批量删除用户失败',
      error: error.message
    };
  }
});

// 8. 恢复已删除用户 POST /api/users/:id/restore
router.post('/:id/restore', async (ctx) => {
  try {
    const { id } = ctx.params;
    
    const user = await User.findByPk(id, { paranoid: false });
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }
    
    if (!user.deleted_at) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '用户未被删除，无需恢复'
      };
      return;
    }
    
    await user.restore();
    
    const restoredUser = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    
    logger.info(`用户恢复成功: ${user.username}`);
    
    ctx.body = {
      success: true,
      message: '用户恢复成功',
      data: restoredUser
    };
    
  } catch (error) {
    logger.error('恢复用户失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '恢复用户失败',
      error: error.message
    };
  }
});

// 注意：用户使用次数管理已迁移到会员系统 /api/membership

// 10. 获取用户统计信息 GET /api/users/stats
router.get('/stats', async (ctx) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { status: 'active' } });
    const adminUsers = await User.count({ where: { is_admin: true } });
    const vipUsers = await User.count({ where: { role: 'vip' } });
    const deletedUsers = await User.count({ paranoid: false, where: { deleted_at: { [Op.ne]: null } } });
    
    // 按角色统计
    const roleStats = await User.findAll({
      attributes: [
        'role',
        [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']
      ],
      group: ['role']
    });
    
    // 按状态统计
    const statusStats = await User.findAll({
      attributes: [
        'status',
        [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count']
      ],
      group: ['status']
    });
    
    ctx.body = {
      success: true,
      data: {
        total: totalUsers,
        active: activeUsers,
        admin: adminUsers,
        vip: vipUsers,
        deleted: deletedUsers,
        roleDistribution: roleStats.map(item => ({
          role: item.role,
          count: parseInt(item.dataValues.count)
        })),
        statusDistribution: statusStats.map(item => ({
          status: item.status,
          count: parseInt(item.dataValues.count)
        }))
      }
    };
    
  } catch (error) {
    logger.error('获取用户统计失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取用户统计失败',
      error: error.message
    };
  }
});

// 11. 导出用户数据（文件下载）GET /api/users/:id/export
router.get('/:id/export', async (ctx) => {
  try {
    const userId = parseInt(ctx.params.id);
    
    // 验证用户权限（这里应该添加适当的权限检查）
    // 例如：只有用户本人或管理员可以导出数据
    
    // 获取用户基本信息
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'email', 'created_at', 'updated_at']
    });
    
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }

    // 使用导出服务生成压缩包
    const userExportService = require('../services/userExportService');
    const path = require('path');
    const fs = require('fs');
    const exportPath = path.join(__dirname, '../public/exports');
    
    // 确保导出目录存在
    if (!fs.existsSync(exportPath)) {
      fs.mkdirSync(exportPath, { recursive: true });
    }
    
    const zipFilePath = await userExportService.exportUserData(userId, exportPath);
    const fileName = path.basename(zipFilePath);
    
    // 设置响应头
    ctx.set('Content-Type', 'application/zip');
    ctx.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    
    // 读取文件并发送
    const fileStream = fs.createReadStream(zipFilePath);
    ctx.body = fileStream;
    
    // 文件发送后清理临时文件
    ctx.res.on('finish', () => {
      setTimeout(() => {
        try {
          if (fs.existsSync(zipFilePath)) {
            fs.unlinkSync(zipFilePath);
          }
        } catch (cleanupError) {
          logger.error('清理临时文件失败:', cleanupError);
        }
      }, 5000); // 5秒后删除文件
    });

    logger.info(`用户 ${userId} 导出数据成功`);

  } catch (error) {
    logger.error('导出用户数据失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '导出用户数据失败'
    };
  }
});

// 获取当前用户角色信息 GET /api/users/me/role
router.get('/me/role', async (ctx) => {
  try {
    const tokenUser = ctx.state.user;
    
    // 添加调试日志
    logger.info(`获取当前用户角色 - 用户ID: ${tokenUser.id}`);
    
    const user = await User.findByPk(tokenUser.id, {
      attributes: ['id', 'username', 'role', 'status', 'is_admin']
    });
    
    logger.info(`查询结果: ${user ? '找到用户' : '用户不存在'}`);
    
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }
    
    ctx.body = {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        is_admin: user.is_admin,
        role_description: getRoleDescription(user.role)
      }
    };
    
  } catch (error) {
    logger.error('获取当前用户角色信息失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取当前用户角色信息失败',
      error: error.message
    };
  }
});

// 获取指定用户角色信息 GET /api/users/:id/role
router.get('/:id/role', async (ctx) => {
  try {
    const { id } = ctx.params;
    const tokenUser = ctx.state.user;
    
    // 先获取当前用户的完整信息
    const currentUser = await User.findByPk(tokenUser.id, {
      attributes: ['id', 'username', 'role', 'status', 'is_admin']
    });
    
    if (!currentUser) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '当前用户不存在'
      };
      return;
    }
    
    // 验证用户权限：只能查询自己的角色或管理员可以查询任何用户角色
    if (parseInt(id) !== currentUser.id && !currentUser.is_admin) {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '无权限查询此用户角色信息'
      };
      return;
    }
    
    // 添加调试日志
    logger.info(`查询用户角色 - ID: ${id}, 当前用户: ${currentUser.id}, 是否管理员: ${currentUser.is_admin}`);
    
    const user = await User.findByPk(id, {
      attributes: ['id', 'username', 'role', 'status', 'is_admin']
    });
    
    logger.info(`查询结果: ${user ? '找到用户' : '用户不存在'}`);
    
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }
    
    ctx.body = {
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        status: user.status,
        is_admin: user.is_admin,
        role_description: getRoleDescription(user.role)
      }
    };
    
  } catch (error) {
    logger.error('获取用户角色信息失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取用户角色信息失败',
      error: error.message
    };
  }
});

// 角色描述辅助函数
function getRoleDescription(role) {
  const roleDescriptions = {
    'user': '普通用户',
    'vip': 'VIP用户',
    'admin': '管理员',
    'prompt_expert': 'Prompt专家'
  };
  return roleDescriptions[role] || '未知角色';
}

module.exports = router;