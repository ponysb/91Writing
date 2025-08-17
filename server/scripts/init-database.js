// 加载环境变量
require('dotenv').config();

const { sequelize, testConnection } = require('../config/database');
const User = require('../models/user');
const Prompt = require('../models/prompt');
const Novel = require('../models/novel');
const Chapter = require('../models/chapter');
const Character = require('../models/character');
const Worldview = require('../models/worldview');
const Timeline = require('../models/timeline');
const Corpus = require('../models/corpus');
const AiModel = require('../models/aimodel');
const AiCallRecord = require('../models/aiCallRecord');
const Package = require('../models/package');
const ActivationCode = require('../models/activationCode');
const NovelType = require('../models/novelType');
const Announcement = require('../models/announcement');
const SystemSetting = require('../models/systemSetting');
const InviteRecord = require('../models/inviteRecord');
const CommissionRecord = require('../models/commissionRecord');
const ShortStory = require('../models/shortStory');
const AiAssistant = require('../models/aiAssistant');
const AiConversation = require('../models/aiConversation');
const AiMessage = require('../models/aiMessage');
const UserPackageRecord = require('../models/userPackageRecord');
const PaymentOrder = require('../models/PaymentOrder');
const PaymentConfig = require('../models/paymentConfig');
const WithdrawalRequest = require('../models/withdrawalRequest');
const DistributionConfig = require('../models/distributionConfig');
// const VipPackage = require('../models/VipPackage'); // 已废弃，统一使用Package表

const logger = require('../utils/logger');
const crypto = require('../utils/crypto');

/**
 * 数据库初始化脚本
 * 功能：
 * 1. 测试数据库连接
 * 2. 同步数据库表结构
 * 3. 创建初始管理员账户
 * 4. 插入基础数据
 */

// 定义模型关联关系
function defineAssociations() {
  try {
    logger.info('定义模型关联关系...');
    
    // 用户与小说的关联
    User.hasMany(Novel, {
      foreignKey: 'user_id',
      as: 'novels'
    });
    Novel.belongsTo(User, {
      foreignKey: 'user_id',
      as: 'author'
    });
    
    // 小说与章节的关联
    Novel.hasMany(Chapter, {
      foreignKey: 'novel_id',
      as: 'chapters'
    });
    Chapter.belongsTo(Novel, {
      foreignKey: 'novel_id',
      as: 'novel'
    });
    
    // 用户与章节的关联
    User.hasMany(Chapter, {
      foreignKey: 'user_id',
      as: 'chapters'
    });
    Chapter.belongsTo(User, {
      foreignKey: 'user_id',
      as: 'author'
    });
    
    // 章节之间的关联（上一章、下一章）
    Chapter.belongsTo(Chapter, {
      foreignKey: 'previous_chapter_id',
      as: 'previousChapter'
    });
    Chapter.belongsTo(Chapter, {
      foreignKey: 'next_chapter_id',
      as: 'nextChapter'
    });
    
    // 小说与人物的关联
    Novel.hasMany(Character, {
      foreignKey: 'novel_id',
      as: 'characterList'
    });
    Character.belongsTo(Novel, {
      foreignKey: 'novel_id',
      as: 'novel'
    });
    
    // 用户与人物的关联
    User.hasMany(Character, {
      foreignKey: 'user_id',
      as: 'characterList'
    });
    Character.belongsTo(User, {
      foreignKey: 'user_id',
      as: 'author'
    });
    
    // 小说与世界观的关联
    Novel.hasMany(Worldview, {
      foreignKey: 'novel_id',
      as: 'worldviews'
    });
    Worldview.belongsTo(Novel, {
      foreignKey: 'novel_id',
      as: 'novel'
    });
    
    // 用户与世界观的关联
    User.hasMany(Worldview, {
      foreignKey: 'user_id',
      as: 'worldviews'
    });
    Worldview.belongsTo(User, {
      foreignKey: 'user_id',
      as: 'author'
    });
    
    // 小说与事件线的关联
    Novel.hasMany(Timeline, {
      foreignKey: 'novel_id',
      as: 'timelines'
    });
    Timeline.belongsTo(Novel, {
      foreignKey: 'novel_id',
      as: 'novel'
    });
    
    // 用户与事件线的关联
    User.hasMany(Timeline, {
      foreignKey: 'user_id',
      as: 'timelines'
    });
    Timeline.belongsTo(User, {
      foreignKey: 'user_id',
      as: 'author'
    });
    
    // 小说与语料库的关联（可选关联）
    Novel.hasMany(Corpus, {
      foreignKey: 'novel_id',
      as: 'corpus'
    });
    Corpus.belongsTo(Novel, {
      foreignKey: 'novel_id',
      as: 'novel'
    });
    
    // 用户与语料库的关联
    User.hasMany(Corpus, {
      foreignKey: 'user_id',
      as: 'corpus'
    });
    Corpus.belongsTo(User, {
      foreignKey: 'user_id',
      as: 'author'
    });
    
    // 用户与AI模型的关联
    User.hasMany(AiModel, {
      foreignKey: 'created_by',
      as: 'createdAiModels'
    });
    AiModel.belongsTo(User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
    
    User.hasMany(AiModel, {
      foreignKey: 'updated_by',
      as: 'updatedAiModels'
    });
    AiModel.belongsTo(User, {
      foreignKey: 'updated_by',
      as: 'updater'
    });
    
    // 用户与AI调用记录的关联
    User.hasMany(AiCallRecord, {
      foreignKey: 'user_id',
      as: 'aiCallRecords'
    });
    AiCallRecord.belongsTo(User, {
      foreignKey: 'user_id',
      as: 'user'
    });
    
    // AI模型与AI调用记录的关联
    AiModel.hasMany(AiCallRecord, {
      foreignKey: 'model_id',
      as: 'callRecords'
    });
    AiCallRecord.belongsTo(AiModel, {
      foreignKey: 'model_id',
      as: 'aiModel'
    });
    
    // Prompt与AI调用记录的关联（可选）
    Prompt.hasMany(AiCallRecord, {
      foreignKey: 'prompt_id',
      as: 'callRecords'
    });
    AiCallRecord.belongsTo(Prompt, {
      foreignKey: 'prompt_id',
      as: 'prompt'
    });
    
    // 套餐与激活码的关联
    Package.hasMany(ActivationCode, {
      foreignKey: 'package_id',
      as: 'activationCodes'
    });
    ActivationCode.belongsTo(Package, {
      foreignKey: 'package_id',
      as: 'package'
    });
    
    // 用户与激活码的关联（使用者）
    User.hasMany(ActivationCode, {
      foreignKey: 'used_by',
      as: 'usedActivationCodes'
    });
    ActivationCode.belongsTo(User, {
      foreignKey: 'used_by',
      as: 'user'
    });
    
    // 用户与激活码的关联（创建者）
    User.hasMany(ActivationCode, {
      foreignKey: 'created_by',
      as: 'createdActivationCodes'
    });
    ActivationCode.belongsTo(User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
    
    // NovelType 与 User 关联
    User.hasMany(NovelType, {
      foreignKey: 'created_by',
      as: 'createdNovelTypes'
    });
    NovelType.belongsTo(User, {
      foreignKey: 'created_by',
      as: 'creator'
    });
    
    User.hasMany(NovelType, {
      foreignKey: 'updated_by',
      as: 'updatedNovelTypes'
    });
    NovelType.belongsTo(User, {
      foreignKey: 'updated_by',
      as: 'updater'
    });
    
    // NovelType 与 Novel 关联
    NovelType.hasMany(Novel, {
      foreignKey: 'novel_type_id',
      as: 'novels'
    });
    Novel.belongsTo(NovelType, {
    foreignKey: 'novel_type_id',
    as: 'novelType'
  });

  // Announcement 与 User 关联
  User.hasMany(Announcement, {
    foreignKey: 'created_by',
    as: 'createdAnnouncements'
  });
  Announcement.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
  });

  User.hasMany(Announcement, {
    foreignKey: 'updated_by',
    as: 'updatedAnnouncements'
  });
  Announcement.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updater'
  });

  // SystemSetting 与 User 关联
  User.hasMany(SystemSetting, {
    foreignKey: 'created_by',
    as: 'createdSystemSettings'
  });
  SystemSetting.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
  });

  User.hasMany(SystemSetting, {
    foreignKey: 'updated_by',
    as: 'updatedSystemSettings'
  });
  SystemSetting.belongsTo(User, {
    foreignKey: 'updated_by',
    as: 'updater'
  });

  // 邀请记录与用户的关联
  InviteRecord.belongsTo(User, { foreignKey: 'inviter_id', as: 'inviter' });
  InviteRecord.belongsTo(User, { foreignKey: 'invitee_id', as: 'invitee' });
  User.hasMany(InviteRecord, { foreignKey: 'inviter_id', as: 'sentInvites' });
  User.hasMany(InviteRecord, { foreignKey: 'invitee_id', as: 'receivedInvites' });

  // 分成记录与其他模型的关联
  CommissionRecord.belongsTo(InviteRecord, { foreignKey: 'invite_record_id', as: 'inviteRecord' });
  CommissionRecord.belongsTo(User, { foreignKey: 'inviter_id', as: 'inviter' });
  CommissionRecord.belongsTo(User, { foreignKey: 'invitee_id', as: 'invitee' });
  CommissionRecord.belongsTo(Package, { foreignKey: 'package_id', as: 'package' });
  CommissionRecord.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
  CommissionRecord.belongsTo(User, { foreignKey: 'updated_by', as: 'updater' });
  
  InviteRecord.hasMany(CommissionRecord, { foreignKey: 'invite_record_id', as: 'commissions' });
  User.hasMany(CommissionRecord, { foreignKey: 'inviter_id', as: 'earnedCommissions' });
  User.hasMany(CommissionRecord, { foreignKey: 'invitee_id', as: 'generatedCommissions' });
  Package.hasMany(CommissionRecord, { foreignKey: 'package_id', as: 'commissions' });
  User.hasMany(CommissionRecord, { foreignKey: 'created_by', as: 'createdCommissions' });
  User.hasMany(CommissionRecord, { foreignKey: 'updated_by', as: 'updatedCommissions' });
  
  // 短文与用户的关联
  User.hasMany(ShortStory, {
    foreignKey: 'user_id',
    as: 'shortStories'
  });
  ShortStory.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'author'
  });
  
  // 短文与提示词的关联
  Prompt.hasMany(ShortStory, {
    foreignKey: 'prompt_id',
    as: 'shortStories'
  });
  ShortStory.belongsTo(Prompt, {
    foreignKey: 'prompt_id',
    as: 'prompt'
  });
  
  // AI助手与用户的关联（创建者）
  User.hasMany(AiAssistant, {
    foreignKey: 'created_by',
    as: 'createdAiAssistants'
  });
  AiAssistant.belongsTo(User, {
    foreignKey: 'created_by',
    as: 'creator'
  });
  
  // AI对话会话与用户的关联
  User.hasMany(AiConversation, {
    foreignKey: 'user_id',
    as: 'aiConversations'
  });
  AiConversation.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  
  // AI对话会话与AI助手的关联
  AiAssistant.hasMany(AiConversation, {
    foreignKey: 'assistant_id',
    as: 'conversations'
  });
  AiConversation.belongsTo(AiAssistant, {
    foreignKey: 'assistant_id',
    as: 'assistant'
  });
  
  // AI对话会话与小说的关联（可选）
  Novel.hasMany(AiConversation, {
    foreignKey: 'novel_id',
    as: 'aiConversations'
  });
  AiConversation.belongsTo(Novel, {
    foreignKey: 'novel_id',
    as: 'novel'
  });
  
  // AI消息与对话会话的关联
  AiConversation.hasMany(AiMessage, {
    foreignKey: 'conversation_id',
    as: 'messages'
  });
  AiMessage.belongsTo(AiConversation, {
    foreignKey: 'conversation_id',
    as: 'conversation'
  });
  
  // 用户套餐记录与用户的关联
  User.hasMany(UserPackageRecord, {
    foreignKey: 'user_id',
    as: 'packageRecords'
  });
  UserPackageRecord.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  
  // 用户套餐记录与套餐的关联
  Package.hasMany(UserPackageRecord, {
    foreignKey: 'package_id',
    as: 'userRecords'
  });
  UserPackageRecord.belongsTo(Package, {
    foreignKey: 'package_id',
    as: 'package'
  });
  
  // 用户套餐记录与激活码的关联
  ActivationCode.hasOne(UserPackageRecord, {
    foreignKey: 'activation_code_id',
    as: 'userRecord'
  });
  UserPackageRecord.belongsTo(ActivationCode, {
    foreignKey: 'activation_code_id',
    as: 'activationCode'
  });
  
  // AI消息与用户的关联
  User.hasMany(AiMessage, {
    foreignKey: 'user_id',
    as: 'aiMessages'
  });
  AiMessage.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  
  // AI消息的父子关联（消息树结构）
  AiMessage.belongsTo(AiMessage, {
    foreignKey: 'parent_message_id',
    as: 'parentMessage'
  });
  AiMessage.hasMany(AiMessage, {
    foreignKey: 'parent_message_id',
    as: 'childMessages'
  });
  
  // 支付订单与用户的关联
  User.hasMany(PaymentOrder, {
    foreignKey: 'user_id',
    as: 'paymentOrders'
  });
  PaymentOrder.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  
  // 支付订单与套餐的关联（统一使用Package表）
  Package.hasMany(PaymentOrder, {
    foreignKey: 'package_id',
    as: 'paymentOrders'
  });
  PaymentOrder.belongsTo(Package, {
    foreignKey: 'package_id',
    as: 'package'
  });
  
  // 提现申请与用户的关联
  User.hasMany(WithdrawalRequest, {
    foreignKey: 'user_id',
    as: 'withdrawalRequests'
  });
  WithdrawalRequest.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  
  // 提现申请与处理人的关联
  User.hasMany(WithdrawalRequest, {
    foreignKey: 'processed_by',
    as: 'processedWithdrawals'
  });
  WithdrawalRequest.belongsTo(User, {
    foreignKey: 'processed_by',
    as: 'processor'
  });
  
  // 分销配置与用户的关联
  User.hasMany(DistributionConfig, {
    foreignKey: 'user_id',
    as: 'distributionConfigs'
  });
  DistributionConfig.belongsTo(User, {
    foreignKey: 'user_id',
    as: 'user'
  });
    
    logger.info('模型关联关系定义完成');
  } catch (error) {
    logger.error('定义模型关联关系失败:', error);
    throw error;
  }
}

// 初始化数据库表结构
async function syncDatabase() {
  try {
    logger.info('开始同步数据库表结构...');
    
    // 先定义关联关系
    defineAssociations();
    
    // force: true 会删除现有表并重新创建
    // alter: true 会修改表结构以匹配模型
    // 根据环境变量决定是否强制重建表
    const shouldForceSync = process.env.DB_FORCE_SYNC === 'true';
    
    if (shouldForceSync) {
      logger.warn('检测到 DB_FORCE_SYNC=true，将强制重建数据库表（数据将丢失）');
      await sequelize.sync({ force: true });
    } else {
      logger.info('使用安全模式同步数据库表结构（保留现有数据）');
      await sequelize.sync({ alter: true });
    }
    
    logger.info('数据库表结构同步完成');
  } catch (error) {
    logger.error('数据库表结构同步失败:', error);
    throw error;
  }
}

// 创建初始管理员账户
async function createAdminUser() {
  try {
    logger.info('检查管理员账户...');
    
    // 检查是否已存在管理员账户
    const existingAdmin = await User.findOne({
      where: {
        is_admin: true
      }
    });
    
    if (existingAdmin) {
      logger.info('管理员账户已存在，跳过创建');
      return existingAdmin;
    }
    
    // 创建默认管理员账户
    // 从环境变量获取管理员密码，如果没有则生成随机密码
    const adminPassword = process.env.ADMIN_PASSWORD || crypto.generateActivationCode(12);
    
    const adminData = {
      username: 'admin',
      email: 'admin@example.com',
      password: await crypto.hashPassword(adminPassword),
      nickname: '系统管理员',
      role: 'admin',
      is_admin: true,
      status: 'active',
      email_verified: true,
      invite_code: crypto.generateActivationCode(8)
    };
    
    const admin = await User.create(adminData);
    logger.info(`管理员账户创建成功: ${admin.username}`);
    if (!process.env.ADMIN_PASSWORD) {
      logger.warn(`管理员随机密码: ${adminPassword} (请记录并及时修改)`);
    }
    
    return admin;
  } catch (error) {
    logger.error('创建管理员账户失败:', error);
    throw error;
  }
}

// 创建测试用户（可选）
async function createTestUsers() {
  try {
    logger.info('创建测试用户...');
    
    const testUsers = [
      {
        username: 'testuser1',
        email: 'test1@example.com',
        password: await crypto.hashPassword(process.env.TEST_USER_PASSWORD || '123456'),
        nickname: '测试用户1',
        role: 'user',
        status: 'active'
      },
      {
        username: 'vipuser1',
        email: 'vip1@example.com',
        password: await crypto.hashPassword(process.env.TEST_USER_PASSWORD || '123456'),
        nickname: 'VIP用户1',
        role: 'vip',
        status: 'active'
      }
    ];
    
    for (const userData of testUsers) {
      const existingUser = await User.findOne({
        where: {
          username: userData.username
        }
      });
      
      if (!existingUser) {
        userData.invite_code = crypto.generateActivationCode(8);
        await User.create(userData);
        logger.info(`测试用户创建成功: ${userData.username}`);
      } else {
        logger.info(`测试用户已存在，跳过: ${userData.username}`);
      }
    }
  } catch (error) {
    logger.error('创建测试用户失败:', error);
    throw error;
  }
}


// 主初始化函数
async function initDatabase() {
  try {
    logger.info('=== 开始初始化数据库 ===');
    
    // 1. 测试数据库连接
    await testConnection();
    
    // 2. 同步数据库表结构
    await syncDatabase();
    
    // 3. 创建管理员账户
    await createAdminUser();
    
    logger.info('=== 数据库初始化完成 ===');
    
  } catch (error) {
    logger.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

// 清理数据库（危险操作，仅用于开发环境）
async function resetDatabase() {
  if (process.env.NODE_ENV === 'production') {
    logger.error('生产环境禁止重置数据库');
    return;
  }
  
  try {
    logger.warn('=== 开始重置数据库 ===');
    
    // 删除所有表并重新创建
    await sequelize.sync({ force: true });
    
    logger.warn('数据库重置完成，所有数据已清空');
    
    // 重新初始化
    await initDatabase();
    
  } catch (error) {
    logger.error('数据库重置失败:', error);
    throw error;
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  // 检查命令行参数
  const args = process.argv.slice(2);
  
  if (args.includes('--reset')) {
    resetDatabase().finally(() => {
      process.exit(0);
    });
  } else {
    initDatabase().finally(() => {
      process.exit(0);
    });
  }
}

module.exports = {
  initDatabase,
  resetDatabase,
  syncDatabase,
  createAdminUser
};