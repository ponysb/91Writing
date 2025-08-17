<template>
  <div id="app">
    <router-view />
    
    <!-- 公告弹窗 -->
    <AnnouncementDialog
      v-model="showAnnouncementDialog"
      :announcements="unreadAnnouncements"
      @close="handleAnnouncementClose"
      @markAsRead="handleMarkAsRead"
    />
  </div>
</template>

<script setup>
import { onMounted, computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useSiteSettingsStore } from '@/stores/siteSettings'
import { useUserStore } from '@/stores/user'
import AnnouncementDialog from '@/components/AnnouncementDialog.vue'
import announcementService from '@/utils/announcementService'

const route = useRoute()
const siteSettingsStore = useSiteSettingsStore()
const userStore = useUserStore()

// 公告相关状态
const showAnnouncementDialog = ref(false)
const unreadAnnouncements = ref([])

const siteConfig = computed(() => ({
  siteName: siteSettingsStore.settings.siteName || '网文创作平台',
  siteDescription: siteSettingsStore.settings.siteDescription || '专业的AI辅助小说创作平台，让创作更简单',
  siteKeywords: siteSettingsStore.settings.siteKeywords || 'AI小说,小说创作,人工智能写作',
  siteLogo: siteSettingsStore.settings.siteLogo || '',
  siteIcon: siteSettingsStore.settings.siteIcon || ''
}))

// 检查并显示公告
const checkAndShowAnnouncements = async () => {
  try {
    // 只有登录用户才显示公告
    if (!userStore.isAuthenticated) {
      return
    }
    
    // 管理后台不显示公告弹窗
    if (route.path.startsWith('/admin')) {
      return
    }
    
    const announcements = await announcementService.getSortedUnreadAnnouncements()
    if (announcements.length > 0) {
      unreadAnnouncements.value = announcements
      showAnnouncementDialog.value = true
    }
  } catch (error) {
    console.error('检查公告失败:', error)
  }
}

// 监听用户登录状态变化
watch(() => userStore.isAuthenticated, (newValue) => {
  if (newValue) {
    // 用户登录后延迟检查公告
    setTimeout(() => {
      checkAndShowAnnouncements()
    }, 1000)
  }
})

// 处理公告弹窗关闭
const handleAnnouncementClose = () => {
  showAnnouncementDialog.value = false
}

// 处理标记公告为已读
const handleMarkAsRead = (announcementId) => {
  announcementService.markAsRead(announcementId)
}

onMounted(async () => {
  await siteSettingsStore.loadPublicSettings()
  
  // 设置页面标题和图标
  document.title = siteConfig.value.siteName
  if (siteConfig.value.siteIcon) {
    const favicon = document.querySelector('link[rel="icon"]') || document.createElement('link')
    favicon.rel = 'icon'
    favicon.href = siteConfig.value.siteIcon
    document.head.appendChild(favicon)
  }
  
  // 设置meta标签
  const metaDescription = document.querySelector('meta[name="description"]') || document.createElement('meta')
  metaDescription.name = 'description'
  metaDescription.content = siteConfig.value.siteDescription
  document.head.appendChild(metaDescription)
  
  const metaKeywords = document.querySelector('meta[name="keywords"]') || document.createElement('meta')
  metaKeywords.name = 'keywords'
  metaKeywords.content = siteConfig.value.siteKeywords
  document.head.appendChild(metaKeywords)
  
  // 如果用户已登录，检查公告
  if (userStore.isAuthenticated) {
    setTimeout(() => {
      checkAndShowAnnouncements()
    }, 1000)
  }
})
</script>

<style>
#app {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  padding: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}
</style>
