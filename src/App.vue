<template>
  <div id="app">
    <router-view />
    
    <!-- 公告对话框 -->
    <AnnouncementDialog
      v-model:visible="showAnnouncement"
      :announcement="currentAnnouncement"
      @close="handleAnnouncementClose"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AnnouncementDialog from './components/AnnouncementDialog.vue'
import { 
  hasNewAnnouncement, 
  getLatestAnnouncement, 
  markAnnouncementAsRead
} from './config/announcements.js'

// 公告相关状态
const showAnnouncement = ref(false)
const currentAnnouncement = ref({})

// 检查并显示公告
const checkAnnouncement = () => {
  try {
    if (hasNewAnnouncement()) {
      const latestAnnouncement = getLatestAnnouncement()
      currentAnnouncement.value = latestAnnouncement
      
      // 延迟显示，确保页面完全加载
      setTimeout(() => {
        showAnnouncement.value = true
      }, 1000)
    }
  } catch (error) {
    console.error('检查公告时出错:', error)
  }
}

// 处理公告关闭
const handleAnnouncementClose = () => {
  const version = currentAnnouncement.value.version
  
  // 标记为已读
  markAnnouncementAsRead(version)
  
  showAnnouncement.value = false
}

onMounted(() => {
  // 页面加载完成后检查公告
  checkAnnouncement()
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