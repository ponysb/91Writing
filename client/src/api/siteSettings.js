import api from './index'

// 网站设置相关API
export const siteSettingsAPI = {
  // 获取公开网站设置
  getPublicSettings: () => api.get('/site-settings/public'),
  
  // 获取完整网站设置（管理员）
  getAdminSettings: (token) => api.get('/site-settings/admin', {
    headers: { Authorization: `Bearer ${token}` }
  }),
  
  // 更新网站设置（管理员）
  updateSettings: (token, data) => api.put('/site-settings/admin', data, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  
  // 获取有效公告（公开）
  getActiveAnnouncements: () => api.get('/site-settings/announcements'),
  
  // 获取所有公告（管理员）
  getAllAnnouncements: (token) => api.get('/site-settings/admin/announcements', {
    headers: { Authorization: `Bearer ${token}` }
  }),
  
  // 获取管理员公告列表（别名方法）
  getAdminAnnouncements: (token) => api.get('/site-settings/admin/announcements', {
    headers: { Authorization: `Bearer ${token}` }
  }),
  
  // 创建公告（管理员）
  createAnnouncement: (token, data) => api.post('/site-settings/admin/announcements', data, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  
  // 更新公告（管理员）
  updateAnnouncement: (token, id, data) => api.put(`/site-settings/admin/announcements/${id}`, data, {
    headers: { Authorization: `Bearer ${token}` }
  }),
  
  // 删除公告（管理员）
  deleteAnnouncement: (token, id) => api.delete(`/site-settings/admin/announcements/${id}`, {
    headers: { Authorization: `Bearer ${token}` }
  }),

  // 上传网站Logo（管理员）
  uploadLogo: (token, logoFile) => {
    const formData = new FormData()
    formData.append('logo', logoFile)
    return api.post('/site-settings/admin/upload-logo', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  // 上传网站Icon（管理员）
  uploadIcon: (token, iconFile) => {
    const formData = new FormData()
    formData.append('icon', iconFile)
    return api.post('/site-settings/admin/upload-icon', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}