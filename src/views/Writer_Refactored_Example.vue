<template>
  <div class="writer-container">
    <!-- 顶部工具栏 -->
    <WriterToolbar
      :current-chapter="currentChapter"
      :is-saving="isSaving"
      :last-save-time="lastSaveTimeText"
      :word-count="currentChapterWordCount"
      @back="goBack"
      @save="saveCurrentChapter"
      @ai-command="handleAICommand"
      @export="handleExport"
      @settings="showSettingsDialog = true"
    />

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧：章节列表（使用虚拟滚动） -->
      <div class="sidebar-left" v-show="activeTab === 'editor'">
        <WriterChapterList
          ref="chapterListRef"
          :chapters="chapters"
          :current-chapter="currentChapter"
          @select-chapter="selectChapter"
          @add-chapter="handleAddChapter"
          @edit-chapter="showChapterEditDialog"
          @generate-chapter="handleGenerateChapter"
          @duplicate-chapter="handleDuplicateChapter"
          @delete-chapter="handleDeleteChapter"
        />
      </div>

      <!-- 中间：编辑器 -->
      <div class="editor-main">
        <!-- 编辑器标签栏 -->
        <WriterTabsBar
          :active-tab="activeTab"
          @change="handleTabChange"
        />

        <!-- 编辑器内容 -->
        <div v-show="activeTab === 'editor'" class="editor-wrapper">
          <WriterEditor
            v-if="currentChapter"
            ref="editorRef"
            :content="editorContent"
            :chapter-id="currentChapter.id"
            @update="handleContentUpdate"
            @cursor-change="handleCursorChange"
          />
          
          <div v-else class="no-chapter-selected">
            <el-empty description="请选择或创建一个章节开始写作">
              <el-button type="primary" @click="handleAddChapter('manual')">
                <el-icon><Plus /></el-icon>
                创建新章节
              </el-button>
            </el-empty>
          </div>
        </div>

        <!-- 其他标签页内容 -->
        <div v-show="activeTab === 'characters'" class="panel-wrapper">
          <WriterCharacterPanel :novel-id="novelId" />
        </div>

        <div v-show="activeTab === 'worldview'" class="panel-wrapper">
          <WriterWorldviewPanel :novel-id="novelId" />
        </div>

        <div v-show="activeTab === 'corpus'" class="panel-wrapper">
          <WriterCorpusPanel :novel-id="novelId" />
        </div>

        <div v-show="activeTab === 'events'" class="panel-wrapper">
          <WriterEventPanel :novel-id="novelId" />
        </div>
      </div>

      <!-- 右侧：辅助面板 -->
      <div class="sidebar-right" v-show="activeTab === 'editor'">
        <WriterChapterPanel
          v-if="currentChapter"
          :chapter="currentChapter"
          @update="handleChapterInfoUpdate"
          @generate-outline="handleGenerateOutline"
        />
      </div>
    </div>

    <!-- 底部状态栏 -->
    <WriterStatusBar
      :total-words="totalWords"
      :chapter-count="chapters.length"
      :today-words="todayWords"
      :daily-goal="dailyGoal"
      :cursor-position="cursorPosition"
      :api-status="apiStatus"
      :is-auto-saving="isAutoSaving"
      :last-save-time="lastSaveTimeText"
    />

    <!-- 对话框组件 -->
    <ChapterEditDialog
      v-model="showChapterEdit"
      :chapter="editingChapter"
      @confirm="handleChapterEditConfirm"
    />

    <SettingsDialog
      v-model="showSettingsDialog"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useNovelStore } from '@/stores/novel'
import apiService from '@/services/api'

// 新的子组件
import WriterToolbar from '@/components/writer/WriterToolbar.vue'
import WriterStatusBar from '@/components/writer/WriterStatusBar.vue'
import WriterChapterList from '@/components/writer/WriterChapterList.vue'

// 已有的子组件
import WriterTabsBar from '@/components/writer/WriterTabsBar.vue'
import WriterEditor from '@/components/writer/WriterEditor.vue'
import WriterChapterPanel from '@/components/writer/WriterChapterPanel.vue'
import WriterCharacterPanel from '@/components/writer/WriterCharacterPanel.vue'
import WriterWorldviewPanel from '@/components/writer/WriterWorldviewPanel.vue'
import WriterCorpusPanel from '@/components/writer/WriterCorpusPanel.vue'
import WriterEventPanel from '@/components/writer/WriterEventPanel.vue'

const router = useRouter()
const route = useRoute()
const novelStore = useNovelStore()

// ========================
// 状态管理
// ========================
const novelId = ref(route.params.id)
const currentNovel = ref(null)
const chapters = ref([])
const currentChapter = ref(null)
const editorContent = ref('')
const activeTab = ref('editor')

// 编辑器状态
const editorRef = ref(null)
const chapterListRef = ref(null)
const cursorPosition = ref({ line: 1, column: 1 })

// 保存状态
const isSaving = ref(false)
const isAutoSaving = ref(false)
const lastSaveTime = ref(null)
const autoSaveTimer = ref(null)

// 对话框状态
const showChapterEdit = ref(false)
const editingChapter = ref(null)
const showSettingsDialog = ref(false)

// API 状态
const apiStatus = ref('disconnected')

// 写作目标
const dailyGoal = ref(2000)
const todayWords = ref(0)

// ========================
// 计算属性
// ========================
const currentChapterWordCount = computed(() => {
  if (!editorContent.value) return 0
  // 简单的字数统计（去除 HTML 标签）
  const text = editorContent.value.replace(/<[^>]*>/g, '')
  return text.length
})

const totalWords = computed(() => {
  return chapters.value.reduce((sum, chapter) => {
    return sum + (chapter.wordCount || 0)
  }, 0)
})

const lastSaveTimeText = computed(() => {
  if (!lastSaveTime.value) return ''
  
  const now = new Date()
  const diff = now - lastSaveTime.value
  
  if (diff < 10000) return '刚刚'
  if (diff < 60000) return `${Math.floor(diff / 1000)}秒前`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  
  return lastSaveTime.value.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
})

// ========================
// 数据加载
// ========================
const loadNovelData = async () => {
  try {
    // 从 store 或 localStorage 加载小说数据
    const novels = JSON.parse(localStorage.getItem('novels') || '[]')
    currentNovel.value = novels.find(n => n.id === novelId.value)
    
    if (!currentNovel.value) {
      ElMessage.error('小说不存在')
      router.push('/novels')
      return
    }

    // 加载章节列表
    const chaptersKey = `novel_chapters_${novelId.value}`
    chapters.value = JSON.parse(localStorage.getItem(chaptersKey) || '[]')
    
    // 自动选择第一章
    if (chapters.value.length > 0 && !currentChapter.value) {
      selectChapter(chapters.value[0])
    }

    // 检查 API 状态
    checkAPIStatus()
    
  } catch (error) {
    console.error('加载小说数据失败:', error)
    ElMessage.error('加载失败')
  }
}

// ========================
// 章节操作
// ========================
const selectChapter = (chapter) => {
  // 保存当前章节
  if (currentChapter.value && editorContent.value) {
    saveCurrentChapter()
  }

  // 切换章节
  currentChapter.value = chapter
  editorContent.value = chapter.content || ''

  // 滚动到该章节
  if (chapterListRef.value) {
    chapterListRef.value.scrollToChapter(chapter.id)
  }
}

const handleAddChapter = async (type) => {
  try {
    let newChapter = null

    switch (type) {
      case 'manual':
        newChapter = {
          id: `chapter_${Date.now()}`,
          title: `第 ${chapters.value.length + 1} 章`,
          content: '',
          description: '',
          wordCount: 0,
          status: 'draft',
          createdAt: new Date(),
          updatedAt: new Date()
        }
        break

      case 'ai-single':
        // AI 生成单章逻辑
        newChapter = await generateChapterWithAI()
        break

      case 'ai-batch':
        // AI 批量生成逻辑
        await generateBatchChapters()
        return
    }

    if (newChapter) {
      chapters.value.push(newChapter)
      saveChapters()
      selectChapter(newChapter)
      ElMessage.success('章节创建成功')
    }
  } catch (error) {
    console.error('创建章节失败:', error)
    ElMessage.error('创建失败')
  }
}

const handleDeleteChapter = async (chapter) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${chapter.title}"吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    const index = chapters.value.findIndex(c => c.id === chapter.id)
    if (index !== -1) {
      chapters.value.splice(index, 1)
      saveChapters()

      if (currentChapter.value?.id === chapter.id) {
        currentChapter.value = chapters.value[0] || null
        editorContent.value = currentChapter.value?.content || ''
      }

      ElMessage.success('删除成功')
    }
  } catch (error) {
    // 用户取消删除
  }
}

const handleDuplicateChapter = (chapter) => {
  const newChapter = {
    ...chapter,
    id: `chapter_${Date.now()}`,
    title: `${chapter.title}（副本）`,
    createdAt: new Date(),
    updatedAt: new Date()
  }

  chapters.value.push(newChapter)
  saveChapters()
  ElMessage.success('复制成功')
}

// ========================
// 内容编辑
// ========================
const handleContentUpdate = (content) => {
  editorContent.value = content
  
  // 更新字数
  if (currentChapter.value) {
    currentChapter.value.wordCount = currentChapterWordCount.value
  }

  // 触发自动保存
  scheduleAutoSave()
}

const handleCursorChange = (position) => {
  cursorPosition.value = position
}

const handleChapterInfoUpdate = (updates) => {
  if (currentChapter.value) {
    Object.assign(currentChapter.value, updates)
    saveChapters()
  }
}

// ========================
// 保存功能
// ========================
const saveCurrentChapter = async () => {
  if (!currentChapter.value) return

  try {
    isSaving.value = true

    // 更新章节内容
    currentChapter.value.content = editorContent.value
    currentChapter.value.wordCount = currentChapterWordCount.value
    currentChapter.value.updatedAt = new Date()

    // 保存到 localStorage
    saveChapters()

    lastSaveTime.value = new Date()
    ElMessage.success('保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  } finally {
    isSaving.value = false
  }
}

const saveChapters = () => {
  const chaptersKey = `novel_chapters_${novelId.value}`
  localStorage.setItem(chaptersKey, JSON.stringify(chapters.value))
}

const scheduleAutoSave = () => {
  // 清除之前的定时器
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }

  // 3 秒后自动保存
  autoSaveTimer.value = setTimeout(async () => {
    isAutoSaving.value = true
    await saveCurrentChapter()
    isAutoSaving.value = false
  }, 3000)
}

// ========================
// AI 功能
// ========================
const handleAICommand = async (command) => {
  if (!currentChapter.value) {
    ElMessage.warning('请先选择一个章节')
    return
  }

  try {
    switch (command) {
      case 'continue':
        await handleContinueWriting()
        break
      case 'polish':
        await handlePolish()
        break
      case 'expand':
        await handleExpand()
        break
      case 'insert':
        await handleInsert()
        break
      case 'dialogue':
        await handleGenerateDialogue()
        break
      case 'scene':
        await handleGenerateScene()
        break
    }
  } catch (error) {
    console.error('AI 操作失败:', error)
    ElMessage.error('操作失败，请重试')
  }
}

const handleContinueWriting = async () => {
  // 续写逻辑
  ElMessage.info('续写功能开发中...')
}

const handlePolish = async () => {
  // 润色逻辑
  ElMessage.info('润色功能开发中...')
}

const handleGenerateChapter = async (chapter) => {
  // AI 生成章节内容
  ElMessage.info('AI 生成功能开发中...')
}

// ========================
// 其他功能
// ========================
const handleTabChange = (tab) => {
  activeTab.value = tab
}

const handleExport = (format) => {
  // 导出逻辑
  ElMessage.info(`导出为 ${format} 格式...`)
}

const goBack = () => {
  router.push('/novels')
}

const checkAPIStatus = async () => {
  try {
    const config = JSON.parse(localStorage.getItem('apiConfig') || '{}')
    apiStatus.value = config.apiKey ? 'connected' : 'disconnected'
  } catch (error) {
    apiStatus.value = 'disconnected'
  }
}

const showChapterEditDialog = (chapter) => {
  editingChapter.value = { ...chapter }
  showChapterEdit.value = true
}

const handleChapterEditConfirm = (updates) => {
  const chapter = chapters.value.find(c => c.id === editingChapter.value.id)
  if (chapter) {
    Object.assign(chapter, updates)
    saveChapters()
  }
  showChapterEdit.value = false
}

// ========================
// 生命周期
// ========================
const cleanupFunctions = []

onMounted(() => {
  loadNovelData()

  // 定期保存（每 30 秒）
  const intervalId = setInterval(() => {
    if (currentChapter.value && editorContent.value) {
      isAutoSaving.value = true
      saveCurrentChapter().finally(() => {
        isAutoSaving.value = false
      })
    }
  }, 30000)

  cleanupFunctions.push(() => clearInterval(intervalId))

  // 加载今日字数统计
  const today = new Date().toDateString()
  const todayKey = `writing_stats_${today}`
  todayWords.value = parseInt(localStorage.getItem(todayKey) || '0')
})

onUnmounted(() => {
  console.log('🧹 开始清理 Writer 组件资源...')

  // 1. 保存当前章节
  if (currentChapter.value && editorContent.value) {
    try {
      saveCurrentChapter()
    } catch (error) {
      console.error('保存章节失败:', error)
    }
  }

  // 2. 清理定时器
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }

  // 3. 执行所有清理函数
  cleanupFunctions.forEach(cleanup => {
    try {
      cleanup()
    } catch (error) {
      console.error('清理函数执行失败:', error)
    }
  })

  // 4. 销毁编辑器
  if (editorRef.value && editorRef.value.destroy) {
    try {
      editorRef.value.destroy()
    } catch (error) {
      console.error('销毁编辑器失败:', error)
    }
  }

  // 5. 清空引用
  chapters.value = []
  currentChapter.value = null
  editorContent.value = ''

  console.log('✅ Writer 组件资源清理完成')
})

// 监听路由变化
watch(() => route.params.id, (newId) => {
  if (newId) {
    novelId.value = newId
    loadNovelData()
  }
})
</script>

<style scoped>
.writer-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f5f7fa;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar-left {
  width: 300px;
  background: #fff;
  border-right: 1px solid #e4e7ed;
  overflow: hidden;
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

.editor-wrapper,
.panel-wrapper {
  flex: 1;
  overflow: auto;
  padding: 20px;
}

.no-chapter-selected {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
}

.sidebar-right {
  width: 320px;
  background: #fff;
  border-left: 1px solid #e4e7ed;
  overflow: auto;
  padding: 16px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .sidebar-right {
    display: none;
  }
}

@media (max-width: 768px) {
  .sidebar-left {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s;
  }

  .sidebar-left.show {
    transform: translateX(0);
  }
}
</style>

