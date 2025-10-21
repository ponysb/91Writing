<template>
  <div class="chapter-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1>📖 章节管理</h1>
        <p>管理您的小说章节，编辑和组织内容</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog = true" :disabled="!selectedNovel">
          <el-icon><Plus /></el-icon>
          新建章节
        </el-button>
      </div>
    </div>

    <!-- 小说选择 -->
    <div class="novel-selector">
      <el-card shadow="never">
        <div class="selector-content">
          <div class="selector-left">
            <span class="selector-label">选择小说：</span>
            <el-select 
              v-model="selectedNovelId" 
              placeholder="请选择要管理的小说"
              style="width: 300px;"
              @change="handleNovelChange"
            >
              <el-option
                v-for="novel in novels"
                :key="novel.id"
                :label="novel.title"
                :value="novel.id"
              >
                <div class="novel-option">
                  <span class="novel-title">{{ novel.title }}</span>
                  <span class="novel-info">{{ novel.genre || '未分类' }}</span>
                </div>
              </el-option>
            </el-select>
          </div>
          
          <div class="selector-right" v-if="selectedNovel">
            <div class="novel-stats">
              <div class="stat-item">
                <span class="stat-label">总章节：</span>
                <span class="stat-value">{{ chapters.length }}章</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">总字数：</span>
                <span class="stat-value">{{ formatNumber(totalWordCount) }}字</span>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 章节列表 -->
    <div class="chapters-section" v-if="selectedNovel">
      <el-card shadow="never">
        <template #header>
          <div class="card-header">
            <span>📚 {{ selectedNovel.title }} - 章节列表</span>
            <div class="header-actions">
              <el-button size="small" @click="sortChapters">排序</el-button>
              <el-button size="small" @click="batchEdit">批量编辑</el-button>
            </div>
          </div>
        </template>
        
        <div class="chapters-list">
          <div 
            v-for="(chapter, index) in chapters" 
            :key="chapter.id"
            class="chapter-item"
            :class="{ 'selected': selectedChapters.includes(chapter.id) }"
          >
            <div class="chapter-checkbox">
              <el-checkbox 
                :model-value="selectedChapters.includes(chapter.id)"
                @change="toggleChapterSelection(chapter.id)"
              />
            </div>
            
            <div class="chapter-number">
              第{{ index + 1 }}章
            </div>
            
            <div class="chapter-content">
              <div class="chapter-title">
                <h4>{{ chapter.title }}</h4>
                <div class="chapter-status">
                  <el-tag 
                    :type="getChapterStatusType(chapter.status)"
                    size="small"
                  >
                    {{ getChapterStatusText(chapter.status) }}
                  </el-tag>
                </div>
              </div>
              
              <div class="chapter-summary" v-if="chapter.summary">
                {{ chapter.summary }}
              </div>
              
              <div class="chapter-meta">
                <div class="meta-item">
                  <el-icon><EditPen /></el-icon>
                  <span>{{ chapter.wordCount }}字</span>
                </div>
                <div class="meta-item">
                  <el-icon><Calendar /></el-icon>
                  <span>{{ formatDate(chapter.updatedAt) }}</span>
                </div>
                <div class="meta-item" v-if="chapter.aiGenerated">
                  <el-icon><EditPen /></el-icon>
                  <span>AI辅助</span>
                </div>
              </div>
            </div>
            
            <div class="chapter-actions">
              <el-button link size="small" @click="editChapter(chapter)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button link size="small" @click="viewChapter(chapter)">
                <el-icon><View /></el-icon>
                预览
              </el-button>
              <el-dropdown trigger="click">
                <el-button link size="small">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="duplicateChapter(chapter)">
                      <el-icon><CopyDocument /></el-icon>
                      复制章节
                    </el-dropdown-item>
                    <el-dropdown-item @click="moveChapter(chapter, 'up')" :disabled="index === 0">
                      <el-icon><ArrowUp /></el-icon>
                      上移
                    </el-dropdown-item>
                    <el-dropdown-item @click="moveChapter(chapter, 'down')" :disabled="index === chapters.length - 1">
                      <el-icon><ArrowDown /></el-icon>
                      下移
                    </el-dropdown-item>
                    <el-dropdown-item divided @click="deleteChapter(chapter)">
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          
          <div v-if="chapters.length === 0" class="empty-chapters">
            <el-empty description="暂无章节，开始创建您的第一个章节吧！">
              <el-button type="primary" @click="showCreateDialog = true">创建章节</el-button>
            </el-empty>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 未选择小说时的提示 -->
    <div v-else class="no-novel-selected">
      <el-empty description="请先选择一部小说来管理章节">
        <el-button type="primary" @click="$router.push('/novels')">前往小说管理</el-button>
      </el-empty>
    </div>

    <!-- 创建/编辑章节对话框 -->
    <el-dialog 
      v-model="showCreateDialog" 
      :title="editingChapter ? '编辑章节' : '创建新章节'" 
      width="800px"
    >
      <el-form :model="chapterForm" :rules="chapterRules" ref="chapterFormRef" label-width="80px">
        <el-form-item label="章节标题" prop="title">
          <el-input 
            v-model="chapterForm.title" 
            placeholder="请输入章节标题"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="章节摘要">
          <el-input 
            v-model="chapterForm.summary" 
            type="textarea" 
            placeholder="简要描述本章节内容（可选）"
            :rows="3"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="章节状态">
          <el-radio-group v-model="chapterForm.status">
            <el-radio label="draft">草稿</el-radio>
            <el-radio label="writing">写作中</el-radio>
            <el-radio label="completed">已完成</el-radio>
            <el-radio label="published">已发布</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="章节内容" prop="content">
          <el-input 
            v-model="chapterForm.content" 
            type="textarea" 
            placeholder="开始写作您的章节内容..."
            :rows="15"
            show-word-limit
          />
        </el-form-item>
        
        <el-form-item label="标签">
          <el-input 
            v-model="tagInput"
            placeholder="输入标签后按回车添加"
            @keyup.enter="addChapterTag"
          >
            <template #append>
              <el-button @click="addChapterTag">添加</el-button>
            </template>
          </el-input>
          <div class="tags-display" v-if="chapterForm.tags.length > 0">
            <el-tag 
              v-for="(tag, index) in chapterForm.tags"
              :key="index"
              closable
              @close="removeChapterTag(index)"
              style="margin: 5px 5px 0 0;"
            >
              {{ tag }}
            </el-tag>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="saveChapter">保存</el-button>
      </template>
    </el-dialog>

    <!-- 章节预览对话框 -->
    <el-dialog v-model="showPreviewDialog" title="章节预览" width="900px">
      <div v-if="previewChapter" class="chapter-preview">
        <div class="preview-header">
          <h2>{{ previewChapter.title }}</h2>
          <div class="preview-meta">
            <span>字数：{{ previewChapter.wordCount }}</span>
            <span>状态：{{ getChapterStatusText(previewChapter.status) }}</span>
            <span>更新：{{ formatDate(previewChapter.updatedAt) }}</span>
          </div>
        </div>
        <div class="preview-content">
          <p v-for="(paragraph, index) in previewChapter.content.split('\n')" :key="index">
            {{ paragraph }}
          </p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, EditPen, Calendar, Edit, View, MoreFilled, 
  CopyDocument, ArrowUp, ArrowDown, Delete 
} from '@element-plus/icons-vue'
import { useRouter, useRoute } from 'vue-router'
import simpleDB from '@/services/simpleDB'

const router = useRouter()
const route = useRoute()

// 响应式数据
const selectedNovelId = ref(null)
const showCreateDialog = ref(false)
const showPreviewDialog = ref(false)
const editingChapter = ref(null)
const previewChapter = ref(null)
const selectedChapters = ref([])
const tagInput = ref('')
const chapterFormRef = ref()

// 小说数据 - 从localStorage加载真实数据
const novels = ref([])

// 章节数据
const chapters = ref([])

// 表单数据
const chapterForm = ref({
  title: '',
  summary: '',
  content: '',
  status: 'draft',
  tags: []
})

// 表单验证规则
const chapterRules = {
  title: [
    { required: true, message: '请输入章节标题', trigger: 'blur' },
    { min: 1, max: 100, message: '标题长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入章节内容', trigger: 'blur' }
  ]
}

// 计算属性
const selectedNovel = computed(() => {
  return novels.value.find(novel => novel.id === selectedNovelId.value)
})

// 计算总字数
const totalWordCount = computed(() => {
  return chapters.value.reduce((sum, chapter) => sum + (chapter.wordCount || 0), 0)
})

// 方法
const loadNovels = async () => {
  try {
    // 优先从 IndexedDB 加载
    let loadedNovels = await simpleDB.getAllNovels()
    
    if (loadedNovels && loadedNovels.length > 0) {
      console.log(`📚 从 IndexedDB 加载了 ${loadedNovels.length} 部小说`)
      novels.value = loadedNovels.map(novel => ({
        ...novel,
        createdAt: new Date(novel.createdAt),
        updatedAt: new Date(novel.updatedAt)
      }))
    } else {
      // 降级到 localStorage
      const saved = localStorage.getItem('novels')
      if (saved) {
        const parsedNovels = JSON.parse(saved)
        console.log(`📚 从 localStorage 加载了 ${parsedNovels.length} 部小说`)
        novels.value = parsedNovels.map(novel => ({
          ...novel,
          createdAt: new Date(novel.createdAt),
          updatedAt: new Date(novel.updatedAt)
        }))
      }
    }
    
    // 打印小说ID，用于调试
    if (novels.value.length > 0) {
      console.log('📋 小说列表:', novels.value.map(n => ({ id: n.id, title: n.title })))
    }
  } catch (error) {
    console.error('加载小说数据失败:', error)
    novels.value = []
  }
}

const formatNumber = (num) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toLocaleString()
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

const getChapterStatusType = (status) => {
  const typeMap = {
    draft: 'info',        // 草稿 - 使用 info 类型
    writing: 'warning',   // 写作中 - 警告色
    completed: 'success', // 已完成 - 成功色
    published: 'primary'  // 已发布 - 主题色
  }
  return typeMap[status] || 'info'  // 默认使用 info
}

const getChapterStatusText = (status) => {
  const textMap = {
    draft: '草稿',
    writing: '写作中',
    completed: '已完成',
    published: '已发布'
  }
  return textMap[status] || '未知'
}

const handleNovelChange = (novelId) => {
  loadChapters(novelId)
}

const toggleChapterSelection = (chapterId) => {
  const index = selectedChapters.value.indexOf(chapterId)
  if (index > -1) {
    selectedChapters.value.splice(index, 1)
  } else {
    selectedChapters.value.push(chapterId)
  }
}

const loadChapters = async (novelId) => {
  if (!novelId) {
    chapters.value = []
    return
  }

  console.log(`🔍 开始加载章节，小说ID: ${novelId}`)

  try {
    let loadedChapters = []
    
    // 1. 优先从 IndexedDB 加载（如果数据已迁移）
    try {
      loadedChapters = await simpleDB.getChaptersByNovel(novelId)
      if (loadedChapters && loadedChapters.length > 0) {
        console.log(`📦 从 IndexedDB 加载了 ${loadedChapters.length} 个章节`, loadedChapters[0])
      } else {
        console.log(`⚠️ IndexedDB 中没有找到小说 ${novelId} 的章节`)
      }
    } catch (dbError) {
      console.warn('从 IndexedDB 加载失败，尝试 localStorage:', dbError)
    }
    
    // 2. 如果 IndexedDB 中没有，尝试从 localStorage 加载
    if (!loadedChapters || loadedChapters.length === 0) {
      const chaptersKey = `novel_chapters_${novelId}`
      console.log(`🔍 尝试从 localStorage 读取键: ${chaptersKey}`)
      const saved = localStorage.getItem(chaptersKey)
      
      if (saved) {
        try {
          loadedChapters = JSON.parse(saved)
          console.log(`📦 从 localStorage 加载了 ${loadedChapters.length} 个章节`)
          console.log('📋 第一个章节数据:', loadedChapters[0])
        } catch (parseError) {
          console.error('解析 localStorage 数据失败:', parseError)
        }
      } else {
        console.log(`❌ localStorage 中没有找到键 ${chaptersKey}`)
        
        // 3. 列出所有 localStorage 中的章节相关键
        console.log('📋 所有 localStorage 中的章节键:')
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('novel_chapters_')) {
            console.log(`  - ${key}`)
          }
        }
      }
    }
    
    // 4. 处理加载的数据
    if (loadedChapters && loadedChapters.length > 0) {
      chapters.value = loadedChapters.map(chapter => ({
        ...chapter,
        createdAt: chapter.createdAt ? new Date(chapter.createdAt) : new Date(),
        updatedAt: chapter.updatedAt ? new Date(chapter.updatedAt) : new Date()
      }))
      console.log(`✅ 成功加载 ${chapters.value.length} 个章节`)
    } else {
      console.log(`⚠️ 小说 ${novelId} 暂无章节数据`)
      chapters.value = []
    }
  } catch (error) {
    console.error('❌ 加载章节数据失败:', error)
    chapters.value = []
    ElMessage.error('加载章节失败：' + error.message)
  }
}

const saveChaptersToNovel = () => {
  if (!selectedNovelId.value) return
  
  try {
    // 保存章节数据到独立的 localStorage 键
    const chaptersKey = `novel_chapters_${selectedNovelId.value}`
    localStorage.setItem(chaptersKey, JSON.stringify(chapters.value))
    
    // 同时更新小说的统计信息
    const novels = JSON.parse(localStorage.getItem('novels') || '[]')
    const novelIndex = novels.findIndex(n => n.id === selectedNovelId.value)
    
    if (novelIndex > -1) {
      // 更新章节列表
      novels[novelIndex].chapterList = chapters.value
      // 重新计算总字数
      novels[novelIndex].wordCount = chapters.value.reduce((sum, ch) => sum + (ch.wordCount || 0), 0)
      // 更新章节数（兼容性）
      novels[novelIndex].chapters = chapters.value.length
      // 更新修改时间
      novels[novelIndex].updatedAt = new Date()
      
      localStorage.setItem('novels', JSON.stringify(novels))
      
      // 同步更新本地的novels数据
      loadNovels()
    }
  } catch (error) {
    console.error('保存章节数据失败:', error)
    ElMessage.error('保存失败')
  }
}

const editChapter = (chapter) => {
  // 跳转到Writer页面进行编辑
  router.push(`/writer?novelId=${selectedNovelId.value}&chapterId=${chapter.id}`)
}

const viewChapter = (chapter) => {
  previewChapter.value = chapter
  showPreviewDialog.value = true
}

const duplicateChapter = (chapter) => {
  const newChapter = {
    ...chapter,
    id: Date.now(),
    title: chapter.title + ' (副本)',
    status: 'draft',
    createdAt: new Date(),
    updatedAt: new Date()
  }
  chapters.value.push(newChapter)
  // 保存到localStorage
  saveChaptersToNovel()
  ElMessage.success('章节复制成功')
}

const moveChapter = (chapter, direction) => {
  const index = chapters.value.findIndex(c => c.id === chapter.id)
  if (direction === 'up' && index > 0) {
    [chapters.value[index], chapters.value[index - 1]] = [chapters.value[index - 1], chapters.value[index]]
    // 保存到localStorage
    saveChaptersToNovel()
    ElMessage.success('章节上移成功')
  } else if (direction === 'down' && index < chapters.value.length - 1) {
    [chapters.value[index], chapters.value[index + 1]] = [chapters.value[index + 1], chapters.value[index]]
    // 保存到localStorage
    saveChaptersToNovel()
    ElMessage.success('章节下移成功')
  }
}

const deleteChapter = (chapter) => {
  ElMessageBox.confirm(
    `确定要删除章节「${chapter.title}」吗？此操作不可恢复。`,
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    const index = chapters.value.findIndex(c => c.id === chapter.id)
    if (index > -1) {
      chapters.value.splice(index, 1)
      // 保存到localStorage
      saveChaptersToNovel()
      ElMessage.success('章节删除成功')
    }
  })
}

const saveChapter = () => {
  chapterFormRef.value.validate((valid) => {
    if (valid) {
      const wordCount = chapterForm.value.content.replace(/<[^>]*>/g, '').length
      
      if (editingChapter.value) {
        // 编辑现有章节
        const index = chapters.value.findIndex(c => c.id === editingChapter.value.id)
        if (index > -1) {
          chapters.value[index] = {
            ...chapters.value[index],
            ...chapterForm.value,
            wordCount,
            updatedAt: new Date()
          }
        }
        ElMessage.success('章节更新成功')
      } else {
        // 创建新章节
        const newChapter = {
          id: Date.now(),
          ...chapterForm.value,
          wordCount,
          createdAt: new Date(),
          updatedAt: new Date(),
          aiGenerated: false,
          status: chapterForm.value.status || 'draft'
        }
        chapters.value.push(newChapter)
        ElMessage.success('章节创建成功')
      }
      
      // 保存到localStorage
      saveChaptersToNovel()
      
      showCreateDialog.value = false
      resetForm()
    }
  })
}

const resetForm = () => {
  chapterForm.value = {
    title: '',
    summary: '',
    content: '',
    status: 'draft',
    tags: []
  }
  editingChapter.value = null
  tagInput.value = ''
}

const addChapterTag = () => {
  if (tagInput.value.trim() && !chapterForm.value.tags.includes(tagInput.value.trim())) {
    chapterForm.value.tags.push(tagInput.value.trim())
    tagInput.value = ''
  }
}

const removeChapterTag = (index) => {
  chapterForm.value.tags.splice(index, 1)
}

const sortChapters = () => {
  ElMessage.info('章节排序功能开发中...')
}

const batchEdit = () => {
  if (selectedChapters.value.length === 0) {
    ElMessage.warning('请先选择要编辑的章节')
    return
  }
  ElMessage.info('批量编辑功能开发中...')
}

// 监听对话框关闭
watch(showCreateDialog, (newVal) => {
  if (!newVal) {
    resetForm()
  }
})

// 生命周期
onMounted(async () => {
  // 1. 先加载小说列表（等待完成）
  await loadNovels()
  
  // 2. 检查 URL 参数中是否有 novelId
  const novelIdFromQuery = route.query.novelId
  console.log('🔍 URL 参数中的 novelId:', novelIdFromQuery)
  console.log('📋 当前小说列表数量:', novels.value.length)
  
  if (novelIdFromQuery) {
    // 从 URL 参数选择小说 - 支持字符串和数字匹配
    const novel = novels.value.find(n => {
      return n.id == novelIdFromQuery || String(n.id) === String(novelIdFromQuery)
    })
    
    if (novel) {
      console.log('✅ 找到匹配的小说:', novel)
      selectedNovelId.value = novel.id
      await loadChapters(novel.id)
    } else {
      console.log('❌ 未找到匹配的小说')
      console.log('  URL novelId:', novelIdFromQuery, typeof novelIdFromQuery)
      console.log('  小说 IDs:', novels.value.map(n => ({ id: n.id, type: typeof n.id })))
      ElMessage.warning('未找到指定的小说，请从列表中选择')
      
      // 仍然尝试自动选择第一个
      if (novels.value.length > 0) {
        selectedNovelId.value = novels.value[0].id
        await loadChapters(novels.value[0].id)
      }
    }
  } else if (novels.value.length > 0) {
    // 没有 URL 参数，自动选择第一个小说
    selectedNovelId.value = novels.value[0].id
    await loadChapters(selectedNovelId.value)
    console.log('自动选择第一个小说:', selectedNovelId.value)
  }
})
</script>

<style scoped>
.chapter-management {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.header-content h1 {
  margin: 0 0 5px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-content p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.novel-selector {
  margin-bottom: 20px;
}

.selector-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selector-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.selector-label {
  font-weight: 600;
  color: #303133;
}

.novel-option {
  display: flex;
  flex-direction: column;
}

.novel-title {
  font-weight: 600;
}

.novel-info {
  font-size: 12px;
  color: #909399;
}

.novel-stats {
  display: flex;
  gap: 20px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

.stat-label {
  color: #606266;
  font-size: 14px;
}

.stat-value {
  font-weight: 600;
  color: #303133;
}

.chapters-section {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.chapters-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.chapter-item {
  display: flex;
  align-items: flex-start;
  gap: 15px;
  padding: 15px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  transition: all 0.3s;
}

.chapter-item:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.chapter-item.selected {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.chapter-checkbox {
  flex-shrink: 0;
  padding-top: 2px;
}

.chapter-number {
  flex-shrink: 0;
  width: 60px;
  text-align: center;
  font-weight: 600;
  color: #409eff;
  background: #f0f9ff;
  padding: 5px;
  border-radius: 4px;
  font-size: 12px;
}

.chapter-content {
  flex: 1;
}

.chapter-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.chapter-title h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.chapter-summary {
  color: #606266;
  font-size: 14px;
  line-height: 1.4;
  margin-bottom: 10px;
}

.chapter-meta {
  display: flex;
  gap: 15px;
  font-size: 12px;
  color: #909399;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.chapter-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 5px;
}

.no-novel-selected {
  padding: 60px 0;
}

.tags-display {
  margin-top: 10px;
}

.chapter-preview {
  max-height: 600px;
  overflow-y: auto;
}

.preview-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e4e7ed;
}

.preview-header h2 {
  margin: 0 0 10px 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.preview-meta {
  display: flex;
  gap: 15px;
  font-size: 14px;
  color: #606266;
}

.preview-content {
  line-height: 1.8;
  color: #303133;
}

.preview-content p {
  margin: 0 0 15px 0;
  text-indent: 2em;
}

.empty-chapters {
  padding: 40px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
  }
  
  .selector-content {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
  
  .chapter-item {
    flex-direction: column;
    gap: 10px;
  }
  
  .chapter-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>