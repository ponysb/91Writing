<template>
  <div class="dashboard-container">
    <!-- 侧边栏 -->
    <aside class="sidebar" :class="{ 'collapsed': isCollapse }">
      <div class="logo">
        <span class="logo-glyph">墨</span>
        <transition name="fade">
          <div v-if="!isCollapse" class="logo-text">
            <h2>墨章</h2>
            <span class="logo-sub">AI 创作工坊</span>
          </div>
        </transition>
      </div>

      <nav class="sidebar-nav">
        <div
          v-for="item in menuItems"
          :key="item.index"
          class="nav-item"
          :class="{ 'active': activeMenu === item.index }"
          @click="handleMenuSelect(item.index)"
        >
          <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
          <transition name="fade">
            <span v-if="!isCollapse" class="nav-label">{{ item.label }}</span>
          </transition>
        </div>
      </nav>

      <div class="sidebar-footer" v-if="!isCollapse">
        <div class="footer-quote">
          <p>"文章千古事"</p>
          <span>—— 杜甫</span>
        </div>
      </div>
    </aside>

    <!-- 主要内容区域 -->
    <div class="main-container">
      <!-- 顶部导航栏 -->
      <header class="header">
        <div class="header-left">
          <button class="collapse-btn" @click="toggleSidebar" aria-label="切换侧边栏">
            <el-icon><Expand v-if="isCollapse" /><Fold v-else /></el-icon>
          </button>
          <span class="page-title">{{ pageTitle }}</span>
        </div>

        <div class="header-right">
          <!-- 模型选择 -->
          <div class="model-selector" v-if="isApiConfigured">
            <el-icon class="select-icon"><Cpu /></el-icon>
            <el-select
              v-model="currentModel"
              @change="handleModelChange"
              size="small"
              style="width: 200px"
              placeholder="选择模型"
            >
              <el-option
                v-for="model in availableModels"
                :key="model.id"
                :label="model.name"
                :value="model.id"
              >
                <span class="model-name-opt">{{ model.name }}</span>
                <span class="model-desc-opt">{{ model.description }}</span>
              </el-option>
            </el-select>
          </div>

          <!-- 公告及教程 -->
          <button class="header-btn ghost" @click="openAnnouncement">
            <el-icon><Bell /></el-icon>
            <span>公告</span>
          </button>

          <!-- API配置状态 -->
          <button
            class="header-btn"
            :class="isApiConfigured ? 'configured' : 'pending'"
            @click="showApiConfig = true"
          >
            <el-icon><Key /></el-icon>
            <span>{{ isApiConfigured ? '已配置' : '配置 API' }}</span>
            <span class="status-dot" :class="isApiConfigured ? 'on' : 'off'"></span>
          </button>
        </div>
      </header>

      <!-- 页面内容 -->
      <main class="content">
        <router-view />
      </main>
    </div>

    <!-- API配置对话框 -->
    <el-dialog v-model="showApiConfig" title="接口配置" width="920px" top="6vh">
      <ApiConfig @close="showApiConfig = false" />
    </el-dialog>

    <!-- 公告对话框 -->
    <AnnouncementDialog
      v-model:visible="showAnnouncement"
      :announcement="currentAnnouncement"
      @close="handleAnnouncementClose"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useNovelStore } from '@/stores/novel'
import { useAuthStore } from '@/stores/auth'
import {
  House, Document, ChatLineSquare, Collection, Notebook, Aim,
  CreditCard, Setting, Key, Tools, EditPen, DataAnalysis,
  Expand, Fold, Bell, Cpu, SwitchButton
} from '@element-plus/icons-vue'
import ApiConfig from '@/components/ApiConfig.vue'
import AnnouncementDialog from '@/components/AnnouncementDialog.vue'
import { getLatestAnnouncement } from '@/config/announcements.js'

const router = useRouter()
const route = useRoute()
const novelStore = useNovelStore()
const authStore = useAuthStore()

const isCollapse = ref(false)
const showApiConfig = ref(false)
const showAnnouncement = ref(false)
const currentAnnouncement = ref({})
const activeMenu = ref('/')
const currentModel = ref('')

// 菜单项
const menuItems = [
  { index: '/', label: '首页', icon: House },
  { index: '/novels', label: '小说列表', icon: Document },
  { index: '/prompts', label: '提示词库', icon: ChatLineSquare },
  { index: '/genres', label: '类型管理', icon: Collection },
  { index: '/chapters', label: '章节管理', icon: Notebook },
  { index: '/goals', label: '写作目标', icon: Aim },
  { index: '/billing', label: 'Token 计费', icon: CreditCard },
  { index: '/tools', label: '工具库', icon: Tools },
  { index: '/short-story', label: '短文写作', icon: EditPen },
  { index: '/book-analysis', label: '拆书工具', icon: DataAnalysis },
  { index: '/settings', label: '系统设置', icon: Setting }
]

const isApiConfigured = computed(() => novelStore.isApiConfigured)
const currentApiConfig = computed(() => novelStore.getCurrentApiConfig())

// 可用模型（通用 OpenAI 兼容模型 + 用户自定义）
const availableModels = computed(() => {
  const defaults = [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'OpenAI 旗舰' },
    { id: 'gpt-4o-mini', name: 'GPT-4o mini', description: '轻量快速' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: '经典经济' },
    { id: 'claude-3-7-sonnet', name: 'claude-3.7-sonnet', description: 'Claude' },
    { id: 'claude-4-sonnet', name: 'claude-4-sonnet', description: 'Claude 新代' },
    { id: 'deepseek-reasoner', name: 'deepseek-r1', description: '深度推理' },
    { id: 'deepseek-chat', name: 'deepseek-v3', description: '深度求索' }
  ]
  const customs = []
  try {
    const saved = localStorage.getItem('customModels')
    if (saved) {
      JSON.parse(saved).forEach(m => {
        if (!defaults.find(d => d.id === m.id)) customs.push(m)
      })
    }
  } catch (e) { /* ignore */ }
  return [...defaults, ...customs]
})

const pageTitle = computed(() => {
  const titleMap = {
    '/': '首页',
    '/novels': '小说列表',
    '/prompts': '提示词库',
    '/genres': '类型管理',
    '/chapters': '章节管理',
    '/goals': '写作目标',
    '/billing': 'Token 计费',
    '/tools': '工具库',
    '/short-story': '短文写作',
    '/book-analysis': '拆书工具',
    '/settings': '系统设置'
  }
  return titleMap[route.path] || '首页'
})

const toggleSidebar = () => { isCollapse.value = !isCollapse.value }
const handleMenuSelect = (index) => { router.push(index) }

const openAnnouncement = () => {
  try {
    currentAnnouncement.value = getLatestAnnouncement()
    showAnnouncement.value = true
  } catch (error) { console.error('获取公告错误:', error) }
}
const handleAnnouncementClose = () => { showAnnouncement.value = false }

// 切换模型：直接更新单一配置
const handleModelChange = (modelId) => {
  novelStore.updateApiConfig({ selectedModel: modelId })
  const model = availableModels.value.find(m => m.id === modelId)
  if (!novelStore.apiConfig.apiKey) {
    showApiConfig.value = true
  }
}

const initializeModelSelector = () => {
  if (isApiConfigured.value && currentApiConfig.value) {
    currentModel.value = currentApiConfig.value.selectedModel || ''
  }
}

watch(() => route.path, (n) => { activeMenu.value = n }, { immediate: true })
watch(() => [isApiConfigured.value, currentApiConfig.value], () => {
  initializeModelSelector()
}, { immediate: true })

const handleStorageChange = (event) => {
  if (['apiConfig', 'customModels'].includes(event.key)) {
    setTimeout(initializeModelSelector, 100)
  }
}

const handleLogout = () => {
  authStore.logout()
  router.push('/auth')
}

onMounted(async () => {
  await authStore.initAuth()
  initializeModelSelector()
  window.addEventListener('storage', handleStorageChange)
})
onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
})
</script>

<style scoped>
.dashboard-container {
  display: flex;
  height: 100vh;
  background-color: var(--bg-page);
}

/* ====== 侧边栏 ====== */
.sidebar {
  width: 240px;
  background-color: var(--bg-sidebar);
  background-image:
    radial-gradient(circle at 30% 0%, rgba(154, 91, 46, 0.18) 0%, transparent 50%),
    radial-gradient(circle at 80% 100%, rgba(107, 63, 31, 0.2) 0%, transparent 45%);
  display: flex;
  flex-direction: column;
  transition: width 0.3s var(--ease);
  overflow: hidden;
  position: relative;
  flex-shrink: 0;
}

.sidebar.collapsed {
  width: 72px;
}

.logo {
  height: 72px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 22px;
  border-bottom: 1px solid rgba(242, 233, 216, 0.08);
  flex-shrink: 0;
}

.logo-glyph {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--accent-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  box-shadow: 0 4px 12px rgba(154, 91, 46, 0.4);
  flex-shrink: 0;
}

.logo-text h2 {
  margin: 0;
  font-size: 19px;
  color: var(--text-on-dark);
  letter-spacing: 0.06em;
  line-height: 1.1;
}

.logo-sub {
  font-size: 11px;
  color: var(--text-on-dark-muted);
  letter-spacing: 0.18em;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 11px 14px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--text-on-dark-muted);
  transition: all 0.22s var(--ease);
  position: relative;
  font-size: 14px;
  white-space: nowrap;
}

.nav-item:hover {
  background-color: var(--bg-sidebar-hover);
  color: var(--text-on-dark);
}

.nav-item.active {
  background: var(--accent-gradient);
  color: #fff;
  box-shadow: 0 4px 12px rgba(154, 91, 46, 0.35);
}

.nav-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.sidebar-footer {
  padding: 18px 22px;
  border-top: 1px solid rgba(242, 233, 216, 0.08);
  flex-shrink: 0;
}

.footer-quote p {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 14px;
  color: var(--text-on-dark);
  font-style: italic;
  letter-spacing: 0.05em;
}

.footer-quote span {
  font-size: 11px;
  color: var(--text-on-dark-muted);
  letter-spacing: 0.1em;
}

/* ====== 主容器 ====== */
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

.header {
  height: 64px;
  background-color: var(--bg-surface);
  border-bottom: 1px solid var(--border-light);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 28px;
  box-shadow: var(--shadow-xs);
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border-base);
  border-radius: var(--radius-sm);
  background: var(--bg-surface);
  color: var(--text-regular);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all 0.2s var(--ease);
}

.collapse-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

.page-title {
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.03em;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 14px;
  background: var(--bg-surface-2);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-pill);
  transition: border-color 0.2s var(--ease);
}

.model-selector:hover {
  border-color: var(--border-strong);
}

.select-icon {
  color: var(--accent);
  font-size: 15px;
}

.model-name-opt {
  font-weight: 500;
}

.model-desc-opt {
  float: right;
  color: var(--text-placeholder);
  font-size: 12px;
  margin-left: 10px;
}

.header-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-base);
  background: var(--bg-surface);
  color: var(--text-regular);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  font-family: var(--font-sans);
  transition: all 0.2s var(--ease);
}

.header-btn.ghost:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

.header-btn.configured {
  border-color: var(--success);
  color: var(--success);
  background: rgba(90, 122, 74, 0.08);
}

.header-btn.pending {
  border-color: var(--warning);
  color: var(--warning);
  background: rgba(184, 118, 45, 0.1);
  animation: pulse-warn 2s var(--ease) infinite;
}

@keyframes pulse-warn {
  0%, 100% { box-shadow: 0 0 0 0 rgba(184, 118, 45, 0.3); }
  50% { box-shadow: 0 0 0 5px rgba(184, 118, 45, 0); }
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-left: 2px;
}

.status-dot.on {
  background: var(--success);
  box-shadow: 0 0 0 3px rgba(90, 122, 74, 0.2);
}

.status-dot.off {
  background: var(--warning);
}

.content {
  flex: 1;
  padding: 24px 28px;
  overflow-y: auto;
  background-color: var(--bg-page);
}

/* 过渡动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s var(--ease);
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    z-index: 1000;
    height: 100vh;
  }
  .content {
    padding: 16px;
  }
  .page-title {
    font-size: 16px;
  }
  .header-btn span:not(.status-dot) {
    display: none;
  }
}
</style>
