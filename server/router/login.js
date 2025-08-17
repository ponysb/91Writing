const Router = require('koa-router');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const MembershipService = require('../services/membershipService');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

const router = new Router({
  prefix: '/api/auth'
});

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// 用户登录
router.post('/login', async (ctx) => {
  try {
    const { account, password } = ctx.request.body;
    
    // 参数验证
    if (!account || !password) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '账号和密码不能为空'
      };
      return;
    }

    // 查找用户（支持邮箱或用户名登录）
    const user = await User.findOne({
      where: {
        [Op.or]: [
          { email: account },
          { username: account }
        ],
        deleted_at: null
      }
    });

    if (!user) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }

    // 检查用户状态
    if (user.status === 'banned') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '账号已被封禁'
      };
      return;
    }

    if (user.status === 'inactive') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '账号未激活'
      };
      return;
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '密码错误'
      };
      return;
    }

    // 更新登录信息
    const clientIP = ctx.request.ip || ctx.request.header['x-forwarded-for'] || ctx.request.header['x-real-ip'] || 'unknown';
    await user.update({
      last_login_time: new Date(),
      last_login_ip: clientIP,
      login_count: user.login_count + 1
    });

    // 生成JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_admin: user.is_admin
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // 记录登录日志
    logger.info(`用户登录成功`, {
      user_id: user.id,
      username: user.username,
      email: user.email,
      ip: clientIP,
      user_agent: ctx.request.header['user-agent']
    });

    ctx.body = {
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role,
          is_admin: user.is_admin,
          status: user.status,
          last_login_time: user.last_login_time
        }
      }
    };

  } catch (error) {
    logger.error('用户登录失败', {
      error: error.message,
      stack: error.stack,
      body: ctx.request.body
    });
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '登录失败，请稍后重试'
    };
  }
});

// 刷新token
router.post('/refresh', async (ctx) => {
  try {
    const { token } = ctx.request.body;
    
    if (!token) {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: 'Token不能为空'
      };
      return;
    }

    // 验证token（忽略过期）
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { ignoreExpiration: true });
    } catch (error) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Token无效'
      };
      return;
    }

    // 检查用户是否存在
    const user = await User.findByPk(decoded.id);
    if (!user || user.deleted_at) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }

    // 检查用户状态
    if (user.status !== 'active') {
      ctx.status = 403;
      ctx.body = {
        success: false,
        message: '用户状态异常'
      };
      return;
    }

    // 生成新token
    const newToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        is_admin: user.is_admin
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    ctx.body = {
      success: true,
      message: 'Token刷新成功',
      data: {
        token: newToken
      }
    };

  } catch (error) {
    logger.error('Token刷新失败', {
      error: error.message,
      stack: error.stack
    });
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: 'Token刷新失败'
    };
  }
});

// 获取当前用户信息
router.get('/me', async (ctx) => {
  try {
    const token = ctx.request.header.authorization?.replace('Bearer ', '');
    
    if (!token) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '未提供认证token'
      };
      return;
    }

    // 验证token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: 'Token无效或已过期'
      };
      return;
    }

    // 获取用户信息
    const user = await User.findByPk(decoded.id, {
      attributes: {
        exclude: ['password']
      }
    });

    if (!user || user.deleted_at) {
      ctx.status = 401;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }

    // 获取用户剩余次数
    const remainingCredits = await MembershipService.getUserRemainingCredits(user.id);
    
    // 获取用户当前会员等级
    const currentMembership = await MembershipService.getUserCurrentMembership(user.id);

    ctx.body = {
      success: true,
      message: '获取用户信息成功',
      data: {
        user: {
          ...user.toJSON(),
          remaining_credits: remainingCredits,
          current_membership: currentMembership
        }
      }
    };

  } catch (error) {
    logger.error('获取用户信息失败', {
      error: error.message,
      stack: error.stack
    });
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取用户信息失败'
    };
  }
});

// 用户登出
router.post('/logout', async (ctx) => {
  try {
    // 这里可以实现token黑名单机制
    // 目前只是简单返回成功
    
    logger.info('用户登出', {
      user_agent: ctx.request.header['user-agent'],
      ip: ctx.request.ip
    });

    ctx.body = {
      success: true,
      message: '登出成功'
    };

  } catch (error) {
    logger.error('用户登出失败', {
      error: error.message,
      stack: error.stack
    });
    
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '登出失败'
    };
  }
});

module.exports = router;