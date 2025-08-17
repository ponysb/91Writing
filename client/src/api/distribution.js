import axios from 'axios'

// 创建独立的 API 实例以避免循环依赖
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
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
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
    return response.data
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 分销配置管理API
export const distributionConfigAPI = {
  // 获取全局默认分销比例
  getGlobalConfig() {
    return api.get('/distribution-config/global')
  },

  // 设置全局默认分销比例（管理员）
  setGlobalConfig(data) {
    return api.post('/distribution-config/global', data)
  },

  // 获取用户个性化分销比例
  getUserConfig(username) {
    return api.get(`/distribution-config/user/${username}`)
  },

  // 设置用户个性化分销比例（管理员）
  setUserConfig(username, data) {
    return api.post(`/distribution-config/user/${username}`, data)
  },

  // 删除用户个性化分销比例（管理员）
  deleteUserConfig(username) {
    return api.delete(`/distribution-config/user/${username}`)
  },

  // 获取所有分销配置列表（管理员）
  getAdminConfigs(params) {
    return api.get('/distribution-config/admin/list', { params })
  },

  // 获取用户有效分销比例（系统内部）
  getEffectiveConfig(username) {
    return api.get(`/distribution-config/effective/${username}`)
  }
}

// 邀请记录管理API
export const inviteRecordAPI = {
  // 获取邀请记录列表（管理员）
  getAdminRecords(params) {
    return api.get('/invite-records/admin/list', { params })
  },

  // 获取我的邀请记录（用户）
  getMyRecords(params) {
    return api.get('/invite-records/my-records', { params })
  },

  // 获取邀请记录详情
  getRecord(id) {
    return api.get(`/invite-records/${id}`)
  },

  // 创建邀请记录
  createRecord(data) {
    return api.post('/invite-records', data)
  },

  // 更新邀请记录（管理员）
  updateRecord(id, data) {
    return api.put(`/invite-records/admin/${id}`, data)
  },

  // 删除邀请记录（管理员）
  deleteRecord(id) {
    return api.delete(`/invite-records/admin/${id}`)
  },

  // 验证邀请码
  validateCode(code) {
    return api.post('/invite-records/validate', { invite_code: code })
  },

  // 使用邀请码
  useCode(code) {
    return api.post('/invite-records/use', { invite_code: code })
  },

  // 获取邀请统计（管理员）
  getAdminStats(params) {
    return api.get('/invite-records/admin/stats', { params })
  },

  // 获取我的邀请统计（用户）
  getMyStats() {
    return api.get('/invite-records/my-stats')
  },

  // 创建邀请记录（管理员）
  createAdminRecord(data) {
    return api.post('/invite-records', data)
  },

  // 取消邀请记录（管理员）
  cancelRecord(id) {
    return api.put(`/invite-records/admin/${id}`, { status: 'cancelled' })
  },

  // 续期邀请记录（管理员）
  renewRecord(id, expires_days = 30) {
    return api.put(`/invite-records/admin/${id}`, { expires_days })
  }
}

// 分成记录管理API
export const commissionRecordAPI = {
  // 获取分成记录列表（管理员）
  getAdminRecords(params) {
    return api.get('/commission-records/admin/list', { params })
  },

  // 获取我的分成记录（用户）
  getMyRecords(params) {
    return api.get('/commission-records', { params })
  },

  // 获取分成记录详情
  getRecord(id) {
    return api.get(`/commission-records/${id}`)
  },

  // 创建分成记录（管理员）
  createRecord(data) {
    return api.post('/commission-records/admin', data)
  },

  // 更新分成记录（管理员）
  updateRecord(id, data) {
    return api.put(`/commission-records/admin/${id}`, data)
  },

  // 删除分成记录（管理员）
  deleteRecord(id) {
    return api.delete(`/commission-records/admin/${id}`)
  },

  // 批量更新结算状态（管理员）
  batchUpdateSettlement(data) {
    return api.put('/commission-records/admin/batch-settlement', data)
  },

  // 获取分成统计（管理员）
  getAdminStats(params) {
    return api.get('/commission-records/admin/stats', { params })
  },

  // 获取我的分成统计（用户）
  getMyStats() {
    return api.get('/commission-records/my-stats')
  },

  // 获取可提现记录（用户）
  getWithdrawableRecords(params) {
    return api.get('/commission-records/withdrawable', { params })
  }
}

// 佣金账户管理API
export const distributionAccountAPI = {
  // 获取佣金账户列表（管理员）
  getAdminAccounts(params) {
    return api.get('/distribution-accounts/admin/list', { params })
  },

  // 获取佣金账户详情（管理员）
  getAdminAccount(userId) {
    return api.get(`/distribution-accounts/admin/${userId}`)
  },

  // 更新用户分成比例（管理员）
  updateCommissionRate(userId, data) {
    return api.put(`/distribution-accounts/admin/${userId}/commission-rate`, data)
  },

  // 获取我的佣金账户（用户）
  getMyAccount() {
    return api.get('/distribution-accounts/my-account')
  },

  // 获取账户统计（管理员）
  getAdminStats() {
    return api.get('/distribution-accounts/admin/stats')
  }
}

// 提现申请管理API
export const withdrawalRequestAPI = {
  // 获取提现申请列表（管理员）
  getAdminRequests(params) {
    return api.get('/withdrawal-requests/admin/list', { params })
  },

  // 获取我的提现申请（用户）
  getMyRequests(params) {
    return api.get('/withdrawal-requests', { params })
  },

  // 获取提现申请详情
  getRequest(id) {
    return api.get(`/withdrawal-requests/${id}`)
  },

  // 创建提现申请（用户）
  createRequest(data) {
    return api.post('/withdrawal-requests', data)
  },

  // 取消提现申请（用户）
  cancelRequest(id) {
    return api.put(`/withdrawal-requests/${id}/cancel`)
  },

  // 审核提现申请（管理员）
  reviewRequest(id, data) {
    return api.put(`/withdrawal-requests/admin/${id}/review`, data)
  },

  // 标记提现完成（管理员）
  completeRequest(id, data) {
    return api.put(`/withdrawal-requests/admin/${id}/complete`, data)
  },

  // 获取提现统计（管理员）
  getAdminStats(params) {
    return api.get('/withdrawal-requests/admin/stats', { params })
  },

  // 获取我的提现统计（用户）
  getMyStats() {
    return api.get('/withdrawal-requests/my-stats')
  }
}

// 导出所有分销相关API
export const distributionAPI = {
  config: distributionConfigAPI,
  inviteRecord: inviteRecordAPI,
  commissionRecord: commissionRecordAPI,
  account: distributionAccountAPI,
  withdrawal: withdrawalRequestAPI
}

export default distributionAPI