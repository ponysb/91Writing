<template>
  <div class="short-story-writing">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-icon class="page-icon"><Document /></el-icon>
        <h1 class="page-title">短文写作</h1>
      </div>
      <div class="header-right">
        <el-button 
          @click="createNewStory"
        >
          <el-icon><Plus /></el-icon>
          新建
        </el-button>
        <el-button 
          @click="manualSave"
          :loading="autoSaving"
          :disabled="!storyTitle.trim()"
        >
          保存
        </el-button>
        <el-button 
          type="primary" 
          plain
          @click="showHistoryDialog = true"
        >
          <el-icon><Reading /></el-icon>
          创作列表
        </el-button>
      </div>
    </div>

    <div class="writing-container">
      <!-- 左侧配置区 -->
      <div class="sidebar">
        <!-- 写作类型选择 -->
        <div class="type-tabs">
          <div 
            class="type-tab" 
            :class="{ active: activeType === 'article' }"
            @click="activeType = 'article'"
          >
            <el-icon><Document /></el-icon>
            文章写作
          </div>
          <div 
            class="type-tab" 
            :class="{ active: activeType === 'novel' }"
            @click="activeType = 'novel'"
          >
            <el-icon><Reading /></el-icon>
            短篇小说
          </div>
        </div>

        <!-- 配置面板 -->
        <div class="config-panel">
          <!-- 文章标题 -->
          <div class="config-section">
            <label class="config-label">文章标题</label>
            <el-input
              v-model="storyTitle"
              placeholder="请输入文章标题"
              class="config-input"
            />
          </div>

          <!-- 字数选择 -->
           <div class="config-section">
             <label class="config-label">字数选择</label>
             <div class="word-count-slider">
               <el-slider
                 v-model="selectedWordCount"
                 :min="1000"
                 :max="10000"
                 :step="100"
                 :show-tooltip="true"
                 :format-tooltip="(val) => `${val}字`"
                 class="slider"
               />
               <div class="word-count-display">
                 <span class="current-count">{{ selectedWordCount }}字</span>
               </div>
             </div>
           </div>

          <!-- 风格选择 -->
          <div class="config-section">
            <label class="config-label">风格选择</label>
            <el-select 
              v-model="selectedStyle" 
              :placeholder="styleOptions.length === 0 && !loadingStyles ? '暂无可用的写作风格' : '请选择写作风格'"
              class="config-select"
              :loading="loadingStyles"
              loading-text="加载中..."
              :disabled="styleOptions.length === 0 && !loadingStyles"
            >
              <el-option
                v-for="style in styleOptions"
                :key="style.id"
                :label="style.title"
                :value="style.id"
              />
              <el-option
                v-if="styleOptions.length === 0 && !loadingStyles"
                disabled
                label="暂无可用的写作风格，请联系管理员添加"
                value=""
              />
            </el-select>
          </div>

          <!-- 基础配置（仅短篇小说显示） -->
           <div v-if="activeType === 'novel'" class="config-section">
             <label class="config-label">基础配置</label>
             <el-input
               v-model="basicConfig"
               type="textarea"
               :rows="8"
               placeholder=""
               class="config-textarea"
             />
           </div>

          <!-- 参考内容 -->
          <div class="config-section">
            <label class="config-label">参考内容</label>
            <el-input
              v-model="referenceContent"
              type="textarea"
              :rows="4"
              placeholder="请输入参考内容或素材"
              class="config-textarea"
            />
          </div>

          <!-- 生成按钮 -->
          <div class="config-section">
            <el-button 
              type="primary" 
              class="generate-btn"
              :loading="isGenerating"
              @click="generateContent"
            >
              <el-icon><Star /></el-icon>
              生成文章
            </el-button>
          </div>
        </div>
      </div>

      <!-- 右侧编辑区 -->
      <div class="editor-area">
        <div class="editor-header">
          <span class="editor-title">文章内容</span>
          <div class="editor-actions">
            <div class="auto-save-status" :class="{ saving: autoSaving }">
              <el-icon v-if="autoSaving"><Loading /></el-icon>
              <el-icon v-else-if="lastSaveTime"><Check /></el-icon>
              <span v-if="autoSaving">自动保存中...</span>
              <span v-else-if="lastSaveTime">已保存 {{ formatSaveTime(lastSaveTime) }}</span>
              <span v-else>内容自动保存</span>
            </div>
          </div>
        </div>
        
        <div class="editor-content">
          <div id="vditor" class="vditor-container"></div>
        </div>
      </div>
    </div>

    <!-- 创作列表弹窗 -->
    <el-dialog
      v-model="showHistoryDialog"
      title="创作列表"
      width="800px"
      :before-close="handleCloseDialog"
    >
      <div class="history-dialog-content" v-loading="storiesLoading">
          <div v-if="recentStories.length === 0 && !storiesLoading" class="empty-state">
            <el-empty description="暂无创作记录" />
          </div>
        <div v-else class="history-list">
          <div
            v-for="story in recentStories"
            :key="story.id"
            class="history-item"
            @click="loadStoryFromDialog(story)"
          >
            <div class="story-info">
              <h4 class="story-title">{{ story.title || '无标题' }}</h4>
              <p class="story-excerpt">{{ story.summary || story.content?.substring(0, 100) + '...' }}</p>
              <div class="story-meta">
                <span class="word-count">{{ story.word_count }} 字</span>
                <span class="create-time">{{ formatDate(story.created_at) }}</span>
                <span class="story-type">{{ getTypeLabel(story.type) }}</span>
              </div>
            </div>
            <div class="story-actions">
              <el-button 
                size="small" 
                type="primary" 
                plain
                @click="loadStoryFromDialog(story)"
              >
                编辑
              </el-button>
              <el-button 
                size="small" 
                type="danger" 
                plain
                @click="deleteStory(story)"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Reading, Star, Loading, Check, Plus } from '@element-plus/icons-vue'
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import { promptAPI, aiBusinessAPI, shortStoryAPI } from '@/api'
import { useUserStore } from '@/stores/user'
import { useAiModelStore } from '@/stores/aiModel'

// Store实例
const userStore = useUserStore()
const aiModelStore = useAiModelStore()

// 响应式数据
const activeType = ref('article') // 'article' 或 'novel'
const storyTitle = ref('')
const selectedWordCount = ref(1000)
const selectedStyle = ref('')
const basicConfig = ref('')
const referenceContent = ref('')
const isGenerating = ref(false)
const showHistoryDialog = ref(false)

// 自动保存相关变量
const autoSaveTimer = ref(null)
const autoSaving = ref(false)
const lastSaveTime = ref(null)

// Vditor 编辑器实例
let vditor = null

// 初始化基础配置模板
const initBasicConfig = () => {
  if (activeType.value === 'novel' && !basicConfig.value) {
    basicConfig.value = `主角姓名：
年龄：
性别：
题材类型：
情节设定：
故事氛围：
时代背景：
故事发生地点：`
  }
}

// 风格选择选项（从API获取短文写作类型的prompt列表）
const styleOptions = ref([])
const loadingStyles = ref(false)



// 历史记录
const recentStories = ref([])
const storiesLoading = ref(false)

// 获取历史记录
const fetchRecentStories = async () => {
  try {
    storiesLoading.value = true
    const response = await shortStoryAPI.getStories({
      page: 1,
      limit: 20,
      sort: 'created_at',
      order: 'desc'
    })
    recentStories.value = response.data.list || []
  } catch (error) {
    console.error('获取历史记录失败:', error)
    ElMessage.error('获取历史记录失败')
  } finally {
    storiesLoading.value = false
  }
}

// 方法
const generateContent = async () => {
  if (!storyTitle.value.trim()) {
    ElMessage.warning('请输入文章标题')
    return
  }
  
  if (!selectedStyle.value) {
    ElMessage.warning('请选择写作风格')
    return
  }
  
  isGenerating.value = true
  
  try {
    // 获取选中的风格信息
    const selectedStyleInfo = styleOptions.value.find(s => s.id === selectedStyle.value)
    
    // 获取当前选择的模型ID，确保转换为字符串类型
    const modelId = String(aiModelStore.selectedModelId || 'gpt-4')
    
    // 构建生成参数
    const params = {
        title: storyTitle.value,
        word_count: selectedWordCount.value,
        model_id: modelId, // 使用全局选择的模型，确保是字符串类型
        stream: true // 启用流式返回
      }
    
    // 根据写作类型设置不同的参数
    if (activeType.value === 'article') {
      // 短文写作接口参数
      params.writing_style = selectedStyleInfo?.title || '现代'
      params.reference_content = referenceContent.value
      params.tone = '中性'
      params.target_audience = '一般读者'
      params.article_type = '通用短文'
      
      if (selectedStyleInfo?.id) {
        params.prompt_id = selectedStyleInfo.id
      }
    } else {
      // 短篇小说接口参数
      params.style = selectedStyleInfo?.title || '现代'
      params.basic_setting = basicConfig.value
      params.reference_content = referenceContent.value
      params.genre = '现代小说'
      params.tone = '中性'
      params.target_audience = '一般读者'
      
      if (selectedStyleInfo?.id) {
        params.prompt_id = selectedStyleInfo.id
      }
    }
    
    // 清空编辑器内容
    if (vditor && typeof vditor.setValue === 'function') {
      vditor.setValue('')
    }
    
    // 处理SSE流式响应
    await handleStreamResponse(null, params)
    
    ElMessage.success('内容生成成功')
  } catch (error) {
    console.error('生成内容失败:', error)
    // 只有在真正的网络错误或服务器错误时才显示错误提示
    if (error.message && (error.message.includes('HTTP error') || error.message.includes('fetch'))) {
      ElMessage.error('网络连接错误，请检查网络后重试')
    } else {
      ElMessage.error('生成内容失败，请重试')
    }
  } finally {
    isGenerating.value = false
  }
}

// 处理SSE流式响应
const handleStreamResponse = async (apiCall, params) => {
  try {
    // 由于axios不直接支持SSE，我们需要使用fetch API
    const userStore = useUserStore()
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}${activeType.value === 'article' ? '/ai-business/short-article/generate' : '/ai-business/short-story/generate'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userStore.token}`
      },
      body: JSON.stringify(params)
    })
    
    if (!response.ok) {
      // 尝试解析错误响应
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorText = await response.text()
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorMessage
      } catch (parseError) {
        // 解析失败时使用默认错误信息
      }
      throw new Error(errorMessage)
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let currentContent = ''
    let hasContent = false
    
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        // 如果流正常结束且有内容，不抛出错误
        if (hasContent) {
          return
        }
        break
      }
      
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          
          if (data === '[DONE]') {
            return
          }
          
          try {
            const parsed = JSON.parse(data)
            
            if (parsed.content) {
              currentContent += parsed.content
              hasContent = true
              
              // 实时更新编辑器内容
              if (vditor && typeof vditor.setValue === 'function') {
                vditor.setValue(currentContent)
              }
            }
          } catch (e) {
            // 解析单个数据块失败不影响整体流程
            console.warn('Failed to parse SSE data:', e)
          }
        }
      }
    }
  } catch (error) {
    console.error('SSE stream error:', error)
    // 只有真正的网络错误才抛出
    if (error.message && error.message.includes('HTTP error')) {
      throw error
    }
    // 其他错误（如解析错误）不抛出，避免误报网络错误
    console.warn('SSE处理完成，可能存在非关键错误:', error)
  }
}

// 当前编辑的短文ID
const currentStoryId = ref(null)

// 自动保存函数（防抖）
const autoSave = () => {
  // 清除之前的定时器
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
  
  // 设置新的定时器，3秒后执行保存
  autoSaveTimer.value = setTimeout(async () => {
    if (autoSaving.value || !storyTitle.value.trim()) return
    
    try {
      autoSaving.value = true
      
      // 获取编辑器内容
      const content = vditor?.getValue() || ''
      
      if (content.trim()) {
        const storyData = {
          title: storyTitle.value,
          content: content,
          type: activeType.value === 'article' ? 'article' : 'short_novel',
          word_count: content.length,
          status: 'draft'
        }
        
        if (currentStoryId.value) {
          // 更新现有短文
          await shortStoryAPI.updateStory(currentStoryId.value, storyData)
        } else {
          // 创建新短文
          const response = await shortStoryAPI.createStory(storyData)
          currentStoryId.value = response.data.id
        }
        
        // 更新最后保存时间
        lastSaveTime.value = new Date()
        
        console.log('自动保存成功:', { title: storyTitle.value, contentLength: content.length })
      }
    } catch (error) {
      console.warn('自动保存失败:', error)
      ElMessage.warning('自动保存失败，请检查网络连接')
    } finally {
      autoSaving.value = false
    }
  }, 3000) // 3秒防抖
}

// 格式化保存时间
const formatSaveTime = (saveTime) => {
  if (!saveTime) return ''
  
  const now = new Date()
  const diff = Math.floor((now - saveTime) / 1000) // 秒数差
  
  if (diff < 60) {
    return '刚刚'
  } else if (diff < 3600) {
    return `${Math.floor(diff / 60)}分钟前`
  } else if (diff < 86400) {
    return `${Math.floor(diff / 3600)}小时前`
  } else {
    return saveTime.toLocaleDateString()
  }
}

// 获取类型标签
const getTypeLabel = (type) => {
  const typeMap = {
    'short_novel': '短篇小说',
    'article': '文章',
    'essay': '散文',
    'poem': '诗歌',
    'script': '剧本',
    'other': '其他'
  }
  return typeMap[type] || '未知类型'
}

// 初始化编辑器
const initVditor = () => {
  vditor = new Vditor('vditor', {
    height: 'calc(100vh - 200px)',
    mode: 'wysiwyg',
    placeholder: '开始您的创作...',
    theme: 'classic',
    icon: 'material',
    toolbar: [
      'headings',
      'bold',
      'italic',
      'strike',
      '|',
      'line',
      'quote',
      'list',
      'ordered-list',
      'check',
      '|',
      'code',
      'inline-code',
      'link',
      'table',
      '|',
      'undo',
      'redo',
      '|',
      'fullscreen',
      'edit-mode',
      'outline',
      'preview'
    ],
    cache: {
      enable: true,
      id: 'short-story-writing'
    },
    cdn: '/vditorCDN',
    input: (value) => {
      // 内容变化时触发自动保存
      autoSave()
    },
    after: () => {
      console.log('Vditor 初始化完成')
    }
  })
}

// 加载历史故事
const loadStory = (story) => {
  storyTitle.value = story.title
  currentStoryId.value = story.id
  
  // 确保Vditor已经初始化
  if (vditor && vditor.vditor && typeof vditor.setValue === 'function') {
    try {
      vditor.setValue(story.content || '')
      ElMessage.success(`已加载：${story.title}`)
    } catch (error) {
      console.warn('Failed to set vditor content:', error)
      ElMessage.error('加载故事内容失败')
    }
  } else {
    // 如果编辑器还没有初始化，等待一段时间后重试
    setTimeout(() => {
      if (vditor && vditor.vditor && typeof vditor.setValue === 'function') {
        try {
          vditor.setValue(story.content || '')
          ElMessage.success(`已加载：${story.title}`)
        } catch (error) {
          console.warn('Failed to set vditor content:', error)
          ElMessage.error('加载故事内容失败')
        }
      } else {
        ElMessage.warning('编辑器还未完全加载，请稍后重试')
      }
    }, 500)
  }
  
  // 根据故事类型设置activeType
  if (story.type) {
    activeType.value = story.type === 'article' ? 'article' : 'novel'
  }
  
  // 重置保存状态
  lastSaveTime.value = story.updated_at ? new Date(story.updated_at) : null
}

// 加载故事从对话框
const loadStoryFromDialog = (story) => {
  loadStory(story)
  showHistoryDialog.value = false
}

// 新建短文
const createNewStory = () => {
  storyTitle.value = ''
  currentStoryId.value = null
  lastSaveTime.value = null
  if (vditor) {
    vditor.setValue('')
  }
  ElMessage.success('已创建新短文')
}

// 手动保存函数
const manualSave = async () => {
  if (!storyTitle.value.trim()) {
    ElMessage.warning('请输入文章标题')
    return
  }
  
  try {
    autoSaving.value = true
    
    // 获取编辑器内容
    const content = vditor?.getValue() || ''
    
    if (!content.trim()) {
      ElMessage.warning('请输入文章内容')
      return
    }
    
    const storyData = {
      title: storyTitle.value,
      content: content,
      type: activeType.value === 'article' ? 'article' : 'short_novel',
      word_count: content.length,
      status: 'draft'
    }
    
    if (currentStoryId.value) {
      // 更新现有短文
      await shortStoryAPI.updateStory(currentStoryId.value, storyData)
      ElMessage.success('保存成功')
    } else {
      // 创建新短文
      const response = await shortStoryAPI.createStory(storyData)
      currentStoryId.value = response.data.id
      ElMessage.success('保存成功')
    }
    
    // 更新最后保存时间
    lastSaveTime.value = new Date()
    
    // 刷新历史记录列表
    await fetchRecentStories()
    
  } catch (error) {
    console.error('手动保存失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    autoSaving.value = false
  }
}

// 删除短文
const deleteStory = async (story) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除短文「${story.title || '无标题'}」吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await shortStoryAPI.deleteStory(story.id)
    ElMessage.success('删除成功')
    
    // 刷新历史记录列表
    await fetchRecentStories()
    
    // 如果删除的是当前编辑的短文，清空编辑器
    if (currentStoryId.value === story.id) {
      createNewStory()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除短文失败:', error)
      ElMessage.error('删除失败，请重试')
    }
  }
}

// 关闭弹窗
const handleCloseDialog = (done) => {
  done()
}

// 格式化日期
const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}



// 获取写作风格prompt列表
const fetchShortStoryPrompts = async () => {
  try {
    loadingStyles.value = true
    
    // 根据当前写作类型获取对应的prompt类别
    const category = activeType.value === 'article' ? 'short_writing' : 'short_story'
    
    const response = await promptAPI.getPrompts({
      category: category,
      status: 'active' // 只获取激活状态的prompt
    })
    
    if (response && response.data && response.data.prompts && Array.isArray(response.data.prompts)) {
        // 直接使用API返回的数据，即使是空数组也显示真实状态
        styleOptions.value = response.data.prompts.map(prompt => ({
          id: prompt.id,
          title: prompt.name || prompt.title, // 优先使用name字段，fallback到title
          content: prompt.content
        }))
      } else {
        // 如果API返回格式不符合预期，清空选项
        styleOptions.value = []
      }
  } catch (error) {
     console.error('获取写作风格prompt列表失败:', error)
     ElMessage.error('获取写作风格列表失败')
     // 清空选项，显示真实的错误状态
     styleOptions.value = []
  } finally {
    loadingStyles.value = false
  }
}

// 监听标题变化，触发自动保存
watch(storyTitle, () => {
  if (storyTitle.value.trim()) {
    autoSave()
  }
})

// 监听写作类型变化
watch(activeType, (newType) => {
  if (newType === 'novel') {
    initBasicConfig()
  }
  
  // 重置选中的风格
  selectedStyle.value = ''
  
  // 重新获取对应类型的prompt列表
  fetchShortStoryPrompts()
})

onMounted(async () => {
  // 初始化AI模型store
  await aiModelStore.loadAvailableModels()
  // 初始化编辑器
  initVditor()
  // 初始化基础配置
  initBasicConfig()
  // 获取短文写作prompt列表
  fetchShortStoryPrompts()
  // 获取历史记录
  fetchRecentStories()
})

onUnmounted(() => {
  // 清理自动保存定时器
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
  
  // 销毁编辑器实例
  if (vditor) {
    vditor.destroy()
    vditor = null
  }
})
</script>

<style scoped>
.short-story-writing {
  height: calc(100vh - 100px);
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

/* 页面头部 */
.page-header {
  background: white;
  padding: 16px 24px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-icon {
  font-size: 24px;
  color: #409eff;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.writing-container {
  display: flex;
  flex: 1;
  min-height: 0;
}

/* 左侧配置区 */
.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
}

/* 类型选择标签 */
.type-tabs {
  display: flex;
  border-bottom: 1px solid #e4e7ed;
}

.type-tab {
  flex: 1;
  padding: 16px 12px;
  text-align: center;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 14px;
  color: #606266;
}

.type-tab:hover {
  background: #f5f7fa;
}

.type-tab.active {
  color: #409eff;
  border-bottom-color: #409eff;
  background: #ecf5ff;
}

/* 配置面板 */
.config-panel {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.config-section {
  margin-bottom: 24px;
}

.config-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.config-input,
.config-select,
.config-textarea {
  width: 100%;
}

.config-textarea {
  resize: vertical;
}

/* 字数选择滑动条 */
.word-count-slider {
  padding: 10px 0;
}

.slider {
  margin-bottom: 12px;
}

.word-count-display {
  text-align: center;
}

.current-count {
  font-size: 14px;
  font-weight: 500;
  color: #409eff;
  background: #ecf5ff;
  padding: 4px 12px;
  border-radius: 12px;
  display: inline-block;
}

/* 生成按钮 */
.generate-btn {
  width: 100%;
  height: 40px;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

/* 右侧编辑区 */
.editor-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
}

.editor-header {
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.editor-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.auto-save-status {
  font-size: 12px;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 4px;
}

.auto-save-status.saving {
  color: #409eff;
}

.auto-save-status .el-icon {
  font-size: 14px;
}

.editor-content {
  flex: 1;
  padding: 0;
}

.vditor-container {
  height: calc(100vh - 220px) !important;
}

.vditor-wysiwyg pre.vditor-reset{
  height: calc(100% - 20px)!important;
}

/* Vditor 样式覆盖 */
:deep(.vditor) {
  border: none;
}

:deep(.vditor-toolbar) {
  border-bottom: 1px solid #e4e7ed;
  background: #fafbfc;
}

:deep(.vditor-content) {
  background: white;
}

/* 创作列表弹窗 */
.history-dialog-content {
  max-height: 500px;
  overflow-y: auto;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.history-item:hover {
  border-color: #409eff;
  background: #f0f9ff;
}

.story-info {
  flex: 1;
  min-width: 0;
}

.story-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-excerpt {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.story-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
  align-items: center;
}

.story-meta .word-count {
  color: #409eff;
}

.story-meta .story-type {
  background: #f0f9ff;
  color: #0369a1;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 11px;
}

.story-actions {
  display: flex;
  gap: 8px;
  margin-left: 16px;
}

.story-actions .el-button {
  padding: 4px 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .writing-container {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: auto;
    max-height: 50vh;
  }
  
  .type-tabs {
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
  }
  
  .config-panel {
    max-height: calc(50vh - 60px);
  }
  
  .word-count-slider {
     padding: 8px 0;
   }
  
  .history-grid {
    grid-template-columns: 1fr;
  }
}
</style>