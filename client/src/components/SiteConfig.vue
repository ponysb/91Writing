<template>
  <div class="site-config">
    <!-- 页脚信息 -->
    <footer class="site-footer" v-if="siteConfig.icp || siteConfig.copyright">
      <div class="footer-content">
        <div class="footer-links">
          <span v-if="siteConfig.icp" class="icp-info">{{ siteConfig.icp }}</span>
          <span v-if="siteConfig.copyright" class="copyright">{{ siteConfig.copyright }}</span>
        </div>
        
        <!-- 社交媒体链接 -->
        <div v-if="siteConfig.showSocialLinks && hasSocialLinks" class="social-links">
          <el-button 
            v-if="siteConfig.socialMedia.weibo"
            type="text" 
            @click="openSocialLink(siteConfig.socialMedia.weibo)"
            class="social-btn"
          >
            <el-icon><Share /></el-icon>
            微博
          </el-button>
          <el-button 
            v-if="siteConfig.socialMedia.douyin"
            type="text" 
            @click="copyContact(siteConfig.socialMedia.douyin, '抖音号')"
            class="social-btn"
          >
            <el-icon><VideoCamera /></el-icon>
            抖音
          </el-button>
          <el-button 
            v-if="siteConfig.socialMedia.bilibili"
            type="text" 
            @click="openSocialLink(siteConfig.socialMedia.bilibili)"
            class="social-btn"
          >
            <el-icon><VideoPlay /></el-icon>
            B站
          </el-button>
        </div>
      </div>
    </footer>
    
    <!-- 联系方式浮动按钮 -->
    <div v-if="siteConfig.showContactFloat && hasContactInfo" class="contact-float">
      <el-button 
        type="primary" 
        circle 
        @click="toggleContact"
        class="contact-toggle"
        size="large"
      >
        <el-icon><Service /></el-icon>
      </el-button>
      
      <!-- 联系方式弹出层 -->
      <transition name="contact-slide">
        <div v-show="showContactFloat" class="contact-panel">
          <div class="contact-header">
            <h4>联系我们</h4>
            <el-button 
              type="text" 
              @click="showContactFloat = false"
              class="close-btn"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          
          <div class="contact-list">
            <div v-if="siteConfig.contactQQ" class="contact-item" @click="copyContact(siteConfig.contactQQ, 'QQ')">
              <el-icon class="contact-icon"><ChatDotRound /></el-icon>
              <div class="contact-info">
                <span class="contact-label">QQ</span>
                <span class="contact-value">{{ siteConfig.contactQQ }}</span>
              </div>
            </div>
            
            <div v-if="siteConfig.contactWechat" class="contact-item" @click="copyContact(siteConfig.contactWechat, '微信')">
              <el-icon class="contact-icon"><ChatRound /></el-icon>
              <div class="contact-info">
                <span class="contact-label">微信</span>
                <span class="contact-value">{{ siteConfig.contactWechat }}</span>
              </div>
            </div>
            
            <div v-if="siteConfig.contactEmail" class="contact-item" @click="copyContact(siteConfig.contactEmail, '邮箱')">
              <el-icon class="contact-icon"><Message /></el-icon>
              <div class="contact-info">
                <span class="contact-label">邮箱</span>
                <span class="contact-value">{{ siteConfig.contactEmail }}</span>
              </div>
            </div>
          </div>
          
          <div class="contact-tip">
            <el-icon><InfoFilled /></el-icon>
            点击联系方式可复制到剪贴板
          </div>
        </div>
      </transition>
    </div>
    
    <!-- 公告通知 -->
    <div v-if="activeAnnouncements.length > 0" class="announcements">
      <el-alert
        v-for="announcement in activeAnnouncements"
        :key="announcement.id"
        :title="announcement.title"
        :description="announcement.content"
        :type="announcement.type"
        show-icon
        :closable="true"
        class="announcement-item"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Service, Close, ChatDotRound, ChatRound, Message, InfoFilled,
  Share, VideoCamera, VideoPlay
} from '@element-plus/icons-vue'
import { useSiteSettingsStore } from '@/stores/siteSettings'

const siteSettingsStore = useSiteSettingsStore()

// 计算属性：从store获取网站配置
const siteConfig = computed(() => ({
  siteName: siteSettingsStore.settings.siteName || '网文创作平台',
  icp: siteSettingsStore.settings.icp || '',
  copyright: siteSettingsStore.settings.copyright || '© 2024 网文创作平台 版权所有',
  contactQQ: siteSettingsStore.settings.contactQQ || '',
  contactWechat: siteSettingsStore.settings.contactWechat || '',
  contactEmail: siteSettingsStore.settings.contactEmail || '',
  socialMedia: siteSettingsStore.settings.socialMedia || {},
  showContactFloat: true,
  showSocialLinks: true
}))

// 活跃公告
const activeAnnouncements = computed(() => 
  siteSettingsStore.announcements.filter(announcement => 
    announcement.isActive && 
    (!announcement.startDate || new Date(announcement.startDate) <= new Date()) &&
    (!announcement.endDate || new Date(announcement.endDate) >= new Date())
  )
)

// 是否有联系信息
const hasContactInfo = computed(() => 
  siteConfig.value.contactQQ || 
  siteConfig.value.contactWechat || 
  siteConfig.value.contactEmail
)

// 是否有社交媒体链接
const hasSocialLinks = computed(() => 
  siteConfig.value.socialMedia.weibo || 
  siteConfig.value.socialMedia.douyin || 
  siteConfig.value.socialMedia.bilibili
)

// 显示联系方式浮动按钮
const showContactFloat = ref(false)

// 切换联系方式显示
const toggleContact = () => {
  showContactFloat.value = !showContactFloat.value
}

// 复制联系方式
const copyContact = async (text, type) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success(`${type}已复制到剪贴板`)
    showContactFloat.value = false
  } catch (error) {
    ElMessage.error('复制失败，请手动复制')
  }
}

// 打开社交媒体链接
const openSocialLink = (url) => {
  if (url) {
    window.open(url, '_blank')
  }
}

// 组件挂载时的初始化
onMounted(async () => {
  // 加载公开的网站设置和公告
  try {
    await siteSettingsStore.loadPublicSettings()
    await siteSettingsStore.getActiveAnnouncements()
  } catch (error) {
    console.error('加载网站配置失败:', error)
  }
})
</script>

<style scoped>
.site-config {
  position: relative;
}

/* 页脚样式 */
.site-footer {
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
  padding: 20px 0;
  margin-top: 40px;
  text-align: center;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.footer-links {
  margin-bottom: 15px;
}

.icp-info, .copyright {
  color: #6c757d;
  font-size: 14px;
  margin: 0 15px;
}

.social-links {
  display: flex;
  justify-content: center;
  gap: 10px;
}

.social-btn {
  color: #6c757d;
  font-size: 14px;
}

.social-btn:hover {
  color: #409eff;
}

/* 联系方式浮动按钮 */
.contact-float {
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 1000;
}

.contact-toggle {
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;
}

.contact-toggle:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(64, 158, 255, 0.4);
}

/* 联系方式面板 */
.contact-panel {
  position: absolute;
  bottom: 70px;
  right: 0;
  width: 280px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid #e4e7ed;
  overflow: hidden;
}

.contact-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.contact-header h4 {
  margin: 0;
  color: #303133;
  font-size: 16px;
}

.close-btn {
  color: #909399;
  padding: 0;
}

.contact-list {
  padding: 10px 0;
}

.contact-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.contact-item:hover {
  background: #f5f7fa;
}

.contact-icon {
  font-size: 18px;
  color: #409eff;
  margin-right: 12px;
}

.contact-info {
  flex: 1;
}

.contact-label {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-bottom: 2px;
}

.contact-value {
  display: block;
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.contact-tip {
  padding: 10px 20px;
  background: #f0f9ff;
  color: #409eff;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
}

/* 动画效果 */
.contact-slide-enter-active,
.contact-slide-leave-active {
  transition: all 0.3s ease;
}

.contact-slide-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

.contact-slide-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.95);
}

/* 公告样式 */
.announcements {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 350px;
  z-index: 999;
}

.announcement-item {
  margin-bottom: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .contact-float {
    bottom: 20px;
    right: 20px;
  }
  
  .contact-panel {
    width: 260px;
  }
  
  .announcements {
    top: 10px;
    right: 10px;
    left: 10px;
    width: auto;
  }
  
  .footer-links {
    flex-direction: column;
    gap: 10px;
  }
  
  .icp-info, .copyright {
    margin: 5px 0;
  }
}
</style>