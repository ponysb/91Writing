<template>
  <div class="dashboard-container">
    <!-- 侧边栏 -->
    <div class="sidebar" :class="{ 'collapsed': isCollapse }">
      <div class="logo">
        <h2>📚 91写作</h2>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        @select="handleMenuSelect"
        :collapse="isCollapse"
        :collapse-transition="false"
      >
        <el-menu-item index="/">
          <el-icon><House /></el-icon>
          <template #title>首页</template>
        </el-menu-item>
        
        <el-menu-item index="/novels">
          <el-icon><Document /></el-icon>
          <template #title>小说列表</template>
        </el-menu-item>
        
        <el-menu-item index="/prompts">
          <el-icon><ChatLineSquare /></el-icon>
          <template #title>提示词库</template>
        </el-menu-item>
        
        <el-menu-item index="/genres">
          <el-icon><Collection /></el-icon>
          <template #title>小说类型管理</template>
        </el-menu-item>
        
        <el-menu-item index="/chapters">
          <el-icon><Notebook /></el-icon>
          <template #title>章节管理</template>
        </el-menu-item>
        
        <el-menu-item index="/goals">
          <el-icon><Aim /></el-icon>
          <template #title>写作目标</template>
        </el-menu-item>
        
        <el-menu-item index="/billing">
          <el-icon><CreditCard /></el-icon>
          <template #title>Token计费</template>
        </el-menu-item>
        
        <el-menu-item index="/tools">
          <el-icon><Tools /></el-icon>
          <template #title>工具库</template>
        </el-menu-item>
        
        <el-menu-item index="/short-story">
          <el-icon><EditPen /></el-icon>
          <template #title>短文写作</template>
        </el-menu-item>
        
        <el-menu-item index="/book-analysis">
          <el-icon><DataAnalysis /></el-icon>
          <template #title>拆书工具</template>
        </el-menu-item>
        
        <el-menu-item index="/settings">
          <el-icon><Setting /></el-icon>
          <template #title>系统设置</template>
        </el-menu-item>
      </el-menu>
    </div>
    
    <!-- 主要内容区域 -->
    <div class="main-container">
      <!-- 顶部导航栏 -->
      <div class="header">
        <div class="header-left">
          <el-button 
            type="text" 
            @click="toggleSidebar"
            class="collapse-btn"
          >
            <el-icon><Expand v-if="isCollapse" /><Fold v-else /></el-icon>
          </el-button>
          <span class="page-title">{{ pageTitle }}</span>
        </div>
        
        <div class="header-right">
          <!-- 模型选择 -->
          <div class="model-selector" v-if="isApiConfigured">
            <el-select 
              v-model="currentModel"
              @change="handleModelChange"
              size="small"
              style="width: 220px"
              placeholder="选择模型"
            >
              <!-- 官方模型组 -->
              <el-option-group label="🏢 91写作官方模型">
                <el-option
                  v-for="model in officialModels"
                  :key="model.id"
                  :label="model.name"
                  :value="model.id"
                >
                  <span>{{ model.name }}</span>
                  <span style="float: right; color: #8492a6; font-size: 12px">
                    {{ model.price }}
                  </span>
                </el-option>
              </el-option-group>
              
              <!-- 自定义模型组 -->
              <el-option-group label="⚙️ 自定义模型" v-if="customModels.length > 0">
                <el-option
                  v-for="model in customModels"
                  :key="model.id"
                  :label="model.name"
                  :value="model.id"
                >
                  <span>{{ model.name }}</span>
                  <span v-if="model.description" style="float: right; color: #8492a6; font-size: 12px">
                    {{ model.description }}
                  </span>
                </el-option>
              </el-option-group>
            </el-select>
          </div>

          <!-- 公告及教程 -->
          <el-button 
            @click="openAnnouncement" 
            type="primary"
            size="small"
          >
            <el-icon><Bell /></el-icon>
            公告及教程
          </el-button>

          <!-- API配置状态 -->
          <el-button 
            @click="showApiConfig = true" 
            :type="isApiConfigured ? 'success' : 'warning'"
            size="small"
          >
            <el-icon><Key /></el-icon>
            {{ isApiConfigured ? 'API已配置' : 'API配置' }}
          </el-button>
        </div>
      </div>
      
      <!-- 页面内容 -->
      <div class="content">
        <router-view />
      </div>
    </div>
    
    <!-- API配置对话框 -->
    <el-dialog v-model="showApiConfig" title="API配置" width="1000px">
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
import { 
  House, Document, ChatLineSquare, Collection, Notebook, Aim, 
  CreditCard, Setting, Key, Tools, EditPen, DataAnalysis,
  Expand, Fold, Bell 
} from '@element-plus/icons-vue'
import ApiConfig from '@/components/ApiConfig.vue'
import AnnouncementDialog from '@/components/AnnouncementDialog.vue'
import { getLatestAnnouncement } from '@/config/announcements.js'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const novelStore = useNovelStore()

// 响应式数据
const isCollapse = ref(false)
const showApiConfig = ref(false)
const showAnnouncement = ref(false)
const currentAnnouncement = ref({})
const activeMenu = ref('/')
const currentModel = ref('')
const configType = ref('official')
const forceUpdate = ref(0) // 用于强制更新计算属性

// 计算属性
const isApiConfigured = computed(() => novelStore.isApiConfigured)

// 获取当前API配置
const currentApiConfig = computed(() => {
  return novelStore.getCurrentApiConfig()
})

// 官方模型列表（固定）
const officialModels = computed(() => [
  {
    id: 'claude-4-sonnet',
    name: 'Claude-4 Sonnet',
    description: '最新一代Claude模型，擅长创意写作和长文本处理',
    price: '￥0.1/次'
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    description: '最强性能Claude模型，顶级创作能力',
    price: '￥0.5/次'
  },
  {
    id: 'claude-3-7-sonnet-thinking',
    name: 'Claude-3.7 Sonnet Thinking',
    description: '具备思维链的Claude模型，逻辑推理强',
    price: '￥0.2/次'
  },
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude-3.7 Sonnet',
    description: '高性能版本，平衡性能与成本',
    price: '￥0.1/次'
  }
])

// 自定义模型列表（从API配置中读取）
const customModels = computed(() => {
  // 依赖于 forceUpdate 来强制重新计算
  forceUpdate.value
  
  const models = []
  
  try {
    // 从ApiConfig组件的配置中读取自定义模型
    const savedCustomModels = localStorage.getItem('customModels')
    if (savedCustomModels) {
      const parsed = JSON.parse(savedCustomModels)
      models.push(...parsed)
    }
    
    // 添加一些默认的自定义模型选项
    const defaultCustomModels = [
      {
        id: 'deepseek-reasoner',
        name: 'deepseek-r1',
        description: '深度思考推理模型'
      },
      {
        id: 'deepseek-chat',
        name: 'deepseek-v3',
        description: '深度求索对话模型'
      },
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        description: 'OpenAI最新多模态模型'
      },
      {
        id: 'gpt-4o-mini',
        name: 'GPT-4o mini',
        description: 'GPT-4o轻量版本'
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'OpenAI经典对话模型'
      }
    ]
    
    // 合并默认模型和自定义模型，去重
    const allModels = [...defaultCustomModels]
    for (const model of models) {
      if (!allModels.find(m => m.id === model.id)) {
        allModels.push(model)
      }
    }
    
    console.log('自定义模型列表:', allModels) // 调试日志
    return allModels
    
  } catch (error) {
    console.error('读取自定义模型失败:', error)
    return []
  }
})

const pageTitle = computed(() => {
  const titleMap = {
    '/': '首页',
    '/novels': '小说列表',
    '/prompts': '提示词库',
    '/genres': '小说类型管理',
    '/chapters': '章节管理',
    '/goals': '写作目标',
    '/billing': 'Token计费',
    '/tools': '工具库',
    '/short-story': '短文写作',
    '/book-analysis': '拆书工具',
    '/settings': '系统设置'
  }
  return titleMap[route.path] || '首页'
})

// 获取当前配置类型的函数
const getCurrentConfigType = () => {
  try {
    // 从localStorage获取配置类型
    const savedConfigType = localStorage.getItem('apiConfigType')
    console.log('从localStorage获取的配置类型:', savedConfigType) // 调试日志
    
    // 如果没有保存的配置类型，尝试通过API地址判断
    if (!savedConfigType && isApiConfigured.value && currentApiConfig.value) {
      const baseURL = currentApiConfig.value.baseURL
      console.log('API地址:', baseURL) // 调试日志
      
      if (baseURL && baseURL.includes('91hub.vip')) {
        console.log('通过API地址判断为官方配置') // 调试日志
        return 'official'
      } else {
        console.log('通过API地址判断为自定义配置') // 调试日志
        return 'custom'
      }
    }
    
    return savedConfigType || 'official'
  } catch (error) {
    console.error('获取配置类型失败:', error)
    return 'official'
  }
}

// 方法
const toggleSidebar = () => {
  isCollapse.value = !isCollapse.value
}

const handleMenuSelect = (index) => {
  router.push(index)
}

// 公告相关功能
const openAnnouncement = () => {
  try {
    currentAnnouncement.value = getLatestAnnouncement()
    showAnnouncement.value = true
  } catch (error) {
    console.error('获取公告错误:', error)
  }
}

const handleAnnouncementClose = () => {
  showAnnouncement.value = false
}

// 模型相关功能
const handleModelChange = (modelId) => {
  try {
    console.log('切换模型:', modelId) // 调试日志
    
    // 判断选择的是官方模型还是自定义模型
    const isOfficialModel = officialModels.value.find(m => m.id === modelId)
    const isCustomModel = customModels.value.find(m => m.id === modelId)
    
    let newConfig = {}
    let newConfigType = ''
    
    if (isOfficialModel) {
      console.log('选择了官方模型，切换到官方配置') // 调试日志
      // 选择了官方模型，切换到官方配置
      newConfigType = 'official'
      
      // 加载官方配置的基础参数
      const savedOfficialConfig = localStorage.getItem('officialApiConfig')
      if (savedOfficialConfig) {
        newConfig = JSON.parse(savedOfficialConfig)
      } else {
        // 如果没有保存的官方配置，使用默认值
        newConfig = {
          baseURL: 'https://ai.91hub.vip/v1',
          maxTokens: 2000000,
          unlimitedTokens: false,
          temperature: 0.7,
          apiKey: '' // 需要用户配置
        }
      }
      newConfig.selectedModel = modelId
      
      // 保存配置类型
      localStorage.setItem('apiConfigType', 'official')
      // 保存官方配置
      localStorage.setItem('officialApiConfig', JSON.stringify(newConfig))
      
    } else if (isCustomModel) {
      console.log('选择了自定义模型，切换到自定义配置') // 调试日志
      // 选择了自定义模型，切换到自定义配置
      newConfigType = 'custom'
      
      // 加载自定义配置的基础参数
      const savedCustomConfig = localStorage.getItem('customApiConfig')
      if (savedCustomConfig) {
        newConfig = JSON.parse(savedCustomConfig)
      } else {
        // 如果没有保存的自定义配置，使用默认值
        newConfig = {
          baseURL: 'https://api.openai.com/v1',
          maxTokens: 2000000,
          unlimitedTokens: false,
          temperature: 0.7,
          apiKey: '' // 需要用户配置
        }
      }
      newConfig.selectedModel = modelId
      
      // 保存配置类型
      localStorage.setItem('apiConfigType', 'custom')
      // 保存自定义配置
      localStorage.setItem('customApiConfig', JSON.stringify(newConfig))
      
    } else {
      console.error('未知的模型类型:', modelId)
      ElMessage.error('未知的模型类型')
      return
    }
    
    // 更新当前配置类型
    configType.value = newConfigType
    
    // 更新store中的API配置，使用新的分离配置系统
    novelStore.updateApiConfig(newConfig, newConfigType)
    novelStore.switchConfigType(newConfigType)
    
    // 强制更新界面
    forceUpdate.value++
    
    const modelName = getModelDisplayName(modelId)
    const configTypeName = newConfigType === 'official' ? '官方配置' : '自定义配置'
    
    // 检查是否需要配置API密钥
    const needsApiKey = !newConfig.apiKey || newConfig.apiKey.trim() === ''
    
    if (needsApiKey) {
      ElMessage.warning(`已切换到${configTypeName}: ${modelName}，请先配置API密钥`)
      // 可以考虑自动打开API配置对话框
      setTimeout(() => {
        showApiConfig.value = true
      }, 1000)
    } else {
      ElMessage.success(`已切换到${configTypeName}: ${modelName}`)
    }
    
    console.log('配置切换完成:', { configType: newConfigType, config: newConfig, needsApiKey }) // 调试日志
    
  } catch (error) {
    console.error('切换模型失败:', error)
    ElMessage.error('切换模型失败: ' + error.message)
  }
}

const getModelDisplayName = (modelId) => {
  // 先在官方模型中查找
  let model = officialModels.value.find(m => m.id === modelId)
  if (model) return model.name
  
  // 再在自定义模型中查找
  model = customModels.value.find(m => m.id === modelId)
  if (model) return model.name
  
  // 都找不到就返回原ID
  return modelId
}

// 初始化模型选择器
const initializeModelSelector = () => {
  try {
    // 获取配置类型
    const savedConfigType = localStorage.getItem('apiConfigType') || 'official'
    configType.value = savedConfigType
    
    // 获取当前选中的模型
    if (isApiConfigured.value && currentApiConfig.value) {
      currentModel.value = currentApiConfig.value.selectedModel || ''
    }
    
    // 强制更新模型列表
    forceUpdate.value++
    
    console.log('模型选择器初始化完成, 配置类型:', savedConfigType, '当前模型:', currentModel.value) // 调试日志
  } catch (error) {
    console.error('初始化模型选择器失败:', error)
  }
}

// 监听路由变化
watch(() => route.path, (newPath) => {
  activeMenu.value = newPath
}, { immediate: true })

// 监听API配置变化，更新模型选择器
watch(() => [isApiConfigured.value, currentApiConfig.value], () => {
  initializeModelSelector()
}, { immediate: true })

// 监听localStorage变化的函数
const handleStorageChange = (event) => {
  if (event.key === 'apiConfigType' || event.key === 'officialApiConfig' || event.key === 'customApiConfig' || event.key === 'customModels') {
    console.log('检测到localStorage配置变化:', event.key, event.newValue) // 调试日志
    // 延迟执行，确保数据已更新
    setTimeout(() => {
      initializeModelSelector()
    }, 100)
  }
}

// 组件挂载时初始化
onMounted(() => {
  initializeModelSelector()
  // 监听localStorage变化
  window.addEventListener('storage', handleStorageChange)
  
  // 手动触发一次检查（处理同页面内的变化）
  const checkConfigChange = () => {
    const currentType = localStorage.getItem('apiConfigType')
    if (currentType !== configType.value) {
      console.log('检测到配置类型变化:', configType.value, '->', currentType)
      initializeModelSelector()
    }
  }
  
  // 定期检查配置变化（处理同页面内的localStorage变化）
  const intervalId = setInterval(checkConfigChange, 1000)
  
  // 保存interval ID以便清理
  window.modelSelectorInterval = intervalId
})

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('storage', handleStorageChange)
  if (window.modelSelectorInterval) {
    clearInterval(window.modelSelectorInterval)
    delete window.modelSelectorInterval
  }
})

</script>

<style scoped>
.dashboard-container {
  display: flex;
  height: 100vh;
  background-color: #f5f5f5;
}

.sidebar {
  width: 250px;
  background-color: #304156;
  color: white;
  display: flex;
  flex-direction: column;
  transition: width 0.3s;
  overflow: hidden;
}

.sidebar.collapsed {
  width: 64px;
}

.sidebar.collapsed .logo h2 {
  display: none;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #2b3a4b;
  color: white;
  margin: 0;
}

.logo h2 {
  margin: 0;
  font-size: 18px;
  white-space: nowrap;
}

.sidebar-menu {
  border: none;
  background-color: #304156;
  height: calc(100vh - 60px);
}

.sidebar-menu .el-menu-item,
.sidebar-menu .el-sub-menu__title {
  color: #bfcbd9;
  border-bottom: none;
}

.sidebar-menu .el-menu-item:hover,
.sidebar-menu .el-sub-menu__title:hover {
  background-color: #263445;
  color: #409eff;
}

.sidebar-menu .el-menu-item.is-active {
  background-color: #409eff;
  color: white;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  height: 60px;
  background-color: white;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
}

.header-left {
  display: flex;
  align-items: center;
}

.collapse-btn {
  margin-right: 15px;
  font-size: 18px;
}

.page-title {
  font-size: 18px;
  font-weight: 500;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.model-selector {
  display: flex;
  align-items: center;
}

.model-selector .el-select {
  min-width: 200px;
}

.model-selector .el-select .el-input__inner {
  font-size: 13px;
}

/* 模型分组样式 */
.model-selector :deep(.el-select-group__title) {
  font-weight: 600;
  color: #409eff;
  padding: 8px 12px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e4e7ed;
}

.model-selector :deep(.el-option-group .el-option) {
  padding-left: 20px;
}

.model-selector :deep(.el-option-group:not(:last-child)) {
  border-bottom: 1px solid #e4e7ed;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 5px 10px;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.user-info:hover {
  background-color: #f5f7fa;
}

.username {
  color: #606266;
  font-size: 14px;
}

.content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #f5f5f5;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    z-index: 1000;
    height: 100vh;
  }
  
  .main-container {
    margin-left: 0;
  }
  
  .content {
    padding: 15px;
  }
}
</style>