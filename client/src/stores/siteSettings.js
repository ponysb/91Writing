import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { siteSettingsAPI } from '@/api'

export const useSiteSettingsStore = defineStore('siteSettings', () => {
  // 网站设置数据
  const settings = ref({
    // 基础信息
    siteName: '网文创作平台',
    siteDescription: '专业的AI辅助小说创作平台，让创作更简单',
    siteKeywords: 'AI小说,小说创作,人工智能写作,创意写作,在线写作',
    siteLogo: '',
    siteIcon: '',
    icp: '', // 备案号
    contactEmail: '',
    contactQQ: '',
    contactWechat: '',
    cardPlatformUrl: '', // 发卡平台链接
    privacyPolicy: '', // 隐私协议
    userAgreement: '', // 用户协议
    membershipAgreement: '', // 会员协议
    aboutUs: '', // 关于我们
    copyright: '© 2024 网文创作平台 版权所有',
    version: '1.0.0',
    maintenanceMode: false,
    registrationEnabled: true,
    maxFileUploadSize: 10485760, // 10MB in bytes
    supportedImageFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    
    // 社交媒体
    socialMedia: {
      weibo: '',
      douyin: '',
      bilibili: ''
    },
    
    // SEO设置
    seo: {
      metaTitle: '网文创作平台 - 智能写作助手',
      metaDescription: '专业的AI辅助小说创作平台，提供智能大纲生成、角色设定、情节构思等功能，让小说创作更高效',
      ogImage: '',
      twitterCard: 'summary_large_image'
    },
    
    // 功能开关
    features: {
      aiAssistant: true,
      collaboration: false,
      publishing: true,
      analytics: true
    },
    
    // 限制设置
    limits: {
      freeUserDailyAiCalls: 10,
      maxNovelLength: 1000000,
      maxChapterLength: 10000
    }
  })
  
  // 公告数据
  const announcements = ref([])
  
  // 加载状态
  const loading = ref(false)
  
  // 计算属性
  const hasCardPlatform = computed(() => {
    return settings.value.cardPlatformUrl && settings.value.cardPlatformUrl.trim() !== ''
  })
  
  const isMaintenanceMode = computed(() => {
    return settings.value.maintenanceMode
  })
  
  const isRegistrationEnabled = computed(() => {
    return settings.value.registrationEnabled
  })
  
  // 获取功能是否启用
  const isFeatureEnabled = (featureName) => {
    return settings.value.features[featureName] || false
  }
  
  // 加载公开设置
  const loadPublicSettings = async () => {
    try {
      loading.value = true
      const response = await siteSettingsAPI.getPublicSettings()
      if (response.success) {
        settings.value = { ...settings.value, ...response.data }
        announcements.value = response.data.announcements || []
      }
      return response
    } catch (error) {
      console.error('加载公开设置失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  // 加载管理员设置
  const loadAdminSettings = async (token) => {
    try {
      loading.value = true
      const response = await siteSettingsAPI.getAdminSettings(token)
      if (response.success) {
        settings.value = { ...settings.value, ...response.data }
        announcements.value = response.data.announcements || []
      }
      return response
    } catch (error) {
      console.error('加载管理员设置失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  // 更新设置
  const updateSettings = async (token, newSettings) => {
    try {
      loading.value = true
      const response = await siteSettingsAPI.updateSettings(token, newSettings)
      if (response.success) {
        settings.value = { ...settings.value, ...response.data }
      }
      return response
    } catch (error) {
      console.error('更新设置失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }
  
  // 获取有效公告
  const getActiveAnnouncements = async () => {
    try {
      const response = await siteSettingsAPI.getActiveAnnouncements()
      if (response.success) {
        announcements.value = response.data
      }
      return response.data
    } catch (error) {
      console.error('获取公告失败:', error)
      throw error
    }
  }
  
  // 获取所有公告（管理员）
  const getAllAnnouncements = async (token) => {
    try {
      const response = await siteSettingsAPI.getAllAnnouncements(token)
      if (response.success) {
        announcements.value = response.data
      }
      return response.data
    } catch (error) {
      console.error('获取所有公告失败:', error)
      throw error
    }
  }
  
  // 创建公告
  const createAnnouncement = async (token, announcementData) => {
    try {
      const response = await siteSettingsAPI.createAnnouncement(token, announcementData)
      if (response.success) {
        announcements.value.push(response.data)
      }
      return response
    } catch (error) {
      console.error('创建公告失败:', error)
      throw error
    }
  }
  
  // 更新公告
  const updateAnnouncement = async (token, id, announcementData) => {
    try {
      const response = await siteSettingsAPI.updateAnnouncement(token, id, announcementData)
      if (response.success) {
        const index = announcements.value.findIndex(item => item.id === id)
        if (index !== -1) {
          announcements.value[index] = response.data
        }
      }
      return response
    } catch (error) {
      console.error('更新公告失败:', error)
      throw error
    }
  }
  
  // 删除公告
  const deleteAnnouncement = async (token, id) => {
    try {
      const response = await siteSettingsAPI.deleteAnnouncement(token, id)
      if (response.success) {
        announcements.value = announcements.value.filter(item => item.id !== id)
      }
      return response
    } catch (error) {
      console.error('删除公告失败:', error)
      throw error
    }
  }
  
  // 初始化设置（自动选择公开或管理员接口）
  const initializeSettings = async () => {
    try {
      // 先尝试加载公开设置
      await loadPublicSettings()
    } catch (error) {
      console.error('初始化设置失败:', error)
    }
  }
  
  return {
    // 状态
    settings,
    announcements,
    loading,
    
    // 计算属性
    hasCardPlatform,
    isMaintenanceMode,
    isRegistrationEnabled,
    
    // 方法
    isFeatureEnabled,
    loadPublicSettings,
    loadAdminSettings,
    updateSettings,
    getActiveAnnouncements,
    getAllAnnouncements,
    createAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    initializeSettings
  }
})