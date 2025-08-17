import axios from 'axios'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const userStore = useUserStore()
    if (userStore.token) {
      config.headers.Authorization = `Bearer ${userStore.token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    const { data, status } = response
    // 对于2xx状态码（成功），直接返回数据
    if (status >= 200 && status < 300) {
      // 检查后端返回的success字段，如果为false则当作错误处理
      if (data && data.success === false) {
        ElMessage.error(data.message || '请求失败')
        return Promise.reject(new Error(data.message || '请求失败'))
      }
      return data
    }
    return data
  },
  (error) => {
    if (error.response) {
      const { status, data } = error.response
      switch (status) {
        case 401:
          // 只有在非登录/注册页面且用户已登录的情况下才跳转
          if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
            const userStore = useUserStore()
            if (userStore.token) {
              ElMessage.error('登录已过期，请重新登录')
              userStore.logout()
              window.location.href = '/login'
            }
          }
          // 对于登录/注册页面的401错误，不进行页面跳转，让组件自己处理错误信息
          break
        case 403:
          ElMessage.error('权限不足')
          break
        case 400:
          // 400错误通常包含具体的业务逻辑错误信息，不在拦截器中处理，让组件自己处理
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          // 对于其他错误，不在拦截器中显示消息，让组件自己处理
          break
      }
    } else if (error.request) {
      ElMessage.error('网络错误，请检查网络连接')
    } else {
      ElMessage.error('请求配置错误')
    }
    return Promise.reject(error)
  }
)

export default api

// 认证相关API
export const authAPI = {
  // 用户登录
  login(data) {
    return api.post('/auth/login', data)
  },
  
  // 用户注册
  register(data) {
    return api.post('/users', data)
  },
  
  // 验证邀请码
  validateInviteCode(code) {
    return api.post('/invite-records/validate', { invite_code: code })
  },
  
  // 刷新Token
  refreshToken(token) {
    return api.post('/auth/refresh', { token })
  },
  
  // 获取当前用户信息
  getCurrentUser() {
    return api.get('/auth/me')
  },
  
  // 用户登出
  logout() {
    return api.post('/auth/logout')
  }
}

// 用户管理API
export const userAPI = {
  // 创建用户
  createUser(data) {
    return api.post('/users', data)
  },
  
  // 获取用户列表
  getUsers(params) {
    return api.get('/users', { params })
  },
  
  // 获取单个用户
  getUser(id) {
    return api.get(`/users/${id}`)
  },
  
  // 更新用户信息
  updateUser(id, data) {
    return api.put(`/users/${id}`, data)
  },
  
  // 删除用户
  deleteUser(id) {
    return api.delete(`/users/${id}`)
  },
  
  // 设置管理员权限
  setAdmin(id, isAdmin) {
    return api.put(`/users/${id}/admin`, { isAdmin })
  },
  
  // 批量删除用户
  batchDeleteUsers(userIds) {
    return api.delete('/users/batch', { data: { userIds } })
  },
  
  // 恢复用户
  restoreUser(id) {
    return api.put(`/users/${id}/restore`)
  },
  
  // 更新用户使用次数
  updateUsage(id, increment) {
    return api.put(`/users/${id}/usage`, { increment })
  },
  
  // 重置用户密码
  resetPassword(id, username) {
    const defaultPassword = `${username}123`
    return api.put(`/users/${id}`, { password: defaultPassword })
  },

  // 用户修改自己的密码
  changePassword(username, data) {
    return api.put(`/users/${username}/password`, data)
  },
  
  // 获取用户统计
  getStats() {
    return api.get('/users/stats')
  },

  // 获取当前用户角色信息
  getCurrentUserRole() {
    return api.get('/users/me/role')
  }
}

// Prompt管理API
export const promptAPI = {
  // 创建Prompt
  createPrompt(data) {
    return api.post('/prompts', data)
  },
  
  // 批量创建Prompt
  batchCreatePrompts(data) {
    return api.post('/prompts/batch', data)
  },
  
  // 获取Prompt列表
  getPrompts(params) {
    return api.get('/prompts', { params })
  },
  
  // 获取Prompt详情
  getPrompt(id) {
    return api.get(`/prompts/${id}`)
  },
  
  // 更新Prompt
  updatePrompt(id, data) {
    return api.put(`/prompts/${id}`, data)
  },
  
  // 删除Prompt
  deletePrompt(id) {
    return api.delete(`/prompts/${id}`)
  },
  
  // 批量删除Prompt
  batchDeletePrompts(ids) {
    return api.delete('/prompts/batch', { data: { ids } })
  },
  
  // 恢复Prompt
  restorePrompt(id) {
    return api.post(`/prompts/${id}/restore`)
  },
  
  // 点赞/取消点赞Prompt
  likePrompt(id) {
    return api.post(`/prompts/${id}/like`)
  },
  
  // 复制Prompt
  copyPrompt(id, data) {
    return api.post(`/prompts/${id}/copy`, data)
  },
  
  // 获取Prompt统计信息
  getStats() {
    return api.get('/prompts/stats')
  },
  

}

// 小说管理API
export const novelAPI = {
  // 创建小说（支持封面上传）
  createNovel(data) {
    // 如果是FormData，需要删除默认的Content-Type让浏览器自动设置
    const config = {}
    if (data instanceof FormData) {
      config.headers = {
        'Content-Type': undefined // 让浏览器自动设置multipart/form-data
      }
    }
    return api.post('/novels', data, config)
  },
  
  // 获取管理员小说列表
  getAdminNovels(params) {
    return api.get('/novels/admin', { params })
  },
  
  // 获取我的小说列表
  getMyNovels(params) {
    return api.get('/novels/my', { params })
  },
  
  // 获取小说详情
  getNovel(id) {
    return api.get(`/novels/${id}`)
  },
  
  // 更新小说
  updateNovel(id, data) {
    // 如果是FormData，需要删除默认的Content-Type让浏览器自动设置
    const config = {}
    if (data instanceof FormData) {
      config.headers = {
        'Content-Type': undefined // 让浏览器自动设置multipart/form-data
      }
    }
    return api.put(`/novels/${id}`, data, config)
  },
  
  // 删除小说
  deleteNovel(id) {
    return api.delete(`/novels/${id}`)
  },
  
  // 批量删除小说
  batchDeleteNovels(ids) {
    return api.delete('/novels', { data: { ids } })
  },
  
  // 获取小说统计信息
  getNovelStats() {
    return api.get('/novels/stats/overview')
  },
  
  // 发布小说（保留兼容性）
  publishNovel(id) {
    return api.put(`/novels/${id}/publish`)
  }
}

// 章节管理API
export const chapterAPI = {
  // 创建章节
  createChapter(data) {
    return api.post('/chapters', data)
  },
  
  // 批量创建章节
  batchCreateChapters(data) {
    return api.post('/chapters/batch', data)
  },
  
  // 获取章节列表
  getChapters(params) {
    return api.get('/chapters', { params })
  },
  
  // 获取章节详情
  getChapter(id) {
    return api.get(`/chapters/${id}`)
  },
  
  // 更新章节
  updateChapter(id, data) {
    return api.put(`/chapters/${id}`, data)
  },
  
  // 删除章节
  deleteChapter(id) {
    return api.delete(`/chapters/${id}`)
  },
  
  // 发布章节
  publishChapter(id) {
    return api.put(`/chapters/${id}/publish`)
  }
}

// 人物管理API
export const characterAPI = {
  // 创建人物
  createCharacter(data) {
    return api.post('/characters', data)
  },
  
  // 批量创建人物
  batchCreateCharacters(data) {
    return api.post('/characters/batch', data)
  },
  
  // 获取人物列表
  getCharacters(params) {
    return api.get('/characters', { params })
  },
  
  // 获取人物详情
  getCharacter(id) {
    return api.get(`/characters/${id}`)
  },
  
  // 更新人物
  updateCharacter(id, data) {
    return api.put(`/characters/${id}`, data)
  },
  
  // 删除人物
  deleteCharacter(id) {
    return api.delete(`/characters/${id}`)
  },
  
  // 批量删除人物
  batchDeleteCharacters(ids) {
    return api.delete('/characters/batch', { data: { ids } })
  }
}

// 世界观管理API
export const worldviewAPI = {
  // 创建世界观
  createWorldview(data) {
    return api.post('/worldviews', data)
  },
  
  // 批量创建世界观
  batchCreateWorldviews(data) {
    return api.post('/worldviews/batch', data)
  },
  
  // 获取世界观列表
  getWorldviews(params) {
    return api.get('/worldviews', { params })
  },
  
  // 获取世界观详情
  getWorldview(id) {
    return api.get(`/worldviews/${id}`)
  },
  
  // 更新世界观
  updateWorldview(id, data) {
    return api.put(`/worldviews/${id}`, data)
  },
  
  // 删除世界观
  deleteWorldview(id) {
    return api.delete(`/worldviews/${id}`)
  },
  
  // 批量删除世界观
  batchDeleteWorldviews(ids) {
    return api.delete('/worldviews/batch', { data: { ids } })
  }
}

// 事件线管理API
export const timelineAPI = {
  // 创建事件线
  createEvent(data) {
    return api.post('/timelines', data)
  },
  
  // 批量创建事件线
  batchCreateEvents(data) {
    return api.post('/timelines/batch', data)
  },
  
  // 获取事件线列表
  getEvents(params) {
    return api.get('/timelines', { params })
  },
  
  // 获取事件线详情
  getEvent(id) {
    return api.get(`/timelines/${id}`)
  },
  
  // 更新事件线
  updateEvent(id, data) {
    return api.put(`/timelines/${id}`, data)
  },
  
  // 删除事件线
  deleteEvent(id) {
    return api.delete(`/timelines/${id}`)
  },
  
  // 批量删除事件线
  batchDeleteEvents(ids) {
    return api.delete('/timelines', { data: { ids } })
  },
  
  // 获取事件线统计信息
  getStats(params) {
    return api.get('/timelines/stats', { params })
  }
}

// 语料库管理API
export const corpusAPI = {
  // 创建语料
  createCorpus(data) {
    return api.post('/corpus', data)
  },
  
  // 批量创建语料
  batchCreateCorpus(data) {
    return api.post('/corpus/batch', data)
  },
  
  // 获取语料列表
  getCorpus(params) {
    return api.get('/corpus', { params })
  },
  
  // 获取语料详情
  getCorpusItem(id) {
    return api.get(`/corpus/${id}`)
  },
  
  // 更新语料
  updateCorpus(id, data) {
    return api.put(`/corpus/${id}`, data)
  },
  
  // 删除语料
  deleteCorpus(id) {
    return api.delete(`/corpus/${id}`)
  },
  
  // 批量删除语料
  batchDeleteCorpus(ids) {
    return api.delete('/corpus/batch', { data: { ids } })
  }
}

// AI模型管理API
export const aiModelAPI = {
  // 获取AI模型列表
  getModels(params) {
    return api.get('/aimodels', { params })
  },
  
  // 获取AI模型详情
  getModel(id) {
    return api.get(`/aimodels/${id}`)
  },
  
  // 创建AI模型
  createModel(data) {
    return api.post('/aimodels', data)
  },
  
  // 更新AI模型
  updateModel(id, data) {
    return api.put(`/aimodels/${id}`, data)
  },
  
  // 删除AI模型
  deleteModel(id) {
    return api.delete(`/aimodels/${id}`)
  },
  
  // 设置默认模型
  setDefaultModel(id) {
    return api.put(`/aimodels/${id}/default`)
  },
  
  // 测试AI模型
  testModel(id, data) {
    return api.post(`/aimodels/${id}/test`, data)
  },
  
  // 获取模型统计信息
  getStats() {
    return api.get('/aimodels/stats')
  }
}

// 会员套餐管理API
export const packageAPI = {
  // 获取套餐列表
  getPackages(params) {
    return api.get('/packages', { params })
  },
  
  // 获取单个套餐详情
  getPackage(id) {
    return api.get(`/packages/${id}`)
  },
  
  // 创建套餐
  createPackage(data) {
    return api.post('/packages', data)
  },
  
  // 更新套餐
  updatePackage(id, data) {
    return api.put(`/packages/${id}`, data)
  },
  
  // 删除套餐
  deletePackage(id) {
    return api.delete(`/packages/${id}`)
  },
  
  // 批量删除套餐
  batchDeletePackages(ids) {
    return api.delete('/packages', { data: { ids } })
  }
}

// 会员管理API（保留原有功能）
export const membershipAPI = {
  // 获取会员订单列表
  getOrders(params) {
    return api.get('/membership/orders', { params })
  },
  
  // 获取会员统计
  getStats() {
    return api.get('/membership/stats')
  },
  
  // 获取用户会员记录列表（用户端）
  getRecords(params) {
    return api.get('/membership/records', { params })
  },
  
  // 获取所有用户会员记录列表（管理员端）
  getAdminRecords(params) {
    return api.get('/membership/admin/all-records', { params })
  },
  
  // 获取剩余调用次数
  getRemainingCredits() {
    return api.get('/membership/remaining-credits')
  },
  
  // 获取当前会员等级
  getCurrentLevel() {
    return api.get('/membership/current-level')
  },
  
  // 通过激活码激活会员
  activateByCode(data) {
    return api.post('/membership/activate-by-code', data)
  },
  
  // 通过充值激活会员
  activateByRecharge(data) {
    return api.post('/membership/activate-by-recharge', data)
  },
  
  // 获取会员统计信息
  getMembershipStats() {
    return api.get('/membership/stats')
  }
}

// 激活码管理API
export const activationCodeAPI = {
  // 获取激活码列表
  list(params) {
    return api.get('/activation-codes', { params })
  },

  // 查看激活码详情
  get(id) {
    return api.get(`/activation-codes/${id}`)
  },

  // 生成激活码
  generate(data) {
    return api.post('/activation-codes/generate', data)
  },

  // 禁用激活码
  disable(id) {
    return api.patch(`/activation-codes/${id}/disable`)
  },

  // 删除激活码
  delete(id) {
    return api.delete(`/activation-codes/${id}`)
  },

  // 导出激活码
  export(params) {
    return api.get('/activation-codes/export', { params, responseType: 'blob' })
  },

  // 获取激活码统计
  getStats() {
    return api.get('/activation-codes/stats')
  },

  // 获取批次列表
  getBatches(params) {
    return api.get('/activation-codes/batches/list', { params })
  },

  // 用户端接口 - 激活码使用
  activate(code) {
    return api.post('/activation-codes/activate', { code })
  }
}

// 保留原有的cardAPI以兼容其他可能的使用
export const cardAPI = {
  // 获取卡密列表
  getCards(params) {
    return api.get('/cards', { params })
  },
  
  // 生成卡密
  generateCards(data) {
    return api.post('/cards/generate', data)
  },
  
  // 删除卡密
  deleteCard(id) {
    return api.delete(`/cards/${id}`)
  },
  
  // 批量删除卡密
  batchDeleteCards(ids) {
    return api.delete('/cards/batch', { data: { ids } })
  },
  
  // 使用卡密
  useCard(code) {
    return api.post('/cards/use', { code })
  },
  
  // 获取卡密统计
  getStats() {
    return api.get('/cards/stats')
  }
}

// 邀请管理API
export const invitationAPI = {
  // 获取当前用户的邀请码
  getMyInviteCode() {
    return api.get('/invite-records/my-invite-code')
  },
  
  // 验证邀请码
  validateInviteCode(code) {
    return api.post('/invite-records/validate', { invite_code: code })
  },
  
  // 获取当前用户的邀请记录
  getMyInviteRecords(params) {
    return api.get('/invite-records', { params })
  },
  
  // 获取当前用户的分成记录
  getMyCommissionRecords(params) {
    return api.get('/commission-records', { params })
  },
  
  // 创建邀请记录
  createInviteRecord(data) {
    return api.post('/invite-records', data)
  },
  
  // 获取邀请记录统计
  getInviteStats() {
    return api.get('/invite-records/stats')
  },
  
  // 获取邀请记录详情
  getInviteRecord(id) {
    return api.get(`/invite-records/${id}`)
  },
  
  // 获取分成记录详情
  getCommissionRecord(id) {
    return api.get(`/commission-records/${id}`)
  },
  
  // 创建分成记录
  createCommissionRecord(data) {
    return api.post('/commission-records', data)
  },
  
  // 批量确认分成记录
  batchConfirmCommission(recordIds) {
    return api.post('/commission-records/batch-confirm', { record_ids: recordIds })
  },
  
  // 获取分成统计
  getCommissionStats(params) {
    return api.get('/commission-records/stats', { params })
  },
  
  // ========== 后台管理专用接口 ==========
  
  // 管理员获取所有邀请记录列表
  getAdminInviteRecords(params) {
    return api.get('/invite-records/admin/all', { params })
  },
  
  // 管理员获取所有分成记录列表
  getAdminCommissionRecords(params) {
    return api.get('/commission-records/admin/records', { params })
  },
  
  // 创建邀请记录（管理员）
  createAdminInviteRecord(data) {
    return api.post('/invite-records', data)
  },
  
  // 取消邀请记录（管理员）
  cancelInviteRecord(id) {
    return api.patch(`/invite-records/${id}`, { status: 'cancelled' })
  },
  
  // 续期邀请记录（管理员）
  renewInviteRecord(id, expires_days = 30) {
    return api.patch(`/invite-records/${id}`, { expires_days })
  },
  
  // 获取邀请和分成综合统计（管理员）
  getAdminStats() {
    return api.get('/invite-records/admin-stats')
  },
  
  // 确认邀请关系（管理员）
  confirmInvitation(id) {
    return api.put(`/invite-records/${id}/confirm`)
  },
  
  // 结算单个佣金（管理员）
  settleCommission(id) {
    return api.put(`/commission-records/${id}/settle`)
  },
  
  // 批量结算佣金（管理员）
  batchSettleCommission(recordIds) {
    return api.post('/commission-records/batch-settle', { record_ids: recordIds })
  },
  
  // 获取佣金设置
  getCommissionSettings() {
    return api.get('/system/commission-settings')
  },
  
  // 更新佣金设置
  updateCommissionSettings(data) {
    return api.put('/system/commission-settings', data)
  }
}

// 系统设置API
export const systemAPI = {
  // 获取系统设置
  getSettings(token) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return api.get('/site-settings/admin', { headers })
  },
  
  // 更新系统设置
  updateSettings(data, token) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return api.put('/site-settings/admin', data, { headers })
  },
  
  // 测试邮件服务
  testEmail(data, token) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return api.post('/site-settings/admin/test-email', data, { headers })
  },
  
  // 测试短信服务
  testSMS(data, token) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return api.post('/site-settings/admin/test-sms', data, { headers })
  },
  
  // 测试云存储
  testStorage(data, token) {
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    return api.post('/site-settings/admin/test-storage', data, { headers })
  }
}

// 支付设置API
export const paymentAPI = {
  // 获取支付设置
  getSettings() {
    return api.get('/payment/settings')
  },
  
  // 更新支付设置
  updateSettings(data) {
    return api.put('/payment/settings', data)
  },
  
  // 测试支付接口
  testPayment(data) {
    return api.post('/payment/test', data)
  },
  
  // 获取支付统计
  getStats() {
    return api.get('/payment/stats')
  },
  
  // 获取VIP套餐列表（用户端）
  getVipPackages() {
    return api.get('/payment/vip-packages')
  },
  
  // 创建支付订单
  createOrder(data) {
    return api.post('/payment/create-order', data)
  },
  
  // 查询订单状态
  getOrderStatus(outTradeNo) {
    return api.get(`/payment/order-status/${outTradeNo}`)
  },
  
  // 获取用户订单列表
  getUserOrders(params) {
    return api.get('/payment/orders', { params })
  }
}

// 支付配置管理API
export const paymentConfigAPI = {
  // 获取支付配置列表
  getConfigs(params) {
    return api.get('/payment-configs', { params })
  },

  // 获取启用的支付配置
  getEnabledConfigs() {
    return api.get('/payment-configs/enabled')
  },

  // 获取单个支付配置
  getConfig(id) {
    return api.get(`/payment-configs/${id}`)
  },

  // 创建支付配置
  createConfig(data) {
    return api.post('/payment-configs', data)
  },

  // 更新支付配置
  updateConfig(id, data) {
    return api.put(`/payment-configs/${id}`, data)
  },

  // 删除支付配置
  deleteConfig(id) {
    return api.delete(`/payment-configs/${id}`)
  },

  // 切换支付配置状态
  toggleStatus(id) {
    return api.patch(`/payment-configs/${id}/toggle-status`)
  }
}

// VIP套餐管理API（管理员）
export const vipPackageAPI = {
  // 获取所有VIP套餐（管理员）
  getPackages(params) {
    return api.get('/vip-packages', { params })
  },
  
  // 获取单个VIP套餐详情
  getPackage(id) {
    return api.get(`/vip-packages/${id}`)
  },
  
  // 创建VIP套餐
  createPackage(data) {
    return api.post('/vip-packages', data)
  },
  
  // 更新VIP套餐
  updatePackage(id, data) {
    return api.put(`/vip-packages/${id}`, data)
  },
  
  // 删除VIP套餐
  deletePackage(id) {
    return api.delete(`/vip-packages/${id}`)
  },
  
  // 批量更新套餐状态
  batchUpdateStatus(data) {
    return api.patch('/vip-packages/batch-status', data)
  },
  
  // 更新套餐排序
  updateSort(data) {
    return api.patch('/vip-packages/sort', data)
  }
}

// AI助手管理API
export const aiAssistantAPI = {
  // 创建AI助手
  createAssistant(data) {
    return api.post('/ai-assistants', data)
  },

  // 获取AI助手列表
  getAssistants(params) {
    return api.get('/ai-assistants', { params })
  },

  // 获取AI助手详情
  getAssistant(id) {
    return api.get(`/ai-assistants/${id}`)
  },

  // 更新AI助手
  updateAssistant(id, data) {
    return api.put(`/ai-assistants/${id}`, data)
  },

  // 删除AI助手
  deleteAssistant(id) {
    return api.delete(`/ai-assistants/${id}`)
  },

  // 批量删除AI助手
  batchDeleteAssistants(data) {
    return api.post('/ai-assistants/batch-delete', data)
  },

  // 复制AI助手
  copyAssistant(id) {
    return api.post(`/ai-assistants/${id}/copy`)
  }
}

// AI对话管理API
export const aiConversationAPI = {
  // 创建对话会话
  createConversation(data) {
    return api.post('/ai-conversations', data)
  },
  
  // 获取对话会话列表
  getConversations(params) {
    return api.get('/ai-conversations', { params })
  },
  
  // 获取对话会话详情
  getConversation(id) {
    return api.get(`/ai-conversations/${id}`)
  },
  
  // 更新对话会话
  updateConversation(id, data) {
    return api.put(`/ai-conversations/${id}`, data)
  },
  
  // 删除对话会话
  deleteConversation(id) {
    return api.delete(`/ai-conversations/${id}`)
  },
  
  // 获取会话消息列表
  getMessages(conversationId, params) {
    return api.get(`/ai-conversations/${conversationId}/messages`, { params })
  }
}

// 小说类型管理API
export const novelTypeAPI = {
  // 获取小说类型列表
  getNovelTypes(params) {
    return api.get('/novel-types', { params })
  },
  
  // 获取单个小说类型详情
  getNovelType(id) {
    return api.get(`/novel-types/${id}`)
  },
  
  // 创建小说类型
  createNovelType(data) {
    return api.post('/novel-types', data)
  },
  
  // 更新小说类型
  updateNovelType(id, data) {
    return api.put(`/novel-types/${id}`, data)
  },
  
  // 删除小说类型
  deleteNovelType(id) {
    return api.delete(`/novel-types/${id}`)
  },
  
  // 批量删除小说类型
  batchDeleteNovelTypes(ids) {
    return api.delete('/novel-types', { data: { ids } })
  },
  
  // 获取可用小说类型列表
  getAvailableNovelTypes() {
    return api.get('/novel-types/available/list')
  },
  
  // 获取小说类型提示词模板
  getNovelTypePrompt(id) {
    return api.get(`/novel-types/${id}/prompt`)
  },
  
  // 增加小说类型使用次数
  incrementUsage(id) {
    return api.post(`/novel-types/${id}/usage`)
  }
}

// AI聊天API
export const aiChatAPI = {
  // 发送消息（支持流式和非流式）
  sendMessage(data) {
    return api.post('/ai-chat/conversation', data)
  },
  
  // 停止AI生成
  stopGeneration(data) {
    return api.post('/ai-chat/stop', data)
  },
  
  // 重新生成回复
  regenerateMessage(data) {
    return api.post('/ai-chat/regenerate', data)
  },
  
  // 获取可用AI模型
  getModels() {
    return api.get('/ai/models')
  },
  
  // 流式对话 - 返回EventSource连接
  sendStreamMessage(data) {
    const userStore = useUserStore()
    const token = userStore.token
    
    const url = new URL('/api/ai/chat/stream', window.location.origin)
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        url.searchParams.append(key, data[key])
      }
    })
    
    const eventSource = new EventSource(url.toString(), {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
    
    return eventSource
  },
  
  // 获取连接状态
  getConnectionStatus() {
    return api.get('/ai/chat/status')
  }
}

// AI业务接口API
export const aiBusinessAPI = {
  // 获取可用AI模型
  getModels(params) {
    return api.get('/aimodels', { params })
  },
  
  // AI短文写作
  generateShortArticle(data) {
    return api.post('/ai-business/short-article/generate', data)
  },
  
  // AI短篇小说写作
  generateShortStory(data) {
    return api.post('/ai-business/short-story/generate', data)
  },
  
  // AI大纲生成
  generateOutline(data) {
    return api.post('/ai-business/outline/generate', data)
  },
  
  // AI人物生成
  generateCharacter(data) {
    return api.post('/ai-business/character/generate', data)
  },
  
  // AI对话生成
  generateDialogue(data) {
    return api.post('/ai-business/dialogue/generate', data)
  },
  
  // AI情节生成
  generatePlot(data) {
    return api.post('/ai-business/plot/generate', data)
  },
  
  // AI文本润色
  polishText(data) {
    return api.post('/ai-business/polish/text', data)
  },
  
  // AI创意建议
  getCreativeSuggestion(data) {
    return api.post('/ai-business/creative/suggest', data)
  },
  
  // AI正文生成
  generateContent(data) {
    return api.post('/ai-business/content/generate', data)
  },
  
  // AI世界观生成
  generateWorldview(data) {
    return api.post('/ai-business/worldview/generate', data)
  },
  
  // AI拆书分析
  analyzeBook(data) {
    return api.post('/ai-business/book-analyze/generate', data)
  }
}

// 仪表盘API
export const dashboardAPI = {
  // 用户端仪表盘数据
  getUserDashboard() {
    return api.get('/dashboard/user')
  },
  
  // 管理员仪表盘数据
  getAdminDashboard() {
    return api.get('/dashboard/admin')
  },
  
  // 系统实时状态
  getSystemStatus() {
    return api.get('/dashboard/system-status')
  },
  
  // 兼容旧版本API
  getStats() {
    return api.get('/dashboard/stats')
  },
  
  getActivities(params) {
    return api.get('/dashboard/activities', { params })
  },
  
  getChartData(type, params) {
    return api.get(`/dashboard/charts/${type}`, { params })
  }
}

// AI调用记录API
export const aiCallRecordAPI = {
  // 获取AI调用记录列表 - 用户端接口
  getRecords(params) {
    return api.get('/user/ai-call-records', { params })
  },
  
  // 获取单个AI调用记录详情 - 用户端接口
  getRecord(id) {
    return api.get(`/user/ai-call-records/${id}`)
  },
  
  // 获取AI调用统计信息 - 用户端接口
  getStats(params) {
    return api.get('/user/ai-call-records/stats/summary', { params })
  },
  
  // 管理员获取AI调用记录列表
  getAdminRecords(params) {
    return api.get('/admin/ai-call-records', { params })
  },
  
  // 管理员获取单个AI调用记录详情
  getAdminRecord(id) {
    return api.get(`/admin/ai-call-records/${id}`)
  },
  
  // 管理员获取AI调用统计信息
  getAdminStats(params) {
    return api.get('/admin/ai-call-records/stats/summary', { params })
  },
  
  // 删除AI调用记录 (仅管理员)
  deleteRecord(id) {
    return api.delete(`/admin/ai-call-records/${id}`)
  },
  
  // 批量删除AI调用记录 (仅管理员)
  batchDeleteRecords(data) {
    return api.delete('/admin/ai-call-records', { data })
  }
}

// 短文管理API
export const shortStoryAPI = {
  // 创建短文
  createStory(data) {
    return api.post('/short-stories', data)
  },
  
  // 获取短文列表
  getStories(params) {
    return api.get('/short-stories', { params })
  },
  
  // 获取短文详情
  getStory(id) {
    return api.get(`/short-stories/${id}`)
  },
  
  // 更新短文
  updateStory(id, data) {
    return api.put(`/short-stories/${id}`, data)
  },
  
  // 删除短文
  deleteStory(id) {
    return api.delete(`/short-stories/${id}`)
  },
  
  // 批量删除短文
  batchDeleteStories(ids) {
    return api.delete('/short-stories', { data: { ids } })
  },
  
  // 点赞短文
  likeStory(id) {
    return api.post(`/short-stories/${id}/like`)
  },
  
  // 获取短文统计信息
  getStats() {
    return api.get('/short-stories/stats/overview')
  }
}

// 导入站点设置API
import { siteSettingsAPI } from './siteSettings.js'
// 导入分销API
import { distributionAPI } from './distribution.js'

// 导出导入的API
export { siteSettingsAPI, distributionAPI }
