const multer = require('@koa/multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../public/uploads');
const coverDir = path.join(uploadDir, 'covers');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

if (!fs.existsSync(coverDir)) {
  fs.mkdirSync(coverDir, { recursive: true });
}

// 文件存储配置
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, coverDir);
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, 'cover-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 检查文件类型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只支持上传 JPEG, PNG, GIF, WebP 格式的图片文件'), false);
  }
};

// 创建multer实例
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1 // 只允许上传一个文件
  }
});

// 封面上传中间件
const uploadCover = upload.single('cover');

// 删除文件的工具函数
const deleteFile = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!filePath) {
      resolve();
      return;
    }
    
    // 如果是相对路径，转换为绝对路径
    let absolutePath = filePath;
    if (!path.isAbsolute(filePath)) {
      absolutePath = path.join(__dirname, '../public', filePath);
    }
    
    fs.unlink(absolutePath, (err) => {
      if (err && err.code !== 'ENOENT') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// 获取文件的相对URL路径
const getFileUrl = (filename) => {
  if (!filename) return null;
  return `/uploads/covers/${filename}`;
};

module.exports = {
  uploadCover,
  deleteFile,
  getFileUrl
};