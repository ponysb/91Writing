const Router = require('koa-router');
const DistributionConfig = require('../models/distributionConfig');
const User = require('../models/user');
const { Op } = require('sequelize');

const router = new Router({ prefix: '/api/distribution-config' });

/**
 * 管理员权限检查中间件
 */
const requireAdmin = async (ctx, next) => {
  if (!ctx.state.user || ctx.state.user.role !== 'admin') {
    ctx.status = 403;
    ctx.body = {
      success: false,
      message: '需要管理员权限'
    };
    return;
  }
  await next();
};

// 获取全局配置（包括分成比例和提现设置）
router.get('/global', async (ctx) => {
  try {
    // 获取分成比例配置
    const globalConfig = await DistributionConfig.findOne({
      where: { user_id: null, config_key: null }
    });

    // 统一使用 getConfigValue 函数获取提现配置，确保与其他接口数据一致
    const getConfigValue = async (key, defaultValue) => {
      try {
        const config = await DistributionConfig.findOne({
          where: { 
            config_key: key,
            user_id: null  // 确保获取全局配置
          },
          order: [['updated_at', 'DESC']]  // 确保获取最新的配置记录
        });
        if (config) {
          if (config.config_type === 'number') {
            return parseFloat(config.config_value);
          } else if (config.config_type === 'boolean') {
            return config.config_value === 'true';
          }
          return config.config_value;
        }
        return defaultValue;
      } catch (error) {
        return defaultValue;
      }
    };

    const defaultRate = globalConfig ? globalConfig.commission_rate : 0.1;

    // 构建提现配置对象，使用统一的获取函数
    const withdrawalSettings = {
      min_withdrawal_amount: await getConfigValue('min_withdrawal_amount', 10.00),
      max_withdrawal_amount: await getConfigValue('max_withdrawal_amount', 5000.00),
      withdrawal_fee_rate: await getConfigValue('withdrawal_fee_rate', 0.02),
      auto_approve_threshold: await getConfigValue('auto_approve_threshold', 100.00)
    };
    
    console.log('[DEBUG] POST /global 获取到的提现设置:', withdrawalSettings);

    ctx.body = {
      success: true,
      message: '获取全局配置成功',
      data: {
        commission_rate: parseFloat(defaultRate),
        commission_percentage: Math.round(parseFloat(defaultRate) * 100),
        is_enabled: globalConfig ? globalConfig.is_enabled : true,
        description: globalConfig ? globalConfig.description : '全局默认分销比例',
        ...withdrawalSettings
      }
    };
  } catch (error) {
    console.error('获取全局配置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取全局配置失败',
      error: error.message
    };
  }
});

// 设置全局配置（包括分成比例和提现设置）（管理员）
router.post('/global', requireAdmin, async (ctx) => {
  try {
    const {
      commission_rate,
      commission_percentage,
      is_enabled = true,
      description,
      min_withdrawal_amount,
      max_withdrawal_amount,
      withdrawal_fee_rate,
      auto_approve_threshold
    } = ctx.request.body;

    let config;
    let rate;

    // 处理分成比例设置
    if (commission_percentage !== undefined || commission_rate !== undefined) {
      // 支持两种输入方式：小数(0.1)或百分比(10)
      if (commission_percentage !== undefined) {
        if (commission_percentage < 0 || commission_percentage > 100) {
          ctx.status = 400;
          ctx.body = {
            success: false,
            message: '分销比例必须在0-100%之间'
          };
          return;
        }
        rate = commission_percentage / 100;
      } else if (commission_rate !== undefined) {
        if (commission_rate < 0 || commission_rate > 1) {
          ctx.status = 400;
          ctx.body = {
            success: false,
            message: '分销比例必须在0-1之间'
          };
          return;
        }
        rate = commission_rate;
      }

      // 创建或更新分成比例配置
      const existingConfig = await DistributionConfig.findOne({
        where: { user_id: null, config_key: null }
      });
      
      if (existingConfig) {
        // 更新现有配置
        await existingConfig.update({
          commission_rate: rate,
          is_enabled,
          description: description || `全局默认分销比例：${Math.round(rate * 100)}%`
        });
        config = existingConfig;
      } else {
        // 创建新配置
        config = await DistributionConfig.create({
          user_id: null,
          commission_rate: rate,
          is_enabled,
          description: description || `全局默认分销比例：${Math.round(rate * 100)}%`
        });
      }
    }

    // 处理提现设置
    const updates = [];

    if (min_withdrawal_amount !== undefined) {
      if (min_withdrawal_amount < 0) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '最小提现金额不能小于0'
        };
        return;
      }
      updates.push({
        user_id: null,
        config_key: 'min_withdrawal_amount',
        config_value: min_withdrawal_amount.toString(),
        config_type: 'number',
        description: '最小提现金额'
      });
    }

    if (max_withdrawal_amount !== undefined) {
      if (max_withdrawal_amount < 0) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '最大提现金额不能小于0'
        };
        return;
      }
      updates.push({
        user_id: null,
        config_key: 'max_withdrawal_amount',
        config_value: max_withdrawal_amount.toString(),
        config_type: 'number',
        description: '最大提现金额'
      });
    }

    if (withdrawal_fee_rate !== undefined) {
      if (withdrawal_fee_rate < 0 || withdrawal_fee_rate > 1) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '提现手续费率必须在0-1之间'
        };
        return;
      }
      updates.push({
        user_id: null,
        config_key: 'withdrawal_fee_rate',
        config_value: withdrawal_fee_rate.toString(),
        config_type: 'number',
        description: '提现手续费率'
      });
    }

    if (auto_approve_threshold !== undefined) {
      if (auto_approve_threshold < 0) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '自动审批阈值不能小于0'
        };
        return;
      }
      updates.push({
        user_id: null,
        config_key: 'auto_approve_threshold',
        config_value: auto_approve_threshold.toString(),
        config_type: 'number',
        description: '自动审批阈值'
      });
    }

    // 批量更新提现配置
    for (const update of updates) {
      console.log('[DEBUG] POST /global 正在更新配置:', update);
      await DistributionConfig.upsert(update);
      
      // 立即验证更新结果
      const verifyConfig = await DistributionConfig.findOne({
        where: {
          config_key: update.config_key,
          user_id: null
        },
        order: [['updated_at', 'DESC']]
      });
      console.log('[DEBUG] POST /global 更新后验证:', {
        config_key: update.config_key,
        saved_value: verifyConfig ? verifyConfig.config_value : 'NOT_FOUND',
        updated_at: verifyConfig ? verifyConfig.updated_at : 'N/A'
      });
    }

    // 获取更新后的完整配置
    const updatedGlobalConfig = await DistributionConfig.findOne({
      where: { user_id: null, config_key: null }
    });

    // 统一使用 getConfigValue 函数获取提现配置，确保与其他接口数据一致
     const getConfigValue = async (key, defaultValue) => {
       try {
         const config = await DistributionConfig.findOne({
           where: { 
             config_key: key,
             user_id: null  // 确保获取全局配置
           },
           order: [['updated_at', 'DESC']]  // 确保获取最新的配置记录
         });
         if (config) {
           if (config.config_type === 'number') {
             return parseFloat(config.config_value);
           } else if (config.config_type === 'boolean') {
             return config.config_value === 'true';
           }
           return config.config_value;
         }
         return defaultValue;
       } catch (error) {
         return defaultValue;
       }
     };

    const withdrawalSettings = {
      min_withdrawal_amount: await getConfigValue('min_withdrawal_amount', 10.00),
      max_withdrawal_amount: await getConfigValue('max_withdrawal_amount', 5000.00),
      withdrawal_fee_rate: await getConfigValue('withdrawal_fee_rate', 0.02),
      auto_approve_threshold: await getConfigValue('auto_approve_threshold', 100.00)
    };

    const responseData = {
      ...withdrawalSettings
    };

    if (updatedGlobalConfig) {
      responseData.commission_rate = parseFloat(updatedGlobalConfig.commission_rate);
      responseData.commission_percentage = Math.round(parseFloat(updatedGlobalConfig.commission_rate) * 100);
      responseData.is_enabled = updatedGlobalConfig.is_enabled;
      responseData.description = updatedGlobalConfig.description;
    }

    ctx.body = {
      success: true,
      message: '全局配置更新成功',
      data: responseData
    };
  } catch (error) {
    console.error('设置全局配置失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '设置全局配置失败',
      error: error.message
    };
  }
});

// 获取用户个性化分销比例（管理员）
router.get('/user/:username', requireAdmin, async (ctx) => {
  try {
    const { username } = ctx.params;

    // 检查用户是否存在
    const user = await User.findOne({ where: { username } });
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }

    const userConfig = await DistributionConfig.findOne({
      where: { user_id: user.id }
    });

    if (!userConfig) {
      // 返回全局默认配置
      const globalConfig = await DistributionConfig.findOne({
        where: { user_id: null }
      });
      const defaultRate = globalConfig ? globalConfig.commission_rate : 0.1;

      ctx.body = {
        success: true,
        message: '用户使用全局默认分销比例',
        data: {
          user_id: user.id,
          username: user.username,
          has_custom_rate: false,
          commission_rate: parseFloat(defaultRate),
          commission_percentage: Math.round(parseFloat(defaultRate) * 100),
          is_enabled: true,
          description: '使用全局默认分销比例'
        }
      };
    } else {
      ctx.body = {
        success: true,
        message: '获取用户分销比例成功',
        data: {
          user_id: user.id,
          username: user.username,
          has_custom_rate: true,
          commission_rate: parseFloat(userConfig.commission_rate),
          commission_percentage: Math.round(parseFloat(userConfig.commission_rate) * 100),
          is_enabled: userConfig.is_enabled,
          description: userConfig.description
        }
      };
    }
  } catch (error) {
    console.error('获取用户分销比例失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取用户分销比例失败',
      error: error.message
    };
  }
});

// 设置用户个性化分销比例（管理员）
router.post('/user/:username', requireAdmin, async (ctx) => {
  try {
    const { username } = ctx.params;
    const { commission_rate, commission_percentage, is_enabled = true, description } = ctx.request.body;

    // 检查用户是否存在
    const user = await User.findOne({ where: { username } });
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }

    // 支持两种输入方式：小数(0.1)或百分比(10)
    let rate;
    if (commission_percentage !== undefined) {
      if (commission_percentage < 0 || commission_percentage > 100) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '分销比例必须在0-100%之间'
        };
        return;
      }
      rate = commission_percentage / 100;
    } else if (commission_rate !== undefined) {
      if (commission_rate < 0 || commission_rate > 1) {
        ctx.status = 400;
        ctx.body = {
          success: false,
          message: '分销比例必须在0-1之间'
        };
        return;
      }
      rate = commission_rate;
    } else {
      ctx.status = 400;
      ctx.body = {
        success: false,
        message: '请提供分销比例（commission_rate或commission_percentage）'
      };
      return;
    }

    // 创建或更新用户配置
    const [config, created] = await DistributionConfig.upsert({
      user_id: user.id,
      commission_rate: rate,
      is_enabled,
      description: description || `用户 ${user.username} 的个性化分销比例：${Math.round(rate * 100)}%`
    });

    ctx.body = {
      success: true,
      message: created ? '用户分销比例设置成功' : '用户分销比例更新成功',
      data: {
        user_id: user.id,
        username: user.username,
        has_custom_rate: true,
        commission_rate: parseFloat(config.commission_rate),
        commission_percentage: Math.round(parseFloat(config.commission_rate) * 100),
        is_enabled: config.is_enabled,
        description: config.description
      }
    };
  } catch (error) {
    console.error('设置用户分销比例失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '设置用户分销比例失败',
      error: error.message
    };
  }
});

// 删除用户个性化分销比例（恢复使用全局默认）（管理员）
router.delete('/user/:username', requireAdmin, async (ctx) => {
  try {
    const { username } = ctx.params;

    // 检查用户是否存在
    const user = await User.findOne({ where: { username } });
    if (!user) {
      ctx.status = 404;
      ctx.body = {
        success: false,
        message: '用户不存在'
      };
      return;
    }

    const deleted = await DistributionConfig.destroy({
      where: { user_id: user.id }
    });

    if (deleted === 0) {
      ctx.body = {
        success: true,
        message: '用户本来就使用全局默认分销比例'
      };
    } else {
      ctx.body = {
        success: true,
        message: '已删除用户个性化分销比例，恢复使用全局默认'
      };
    }
  } catch (error) {
    console.error('删除用户分销比例失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '删除用户分销比例失败',
      error: error.message
    };
  }
});

// 获取所有用户的分销配置列表（管理员）
router.get('/admin/list', requireAdmin, async (ctx) => {
  try {
    const { page = 1, limit = 20 } = ctx.query;
    const offset = (page - 1) * limit;

    // 获取全局配置
    const globalConfig = await DistributionConfig.findOne({
      where: { user_id: null, config_key: null }
    });

    // 统一使用 getConfigValue 函数获取提现配置，确保与其他接口数据一致
    const getConfigValue = async (key, defaultValue) => {
      try {
        const config = await DistributionConfig.findOne({
          where: { 
            config_key: key,
            user_id: null  // 确保获取全局配置
          },
          order: [['updated_at', 'DESC']]  // 确保获取最新的配置记录
        });
        if (config) {
          if (config.config_type === 'number') {
            return parseFloat(config.config_value);
          } else if (config.config_type === 'boolean') {
            return config.config_value === 'true';
          }
          return config.config_value;
        }
        return defaultValue;
      } catch (error) {
        return defaultValue;
      }
    };

    const withdrawalSettings = {
      min_withdrawal_amount: await getConfigValue('min_withdrawal_amount', 10.00),
      max_withdrawal_amount: await getConfigValue('max_withdrawal_amount', 5000.00),
      withdrawal_fee_rate: await getConfigValue('withdrawal_fee_rate', 0.02),
      auto_approve_threshold: await getConfigValue('auto_approve_threshold', 100.00)
    };
    console.log('[DEBUG] /admin/list 接口获取 withdrawalSettings:', withdrawalSettings);

    // 获取用户个性化配置
    const { count, rows: userConfigs } = await DistributionConfig.findAndCountAll({
      where: { user_id: { [Op.ne]: null } },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'role']
      }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['updated_at', 'DESC']]
    });

    ctx.body = {
      success: true,
      message: '获取分销配置列表成功',
      data: {
        global_config: globalConfig ? {
          commission_rate: parseFloat(globalConfig.commission_rate),
          commission_percentage: Math.round(parseFloat(globalConfig.commission_rate) * 100),
          is_enabled: globalConfig.is_enabled,
          description: globalConfig.description,
          ...withdrawalSettings
        } : {
          commission_rate: 0.10,
          commission_percentage: 10,
          is_enabled: true,
          description: '全局默认配置',
          ...withdrawalSettings
        },
        user_configs: userConfigs.map(config => ({
          user_id: config.user_id,
          username: config.user?.username || '未知用户',
          email: config.user?.email,
          commission_rate: parseFloat(config.commission_rate),
          commission_percentage: Math.round(parseFloat(config.commission_rate) * 100),
          is_enabled: config.is_enabled,
          description: config.description,
          updated_at: config.updated_at
        })),
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(count / limit),
          total_count: count,
          per_page: parseInt(limit)
        }
      }
    };
  } catch (error) {
    console.error('获取分销配置列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取分销配置列表失败',
      error: error.message
    };
  }
});

// 获取用户的有效分销比例（供系统内部调用）
router.get('/effective/:userId', async (ctx) => {
  try {
    const { userId } = ctx.params;

    // 先查找用户个性化配置
    const userConfig = await DistributionConfig.findOne({
      where: { user_id: userId, is_enabled: true }
    });

    if (userConfig) {
      ctx.body = {
        success: true,
        message: '获取有效分销比例成功',
        data: {
          commission_rate: parseFloat(userConfig.commission_rate),
          commission_percentage: Math.round(parseFloat(userConfig.commission_rate) * 100),
          source: 'user_custom'
        }
      };
      return;
    }

    // 使用全局默认配置
    const globalConfig = await DistributionConfig.findOne({
      where: { user_id: null, is_enabled: true }
    });

    const defaultRate = globalConfig ? globalConfig.commission_rate : 0.1;

    ctx.body = {
      success: true,
      message: '获取有效分销比例成功',
      data: {
        commission_rate: parseFloat(defaultRate),
        commission_percentage: Math.round(parseFloat(defaultRate) * 100),
        source: 'global_default'
      }
    };
  } catch (error) {
    console.error('获取有效分销比例失败:', error);
    ctx.status = 500;
    ctx.body = {
      success: false,
      message: '获取有效分销比例失败',
      error: error.message
    };
  }
});

// 获取提现配置


module.exports = router;