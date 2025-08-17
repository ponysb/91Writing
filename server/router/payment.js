const Router = require('koa-router');
const router = new Router({ prefix: '/api/payment' });
const ltzfService = require('../services/ltzfService');
const cryptoUtils = require('../utils/crypto');
const PaymentOrder = require('../models/PaymentOrder');
const User = require('../models/user');
const Package = require('../models/package');
const UserPackageRecord = require('../models/userPackageRecord');
const MembershipService = require('../services/membershipService');
const paymentConfigService = require('../services/paymentConfigService');
const { Op } = require('sequelize');

// 获取VIP套餐列表
router.get('/vip-packages', async (ctx) => {
  try {
    const packages = await Package.findAll({
      where: {
        is_active: true
      },
      order: [['sort_order', 'ASC'], ['id', 'ASC']]
    });

    ctx.body = {
      code: 200,
      message: '获取VIP套餐列表成功',
      data: packages
    };
  } catch (error) {
    console.error('获取VIP套餐列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: '获取VIP套餐列表失败',
      error: error.message
    };
  }
});

// 创建支付订单
router.post('/create-order', async (ctx) => {
  try {
    // 检查用户认证
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        message: '请先登录'
      };
      return;
    }
    
    const { package_id, product_type = 'vip' } = ctx.request.body;
    const userId = ctx.state.user.id;

    // 验证套餐
    let packageInfo = null;
    let totalFee = 0;
    let body = '';
    let productInfo = {};

    if (product_type === 'vip') {
      packageInfo = await Package.findOne({
        where: {
          id: package_id,
          is_active: true
        }
      });

      if (!packageInfo) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: 'VIP套餐不存在或已下架'
        };
        return;
      }

      totalFee = packageInfo.price;
      body = `VIP会员-${packageInfo.name}`;
      productInfo = {
        package_id: packageInfo.id,
        package_name: packageInfo.name,
        duration_days: packageInfo.validity_days,
        credits: packageInfo.credits
      };
    } else if (product_type === 'credits') {
      packageInfo = await Package.findOne({
        where: {
          id: package_id,
          status: 'active'
        }
      });

      if (!packageInfo) {
        ctx.status = 400;
        ctx.body = {
          code: 400,
          message: '积分套餐不存在或已下架'
        };
        return;
      }

      totalFee = packageInfo.price;
      body = `积分套餐-${packageInfo.name}`;
      productInfo = {
        package_id: packageInfo.id,
        package_name: packageInfo.name,
        credits: packageInfo.credits,
        validity_days: packageInfo.validity_days,
        package_type: packageInfo.type
      };
    } else {
      ctx.status = 400;
      ctx.body = {
        code: 400,
        message: '暂不支持该商品类型'
      };
      return;
    }

    // 生成订单号
    const outTradeNo = `PAY${Date.now()}${userId.toString().padStart(6, '0')}`;
    
    // 获取支付配置中的回调地址
    const ltzfConfig = await paymentConfigService.getLtzfConfig();
    const notifyUrl = ltzfConfig?.notifyUrl || process.env.LTZF_NOTIFY_URL || `${process.env.BASE_URL || 'http://localhost:3000'}/api/payment/notify`;
    
    // 创建支付订单记录
    const paymentOrder = await PaymentOrder.create({
      user_id: userId,
      out_trade_no: outTradeNo,
      total_fee: totalFee,
      body: body,
      attach: JSON.stringify({ user_id: userId, product_type }),
      status: 'pending',
      notify_url: notifyUrl,
      product_type: product_type,
      product_id: package_id,
      product_info: productInfo,
      expire_time: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2小时后过期
    });

    // 调用蓝兔支付接口
    const paymentParams = {
      out_trade_no: outTradeNo,
      total_fee: totalFee.toString(), // 直接传递金额
      body: body,
      notify_url: paymentOrder.notify_url,
      attach: paymentOrder.attach,
      time_expire: '2h'
    };

    const paymentResult = await ltzfService.nativePay(paymentParams);

    if (paymentResult.code === 0) {
      // 更新订单信息
      await paymentOrder.update({
        code_url: paymentResult.data.code_url,
        qrcode_url: paymentResult.data.QRcode_url,
        trade_type: 'NATIVE',
        pay_channel: 'wxpay'
      });

      ctx.body = {
        code: 200,
        message: '创建支付订单成功',
        data: {
          out_trade_no: outTradeNo,
          total_fee: totalFee,
          body: body,
          code_url: paymentResult.data.code_url,
          qrcode_url: paymentResult.data.QRcode_url,
          expire_time: paymentOrder.expire_time
        }
      };
    } else {
      // 更新订单状态为失败
      await paymentOrder.update({ status: 'failed' });
      
      ctx.status = 400;
      ctx.body = {
        code: 400,
        message: paymentResult.msg || '创建支付订单失败'
      };
    }
  } catch (error) {
    console.error('创建支付订单失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: '创建支付订单失败',
      error: error.message
    };
  }
});

// 查询支付订单状态
router.get('/order-status/:out_trade_no', async (ctx) => {
  try {
    // 检查用户认证
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        message: '请先登录'
      };
      return;
    }
    
    const { out_trade_no } = ctx.params;
    const userId = ctx.state.user.id;

    // 检查是否为管理员
    const isAdmin = ctx.state.user && (ctx.state.user.is_admin || ctx.state.user.role === 'admin');
    
    // 查询本地订单 - 管理员可以查询所有订单，普通用户只能查询自己的订单
    const whereCondition = { out_trade_no: out_trade_no };
    if (!isAdmin) {
      whereCondition.user_id = userId;
    }
    
    const paymentOrder = await PaymentOrder.findOne({
      where: whereCondition
    });

    if (!paymentOrder) {
      ctx.status = 404;
      ctx.body = {
        code: 404,
        message: '订单不存在'
      };
      return;
    }

    // 如果订单已支付，直接返回
    if (paymentOrder.status === 'paid') {
      ctx.body = {
        code: 200,
        message: '订单查询成功',
        data: {
          out_trade_no: paymentOrder.out_trade_no,
          status: paymentOrder.status,
          total_fee: paymentOrder.total_fee,
          success_time: paymentOrder.success_time
        }
      };
      return;
    }

    // 查询远程订单状态
    try {
      const queryResult = await ltzfService.queryOrder(out_trade_no);
      console.log('远程订单查询结果:', JSON.stringify(queryResult, null, 2));
      
      if (queryResult.code === 0 && queryResult.data) {
        const remoteOrder = queryResult.data;
        console.log('远程订单支付状态:', remoteOrder.pay_status, '类型:', typeof remoteOrder.pay_status);
        
        // 更新本地订单状态
        if (remoteOrder.pay_status === 1 || remoteOrder.pay_status === '1') { // 支付成功
          await paymentOrder.update({
            status: 'paid',
            order_no: remoteOrder.order_no,
            pay_no: remoteOrder.pay_no,
            success_time: new Date(remoteOrder.success_time),
            pay_channel: remoteOrder.pay_channel,
            openid: remoteOrder.openid
          });
          
          // 处理支付成功后的业务逻辑
          await handlePaymentSuccess(paymentOrder);
          
          ctx.body = {
            code: 200,
            message: '支付成功',
            data: {
              out_trade_no: paymentOrder.out_trade_no,
              status: 'paid',
              total_fee: paymentOrder.total_fee,
              success_time: remoteOrder.success_time
            }
          };
          return;
        }
      }
    } catch (queryError) {
      console.error('查询远程订单失败:', queryError);
    }

    // 检查订单是否过期
    if (paymentOrder.expire_time && new Date() > paymentOrder.expire_time) {
      await paymentOrder.update({ status: 'expired' });
      ctx.body = {
        code: 200,
        message: '订单已过期',
        data: {
          out_trade_no: paymentOrder.out_trade_no,
          status: 'expired',
          total_fee: paymentOrder.total_fee
        }
      };
      return;
    }

    ctx.body = {
      code: 200,
      message: '订单查询成功',
      data: {
        out_trade_no: paymentOrder.out_trade_no,
        status: paymentOrder.status,
        total_fee: paymentOrder.total_fee,
        expire_time: paymentOrder.expire_time
      }
    };
  } catch (error) {
    console.error('查询订单状态失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: '查询订单状态失败',
      error: error.message
    };
  }
});

// 支付成功回调
router.post('/notify', async (ctx) => {
  try {
    console.log('收到支付回调:', ctx.request.body);
    
    // 验证签名
    const isValidSign = await ltzfService.verifyNotifySign(ctx.request.body);
    if (!isValidSign) {
      console.error('支付回调签名验证失败');
      ctx.body = 'FAIL';
      return;
    }

    const {
      code,
      out_trade_no,
      order_no,
      pay_no,
      total_fee,
      success_time,
      pay_channel,
      openid,
      attach
    } = ctx.request.body;

    // 查询订单
    const paymentOrder = await PaymentOrder.findOne({
      where: { out_trade_no }
    });

    if (!paymentOrder) {
      console.error('支付回调：订单不存在', out_trade_no);
      ctx.body = 'FAIL';
      return;
    }

    // 检查订单是否已处理
    if (paymentOrder.status === 'paid') {
      console.log('订单已处理，直接返回成功');
      ctx.body = 'SUCCESS';
      return;
    }

    if (code === '0') { // 支付成功
      // 更新订单状态
      await paymentOrder.update({
        status: 'paid',
        order_no,
        pay_no,
        success_time: new Date(success_time),
        pay_channel,
        openid
      });

      // 处理支付成功后的业务逻辑
      await handlePaymentSuccess(paymentOrder);
      
      console.log('支付成功处理完成:', out_trade_no);
      ctx.body = 'SUCCESS';
    } else {
      // 支付失败
      await paymentOrder.update({ status: 'failed' });
      console.log('支付失败:', out_trade_no);
      ctx.body = 'SUCCESS';
    }
  } catch (error) {
    console.error('处理支付回调失败:', error);
    ctx.body = 'FAIL';
  }
});

// 获取用户支付订单列表
router.get('/orders', async (ctx) => {
  try {
    // 检查用户认证
    if (!ctx.state.user) {
      ctx.status = 401;
      ctx.body = {
        code: 401,
        message: '请先登录'
      };
      return;
    }
    
    const userId = ctx.state.user.id;
    const { page = 1, limit = 10, status, user_id } = ctx.query;
    
    // 检查是否为管理员
    const isAdmin = ctx.state.user && (ctx.state.user.is_admin || ctx.state.user.role === 'admin');
    
    // 获取支付订单 - 管理员可以查询所有订单或指定用户订单，普通用户只能查询自己的订单
    const paymentWhereCondition = {};
    if (isAdmin && user_id) {
      // 管理员查询指定用户的订单
      paymentWhereCondition.user_id = parseInt(user_id);
    } else if (!isAdmin) {
      // 普通用户只能查询自己的订单
      paymentWhereCondition.user_id = userId;
    }
    // 如果是管理员且没有指定user_id，则查询所有订单
    
    if (status) {
      paymentWhereCondition.status = status;
    }

    const paymentOrders = await PaymentOrder.findAll({
      where: paymentWhereCondition,
      include: [
        {
          model: Package,
          as: 'package',
          attributes: ['id', 'name', 'credits', 'validity_days']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'nickname'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // 获取激活码激活记录
    const UserPackageRecord = require('../models/userPackageRecord');
    const ActivationCode = require('../models/activationCode');
    
    // 获取激活码激活记录 - 管理员可以查询所有记录或指定用户记录，普通用户只能查询自己的记录
    const activationWhereCondition = { 
      activation_type: 'activation_code'
    };
    if (isAdmin && user_id) {
      // 管理员查询指定用户的记录
      activationWhereCondition.user_id = parseInt(user_id);
    } else if (!isAdmin) {
      // 普通用户只能查询自己的记录
      activationWhereCondition.user_id = userId;
    }
    // 如果是管理员且没有指定user_id，则查询所有记录
    
    const activationRecords = await UserPackageRecord.findAll({
      where: activationWhereCondition,
      include: [
        {
          model: Package,
          as: 'package',
          attributes: ['id', 'name', 'credits', 'validity_days']
        },
        {
          model: ActivationCode,
          as: 'activationCode',
          attributes: ['id', 'code'],
          required: false
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'nickname'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // 统一格式化订单数据
    const formattedPaymentOrders = paymentOrders.map(order => ({
      id: order.id,
      type: 'payment',
      order_no: order.out_trade_no,
      amount: parseFloat(order.total_fee),
      status: order.status,
      payment_method: order.pay_channel,
      product_name: order.body,
      package_info: order.package ? {
        id: order.package.id,
        name: order.package.name,
        credits: order.package.credits,
        validity_days: order.package.validity_days
      } : null,
      created_at: order.created_at,
      success_time: order.success_time
    }));

    const formattedActivationOrders = activationRecords.map(record => ({
      id: record.id,
      type: 'activation_code',
      order_no: record.activationCode?.code || `ACT-${record.id}`,
      amount: parseFloat(record.payment_amount || 0),
      status: record.status === 'active' ? 'paid' : record.status,
      payment_method: 'activation_code',
      product_name: `激活码开通-${record.package?.name || '未知套餐'}`,
      package_info: record.package ? {
        id: record.package.id,
        name: record.package.name,
        credits: record.package.credits,
        validity_days: record.package.validity_days
      } : null,
      created_at: record.created_at,
      success_time: record.created_at,
      activation_info: {
        credits: record.credits,
        remaining_credits: record.remaining_credits,
        start_date: record.start_date,
        end_date: record.end_date
      }
    }));

    // 合并并排序所有订单
    const allOrders = [...formattedPaymentOrders, ...formattedActivationOrders]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // 应用状态筛选
    let filteredOrders = allOrders;
    if (status) {
      filteredOrders = allOrders.filter(order => order.status === status);
    }

    // 分页处理
    const total = filteredOrders.length;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const paginatedOrders = filteredOrders.slice(offset, offset + parseInt(limit));

    ctx.body = {
      code: 200,
      message: '获取订单列表成功',
      data: {
        orders: paginatedOrders,
        total: total,
        page: parseInt(page),
        limit: parseInt(limit),
        total_pages: Math.ceil(total / parseInt(limit)),
        summary: {
          payment_orders: formattedPaymentOrders.length,
          activation_orders: formattedActivationOrders.length,
          total_orders: total
        }
      }
    };
  } catch (error) {
    console.error('获取订单列表失败:', error);
    ctx.status = 500;
    ctx.body = {
      code: 500,
      message: '获取订单列表失败',
      error: error.message
    };
  }
});

// 处理支付成功后的业务逻辑
async function handlePaymentSuccess(paymentOrder) {
  try {
    // 统一使用MembershipService处理所有套餐类型的开通
    const productInfo = paymentOrder.product_info;
    
    console.log('支付订单信息:', {
      product_id: paymentOrder.product_id,
      product_type: paymentOrder.product_type,
      product_info: paymentOrder.product_info,
      productInfo_package_id: productInfo.package_id
    });
    
    await MembershipService.activateByRecharge({
      userId: paymentOrder.user_id,
      packageId: productInfo.package_id,
      orderId: paymentOrder.out_trade_no,
      paymentAmount: paymentOrder.total_fee,
      paymentMethod: 'ltzf'
    });
    
    console.log(`用户 ${paymentOrder.user_id} 套餐开通成功，会员记录已创建`);
  } catch (error) {
    console.error('处理支付成功业务逻辑失败:', error);
    throw error;
  }
}

module.exports = router;