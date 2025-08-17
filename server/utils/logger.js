const winston = require('winston');
const path = require('path');
const fs = require('fs');

// 确保日志目录存在
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定义日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack }) => {
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// 创建logger实例
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // 错误日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
      tailable: true
    }),
    
    // 所有日志文件
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    })
  ]
});

// 开发环境下同时输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// 添加请求日志方法
logger.request = (ctx, responseTime) => {
  const { method, url, status } = ctx;
  const userAgent = ctx.get('User-Agent') || '';
  const ip = ctx.ip || ctx.request.ip;
  
  logger.info(`${method} ${url} ${status} ${responseTime}ms - ${ip} - ${userAgent}`);
};

// 添加API调用日志方法
logger.apiCall = (modelName, prompt, tokens, cost, duration) => {
  logger.info(`API调用 - 模型: ${modelName}, Token数: ${tokens}, 费用: ${cost}, 耗时: ${duration}ms`);
};

// 添加用户操作日志方法
logger.userAction = (userId, action, details = '') => {
  logger.info(`用户操作 - 用户ID: ${userId}, 操作: ${action}, 详情: ${details}`);
};

module.exports = logger;