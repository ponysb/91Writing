<template>
  <div class="admin-layout">
    <!-- 顶部导航 -->
    <el-header class="header">
      <div class="header-left">
        <div class="logo">
          <img v-if="siteConfig.siteLogo" :src="getFullImageUrl(siteConfig.siteLogo)" alt="网站Logo" class="logo-image" />
          <h2 class="logo-text">{{ siteConfig.siteName }} - 管理后台</h2>
        </div>
      </div>
      <div class="header-right">
        <!-- 切换到用户端按钮 -->
        <el-button 
          type="primary" 
          size="small" 
          @click="switchToClient"
          class="switch-btn"
        >
          <el-icon><User /></el-icon>
          用户端
        </el-button>
        
        <el-dropdown @command="handleCommand">
          <span class="user-info">
            <el-icon><User /></el-icon>
            {{ userStore.userName }}
            <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <!-- <el-dropdown-item command="profile">个人资料</el-dropdown-item> -->
              <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <el-container class="main-container">
      <!-- 左侧导航 -->
      <el-aside class="sidebar" width="240px">
        <el-menu
          :default-active="activeMenu"
          class="sidebar-menu"
          router
          unique-opened
        >
          <template v-for="item in menuItems" :key="item.path">
            <!-- 有子菜单的项 -->
            <el-sub-menu v-if="item.children" :index="item.path" class="menu-group">
              <template #title>
                <el-icon><component :is="item.icon" /></el-icon>
                <span>{{ item.title }}</span>
              </template>
              <el-menu-item
                v-for="child in item.children"
                :key="child.path"
                :index="child.path"
                class="sub-menu-item"
              >
                <el-icon><component :is="child.icon" /></el-icon>
                <span>{{ child.title }}</span>
              </el-menu-item>
            </el-sub-menu>
            <!-- 没有子菜单的项 -->
            <el-menu-item v-else :index="item.path" class="menu-item">
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.title }}</span>
            </el-menu-item>
          </template>
        </el-menu>
      </el-aside>

      <!-- 右侧内容区 -->
      <el-main class="content">
        <div class="content-wrapper">
          <router-view />
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useSiteSettingsStore } from '@/stores/siteSettings'
import { userAPI } from '@/api'
import {
  User,
  ArrowDown,
  Odometer,
  UserFilled,
  Reading,
  ChatDotRound,
  Collection,
  Cpu,
  Avatar,
  CreditCard,
  Ticket,
  Share,
  Money,
  Setting,
  DataAnalysis,
  Bell
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const siteSettingsStore = useSiteSettingsStore()

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

// 管理后台菜单项配置
const menuItems = ref([
  {
    path: '/admin/dashboard',
    title: '仪表盘',
    icon: 'Odometer'
  },
  {
    path: '/admin/users',
    title: '用户管理',
    icon: 'UserFilled'
  },
  {
    path: '/admin/membership-group',
    title: '会员管理',
    icon: 'CreditCard',
    children: [
      {
        path: '/admin/membership',
        title: '会员套餐',
        icon: 'CreditCard'
      },
      {
        path: '/admin/membership-records',
        title: '开通记录',
        icon: 'Document'
      },
      {
        path: '/admin/cards',
        title: '发卡管理',
        icon: 'Ticket'
      }
    ]
  },
  {
    path: '/admin/novel-group',
    title: '小说管理',
    icon: 'Reading',
    children: [
      {
        path: '/admin/novels',
        title: '小说管理',
        icon: 'Reading'
      },
      {
        path: '/admin/novel-types',
        title: '小说类型管理',
        icon: 'Collection'
      },
      {
        path: '/admin/prompts',
        title: '提示词管理',
        icon: 'ChatDotRound'
      }
    ]
  },
  {
    path: '/admin/distribution-group',
    title: '分销管理',
    icon: 'Share',
    children: [
      {
        path: '/admin/distribution-config',
        title: '分销配置',
        icon: 'Setting'
      },
      {
        path: '/admin/distribution-accounts',
        title: '佣金账户',
        icon: 'Money'
      },
      {
        path: '/admin/withdrawal-management',
        title: '提现工单',
        icon: 'CreditCard'
      },
      {
        path: '/admin/invite-records',
        title: '邀请记录',
        icon: 'UserFilled'
      },
      {
        path: '/admin/commission-records',
        title: '分成记录',
        icon: 'DataAnalysis'
      }
    ]
  },
  {
    path: '/admin/model-group',
    title: '模型管理',
    icon: 'Cpu',
    children: [
      {
        path: '/admin/ai-models',
        title: '模型配置',
        icon: 'Cpu'
      },
      {
        path: '/admin/ai-assistants',
        title: 'AI助手配置',
        icon: 'Avatar'
      },
      {
        path: '/admin/ai-call-records',
        title: 'AI调用记录',
        icon: 'DataAnalysis'
      }
    ]
  },
  {
    path: '/admin/system-group',
    title: '系统设置',
    icon: 'Setting',
    children: [
      {
        path: '/admin/announcements',
        title: '公告管理',
        icon: 'Bell'
      },
      {
        path: '/admin/payment',
        title: '支付配置',
        icon: 'Wallet'
      },
      {
        path: '/admin/system',
        title: '系统设置',
        icon: 'Setting'
      }
    ]
  }
])

// 当前激活的菜单
const activeMenu = computed(() => {
  return route.path
})

// 切换到用户端
const switchToClient = () => {
  router.push('/client/dashboard')
  ElMessage.success('已切换到用户端')
}

// 验证用户角色权限
const checkUserRole = async () => {
  try {
    const response = await userAPI.getCurrentUserRole()
    const { role, is_admin } = response.data
    
    // 更新本地存储的角色信息
    userStore.updateUserRole(role)
    
    // 如果不是管理员，跳转到用户端
    if (role !== 'admin' && !is_admin) {
      ElMessage.warning('您没有管理员权限，已跳转到用户端')
      router.push('/client/dashboard')
      return false
    }
    
    return true
  } catch (error) {
    console.error('获取用户角色失败:', error)
    ElMessage.error('获取用户角色失败，请重新登录')
    userStore.logout()
    router.push('/login')
    return false
  }
}

// 处理用户下拉菜单命令
const handleCommand = (command) => {
  switch (command) {
    case 'logout':
      userStore.logout()
      router.push('/login')
      ElMessage.success('已退出登录')
      break
  }
}

// 组件挂载时验证角色权限
onMounted(() => {
  checkUserRole()
})
</script>

<style scoped>
.admin-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
  height: 60px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
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
  color: #e6a23c;
  font-size: 20px;
  font-weight: bold;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
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
  width: 240px;
  background: #ffffff;
  border-right: 1px solid #f0f2f5;
  overflow-y: auto;
  padding: 16px 12px;
}

.sidebar-menu {
  border-right: none;
  background: transparent;
  height: 100%;
}

/* 一级菜单项样式（无子菜单） */
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

/* 菜单组样式（有子菜单） */
.menu-group {
  margin: 8px 0;
  border-radius: 8px;
  overflow: hidden;
  background: #fafbfc;
  border: 1px solid #f0f2f5;
}

.menu-group .el-sub-menu__title {
  height: 48px;
  line-height: 48px;
  border-radius: 8px 8px 0 0;
  transition: all 0.3s ease;
  font-weight: 600;
  background: #f8fafc;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 16px;
}

.menu-group .el-sub-menu__title:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.menu-group.is-opened .el-sub-menu__title {
  background: #e5e7eb;
  color: #1f2937;
  border-bottom-color: #d1d5db;
}

.menu-group.is-opened .el-sub-menu__title .el-sub-menu__icon-arrow {
  transform: rotateZ(180deg);
}

/* 子菜单容器样式 */
.el-menu--inline {
  background: #ffffff !important;
  padding: 8px 0;
  border-radius: 0 0 8px 8px;
}

/* 子菜单项样式 */
.sub-menu-item {
  height: 40px;
  line-height: 40px;
  margin: 2px 12px;
  border-radius: 6px;
  transition: all 0.3s ease;
  font-weight: 400;
  font-size: 14px;
  color: #6b7280;
  position: relative;
  padding-left: 12px;
}

.sub-menu-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 4px;
  background: #d1d5db;
  border-radius: 50%;
}

.sub-menu-item:hover {
  background: #f3f4f6;
  color: #374151;
  transform: translateX(4px);
}

.sub-menu-item:hover::before {
  background: #6b7280;
}

.sub-menu-item.is-active {
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 500;
}

.sub-menu-item.is-active::before {
  background: #2563eb;
  width: 6px;
  height: 6px;
}

/* 菜单图标样式 */
.el-menu-item .el-icon,
.el-sub-menu__title .el-icon {
  margin-right: 12px;
  font-size: 18px;
}

.sub-menu-item .el-icon {
  margin-right: 8px;
  font-size: 16px;
}

/* 箭头图标样式 */
.el-sub-menu__icon-arrow {
  transition: transform 0.3s ease;
  color: #9ca3af;
}

/* 菜单分组标题样式优化 */
.menu-group .el-sub-menu__title .el-icon {
  color: #6b7280;
}

.menu-group:hover .el-sub-menu__title .el-icon,
.menu-group.is-opened .el-sub-menu__title .el-icon {
  color: #374151;
}

/* 移除默认的Element Plus样式 */
.el-sub-menu .el-menu-item {
  background: transparent !important;
}

.el-sub-menu .el-menu-item:hover {
  background: transparent !important;
}

.content {
  background: #f5f7fa;
  padding: 0;
  overflow-y: auto;
}

.content-wrapper {
  padding: 20px;
  min-height: 100%;
}
</style>