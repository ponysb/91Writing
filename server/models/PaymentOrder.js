const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PaymentOrder = sequelize.define('PaymentOrder', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  out_trade_no: {
    type: DataTypes.STRING(64),
    allowNull: false,
    comment: '商户订单号'
  },
  order_no: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: '系统订单号'
  },
  pay_no: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: '支付宝或微信支付订单号'
  },
  total_fee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '支付金额（元）'
  },
  body: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '商品描述'
  },
  attach: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '附加数据'
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'cancelled', 'expired'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '订单状态：pending-待支付，paid-已支付，failed-支付失败，cancelled-已取消，expired-已过期'
  },
  pay_channel: {
    type: DataTypes.ENUM('wxpay', 'alipay'),
    allowNull: true,
    comment: '支付渠道'
  },
  trade_type: {
    type: DataTypes.ENUM('NATIVE', 'H5', 'APP', 'JSAPI', 'MINIPROGRAM'),
    allowNull: true,
    comment: '支付类型'
  },
  code_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '微信原生支付链接'
  },
  qrcode_url: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '二维码图片链接'
  },
  notify_url: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '支付通知地址'
  },
  success_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '支付完成时间'
  },
  expire_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '订单过期时间'
  },
  openid: {
    type: DataTypes.STRING(128),
    allowNull: true,
    comment: '支付者信息'
  },
  product_type: {
    type: DataTypes.ENUM('vip', 'activation_code', 'other'),
    allowNull: false,
    comment: '商品类型：vip-会员，activation_code-激活码，other-其他'
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '商品ID（如VIP套餐ID）'
  },
  product_info: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '商品详细信息'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'payment_orders',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['out_trade_no'],
      unique: true
    },
    {
      fields: ['order_no']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    }
  ]
});

// 关联用户模型
PaymentOrder.associate = function(models) {
  PaymentOrder.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

module.exports = PaymentOrder;