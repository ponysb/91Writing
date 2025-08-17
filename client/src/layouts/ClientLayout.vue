<template>
  <div class="client-layout">
    <!-- 顶部导航 -->
    <el-header class="header">
      <div class="header-left">
        <div class="logo">
          <img v-if="siteConfig.siteLogo" :src="getFullImageUrl(siteConfig.siteLogo)" alt="网站Logo" class="logo-image" />
          <h2 class="logo-text">{{ siteConfig.siteName }}</h2>
        </div>
      </div>
      <div class="header-center">
        <div class="model-selector">
          <span class="model-label">AI模型:</span>
          <el-dropdown @command="handleModelCommand" trigger="click">
            <span class="model-dropdown">
               {{ getCurrentModel?.display_name || getCurrentModel?.name || '选择模型' }}
               <el-icon class="el-icon--right"><ArrowDown /></el-icon>
             </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
              v-for="model in aiModelStore.availableModels"
              :key="model.id"
              :command="model.id"
              :class="{ 'is-active': aiModelStore.selectedModelId === model.id }"
            >
                 <div class="model-item">
                   <div class="model-name">
                     {{ model.display_name || model.name }}
                     <el-tag v-if="model.is_default" type="primary" size="small" style="margin-left: 5px;">默认</el-tag>
                   </div>
                   <div class="model-desc">{{ model.description || `非常强悍的模型` }}</div>
                 </div>
               </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      <div class="header-right">
        <!-- 剩余次数显示 -->
        <div class="remaining-credits" @click="goToMembershipCenter">
          <el-icon><CreditCard /></el-icon>
          <span class="credits-text">{{ $t('membership.remaining') }}: {{ remainingCredits }}</span>
        </div>
        
        <!-- 语言选择器 -->
        <el-dropdown @command="handleLanguageCommand" trigger="click">
          <span class="language-selector">
            <el-icon><Location /></el-icon>
            {{ $t('language.' + currentLanguage) }}
            <el-icon class="el-icon--right"><ArrowDown /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="zh-CN">{{ $t('language.zh-CN') }}</el-dropdown-item>
              <el-dropdown-item command="en-US">{{ $t('language.en-US') }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        
        <!-- 公告按钮 -->
        <el-badge 
          :value="unreadAnnouncementCount" 
          :hidden="unreadAnnouncementCount === 0"
          class="announcement-badge"
        >
          <el-button 
            type="primary" 
            size="small" 
            @click="showAnnouncementDialog"
            class="announcement-btn"
          >
            <el-icon><Bell /></el-icon>
            公告
          </el-button>
        </el-badge>
        
        <!-- 管理后台切换按钮（仅管理员可见） -->
        <el-button 
          v-if="userStore.userRole === 'admin'"
          type="warning" 
          size="small" 
          @click="switchToAdmin"
          class="switch-btn"
        >
          <el-icon><Setting /></el-icon>
          {{ $t('nav.admin') }}
        </el-button>
        
        <el-dropdown @command="handleCommand">
          <span class="user-info">
            <el-icon><User /></el-icon>
            {{ userStore.userName }}
            <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="membership">{{ $t('nav.membership') }}</el-dropdown-item>
              <el-dropdown-item command="changePassword">修改密码</el-dropdown-item>
              <el-dropdown-item command="logout" divided>{{ $t('nav.logout') }}</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <el-container class="main-container">
      <!-- 左侧导航 -->
      <el-aside v-if="!isNovelEditorPage" class="sidebar" width="240px">
        <el-menu
          :default-active="activeMenu"
          class="sidebar-menu"
          router
          unique-opened
        >
          <el-menu-item
            v-for="item in menuItems"
            :key="item.path"
            :index="item.path"
            class="menu-item"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.title }}</span>
          </el-menu-item>
        </el-menu>
      </el-aside>

      <!-- 右侧内容区 -->
      <el-main class="content" :class="{ 'full-width': isNovelEditorPage }">
        <div class="content-wrapper">
          <router-view />
        </div>
      </el-main>
    </el-container>
    
    <!-- 公告弹窗 -->
    <AnnouncementDialog
      v-model="showAnnouncementDialogVisible"
      :announcements="unreadAnnouncements"
      @close="handleAnnouncementClose"
      @markAsRead="handleMarkAsRead"
    />
    
    <!-- 修改密码弹窗 -->
    <el-dialog
      v-model="showChangePasswordDialog"
      title="修改密码"
      width="400px"
      :before-close="cancelChangePassword"
    >
      <el-form
        ref="changePasswordFormRef"
        :model="changePasswordForm"
        :rules="changePasswordRules"
        label-width="100px"
      >
        <el-form-item label="当前密码" prop="oldPassword">
          <el-input
            v-model="changePasswordForm.oldPassword"
            type="password"
            placeholder="请输入当前密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input
            v-model="changePasswordForm.newPassword"
            type="password"
            placeholder="请输入新密码（至少6位）"
            show-password
          />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="changePasswordForm.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            show-password
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="cancelChangePassword">取消</el-button>
          <el-button type="primary" @click="submitChangePassword">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useSiteSettingsStore } from '@/stores/siteSettings'
import { useAiModelStore } from '@/stores/aiModel'
import { useI18n } from 'vue-i18n'
import { setLocale, getCurrentLocale } from '@/locales'
import {
  User,
  ArrowDown,
  Odometer,
  Reading,
  ChatDotRound,
  Tools,
  Edit,
  Document,
  CreditCard,
  Setting,
  Location,
  Bell
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { aiModelAPI, membershipAPI, userAPI, authAPI } from '@/api'
import AnnouncementDialog from '@/components/AnnouncementDialog.vue'
import announcementService from '@/utils/announcementService'
import { updateSiteInfo } from '@/utils/faviconUtils'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const siteSettingsStore = useSiteSettingsStore()
const aiModelStore = useAiModelStore()
const { t: $t } = useI18n()

// 剩余次数（使用userStore中的数据）
const remainingCredits = computed(() => {
  return userStore.userInfo?.remaining_usage || userStore.userInfo?.remaining_credits || '--'
})

// 公告相关状态
const showAnnouncementDialogVisible = ref(false)
const unreadAnnouncements = ref([])
const unreadAnnouncementCount = ref(0)

// 修改密码相关状态
const showChangePasswordDialog = ref(false)
const changePasswordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})
const changePasswordFormRef = ref(null)

// 网站配置
const siteConfig = computed(() => ({
  siteName: siteSettingsStore.settings.siteName || '网文创作平台',
  siteLogo: siteSettingsStore.settings.siteLogo || '',
  siteIcon: siteSettingsStore.settings.siteIcon || ''
}))

// 获取完整图片URL
const getFullImageUrl = (path) => {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }
  return `${import.meta.env.VITE_IMAGE_BASE_URL || 'http://localhost:3000'}${path.startsWith('/') ? '' : '/'}${path}`
}

// 当前语言
const currentLanguage = computed(() => {
  return getCurrentLocale()
})

// 处理语言切换命令
const handleLanguageCommand = (language) => {
  setLocale(language)
  ElMessage.success($t('success.languageChanged'))
  // 刷新页面以确保Element Plus组件也切换语言
  setTimeout(() => {
    window.location.reload()
  }, 500)
}

// 菜单项配置
const menuItems = computed(() => [
  {
    path: '/client/dashboard',
    title: $t('nav.dashboard'),
    icon: 'Odometer'
  },
  {
    path: '/client/novels',
    title: $t('nav.novels'),
    icon: 'Reading'
  },
  {
    path: '/client/prompts',
    title: $t('nav.prompts'),
    icon: 'ChatDotRound'
  },
  {
    path: '/client/tools',
    title: $t('nav.tools'),
    icon: 'Tools'
  },

  {
    path: '/client/short-story',
    title: $t('nav.shortStory'),
    icon: 'Edit'
  },
  {
    path: '/client/book-analysis',
    title: $t('tools.bookAnalysis'),
    icon: 'Document'
  },
  {
    path: '/client/membership-center',
    title: $t('nav.membership'),
    icon: 'CreditCard'
  },
  {
    path: '/client/distribution',
    title: '我的邀请',
    icon: 'Money'
  },
  {
    path: '/client/system-settings',
    title: $t('nav.settings'),
    icon: 'Setting'
  }
])

// 当前激活的菜单
const activeMenu = computed(() => {
  return route.path
})

// 判断是否为小说编辑页面或思维导图页面
const isNovelEditorPage = computed(() => {
  return (route.path.includes('/novels/') && route.path.includes('/edit')) || route.path.includes('/mindmap/')
})

// 加载可用的AI模型列表
// 处理模型选择命令
const handleModelCommand = (modelId) => {
  aiModelStore.selectModel(modelId)
}

// 获取当前选中的模型信息
const getCurrentModel = computed(() => {
  return aiModelStore.currentModel
})

// 显示公告弹窗
const showAnnouncementDialog = async () => {
  try {
    const announcements = await announcementService.getActiveAnnouncements()
    if (announcements.length > 0) {
      unreadAnnouncements.value = announcements
      showAnnouncementDialogVisible.value = true
    } else {
      ElMessage.info('暂无公告')
    }
  } catch (error) {
    console.error('获取公告失败:', error)
    ElMessage.error('获取公告失败')
  }
}

// 加载未读公告数量
const loadUnreadAnnouncementCount = async () => {
  try {
    const unreadAnnouncements = await announcementService.getUnreadAnnouncements()
    unreadAnnouncementCount.value = unreadAnnouncements.length
  } catch (error) {
    console.error('获取未读公告数量失败:', error)
    unreadAnnouncementCount.value = 0
  }
}

// 处理公告弹窗关闭
const handleAnnouncementClose = () => {
  showAnnouncementDialogVisible.value = false
  // 延迟重新加载未读公告数量，确保localStorage已更新
  setTimeout(() => {
    loadUnreadAnnouncementCount()
  }, 100)
}

// 处理标记公告为已读
const handleMarkAsRead = (announcementId) => {
  announcementService.markAsRead(announcementId)
  // 延迟重新加载未读公告数量
  setTimeout(() => {
    loadUnreadAnnouncementCount()
  }, 100)
}

// 获取剩余次数
const loadRemainingCredits = async () => {
  try {
    const response = await authAPI.getCurrentUser()
    if (response && response.success) {
      const userData = response.data.user || response.data
      // 更新userStore中的用户信息，保持数据源一致
      userStore.updateUserInfo({
        remaining_usage: userData.remaining_credits || userData.remaining_usage || 0,
        remaining_credits: userData.remaining_credits || userData.remaining_usage || 0
      })
    }
  } catch (error) {
    console.error('获取剩余次数失败:', error)
  }
}

// 监听全局会员状态更新事件（保留兼容性）
const handleMembershipUpdate = () => {
  loadRemainingCredits()
}

// 暴露刷新方法给全局使用（保留兼容性）
window.refreshRemainingCredits = loadRemainingCredits

// 监听路由变化，从会员中心页面离开时刷新剩余次数
watch(() => route.path, (newPath, oldPath) => {
  if (oldPath === '/client/membership-center' && newPath !== '/client/membership-center') {
    // 延迟刷新，确保页面切换完成
    setTimeout(() => {
      loadRemainingCredits()
    }, 500)
  }
})

// 跳转到会员中心
const goToMembershipCenter = () => {
  router.push('/client/membership-center')
}

// 切换到管理后台
const switchToAdmin = () => {
  router.push('/admin/dashboard')
  ElMessage.success('已切换到管理后台')
}



// 修改密码表单验证规则
const changePasswordRules = {
  oldPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== changePasswordForm.value.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 提交修改密码
const submitChangePassword = async () => {
  try {
    await changePasswordFormRef.value.validate()
    
    await userAPI.changePassword(userStore.userInfo.username, {
      current_password: changePasswordForm.value.oldPassword,
      new_password: changePasswordForm.value.newPassword
    })
    
    ElMessage.success('密码修改成功')
    showChangePasswordDialog.value = false
    
    // 重置表单
    changePasswordForm.value = {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  } catch (error) {
    console.error('修改密码失败:', error)
    ElMessage.error(error.response?.data?.message || '修改密码失败')
  }
}

// 取消修改密码
const cancelChangePassword = () => {
  showChangePasswordDialog.value = false
  // 重置表单
  changePasswordForm.value = {
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  changePasswordFormRef.value?.clearValidate()
}

// 处理用户下拉菜单命令
const handleCommand = (command) => {
  switch (command) {
    case 'membership':
      goToMembershipCenter()
      break
    case 'changePassword':
      showChangePasswordDialog.value = true
      break
    case 'logout':
      userStore.logout()
      router.push('/login')
      ElMessage.success('已退出登录')
      break
  }
}

onMounted(async () => {
  await siteSettingsStore.loadPublicSettings()
  
  // 加载可用模型列表
  await aiModelStore.loadAvailableModels()
  
  // 加载剩余次数
  await loadRemainingCredits()
  
  // 加载未读公告数量
  await loadUnreadAnnouncementCount()
  
  // 设置页面标题和图标
  updateSiteInfo({
    title: siteConfig.value.siteName,
    iconPath: siteConfig.value.siteIcon
  })
  
  // 监听会员状态更新事件
  window.addEventListener('membershipUpdated', handleMembershipUpdate)
})

// 组件卸载时清理事件监听器
onUnmounted(() => {
  window.removeEventListener('membershipUpdated', handleMembershipUpdate)
  // 清理全局方法
  delete window.refreshRemainingCredits
})
</script>

<style scoped>
.client-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.header {
  background: #ffffff;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
}

.header-left .logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left .logo-image {
  height: 40px;
  width: auto;
  max-width: 120px;
  object-fit: contain;
}

.header-left .logo-text {
  margin: 0;
  color: #2c3e50;
  font-size: 20px;
  font-weight: bold;
}

.header-center {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.model-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-label {
  font-size: 14px;
  color: #6c757d;
  font-weight: 500;
}

.model-dropdown {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 6px 12px;
  background: #ffffff;
  border-radius: 4px;
  border: 1px solid #dee2e6;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  min-width: 140px;
  justify-content: space-between;
  color: #495057;
}

.model-dropdown:hover {
  background: #f8f9fa;
  border-color: #adb5bd;
}

.model-item {
  padding: 4px 0;
}

.model-name {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.model-desc {
  font-size: 12px;
  color: #666;
  margin-top: 2px;
  line-height: 1.3;
}

/* 下拉菜单项激活状态 */
:deep(.el-dropdown-menu__item.is-active) {
  background-color: #f0f9ff;
  color: #409eff;
}

:deep(.el-dropdown-menu__item.is-active .model-name) {
  color: #409eff;
  font-weight: 600;
}

:deep(.el-dropdown-menu__item.is-active .model-desc) {
  color: #409eff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.remaining-credits {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 12px;
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  color: #0369a1;
  font-size: 14px;
}

.remaining-credits:hover {
  background: #e0f2fe;
  border-color: #0284c7;
  transform: translateY(-1px);
}

.credits-text {
  font-weight: 500;
}

.language-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background 0.3s;
  color: #333;
}

.language-selector:hover {
  background: #f5f7fa;
}

.announcement-badge {
  margin-right: 8px;
}

.announcement-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}

.switch-btn {
  margin-right: 8px;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f7fa;
}

.main-container {
  flex: 1;
  height: calc(100vh - 60px);
}

.sidebar {
  width: 200px;
  background: #ffffff;
  border-right: 1px solid #f0f2f5;
  overflow-y: auto;
  padding: 16px 12px;
}

.sidebar-menu {
  border-right: none;
  /*height: 100%;*/
  background: transparent;
}

.menu-item {
  height: 48px;
  line-height: 48px;
  color: #6b7280;
  margin: 4px 0;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-weight: 500;
  position: relative;
}

.menu-item:hover {
  background: #f3f4f6;
  color: #374151;
  transform: translateX(2px);
}

.menu-item.is-active {
  background: #2563eb;
  color: white;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

.menu-item.is-active::before {
  content: '';
  position: absolute;
  left: -12px;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 24px;
  background: #1d4ed8;
  border-radius: 2px;
}

.menu-item .el-icon {
  margin-right: 12px;
  font-size: 18px;
}

.content {
  flex: 1;
  background: #f8f9fa;
  padding: 0;
  overflow-y: auto;
}

.content.full-width {
  background: #fff;
}

.content-wrapper {
  padding: 20px;
  min-height: 100%;
}

.content.full-width .content-wrapper {
  padding: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    width: 200px !important;
  }
  
  .header-left .logo {
    font-size: 16px;
  }
}
</style>