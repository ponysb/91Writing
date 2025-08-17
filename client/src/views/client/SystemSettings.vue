<template>
  <div class="system-settings">

    <div class="settings-container">
      <el-row :gutter="20">
        <!-- 左侧菜单 -->
        <el-col :span="6">
          <el-card class="menu-card" shadow="never">
            <el-menu
              v-model:default-active="activeMenu"
              class="settings-menu"
              @select="handleMenuSelect"
            >
              <el-menu-item index="announcement">
                <el-icon><Bell /></el-icon>
                <span>公告</span>
              </el-menu-item>
              <el-menu-item index="about">
                <el-icon><InfoFilled /></el-icon>
                <span>关于我们</span>
              </el-menu-item>
              <el-menu-item index="privacy">
                <el-icon><Lock /></el-icon>
                <span>隐私协议</span>
              </el-menu-item>
              <el-menu-item index="user-agreement">
                <el-icon><Document /></el-icon>
                <span>用户协议</span>
              </el-menu-item>
              <el-menu-item index="membership">
                <el-icon><Star /></el-icon>
                <span>会员协议</span>
              </el-menu-item>
            </el-menu>
          </el-card>
        </el-col>

        <!-- 右侧内容 -->
        <el-col :span="18">




          <!-- 公告 -->
          <div v-if="activeMenu === 'announcement'" class="settings-content">
            <el-card class="content-card" shadow="never">
              <template #header>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <h3>公告</h3>
                  <el-button type="primary" size="small" @click="loadAnnouncements">刷新公告</el-button>
                </div>
              </template>
              
              <div class="announcement-content">
                <div class="announcement-list">
                  <div v-for="announcement in announcements" :key="announcement.id" class="announcement-item">
                    <div class="announcement-header">
                      <div class="announcement-title-section">
                        <h4>{{ announcement.title }}</h4>
                        <div class="announcement-tags">
                          <el-tag :type="getAnnouncementTypeTag(announcement.type)" size="small">
                            {{ getAnnouncementTypeText(announcement.type) }}
                          </el-tag>
                          <el-tag :type="getAnnouncementPriorityTag(announcement.priority)" size="small" class="priority-tag">
                            {{ getAnnouncementPriorityText(announcement.priority) }}
                          </el-tag>
                        </div>
                      </div>
                      <span class="announcement-date">{{ formatDate(announcement.createdAt || announcement.created_at) }}</span>
                    </div>
                    <div class="announcement-body">
                      <p>{{ announcement.content }}</p>
                    </div>
                    <div class="announcement-footer">
                      <div class="announcement-period">
                        <span class="period-text">有效期：</span>
                        <span class="period-date">{{ formatDate(announcement.startDate) }} - {{ formatDate(announcement.endDate) }}</span>
                      </div>
                      <div class="announcement-status">
                        <el-tag :type="announcement.isActive ? 'success' : 'info'" size="small">
                          {{ announcement.isActive ? '生效中' : '已失效' }}
                        </el-tag>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div v-if="announcements.length === 0" class="empty-state">
                  <el-empty description="暂无公告" />
                </div>
              </div>
            </el-card>
          </div>



          <!-- 关于我们 -->
          <div v-if="activeMenu === 'about'" class="settings-content">
            <el-card class="content-card" shadow="never">
              <template #header>
                <h3>关于我们</h3>
              </template>
              
              <div class="about-content" v-loading="siteLoading">
                <div class="app-info">
                  <h2>{{ siteSettings.siteName || '网文创作平台' }}</h2>
                  <p class="description">{{ siteSettings.siteDescription }}</p>
                  <p>版本：{{ siteSettings.version || 'v1.0.0' }}</p>
                  <p v-if="siteSettings.icp">备案号：{{ siteSettings.icp }}</p>
                </div>
                
                <div class="contact-info" v-if="siteSettings.contactEmail">
                  <h4>联系我们</h4>
                  <p v-if="siteSettings.contactEmail">邮箱：{{ siteSettings.contactEmail }}</p>
                  <p v-if="siteSettings.contactQQ">QQ：{{ siteSettings.contactQQ }}</p>
                  <p v-if="siteSettings.contactWechat">微信：{{ siteSettings.contactWechat }}</p>
                </div>
                
                <div class="social-media" v-if="siteSettings.socialMedia">
                  <h4>关注我们</h4>
                  <div class="social-links">
                    <el-button v-if="siteSettings.socialMedia.weibo" type="text" @click="openLink(siteSettings.socialMedia.weibo)">微博</el-button>
                    <el-button v-if="siteSettings.socialMedia.douyin" type="text">抖音：{{ siteSettings.socialMedia.douyin }}</el-button>
                    <el-button v-if="siteSettings.socialMedia.bilibili" type="text" @click="openLink(siteSettings.socialMedia.bilibili)">哔哩哔哩</el-button>
                  </div>
                </div>
                
                <div class="about-us-content" v-if="siteSettings.aboutUs">
                  <h4>关于我们</h4>
                  <div class="content-text markdown-content" v-html="renderedAboutUs"></div>
                </div>
                
                <div class="copyright" v-if="siteSettings.copyright">
                  <p>{{ siteSettings.copyright }}</p>
                </div>
              </div>
            </el-card>
          </div>

          <!-- 隐私协议 -->
          <div v-if="activeMenu === 'privacy'" class="settings-content">
            <el-card class="content-card" shadow="never">
              <template #header>
                <h3>隐私协议</h3>
              </template>
              
              <div class="policy-content" v-loading="siteLoading">
                <div v-if="siteSettings.privacyPolicy" class="content-text markdown-content" v-html="renderedPrivacyPolicy"></div>
                <div v-else class="empty-state">
                  <el-empty description="暂无隐私协议内容" />
                </div>
              </div>
            </el-card>
          </div>

          <!-- 用户协议 -->
          <div v-if="activeMenu === 'user-agreement'" class="settings-content">
            <el-card class="content-card" shadow="never">
              <template #header>
                <h3>用户协议</h3>
              </template>
              
              <div class="policy-content" v-loading="siteLoading">
                <div v-if="siteSettings.userAgreement" class="content-text markdown-content" v-html="renderedUserAgreement"></div>
                <div v-else class="empty-state">
                  <el-empty description="暂无用户协议内容" />
                </div>
              </div>
            </el-card>
          </div>

          <!-- 会员协议 -->
          <div v-if="activeMenu === 'membership'" class="settings-content">
            <el-card class="content-card" shadow="never">
              <template #header>
                <h3>会员协议</h3>
              </template>
              
              <div class="policy-content" v-loading="siteLoading">
                <div v-if="siteSettings.membershipAgreement" class="content-text markdown-content" v-html="renderedMembershipAgreement"></div>
                <div v-else class="empty-state">
                  <el-empty description="暂无会员协议内容" />
                </div>
              </div>
            </el-card>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import {
  User,
  Setting,
  Lock,
  Bell,
  FolderOpened,
  InfoFilled,
  Monitor,
  Share,
  CopyDocument,
  Refresh,
  Document,
  Star
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { userAPI, invitationAPI, siteSettingsAPI } from '@/api'
import api from '@/api'
import { marked } from 'marked'

const userStore = useUserStore()

// 当前激活的菜单
const activeMenu = ref('announcement')

// 网站设置数据
const siteSettings = ref({
  siteName: '',
  siteDescription: '',
  privacyPolicy: '',
  userAgreement: '',
  membershipAgreement: '',
  aboutUs: '',
  copyright: ''
})
const siteLoading = ref(false)

// 配置marked选项
marked.setOptions({
  breaks: true,
  gfm: true,
  sanitize: false
})

// 使用marked渲染markdown内容的计算属性
const renderedPrivacyPolicy = computed(() => {
  return siteSettings.value.privacyPolicy ? marked(siteSettings.value.privacyPolicy) : ''
})

const renderedUserAgreement = computed(() => {
  return siteSettings.value.userAgreement ? marked(siteSettings.value.userAgreement) : ''
})

const renderedMembershipAgreement = computed(() => {
  return siteSettings.value.membershipAgreement ? marked(siteSettings.value.membershipAgreement) : ''
})

const renderedAboutUs = computed(() => {
  return siteSettings.value.aboutUs ? marked(siteSettings.value.aboutUs) : ''
})



// 公告相关数据
const announcements = ref([])





// 处理菜单选择
const handleMenuSelect = (index) => {
  activeMenu.value = index
  // 当切换到公告时，加载公告数据
  if (index === 'announcement') {
    loadAnnouncements()
  }
  // 网站设置数据在页面初始化时已加载，无需重复加载
}

// 加载网站设置
const loadSiteSettings = async () => {
  siteLoading.value = true
  try {
    const response = await siteSettingsAPI.getPublicSettings()
    console.log('网站设置API响应:', response.data)
    
    // 直接使用API返回的数据，不需要检查success字段
    if (response.data && typeof response.data === 'object') {
      siteSettings.value = response.data
      console.log('加载的网站设置:', siteSettings.value)
      console.log('协议内容:', {
        privacyPolicy: siteSettings.value.privacyPolicy,
        userAgreement: siteSettings.value.userAgreement,
        membershipAgreement: siteSettings.value.membershipAgreement,
        aboutUs: siteSettings.value.aboutUs
      })
      ElMessage.success('网站设置加载成功')
    } else {
      console.error('API返回格式错误:', response.data)
      ElMessage.error('获取网站设置失败：数据格式错误')
    }
  } catch (error) {
    console.error('获取网站设置失败:', error)
    ElMessage.error('获取网站设置失败')
  } finally {
    siteLoading.value = false
  }
}

// 打开外部链接
const openLink = (url) => {
  if (url) {
    window.open(url, '_blank')
  }
}









// 获取公告类型标签样式
const getAnnouncementTypeTag = (type) => {
  const typeMap = {
    info: 'info',
    success: 'success',
    warning: 'warning',
    danger: 'danger'
  }
  return typeMap[type] || 'info'
}

// 获取公告类型文本
const getAnnouncementTypeText = (type) => {
  const typeMap = {
    info: '通知',
    success: '成功',
    warning: '警告',
    danger: '紧急'
  }
  return typeMap[type] || '通知'
}

// 获取公告优先级标签样式
const getAnnouncementPriorityTag = (priority) => {
  const priorityMap = {
    low: 'info',
    medium: 'warning',
    high: 'danger'
  }
  return priorityMap[priority] || 'info'
}

// 获取公告优先级文本
const getAnnouncementPriorityText = (priority) => {
  const priorityMap = {
    low: '低',
    medium: '中',
    high: '高'
  }
  return priorityMap[priority] || '中'
}



// 加载公告数据
const loadAnnouncements = async () => {
  try {
    console.log('开始获取公告数据...')
    const response = await siteSettingsAPI.getActiveAnnouncements()
    console.log('公告API完整响应:', response)
    console.log('公告API响应数据:', response.data)
    
    // 处理直接返回数组的情况
    let announcementData = []
    
    if (Array.isArray(response.data)) {
      // 直接返回数组格式
      announcementData = response.data
      console.log('检测到直接数组格式')
    } else if (response.data && response.data.success && response.data.data) {
      // 包装在success和data中的格式
      announcementData = response.data.data
      console.log('检测到包装格式')
    } else if (response.data && Array.isArray(response.data.data)) {
      // 只有data字段的格式
      announcementData = response.data.data
      console.log('检测到data字段格式')
    } else {
      console.error('无法识别的公告数据格式:', response.data)
      announcements.value = []
      return
    }
    
    console.log('原始公告数据:', announcementData)
    console.log('公告数据类型:', typeof announcementData, Array.isArray(announcementData))
    
    if (Array.isArray(announcementData) && announcementData.length > 0) {
      announcements.value = announcementData.map(announcement => {
        console.log('处理单个公告:', announcement)
        return {
          id: announcement.id,
          title: announcement.title,
          content: announcement.content,
          type: announcement.type || 'info',
          priority: announcement.priority || 'medium',
          startDate: announcement.startDate,
          endDate: announcement.endDate,
          isActive: announcement.isActive !== undefined ? announcement.isActive : true,
          createdAt: announcement.createdAt,
          created_at: announcement.createdAt // 兼容旧字段名
        }
      })
      console.log('解析后的公告数据:', announcements.value)
      console.log('公告数组长度:', announcements.value.length)
      ElMessage.success(`成功加载 ${announcements.value.length} 条公告`)
    } else {
      console.log('没有公告数据')
      announcements.value = []
    }
  } catch (error) {
    console.error('获取公告失败:', error)
    ElMessage.error('获取公告失败: ' + (error.message || '未知错误'))
    announcements.value = []
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(() => {
  // 始终加载网站设置数据，确保协议内容可用
  loadSiteSettings()
  
  // 根据当前激活的菜单加载对应数据
  if (activeMenu.value === 'announcement') {
    loadAnnouncements()
  }
  
  // 如果没有指定菜单，默认加载公告数据
  if (!activeMenu.value) {
    activeMenu.value = 'announcement'
    loadAnnouncements()
  }
})
</script>

<style scoped>
.system-settings {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}


.settings-container {
  max-width: 1200px;
  margin: 0 auto;
}

.menu-card {
  border-radius: 12px;
  border: none;
}

.settings-menu {
  border: none;
}

.settings-menu .el-menu-item {
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.3s ease;
}

.settings-menu .el-menu-item:hover {
  background: #e8f4fd;
  color: #409eff;
}

.settings-menu .el-menu-item.is-active {
  background: #409eff;
  color: white;
}

.content-card {
  border-radius: 12px;
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.settings-content {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
  padding: 20px;
  background: #f9f9f9;
  border-radius: 4px;
}

.avatar-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.profile-form {
  max-width: 500px;
}

.form-tip {
  margin-left: 12px;
  color: #999;
  font-size: 12px;
}

.security-section {
  margin-bottom: 30px;
}

.security-section h4 {
  margin: 0 0 20px 0;
  color: #333;
  font-size: 16px;
  font-weight: bold;
}

.device-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.device-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 4px;
}

.device-info {
  flex: 1;
}

.device-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.device-details {
  display: flex;
  gap: 16px;
  color: #666;
  font-size: 14px;
}

.storage-overview {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.storage-item h4,
.storage-breakdown h4 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 16px;
  font-weight: bold;
}

.breakdown-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.breakdown-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.breakdown-item:last-child {
  border-bottom: none;
}

.storage-actions {
  display: flex;
  gap: 12px;
}

.about-content {
  margin-top: 20px;
}

.app-info,
.contact-info,
.social-media,
.about-us-content {
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e1e8ed;
}

.app-info h2 {
  color: #2c3e50;
  margin-bottom: 15px;
}

.app-info .description {
  color: #7f8c8d;
  font-size: 16px;
  margin-bottom: 15px;
  line-height: 1.6;
}

.app-info p,
.contact-info p {
  margin: 5px 0;
  color: #606266;
}

.contact-info h4,
.social-media h4,
.about-us-content h4 {
  color: #2c3e50;
  margin-bottom: 15px;
}

.social-links {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.social-links .el-button {
  margin: 0;
}

.content-text {
  color: #606266;
  line-height: 1.8;
  font-size: 14px;
}

.content-text :deep(h1),
.content-text :deep(h2),
.content-text :deep(h3),
.content-text :deep(h4),
.content-text :deep(h5),
.content-text :deep(h6) {
  color: #2c3e50;
  margin: 20px 0 10px 0;
}

.content-text :deep(p) {
  margin: 10px 0;
}

.content-text :deep(ul),
.content-text :deep(ol) {
  margin: 10px 0;
  padding-left: 20px;
}

.copyright {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid #e1e8ed;
  color: #7f8c8d;
  font-size: 12px;
}

/* 协议页面样式 */
.policy-content {
  margin-top: 20px;
  max-height: 600px;
  overflow-y: auto;
  padding: 20px;
  background: #fafafa;
  border-radius: 8px;
}

/* Markdown内容样式 */
.markdown-content {
  line-height: 1.8;
  font-size: 14px;
  color: #606266;
}

.markdown-content :deep(h1) {
  font-size: 24px;
  color: #2c3e50;
  margin: 24px 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e1e8ed;
  font-weight: 600;
}

.markdown-content :deep(h2) {
  font-size: 20px;
  color: #2c3e50;
  margin: 20px 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid #e1e8ed;
  font-weight: 600;
}

.markdown-content :deep(h3) {
  font-size: 18px;
  color: #2c3e50;
  margin: 18px 0 10px 0;
  font-weight: 600;
}

.markdown-content :deep(h4) {
  font-size: 16px;
  color: #2c3e50;
  margin: 16px 0 8px 0;
  font-weight: 600;
}

.markdown-content :deep(h5) {
  font-size: 14px;
  color: #2c3e50;
  margin: 14px 0 6px 0;
  font-weight: 600;
}

.markdown-content :deep(h6) {
  font-size: 13px;
  color: #2c3e50;
  margin: 12px 0 4px 0;
  font-weight: 600;
}

.markdown-content :deep(p) {
  margin: 12px 0;
  line-height: 1.8;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 12px 0;
  padding-left: 24px;
}

.markdown-content :deep(li) {
  margin: 6px 0;
  line-height: 1.6;
}

.markdown-content :deep(blockquote) {
  margin: 16px 0;
  padding: 12px 16px;
  background: #f8f9fa;
  border-left: 4px solid #409eff;
  color: #606266;
  font-style: italic;
}

.markdown-content :deep(code) {
  background: #f1f2f3;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  color: #e74c3c;
}

.markdown-content :deep(pre) {
  background: #f8f9fa;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 16px 0;
  border: 1px solid #e1e8ed;
}

.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
  color: #2c3e50;
}

.markdown-content :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  border: 1px solid #e1e8ed;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  padding: 12px;
  text-align: left;
  border-bottom: 1px solid #e1e8ed;
}

.markdown-content :deep(th) {
  background: #f8f9fa;
  font-weight: 600;
  color: #2c3e50;
}

.markdown-content :deep(tr:hover) {
  background: #f8f9fa;
}

.markdown-content :deep(a) {
  color: #409eff;
  text-decoration: none;
  transition: color 0.3s ease;
}

.markdown-content :deep(a:hover) {
  color: #66b1ff;
  text-decoration: underline;
}

.markdown-content :deep(hr) {
  margin: 24px 0;
  border: none;
  border-top: 1px solid #e1e8ed;
}

.markdown-content :deep(strong) {
  font-weight: 600;
  color: #2c3e50;
}

.markdown-content :deep(em) {
  font-style: italic;
  color: #7f8c8d;
}

/* 邀请管理样式 */
.invite-overview {
  margin-top: 20px;
}

.invite-code-section,
.invite-stats-section,
.invite-records-section {
  margin-bottom: 30px;
}

.invite-code-section h4,
.invite-stats-section h4,
.invite-records-section h4 {
  color: #2c3e50;
  margin-bottom: 15px;
  font-size: 16px;
}

.invite-code-card {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
  text-align: center;
}

.invite-code-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 15px;
}

.invite-code-text {
  font-size: 24px;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  background: rgba(255, 255, 255, 0.2);
  padding: 10px 20px;
  border-radius: 8px;
  letter-spacing: 2px;
}

.invite-tip {
  margin: 0;
  opacity: 0.9;
  font-size: 14px;
}

.stat-card {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: #e9ecef;
  transform: translateY(-2px);
}

.stat-number {
  font-size: 28px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 5px;
}

.stat-label {
  color: #7f8c8d;
  font-size: 14px;
}

.pagination-wrapper {
  margin-top: 20px;
  text-align: center;
}

.create-invite-section {
  background: #f9f9f9;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #e6e6e6;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .invite-code-display {
    flex-direction: column;
    align-items: stretch;
  }
  
  .invite-code-text {
    text-align: center;
  }
  
  .stat-card {
    margin-bottom: 12px;
  }
}



/* 响应式设计 */
@media (max-width: 768px) {
  .settings-container .el-row {
    flex-direction: column;
  }
  
  .menu-card {
    position: static;
    margin-bottom: 20px;
  }
  
  .settings-menu {
    display: flex;
    overflow-x: auto;
  }
  
  .settings-menu .el-menu-item {
    flex-shrink: 0;
  }
  
  .avatar-section {
    flex-direction: column;
    text-align: center;
  }
  
  .device-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .storage-actions {
    flex-direction: column;
  }
  
  .legal-info {
    flex-direction: column;
    gap: 8px;
  }
}

/* 公告样式 */
.announcement-content {
  max-width: 800px;
}

.announcement-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.announcement-content {
  margin-top: 20px;
}

.announcement-list {
  max-height: 600px;
  overflow-y: auto;
}

.announcement-item {
  border: 1px solid #e1e8ed;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 15px;
  transition: all 0.3s ease;
}

.announcement-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.announcement-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.announcement-title-section {
  flex: 1;
}

.announcement-title-section h4 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 16px;
}

.announcement-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.announcement-tags .priority-tag {
  margin-left: 4px;
}

.announcement-date {
  color: #7f8c8d;
  font-size: 12px;
  white-space: nowrap;
  margin-left: 16px;
}

.announcement-body p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.announcement-footer {
  margin-top: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.announcement-period {
  display: flex;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.period-text {
  margin-right: 4px;
}

.period-date {
  color: #606266;
}

.announcement-status {
  display: flex;
  align-items: center;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

@media (max-width: 768px) {
  .announcement-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .announcement-item {
    padding: 16px;
  }
}
</style>