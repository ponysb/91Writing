const Router = require('koa-router');
const User = require('../models/user');
const Novel = require('../models/novel');
const ShortStory = require('../models/shortStory');
const AiCallRecord = require('../models/aiCallRecord');
const PaymentOrder = require('../models/PaymentOrder');
const UserPackageRecord = require('../models/userPackageRecord');
const Package = require('../models/package');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const membershipService = require('../services/membershipService');

const router = new Router({
  prefix: '/api/dashboard'
});

// 认证中间件
const requireAuth = async (ctx, next) => {
  const token = ctx.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    ctx.status = 401;
    ctx.body = { success: false, message: '未提供认证令牌' };
    return;
  }
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    ctx.user = decoded;
    await next();
  } catch (error) {
    ctx.status = 401;
    ctx.body = { success: false, message: '无效的认证令牌' };
  }
};

// 管理员权限中间件
const requireAdmin = async (ctx, next) => {
  if (!ctx.user.is_admin) {
    ctx.status = 403;
    ctx.body = { success: false, message: '需要管理员权限' };
    return;
  }
  await next();
};

router.use(requireAuth);

/**
 * 用户端仪表盘数据
 * GET /api/dashboard/user
 */
router.get('/user', async (ctx) => {
  try {
    const userId = ctx.user.id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 获取用户基本信息
    const user = await User.findByPk(userId, {
      attributes: ['id', 'username', 'nickname', 'avatar', 'total_usage', 'login_count', 'invite_count', 'created_at']
    });

    // 获取会员信息
    const remainingCredits = await membershipService.getUserRemainingCredits(userId);
    const currentMembership = await membershipService.getUserCurrentMembership(userId);

    // 作品统计
    const [novelCount, shortStoryCount] = await Promise.all([
      Novel.count({ where: { user_id: userId } }),
      ShortStory.count({ where: { user_id: userId } })
    ]);

    // 最近30天AI调用统计
    const aiCallStats = await AiCallRecord.findAll({
      where: {
        user_id: userId,
        created_at: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: [
        [require('sequelize').fn('DATE', require('sequelize').col('created_at')), 'date'],
        [require('sequelize').fn('COUNT', '*'), 'count']
      ],
      group: [require('sequelize').fn('DATE', require('sequelize').col('created_at'))],
      order: [[require('sequelize').fn('DATE', require('sequelize').col('created_at')), 'ASC']]
    });

    // AI调用业务类型统计
    const businessTypeStats = await AiCallRecord.findAll({
      where: {
        user_id: userId,
        created_at: { [Op.gte]: thirtyDaysAgo },
        business_type: { [Op.ne]: 'general' } // 排除general类型的记录
      },
      attributes: [
        'business_type',
        [require('sequelize').fn('COUNT', '*'), 'count']
      ],
      group: ['business_type']
    });

    // 最近作品
    const [recentNovels, recentShortStories] = await Promise.all([
      Novel.findAll({
        where: { user_id: userId },
        attributes: ['id', 'title', 'status', 'current_word_count', 'updated_at'],
        order: [['updated_at', 'DESC']],
        limit: 5
      }),
      ShortStory.findAll({
        where: { user_id: userId },
        attributes: ['id', 'title', 'type', 'word_count', 'updated_at'],
        order: [['updated_at', 'DESC']],
        limit: 5
      })
    ]);

    // 本周创作统计
    const [weeklyNovels, weeklyShortStories, weeklyAiCalls] = await Promise.all([
      Novel.count({
        where: {
          user_id: userId,
          created_at: { [Op.gte]: sevenDaysAgo }
        }
      }),
      ShortStory.count({
        where: {
          user_id: userId,
          created_at: { [Op.gte]: sevenDaysAgo }
        }
      }),
      AiCallRecord.count({
        where: {
          user_id: userId,
          created_at: { [Op.gte]: sevenDaysAgo },
          business_type: { [Op.ne]: 'general' } // 排除general类型的记录
        }
      })
    ]);

    // 总字数统计
    const totalWordCount = await Novel.sum('current_word_count', {
      where: { user_id: userId }
    }) + await ShortStory.sum('word_count', {
      where: { user_id: userId }
    });

    ctx.body = {
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          memberSince: user.created_at
        },
        membership: {
          remainingCredits,
          currentLevel: currentMembership?.package_type || 'basic',
          currentPackage: currentMembership?.package_name || '基础用户'
        },
        statistics: {
          totalNovels: novelCount,
          totalShortStories: shortStoryCount,
          totalWorks: novelCount + shortStoryCount,
          totalWordCount: totalWordCount || 0,
          totalAiUsage: user.total_usage,
          totalLogins: user.login_count,
          totalInvites: user.invite_count
        },
        weeklyStats: {
          novelsCreated: weeklyNovels,
          shortStoriesCreated: weeklyShortStories,
          aiCallsMade: weeklyAiCalls
        },
        charts: {
          aiCallTrend: aiCallStats.map(item => ({
            date: item.dataValues.date,
            count: parseInt(item.dataValues.count)
          })),
          businessTypeDistribution: businessTypeStats.map(item => ({
            type: item.business_type,
            count: parseInt(item.dataValues.count)
          }))
        },
        recentWorks: {
          novels: recentNovels,
          shortStories: recentShortStories
        }
      }
    };
  } catch (error) {
    logger.error('获取用户仪表盘数据失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取仪表盘数据失败'
    };
  }
});

/**
 * 管理员仪表盘数据
 * GET /api/dashboard/admin
 */
router.get('/admin', requireAdmin, async (ctx) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    // 用户统计
    const [totalUsers, activeUsers, newUsersToday, newUsersWeek] = await Promise.all([
      User.count(),
      User.count({
        where: {
          last_login_time: { [Op.gte]: sevenDaysAgo }
        }
      }),
      User.count({
        where: {
          created_at: { [Op.gte]: today }
        }
      }),
      User.count({
        where: {
          created_at: { [Op.gte]: sevenDaysAgo }
        }
      })
    ]);

    // 作品统计
    const [totalNovels, totalShortStories, novelsToday, shortStoriesToday] = await Promise.all([
      Novel.count(),
      ShortStory.count(),
      Novel.count({
        where: {
          created_at: { [Op.gte]: today }
        }
      }),
      ShortStory.count({
        where: {
          created_at: { [Op.gte]: today }
        }
      })
    ]);

    // AI调用统计
    const [totalAiCalls, aiCallsToday, aiCallsWeek] = await Promise.all([
      AiCallRecord.count(),
      AiCallRecord.count({
        where: {
          created_at: { [Op.gte]: today }
        }
      }),
      AiCallRecord.count({
        where: {
          created_at: { [Op.gte]: sevenDaysAgo }
        }
      })
    ]);

    // 支付统计
    const [totalOrders, paidOrders, todayRevenue, weekRevenue] = await Promise.all([
      PaymentOrder.count(),
      PaymentOrder.count({
        where: { status: 'paid' }
      }),
      PaymentOrder.sum('total_fee', {
        where: {
          status: 'paid',
          success_time: { [Op.gte]: today }
        }
      }),
      PaymentOrder.sum('total_fee', {
        where: {
          status: 'paid',
          success_time: { [Op.gte]: sevenDaysAgo }
        }
      })
    ]);

    // 会员统计
    const membershipStats = await UserPackageRecord.findAll({
      where: {
        status: 'active',
        start_date: { [Op.lte]: now },
        end_date: { [Op.gte]: now }
      },
      attributes: [
        'package_type',
        [require('sequelize').fn('COUNT', require('sequelize').fn('DISTINCT', require('sequelize').col('user_id'))), 'count']
      ],
      group: ['package_type']
    });

    // 最近30天用户注册趋势
    const userRegistrationTrend = await User.findAll({
      where: {
        created_at: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: [
        [require('sequelize').fn('DATE', require('sequelize').col('created_at')), 'date'],
        [require('sequelize').fn('COUNT', '*'), 'count']
      ],
      group: [require('sequelize').fn('DATE', require('sequelize').col('created_at'))],
      order: [[require('sequelize').fn('DATE', require('sequelize').col('created_at')), 'ASC']]
    });

    // 最近30天AI调用趋势
    const aiCallTrend = await AiCallRecord.findAll({
      where: {
        created_at: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: [
        [require('sequelize').fn('DATE', require('sequelize').col('created_at')), 'date'],
        [require('sequelize').fn('COUNT', '*'), 'count']
      ],
      group: [require('sequelize').fn('DATE', require('sequelize').col('created_at'))],
      order: [[require('sequelize').fn('DATE', require('sequelize').col('created_at')), 'ASC']]
    });

    // 最近30天收入趋势
    const revenueTrend = await PaymentOrder.findAll({
      where: {
        status: 'paid',
        success_time: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: [
        [require('sequelize').fn('DATE', require('sequelize').col('success_time')), 'date'],
        [require('sequelize').fn('SUM', require('sequelize').col('total_fee')), 'revenue']
      ],
      group: [require('sequelize').fn('DATE', require('sequelize').col('success_time'))],
      order: [[require('sequelize').fn('DATE', require('sequelize').col('success_time')), 'ASC']]
    });

    // AI业务类型分布
    const businessTypeDistribution = await AiCallRecord.findAll({
      where: {
        created_at: { [Op.gte]: thirtyDaysAgo }
      },
      attributes: [
        'business_type',
        [require('sequelize').fn('COUNT', '*'), 'count']
      ],
      group: ['business_type']
    });

    // 最活跃用户（按AI调用次数）
    const topActiveUsersData = await AiCallRecord.findAll({
      where: {
        created_at: { [Op.gte]: sevenDaysAgo }
      },
      attributes: [
        'user_id',
        [require('sequelize').fn('COUNT', '*'), 'call_count']
      ],
      group: ['user_id'],
      order: [[require('sequelize').fn('COUNT', '*'), 'DESC']],
      limit: 10
    });

    // 获取用户信息
    const userIds = topActiveUsersData.map(item => item.user_id);
    const users = await User.findAll({
      where: { id: { [Op.in]: userIds } },
      attributes: ['id', 'username', 'nickname']
    });
    const userMap = users.reduce((map, user) => {
      map[user.id] = user;
      return map;
    }, {});

    ctx.body = {
      success: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          totalNovels,
          totalShortStories,
          totalAiCalls,
          totalOrders,
          paidOrders,
          todayRevenue: todayRevenue || 0,
          weekRevenue: weekRevenue || 0
        },
        todayStats: {
          newUsers: newUsersToday,
          newNovels: novelsToday,
          newShortStories: shortStoriesToday,
          aiCalls: aiCallsToday
        },
        weeklyStats: {
          newUsers: newUsersWeek,
          aiCalls: aiCallsWeek
        },
        membershipDistribution: membershipStats.map(item => ({
          type: item.package_type,
          count: parseInt(item.dataValues.count)
        })),
        charts: {
          userRegistrationTrend: userRegistrationTrend.map(item => ({
            date: item.dataValues.date,
            count: parseInt(item.dataValues.count)
          })),
          aiCallTrend: aiCallTrend.map(item => ({
            date: item.dataValues.date,
            count: parseInt(item.dataValues.count)
          })),
          revenueTrend: revenueTrend.map(item => ({
            date: item.dataValues.date,
            revenue: parseFloat(item.dataValues.revenue || 0)
          })),
          businessTypeDistribution: businessTypeDistribution.map(item => ({
            type: item.business_type,
            count: parseInt(item.dataValues.count)
          }))
        },
        topActiveUsers: topActiveUsersData.map(item => {
          const user = userMap[item.user_id];
          return {
            userId: item.user_id,
            username: user?.username || '未知用户',
            nickname: user?.nickname || '',
            callCount: parseInt(item.dataValues.call_count)
          };
        })
      }
    };
  } catch (error) {
    logger.error('获取管理员仪表盘数据失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取仪表盘数据失败'
    };
  }
});

/**
 * 获取系统实时状态
 * GET /api/dashboard/system-status
 */
router.get('/system-status', requireAdmin, async (ctx) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // 最近1小时的系统活动
    const [recentUsers, recentAiCalls, recentOrders] = await Promise.all([
      User.count({
        where: {
          last_login_time: { [Op.gte]: oneHourAgo }
        }
      }),
      AiCallRecord.count({
        where: {
          created_at: { [Op.gte]: oneHourAgo }
        }
      }),
      PaymentOrder.count({
        where: {
          created_at: { [Op.gte]: oneHourAgo }
        }
      })
    ]);

    // 系统健康状态（可以根据实际需求扩展）
    const systemHealth = {
      database: 'healthy', // 可以通过数据库连接测试来确定
      api: 'healthy',
      storage: 'healthy'
    };

    ctx.body = {
      success: true,
      data: {
        timestamp: now,
        recentActivity: {
          activeUsers: recentUsers,
          aiCalls: recentAiCalls,
          newOrders: recentOrders
        },
        systemHealth
      }
    };
  } catch (error) {
    logger.error('获取系统状态失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取系统状态失败'
    };
  }
});

module.exports = router;