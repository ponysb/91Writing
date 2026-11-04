<template>
  <div class="novel-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1>📚 小说列表</h1>
        <p>查看和管理您的小说作品</p>
      </div>
      <div class="header-actions">
        <el-button 
          v-if="novels.length > 0" 
          @click="exportAllNovels"
          :disabled="filteredNovels.length === 0"
        >
          <el-icon><Download /></el-icon>
          导出列表
        </el-button>
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          创建新小说
        </el-button>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filter-section">
      <el-card shadow="never">
        <div class="filter-content">
          <div class="filter-left">
            <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 120px;">
              <el-option label="全部" value="all" />
              <el-option label="创作中" value="writing" />
              <el-option label="已完成" value="completed" />
              <el-option label="已暂停" value="paused" />
            </el-select>
            
            <el-select v-model="genreFilter" placeholder="类型筛选" style="width: 120px;">
              <el-option label="全部类型" value="all" />
              <el-option 
                v-for="(preset, key) in genrePresets" 
                :key="key"
                :label="preset.name" 
                :value="key"
              />
            </el-select>
            
            <el-select v-model="sortBy" placeholder="排序方式" style="width: 140px;">
              <el-option label="最近更新" value="updated" />
              <el-option label="创建时间" value="created" />
              <el-option label="字数" value="wordCount" />
              <el-option label="章节数" value="chapters" />
            </el-select>
          </div>
          
          <div class="filter-right">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索小说标题、简介..."
              clearable
              style="width: 300px;"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 小说列表 -->
    <div class="novels-grid">
      <div 
        v-for="novel in filteredNovels" 
        :key="novel.id"
        class="novel-card"
      >
        <el-card shadow="hover" class="novel-item">
          <div class="novel-cover">
            <img 
              :src="novel.cover || '/default-cover.jpg'" 
              :alt="novel.title"
              loading="lazy"
              @error="handleImageError"
              @load="handleImageLoad"
            />
            <div class="novel-status">
              <el-tag 
                :type="getStatusType(novel.status)"
                size="small"
              >
                {{ getStatusText(novel.status) }}
              </el-tag>
            </div>
          </div>
          
          <div class="novel-info">
            <h3 class="novel-title">{{ novel.title }}</h3>
            <p class="novel-description">{{ novel.description }}</p>
            
            <div class="novel-meta">
              <div class="meta-item">
                <el-icon><Document /></el-icon>
                <span>{{ (novel.chapterList || []).length }}章</span>
              </div>
              <div class="meta-item">
                <el-icon><EditPen /></el-icon>
                <span>{{ formatNumber(novel.wordCount || 0) }}字</span>
              </div>
              <div class="meta-item">
                <el-icon><Calendar /></el-icon>
                <span>{{ formatDate(novel.updatedAt) }}</span>
              </div>
            </div>
            
            <div class="novel-genre">
              <el-tag size="small" type="info">{{ getGenreDisplayName(novel.genre) }}</el-tag>
            </div>
          </div>
          
          <div class="novel-actions">
            <el-button 
              type="primary" 
              size="small" 
              @click="openNovel(novel)"
            >
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button 
              size="small" 
              @click="manageChapters(novel)"
            >
              <el-icon><Memo /></el-icon>
              章节管理
            </el-button>
            <el-button 
              size="small" 
              @click="viewNovelDetails(novel)"
            >
              <el-icon><View /></el-icon>
              详情
            </el-button>
            <el-dropdown trigger="click">
              <el-button size="small" link>
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="editNovelInfo(novel)">
                    <el-icon><EditPen /></el-icon>
                    编辑信息
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="exportNovel(novel)">
                    <el-icon><Download /></el-icon>
                    导出
                  </el-dropdown-item>
                  <el-dropdown-item @click="duplicateNovel(novel)">
                    <el-icon><CopyDocument /></el-icon>
                    复制
                  </el-dropdown-item>
                  <el-dropdown-item divided @click="deleteNovel(novel)">
                    <el-icon><Delete /></el-icon>
                    删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </el-card>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredNovels.length === 0" class="empty-state">
      <el-empty description="暂无小说作品">
        <el-button type="primary" @click="showCreateDialog = true">创建第一部小说</el-button>
      </el-empty>
    </div>

    <!-- 创建小说对话框 -->
    <el-dialog 
      v-model="showCreateDialog" 
      title="创建新小说" 
      width="600px"
      @close="resetCreateForm"
    >
      <el-form 
        ref="createFormRef" 
        :model="createForm" 
        :rules="createRules" 
        label-width="80px"
      >
        <el-form-item label="小说标题" prop="title">
          <el-input v-model="createForm.title" placeholder="请输入小说标题" />
        </el-form-item>
        
        <el-form-item label="类型" prop="genre">
          <el-select v-model="createForm.genre" placeholder="请选择小说类型" @change="onGenreChange">
            <el-option 
              v-for="(preset, key) in genrePresets" 
              :key="key"
              :label="preset.name" 
              :value="key"
            >
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>{{ preset.name }}</span>
                <el-tag size="small" type="info">{{ preset.tags.slice(0, 2).join('、') }}</el-tag>
              </div>
            </el-option>
          </el-select>
          <div v-if="createForm.genre && genrePresets[createForm.genre]" style="margin-top: 8px; font-size: 12px; color: #909399;">
            💡 {{ genrePresets[createForm.genre].prompt }}
          </div>
        </el-form-item>
        
        <el-form-item label="简介" prop="description">
          <div class="description-input-group">
            <el-input 
              v-model="createForm.description" 
              type="textarea" 
              :rows="4"
              placeholder="请输入小说简介或点击AI生成"
            />
            <div class="ai-generate-section" v-if="createForm.genre">
              <el-button 
                type="primary" 
                size="small" 
                @click="generateDescription" 
                :loading="isGeneratingDescription"
                :disabled="!createForm.title?.trim()"
              >
                <el-icon><Star /></el-icon>
                {{ isGeneratingDescription ? 'AI生成中...' : 'AI智能生成' }}
              </el-button>
              <el-button 
                v-if="createForm.description" 
                size="small" 
                @click="generateDescription" 
                :loading="isGeneratingDescription"
                :disabled="!createForm.title?.trim()"
              >
                重新生成
              </el-button>
              <span class="generate-tip">使用AI技术基于标题和类型智能生成</span>
            </div>
          </div>
        </el-form-item>
        
        <el-form-item label="封面">
          <div class="cover-upload-container">
            <div class="cover-uploader" @click="triggerFileInput">
              <img v-if="createForm.cover" :src="createForm.cover" class="cover-preview" />
              <div v-else class="cover-uploader-placeholder">
                <el-icon class="cover-uploader-icon"><Plus /></el-icon>
                <div class="upload-text">点击上传封面</div>
              </div>
            </div>
            <input 
              ref="fileInput"
              type="file" 
              accept="image/*" 
              style="display: none;"
              @change="handleNativeFileChange"
            />
            <div v-if="createForm.cover" class="cover-actions">
              <el-button size="small" type="danger" @click="removeCover">
                <el-icon><Delete /></el-icon>
                移除封面
              </el-button>
            </div>
          </div>
        </el-form-item>
        
        <el-form-item label="标签">
          <el-input 
            v-model="tagInput"
            placeholder="输入标签，支持用逗号、分号、空格分隔批量添加"
            @keyup.enter="addTag"
          >
            <template #append>
              <el-button @click="addTag">添加</el-button>
            </template>
          </el-input>
          <el-text type="info" size="small" style="margin-top: 4px; display: block;">
            💡 提示：可以输入"都市,职场,现代"一次性添加多个标签
          </el-text>
          <div class="tags-display" v-if="createForm.tags.length > 0">
            <el-tag 
              v-for="(tag, index) in createForm.tags"
              :key="index"
              closable
              @close="removeTag(index)"
              style="margin: 2px 4px 2px 0;"
            >
              {{ tag }}
            </el-tag>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" @click="createNovel">创建</el-button>
      </template>
    </el-dialog>

    <!-- 小说详情对话框 -->
    <el-dialog 
      v-model="showDetailsDialog" 
      title="小说详情" 
      width="800px"
    >
      <div v-if="selectedNovel" class="novel-details">
        <div class="details-header">
          <div class="details-cover">
            <img 
              :src="selectedNovel.cover || '/default-cover.jpg'" 
              :alt="selectedNovel.title"
              loading="lazy"
              @error="handleImageError"
              @load="handleImageLoad"
            />
          </div>
          <div class="details-info">
            <h2>{{ selectedNovel.title }}</h2>
            <p class="details-description">{{ selectedNovel.description }}</p>
            <div class="details-meta">
              <div class="meta-row">
                <span class="meta-label">类型：</span>
                <el-tag size="small">{{ getGenreDisplayName(selectedNovel.genre) }}</el-tag>
              </div>
              <div class="meta-row">
                <span class="meta-label">状态：</span>
                <el-tag :type="getStatusType(selectedNovel.status)" size="small">
                  {{ getStatusText(selectedNovel.status) }}
                </el-tag>
              </div>
              <div class="meta-row">
                <span class="meta-label">章节：</span>
                <span>{{ selectedNovel.chapters }}章</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">字数：</span>
                <span>{{ formatNumber(selectedNovel.wordCount) }}字</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">创建时间：</span>
                <span>{{ formatDate(selectedNovel.createdAt) }}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">更新时间：</span>
                <span>{{ formatDate(selectedNovel.updatedAt) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="details-content">
          <el-tabs v-model="activeTab">
            <el-tab-pane label="章节列表" name="chapters">
              <div class="chapters-list">
                <div 
                  v-for="(chapter, index) in selectedNovel.chapterList" 
                  :key="index"
                  class="chapter-item"
                >
                  <div class="chapter-info">
                    <h4>第{{ index + 1 }}章 {{ chapter.title }}</h4>
                    <p>{{ chapter.wordCount }}字 · {{ formatDate(chapter.updatedAt) }}</p>
                  </div>
                  <div class="chapter-actions">
                    <el-button size="small" @click="editChapter(chapter)">编辑</el-button>
                  </div>
                </div>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="创作记录" name="records">
              <div class="writing-records">
                <div 
                  v-for="record in selectedNovel.writingRecords" 
                  :key="record.id"
                  class="record-item"
                >
                  <div class="record-date">{{ formatDate(record.date) }}</div>
                  <div class="record-content">
                    <div class="record-stats">
                      <span>写作 {{ record.wordsWritten }} 字</span>
                      <span>用时 {{ record.timeSpent }} 分钟</span>
                    </div>
                    <div class="record-note" v-if="record.note">
                      {{ record.note }}
                    </div>
                  </div>
                </div>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="统计数据" name="statistics">
              <div class="novel-statistics">
                <div class="stats-grid">
                  <div class="stat-item">
                    <div class="stat-value">{{ selectedNovel.totalWords }}</div>
                    <div class="stat-label">总字数</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">{{ (selectedNovel.chapterList || []).length }}</div>
                    <div class="stat-label">章节数</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">{{ Math.round((selectedNovel.wordCount || 0) / Math.max((selectedNovel.chapterList || []).length, 1)) }}</div>
                    <div class="stat-label">平均章节字数</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">{{ selectedNovel.writingDays }}</div>
                    <div class="stat-label">创作天数</div>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>
    </el-dialog>

    <!-- 编辑小说信息对话框 -->
    <el-dialog 
      v-model="showEditDialog" 
      title="编辑小说信息" 
      width="600px"
      @close="resetEditForm"
    >
      <el-form 
        ref="editFormRef" 
        :model="editForm" 
        :rules="editRules" 
        label-width="80px"
      >
        <el-form-item label="小说标题" prop="title">
          <el-input v-model="editForm.title" placeholder="请输入小说标题" />
        </el-form-item>
        
        <el-form-item label="类型" prop="genre">
          <el-select v-model="editForm.genre" placeholder="请选择小说类型" @change="onEditGenreChange">
            <el-option 
              v-for="(preset, key) in genrePresets" 
              :key="key"
              :label="preset.name" 
              :value="key"
            >
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span>{{ preset.name }}</span>
                <el-tag size="small" type="info">{{ preset.tags.slice(0, 2).join('、') }}</el-tag>
              </div>
            </el-option>
          </el-select>
          <div v-if="editForm.genre && genrePresets[editForm.genre]" style="margin-top: 8px; font-size: 12px; color: #909399;">
            💡 {{ genrePresets[editForm.genre].prompt }}
          </div>
        </el-form-item>

        <el-form-item label="状态" prop="status">
          <el-select v-model="editForm.status" placeholder="请选择小说状态">
            <el-option label="创作中" value="writing" />
            <el-option label="已完成" value="completed" />
            <el-option label="已暂停" value="paused" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="简介" prop="description">
          <div class="description-input-group">
            <el-input 
              v-model="editForm.description" 
              type="textarea" 
              :rows="4"
              placeholder="请输入小说简介或点击AI生成"
            />
            <div class="ai-generate-section" v-if="editForm.genre">
              <el-button 
                type="primary" 
                size="small" 
                @click="generateEditDescription" 
                :loading="isGeneratingEditDescription"
                :disabled="!editForm.title?.trim()"
              >
                <el-icon><Star /></el-icon>
                {{ isGeneratingEditDescription ? 'AI生成中...' : 'AI重新生成' }}
              </el-button>
              <span class="generate-tip">使用AI技术基于标题和类型智能生成</span>
            </div>
          </div>
        </el-form-item>
        
        <el-form-item label="封面">
          <div class="cover-upload-container">
            <div class="cover-uploader" @click="triggerEditFileInput">
              <img v-if="editForm.cover" :src="editForm.cover" class="cover-preview" />
              <div v-else class="cover-uploader-placeholder">
                <el-icon class="cover-uploader-icon"><Plus /></el-icon>
                <div class="upload-text">点击上传封面</div>
              </div>
            </div>
            <input 
              ref="editFileInput"
              type="file" 
              accept="image/*" 
              style="display: none;"
              @change="handleEditFileChange"
            />
            <div v-if="editForm.cover" class="cover-actions">
              <el-button size="small" type="danger" @click="removeEditCover">
                <el-icon><Delete /></el-icon>
                移除封面
              </el-button>
            </div>
          </div>
        </el-form-item>
        
        <el-form-item label="标签">
          <el-input 
            v-model="editTagInput"
            placeholder="输入标签，支持用逗号、分号、空格分隔批量添加"
            @keyup.enter="addEditTag"
          >
            <template #append>
              <el-button @click="addEditTag">添加</el-button>
            </template>
          </el-input>
          <el-text type="info" size="small" style="margin-top: 4px; display: block;">
            💡 提示：可以输入"都市,职场,现代"一次性添加多个标签
          </el-text>
          <div class="tags-display" v-if="editForm.tags.length > 0">
            <el-tag 
              v-for="(tag, index) in editForm.tags"
              :key="index"
              closable
              @close="removeEditTag(index)"
              style="margin: 2px 4px 2px 0;"
            >
              {{ tag }}
            </el-tag>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="updateNovelInfo" :loading="isSavingEdit">保存修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox, ElNotification } from 'element-plus'
import { 
  Plus, Search, Document, EditPen, Calendar, Edit, View, 
  MoreFilled, Star, Download, CopyDocument, Delete, Close
} from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import apiService from '@/services/api.js'
import db from '@/services/simpleDB.js'

const router = useRouter()

// 响应式数据
const statusFilter = ref('all')
const genreFilter = ref('all')
const sortBy = ref('updated')
const searchKeyword = ref('')
const showCreateDialog = ref(false)
const showDetailsDialog = ref(false)
const showEditDialog = ref(false)
const selectedNovel = ref(null)
const editingNovel = ref(null)
const activeTab = ref('chapters')
const tagInput = ref('')
const editTagInput = ref('')
const createFormRef = ref()
const editFormRef = ref()
const editFileInput = ref()
const isGeneratingDescription = ref(false)
const isGeneratingEditDescription = ref(false)
const isSavingEdit = ref(false)

// 小说数据 - 从localStorage加载
const novels = ref([])

// 加载小说数据（使用 IndexedDB）
const loadNovels = async () => {
  try {
    console.log('📚 从 IndexedDB 加载小说数据...')
    const novelsData = await db.getAllNovels()
    
    // 为每个小说加载完整的关联数据
    for (const novel of novelsData) {
      novel.chapterList = await db.getChaptersByNovel(novel.id)
      novel.characters = await db.getCharactersByNovel(novel.id)
      novel.worldSettings = await db.getWorldSettingsByNovel(novel.id)
      novel.corpusData = await db.getCorpusByNovel(novel.id)
      novel.events = await db.getEventsByNovel(novel.id)
      
      // 统计数据
      novel.chapters = novel.chapterList?.length || 0
      novel.wordCount = novel.chapterList?.reduce((sum, ch) => sum + (ch.wordCount || 0), 0) || 0
      novel.totalWords = novel.wordCount
    }
    
    novels.value = novelsData
    console.log(`✅ 成功加载 ${novelsData.length} 部小说`)
  } catch (error) {
    console.error('❌ 从 IndexedDB 加载小说失败:', error)
    ElMessage.error('加载小说数据失败')
    novels.value = []
  }
}

// 保存单个小说（使用 IndexedDB）
const saveNovel = async (novelData) => {
  try {
    const novelId = await db.saveNovel(novelData)
    console.log('💾 小说保存成功:', novelId)
    return novelId
  } catch (error) {
    console.error('❌ 保存小说失败:', error)
    ElMessage.error('保存小说失败')
    throw error
  }
}

// 创建表单
const createForm = ref({
  title: '',
  genre: '',
  description: '',
  cover: '',
  tags: []
})

// 编辑表单
const editForm = ref({
  title: '',
  genre: '',
  status: '',
  description: '',
  cover: '',
  tags: []
})

// 动态类型预设配置 - 从localStorage读取
const genrePresets = ref({})

// 表单验证规则
const createRules = {
  title: [{ required: true, message: '请输入小说标题', trigger: 'blur' }],
  genre: [{ required: true, message: '请选择小说类型', trigger: 'change' }],
  description: [{ required: true, message: '请输入小说简介', trigger: 'blur' }]
}

const editRules = {
  title: [{ required: true, message: '请输入小说标题', trigger: 'blur' }],
  genre: [{ required: true, message: '请选择小说类型', trigger: 'change' }],
  status: [{ required: true, message: '请选择小说状态', trigger: 'change' }],
  description: [{ required: true, message: '请输入小说简介', trigger: 'blur' }]
}

// 计算属性
const filteredNovels = computed(() => {
  let result = novels.value
  
  // 状态筛选
  if (statusFilter.value !== 'all') {
    result = result.filter(novel => novel.status === statusFilter.value)
  }
  
  // 类型筛选
  if (genreFilter.value !== 'all') {
    result = result.filter(novel => novel.genre === genreFilter.value)
  }
  
  // 关键词搜索
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    result = result.filter(novel => 
      novel.title.toLowerCase().includes(keyword) ||
      novel.description.toLowerCase().includes(keyword)
    )
  }
  
  // 排序
  result.sort((a, b) => {
    switch (sortBy.value) {
      case 'updated':
        return new Date(b.updatedAt) - new Date(a.updatedAt)
      case 'created':
        return new Date(b.createdAt) - new Date(a.createdAt)
      case 'wordCount':
        return b.wordCount - a.wordCount
      case 'chapters':
        return b.chapters - a.chapters
      default:
        return 0
    }
  })
  
  return result
})

// 方法
const getStatusType = (status) => {
  const types = {
    writing: 'success',
    completed: 'info',
    paused: 'warning'
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    writing: '创作中',
    completed: '已完成',
    paused: '已暂停'
  }
  return texts[status] || '未知'
}

const getGenreDisplayName = (genreCode) => {
  return genrePresets.value[genreCode]?.name || genreCode || '未知'
}

// 加载类型数据
const loadGenres = () => {
  try {
    const saved = localStorage.getItem('novelGenres')
    if (saved) {
      const parsed = JSON.parse(saved)
      // 转换为键值对格式，兼容旧版本
      const genresObj = {}
      parsed.forEach(genre => {
        genresObj[genre.code] = {
          name: genre.name,
          tags: genre.tags,
          prompt: genre.prompt
        }
      })
      genrePresets.value = genresObj
    } else {
      // 如果没有保存的数据，加载默认类型
      loadDefaultGenres()
    }
  } catch (error) {
    console.error('加载类型数据失败:', error)
    loadDefaultGenres()
  }
}

// 加载默认类型
const loadDefaultGenres = () => {
  const defaultGenres = {
    fantasy: {
      name: '玄幻',
      tags: ['修仙', '异世界', '法宝', '灵气', '境界'],
      prompt: '创作一部玄幻小说，包含修仙体系、异世界冒险等元素，注重世界观构建和修炼体系描写。'
    },
    urban: {
      name: '都市',
      tags: ['都市', '现代', '职场', '生活'],
      prompt: '创作一部都市小说，以现代都市为背景，贴近现实生活，注重人物情感和社会现象描写。'
    },
    history: {
      name: '历史',
      tags: ['历史', '古代', '朝廷', '战争'],
      prompt: '创作一部历史小说，以真实历史为背景，注重历史考证和时代特色描写。'
    },
    scifi: {
      name: '科幻',
      tags: ['科幻', '未来', '科技', '太空'],
      prompt: '创作一部科幻小说，包含未来科技、太空探索等元素，注重科学性和想象力的平衡。'
    },
    wuxia: {
      name: '武侠',
      tags: ['武侠', '江湖', '武功', '侠义'],
      prompt: '创作一部武侠小说，以江湖为背景，注重武功描写和侠义精神体现。'
    },
    romance: {
      name: '言情',
      tags: ['言情', '爱情', '情感', '浪漫'],
      prompt: '创作一部言情小说，以爱情为主线，注重情感描写和人物关系发展。'
    }
  }
  genrePresets.value = defaultGenres
}

// 更新类型使用计数
const updateGenreUsageCount = (genreCode) => {
  try {
    const saved = localStorage.getItem('novelGenres')
    if (saved) {
      const genres = JSON.parse(saved)
      const genreIndex = genres.findIndex(g => g.code === genreCode)
      if (genreIndex > -1) {
        genres[genreIndex].usageCount = (genres[genreIndex].usageCount || 0) + 1
        localStorage.setItem('novelGenres', JSON.stringify(genres))
        console.log(`类型 ${genreCode} 使用计数更新为:`, genres[genreIndex].usageCount)
      }
    }
  } catch (error) {
    console.error('更新类型使用计数失败:', error)
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

const handleImageError = (e) => {
  // 防止无限循环加载
  if (e.target.src.includes('default-cover.jpg') || e.target.getAttribute('data-error-handled')) {
    // 如果默认图片也加载失败，显示占位符
    e.target.style.display = 'none'
    
    // 检查是否已经有占位符，避免重复创建
    const existingPlaceholder = e.target.parentNode.querySelector('.image-placeholder')
    if (!existingPlaceholder) {
      const placeholder = document.createElement('div')
      placeholder.className = 'image-placeholder'
      placeholder.innerHTML = '<i class="el-icon-picture"></i><span>暂无封面</span>'
      e.target.parentNode.appendChild(placeholder)
    }
    return
  }
  
  // 标记已经尝试过加载默认图片
  e.target.setAttribute('data-error-handled', 'true')
  e.target.src = '/default-cover.jpg'
}

const handleImageLoad = (e) => {
  // 图片加载成功，移除错误标记
  e.target.removeAttribute('data-error-handled')
  
  // 移除可能存在的占位符
  const placeholder = e.target.parentNode.querySelector('.image-placeholder')
  if (placeholder) {
    placeholder.remove()
  }
}

const openNovel = (novel) => {
  // 跳转到AI写作页面
  router.push(`/writer?novelId=${novel.id}`)
}

const manageChapters = (novel) => {
  // 跳转到章节管理页面，并传递 novelId
  router.push(`/chapters?novelId=${novel.id}`)
}

const viewNovelDetails = (novel) => {
  selectedNovel.value = novel
  showDetailsDialog.value = true
}

const exportNovel = (novel) => {
  try {
    // 简化的HTML清理函数
    const cleanHtml = (htmlString) => {
      if (!htmlString) return ''
      return htmlString
        .replace(/<br\s*\/?>/gi, '\n')  // br标签转换为换行
        .replace(/<\/p>/gi, '\n\n')     // p结束标签转换为双换行
        .replace(/<[^>]*>/g, '')        // 移除所有HTML标签
        .replace(/&nbsp;/g, ' ')        // HTML空格转换为普通空格
        .replace(/&lt;/g, '<')          // HTML实体转换
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n\s*\n\s*\n+/g, '\n\n') // 清理多余换行
        .trim()
    }
    
    // 构建导出内容
    let exportContent = `《${novel.title}》\n`
    exportContent += `${'='.repeat(50)}\n\n`
    
    // 基本信息
    exportContent += `📚 小说信息\n`
    exportContent += `标题：${novel.title}\n`
    exportContent += `作者：${novel.author || '未设置'}\n`
    exportContent += `类型：${getGenreDisplayName(novel.genre)}\n`
    exportContent += `状态：${getStatusText(novel.status)}\n`
    exportContent += `字数：${formatNumber(novel.wordCount || 0)}字\n`
    exportContent += `章节：${novel.chapters || 0}章\n`
    exportContent += `创建时间：${formatDate(novel.createdAt)}\n`
    exportContent += `更新时间：${formatDate(novel.updatedAt)}\n`
    
    if (novel.tags && novel.tags.length > 0) {
      exportContent += `标签：${novel.tags.join('、')}\n`
    }
    
    if (novel.description) {
      exportContent += `\n📖 简介\n`
      exportContent += `${cleanHtml(novel.description)}\n`
    }
    
    exportContent += `\n${'='.repeat(50)}\n\n`
    
    // 章节内容
    if (novel.chapterList && novel.chapterList.length > 0) {
      exportContent += `📝 章节内容\n\n`
      
      novel.chapterList.forEach((chapter, index) => {
        exportContent += `第${index + 1}章 ${chapter.title}\n`
        exportContent += `${'-'.repeat(30)}\n\n`
        
        if (chapter.description) {
          exportContent += `【章节简介】\n${cleanHtml(chapter.description)}\n\n`
        }
        
        if (chapter.content) {
          const cleanContent = cleanHtml(chapter.content)
          exportContent += `${cleanContent}\n\n`
        } else {
          exportContent += `（章节内容暂无）\n\n`
        }
        
        exportContent += `字数：${chapter.wordCount || 0}字\n`
        exportContent += `更新时间：${formatDate(chapter.updatedAt || chapter.createdAt)}\n\n`
        exportContent += `${'='.repeat(50)}\n\n`
      })
    } else {
      exportContent += `📝 章节内容\n\n`
      exportContent += `暂无章节内容\n\n`
    }
    
    // 统计信息
    exportContent += `📊 创作统计\n`
    exportContent += `总字数：${formatNumber(novel.totalWords || novel.wordCount || 0)}字\n`
    exportContent += `平均章节字数：${novel.avgWordsPerChapter || 0}字\n`
    exportContent += `创作天数：${novel.writingDays || 0}天\n`
    
    if (novel.writingRecords && novel.writingRecords.length > 0) {
      exportContent += `\n📝 创作记录\n`
      novel.writingRecords.forEach(record => {
        exportContent += `${formatDate(record.date)}：写作${record.wordsWritten}字，用时${record.timeSpent}分钟\n`
        if (record.note) {
          exportContent += `备注：${cleanHtml(record.note)}\n`
        }
      })
    }
    
    exportContent += `\n\n导出时间：${new Date().toLocaleString()}\n`
    exportContent += `导出来源：AI小说生成器v0.5.0\n`
    
    // 创建并下载文件
    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // 文件名处理
    const safeTitle = novel.title.replace(/[<>:"/\\|?*]/g, '_')
    link.download = `${safeTitle}_${new Date().toISOString().slice(0, 10)}.txt`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success(`《${novel.title}》导出成功！`)
    
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

// 批量导出所有小说
const exportAllNovels = () => {
  try {
    if (filteredNovels.value.length === 0) {
      ElMessage.warning('没有可导出的小说')
      return
    }
    
    // 简化的HTML清理函数
    const cleanHtml = (htmlString) => {
      if (!htmlString) return ''
      return htmlString
        .replace(/<br\s*\/?>/gi, '\n')  // br标签转换为换行
        .replace(/<\/p>/gi, '\n\n')     // p结束标签转换为双换行
        .replace(/<[^>]*>/g, '')        // 移除所有HTML标签
        .replace(/&nbsp;/g, ' ')        // HTML空格转换为普通空格
        .replace(/&lt;/g, '<')          // HTML实体转换
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\n\s*\n\s*\n+/g, '\n\n') // 清理多余换行
        .trim()
    }
    
    // 构建导出内容
    let exportContent = `📚 小说列表导出\n`
    exportContent += `${'='.repeat(60)}\n\n`
    exportContent += `导出时间：${new Date().toLocaleString()}\n`
    exportContent += `小说数量：${filteredNovels.value.length}部\n`
    exportContent += `导出来源：AI小说生成器v0.5.0\n\n`
    exportContent += `${'='.repeat(60)}\n\n`
    
    filteredNovels.value.forEach((novel, index) => {
      exportContent += `【第${index + 1}部】《${novel.title}》\n`
      exportContent += `${'='.repeat(50)}\n\n`
      
      // 基本信息
      exportContent += `📚 小说信息\n`
      exportContent += `标题：${novel.title}\n`
      exportContent += `作者：${novel.author || '未设置'}\n`
      exportContent += `类型：${getGenreDisplayName(novel.genre)}\n`
      exportContent += `状态：${getStatusText(novel.status)}\n`
      exportContent += `字数：${formatNumber(novel.wordCount || 0)}字\n`
      exportContent += `章节：${novel.chapters || 0}章\n`
      exportContent += `创建时间：${formatDate(novel.createdAt)}\n`
      exportContent += `更新时间：${formatDate(novel.updatedAt)}\n`
      
      if (novel.tags && novel.tags.length > 0) {
        exportContent += `标签：${novel.tags.join('、')}\n`
      }
      
      if (novel.description) {
        exportContent += `\n📖 简介\n`
        exportContent += `${cleanHtml(novel.description)}\n`
      }
      
      exportContent += `\n${'='.repeat(50)}\n\n`
      
      // 章节概要
      if (novel.chapterList && novel.chapterList.length > 0) {
        exportContent += `📝 章节概要\n`
        novel.chapterList.forEach((chapter, chapterIndex) => {
          exportContent += `第${chapterIndex + 1}章 ${chapter.title}`
          if (chapter.wordCount) {
            exportContent += ` (${chapter.wordCount}字)`
          }
          exportContent += `\n`
          if (chapter.description) {
            exportContent += `  简介：${cleanHtml(chapter.description)}\n`
          }
        })
        exportContent += `\n`
      } else {
        exportContent += `📝 章节概要\n`
        exportContent += `暂无章节内容\n\n`
      }
      
      // 统计信息
      exportContent += `📊 创作统计\n`
      exportContent += `总字数：${formatNumber(novel.totalWords || novel.wordCount || 0)}字\n`
      exportContent += `平均章节字数：${novel.avgWordsPerChapter || 0}字\n`
      exportContent += `创作天数：${novel.writingDays || 0}天\n\n`
      
      // 分隔符
      if (index < filteredNovels.value.length - 1) {
        exportContent += `\n${'#'.repeat(60)}\n\n`
      }
    })
    
    exportContent += `\n\n${'='.repeat(60)}\n`
    exportContent += `导出完成！共导出 ${filteredNovels.value.length} 部小说\n`
    exportContent += `感谢使用 AI小说生成器v0.5.0\n`
    
    // 创建并下载文件
    const blob = new Blob([exportContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // 生成文件名
    const dateStr = new Date().toISOString().slice(0, 10)
    const statusText = statusFilter.value === 'all' ? '全部' : getStatusText(statusFilter.value)
    const genreText = genreFilter.value === 'all' ? '全部类型' : (genrePresets.value[genreFilter.value]?.name || '未知类型')
    
    link.download = `小说列表_${statusText}_${genreText}_${dateStr}.txt`
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success(`成功导出 ${filteredNovels.value.length} 部小说！`)
    
  } catch (error) {
    console.error('批量导出失败:', error)
    ElMessage.error('批量导出失败，请重试')
  }
}

const duplicateNovel = (novel) => {
  const newNovel = {
    ...novel,
    id: Date.now(),
    title: novel.title + ' (副本)',
    createdAt: new Date(),
    updatedAt: new Date()
  }
  novels.value.push(newNovel)
  // 保存到localStorage
  saveNovels()
  ElMessage.success('小说复制成功')
}

const deleteNovel = async (novel) => {
  try {
    await ElMessageBox.confirm(`确定要删除《${novel.title}》吗？此操作不可恢复。`, '确认删除', {
      type: 'warning'
    })
    
    // 从 IndexedDB 删除
    await db.deleteNovel(novel.id)
    
    // 从本地列表移除
    const index = novels.value.findIndex(n => n.id === novel.id)
    if (index > -1) {
      novels.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  } catch (error) {
    if (error.message) {
      ElMessage.error('删除失败: ' + error.message)
    }
    // 用户取消删除或其他错误
  }
}

const addTag = () => {
  const input = tagInput.value.trim()
  if (!input) return
  
  // 支持多种分隔符：逗号、分号、空格、中文逗号、中文分号
  const separators = /[,，;；\s]+/
  const newTags = input.split(separators)
    .map(tag => tag.trim())
    .filter(tag => tag && !createForm.value.tags.includes(tag))
  
  if (newTags.length > 0) {
    createForm.value.tags.push(...newTags)
    tagInput.value = ''
    
    if (newTags.length > 1) {
      ElMessage.success(`已添加 ${newTags.length} 个标签：${newTags.join('、')}`)
    }
  } else {
    ElMessage.warning('标签已存在或输入为空')
  }
}

const removeTag = (index) => {
  createForm.value.tags.splice(index, 1)
}

const fileInput = ref()

const triggerFileInput = () => {
  console.log('触发文件选择器')
  fileInput.value?.click()
}

const handleNativeFileChange = (event) => {
  const file = event.target.files[0]
  console.log('原生文件选择事件触发:', file)
  
  if (!file) {
    console.log('没有选择文件')
    return
  }
  
  console.log('文件信息:', {
    name: file.name,
    type: file.type,
    size: file.size
  })
  
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('只能上传图片文件!')
    console.log('文件类型验证失败:', file.type)
    return
  }
  
  // 验证文件大小（2MB）
  if (file.size / 1024 / 1024 > 2) {
    ElMessage.error('图片大小不能超过 2MB!')
    console.log('文件大小验证失败:', (file.size / 1024 / 1024).toFixed(2) + 'MB')
    return
  }
  
  console.log('开始读取文件为base64...')
  
  // 转换为base64格式保存
  const reader = new FileReader()
  reader.onload = (e) => {
    console.log('FileReader读取成功')
    createForm.value.cover = e.target.result // base64字符串
    ElMessage.success('封面上传成功!')
    console.log('封面base64长度:', e.target.result.length)
    console.log('封面已保存到createForm.cover')
    
    // 清空input的值，这样可以重复选择同一个文件
    event.target.value = ''
  }
  reader.onerror = (e) => {
    console.error('FileReader读取失败:', e)
    ElMessage.error('封面读取失败，请重试')
  }
  
  // 读取文件为base64
  reader.readAsDataURL(file)
}

const handleCoverSuccess = (response, file) => {
  // 这个函数现在不会被调用，因为我们阻止了默认上传
  // 但保留以备后续扩展
}

const removeCover = () => {
  createForm.value.cover = ''
  ElMessage.success('封面已移除')
}

const createNovel = async () => {
  try {
    await createFormRef.value.validate()
    
    // 确保所有数据都是可序列化的
    const newNovel = {
      title: createForm.value.title || '',
      genre: createForm.value.genre || '',
      description: createForm.value.description || '',
      cover: createForm.value.cover || '',
      tags: Array.isArray(createForm.value.tags) ? [...createForm.value.tags] : [],
      status: 'writing',
      chapters: 0,
      wordCount: 0,
      totalWords: 0,
      avgWordsPerChapter: 0,
      writingDays: 0,
      chapterList: [],
      writingRecords: [],
      genrePrompt: genrePresets.value[createForm.value.genre]?.prompt || '',
      // 确保关联数据都是简单数组
      characters: [],
      worldSettings: [],
      corpusData: [],
      events: []
    }
    
    console.log('准备保存的小说数据:', newNovel)
    
    // 保存到 IndexedDB
    const novelId = await saveNovel(newNovel)
    newNovel.id = novelId
    
    // 添加到本地列表
    novels.value.unshift(newNovel)
    
    // 更新类型使用计数
    updateGenreUsageCount(createForm.value.genre)
    
    ElMessage.success('小说创建成功！即将跳转到编辑区...')
    showCreateDialog.value = false
    resetCreateForm()
    
    // 创建成功后跳转到编辑页面
    setTimeout(() => {
      router.push(`/writer?novelId=${novelId}`)
    }, 1000)
  } catch (error) {
    console.error('创建小说失败:', error)
    ElMessage.error('创建小说失败: ' + error.message)
  }
}

// 监听类型选择，自动填充标签
const onGenreChange = (genre) => {
  if (genrePresets.value[genre]) {
    createForm.value.tags = [...genrePresets.value[genre].tags]
  }
}

const resetCreateForm = () => {
  createForm.value = {
    title: '',
    genre: '',
    description: '',
    cover: '',
    tags: []
  }
  tagInput.value = ''
}

// 编辑小说信息
const editNovelInfo = (novel) => {
  editingNovel.value = novel
  editForm.value = {
    title: novel.title,
    genre: novel.genre,
    status: novel.status,
    description: novel.description,
    cover: novel.cover || '',
    tags: [...(novel.tags || [])]
  }
  showEditDialog.value = true
}

// 重置编辑表单
const resetEditForm = () => {
  editForm.value = {
    title: '',
    genre: '',
    status: '',
    description: '',
    cover: '',
    tags: []
  }
  editTagInput.value = ''
  editingNovel.value = null
  editFormRef.value?.clearValidate()
}

// 编辑表单的类型变化处理
const onEditGenreChange = (genre) => {
  // 可以选择是否自动更新标签，这里不自动更新，让用户手动调整
}

// 添加编辑标签
const addEditTag = () => {
  const input = editTagInput.value.trim()
  if (!input) return
  
  // 支持多种分隔符：逗号、分号、空格、中文逗号、中文分号
  const separators = /[,，;；\s]+/
  const newTags = input.split(separators)
    .map(tag => tag.trim())
    .filter(tag => tag && !editForm.value.tags.includes(tag))
  
  if (newTags.length > 0) {
    editForm.value.tags.push(...newTags)
    editTagInput.value = ''
    
    if (newTags.length > 1) {
      ElMessage.success(`已添加 ${newTags.length} 个标签：${newTags.join('、')}`)
    }
  } else {
    ElMessage.warning('标签已存在或输入为空')
  }
}

// 移除编辑标签
const removeEditTag = (index) => {
  editForm.value.tags.splice(index, 1)
}

// 触发编辑文件选择
const triggerEditFileInput = () => {
  editFileInput.value?.click()
}

// 处理编辑文件变化
const handleEditFileChange = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('只能上传图片文件!')
    return
  }
  
  // 验证文件大小（2MB）
  if (file.size / 1024 / 1024 > 2) {
    ElMessage.error('图片大小不能超过 2MB!')
    return
  }
  
  // 读取文件为base64
  const reader = new FileReader()
  reader.onload = (e) => {
    editForm.value.cover = e.target.result
    ElMessage.success('封面上传成功')
  }
  reader.onerror = () => {
    ElMessage.error('文件读取失败')
  }
  reader.readAsDataURL(file)
}

// 移除编辑封面
const removeEditCover = () => {
  editForm.value.cover = ''
  // 清除文件输入框的值
  if (editFileInput.value) {
    editFileInput.value.value = ''
  }
}

// 生成编辑简介
const generateEditDescription = async () => {
  if (!editForm.value.title?.trim()) {
    ElMessage.warning('请先填写小说标题')
    return
  }
  
  if (!editForm.value.genre) {
    ElMessage.warning('请先选择小说类型')
    return
  }

  isGeneratingEditDescription.value = true
  try {
    const title = editForm.value.title.trim()
    const genreInfo = genrePresets.value[editForm.value.genre]
    
    // 构建AI提示词
    const prompt = `请为小说《${title}》重新生成一段简介。

小说信息：
- 标题：${title}
- 类型：${genreInfo.name}
- 标签：${genreInfo.tags.join('、')}

要求：
1. 简介长度控制在100-200字之间
2. 突出${genreInfo.name}类型的特色
3. 包含主角、背景设定、核心冲突等元素
4. 语言要吸引人，能激发读者的阅读兴趣
5. 风格要符合${genreInfo.name}小说的特点

请直接输出简介内容，不要包含其他解释文字：`

    // 调用AI API流式生成简介
    const generatedDescription = await apiService.generateTextStream(prompt, {
      maxTokens: null, // 移除token限制
      temperature: 0.8,
      type: 'synopsis'
    }, (chunk, fullContent) => {
      // 实时更新简介内容
      console.log('编辑简介生成流式回调 - chunk:', chunk, 'fullContent长度:', fullContent.length)
      editForm.value.description = fullContent
    })
    
    if (generatedDescription && generatedDescription.trim()) {
      // 流式调用已经在回调中更新了内容，这里只需要显示成功消息
      ElMessage.success('AI简介生成成功！您可以根据需要进行修改')
    } else {
      throw new Error('AI返回的内容为空')
    }
    
  } catch (error) {
    console.error('AI生成简介失败:', error)
    ElMessage.error('AI生成失败，请手动修改简介')
  } finally {
    isGeneratingEditDescription.value = false
  }
}

// 保存小说信息修改
const updateNovelInfo = async () => {
  try {
    await editFormRef.value.validate()
    isSavingEdit.value = true
    
    const index = novels.value.findIndex(n => n.id === editingNovel.value.id)
    if (index > -1) {
      // 更新小说信息
      novels.value[index] = {
        ...novels.value[index],
        title: editForm.value.title,
        genre: editForm.value.genre,
        status: editForm.value.status,
        description: editForm.value.description,
        cover: editForm.value.cover,
        tags: editForm.value.tags,
        updatedAt: new Date()
      }
      
      // 更新类型使用计数（如果类型发生变化）
      if (editingNovel.value.genre !== editForm.value.genre) {
        updateGenreUsageCount(editForm.value.genre)
      }
      
      // 保存到localStorage
      saveNovels()
      
      ElMessage.success('小说信息更新成功')
      showEditDialog.value = false
      resetEditForm()
      
      // 如果当前正在查看详情，更新详情显示
      if (selectedNovel.value && selectedNovel.value.id === editingNovel.value.id) {
        selectedNovel.value = novels.value[index]
      }
    }
  } catch (error) {
    console.error('保存小说信息失败:', error)
  } finally {
    isSavingEdit.value = false
  }
}

const editChapter = (chapter) => {
  ElMessage.info('跳转到章节编辑页面')
}

const generateDescription = async () => {
  if (!createForm.value.title?.trim()) {
    ElMessage.warning('请先填写小说标题')
    return
  }
  
  if (!createForm.value.genre) {
    ElMessage.warning('请先选择小说类型')
    return
  }

  isGeneratingDescription.value = true
  try {
    const title = createForm.value.title.trim()
    const genreInfo = genrePresets.value[createForm.value.genre]
    
    // 构建AI提示词
    const prompt = `请为小说《${title}》生成一段简介。

小说信息：
- 标题：${title}
- 类型：${genreInfo.name}
- 标签：${genreInfo.tags.join('、')}

要求：
1. 简介长度控制在100-200字之间
2. 突出${genreInfo.name}类型的特色
3. 包含主角、背景设定、核心冲突等元素
4. 语言要吸引人，能激发读者的阅读兴趣
5. 风格要符合${genreInfo.name}小说的特点

请直接输出简介内容，不要包含其他解释文字：`

    console.log('开始AI生成简介，提示词:', prompt)
    
    // 调用AI API流式生成简介
    const generatedDescription = await apiService.generateTextStream(prompt, {
      maxTokens: null, // 移除token限制
      temperature: 0.8,
      type: 'synopsis'
    }, (chunk, fullContent) => {
      // 实时更新简介内容
      console.log('简介生成流式回调 - chunk:', chunk, 'fullContent长度:', fullContent.length)
      createForm.value.description = fullContent
    })
    
    if (generatedDescription && generatedDescription.trim()) {
      // 流式调用已经在回调中更新了内容，这里只需要显示成功消息
      ElMessage.success('AI简介生成成功！您可以根据需要进行修改')
    } else {
      throw new Error('AI返回的内容为空')
    }
    
  } catch (error) {
    console.error('AI生成简介失败:', error)
    
    // 根据错误类型提供不同的提示
    let errorMessage = 'AI生成失败'
    if (error.message.includes('API请求失败') || error.message.includes('API Key')) {
      errorMessage = 'AI服务暂时不可用'
    } else if (error.message.includes('网络')) {
      errorMessage = '网络连接失败'
    } else {
      errorMessage = 'AI生成遇到问题'
    }
    
    // 提供备选的模板生成
    ElMessageBox.confirm(
      `${errorMessage}，是否使用本地智能模板生成简介？模板会根据您的标题和类型智能匹配。`, 
      '生成选项', 
      {
        confirmButtonText: '使用智能模板',
        cancelButtonText: '手动填写',
        type: 'info'
      }
    ).then(() => {
      generateDescriptionFromTemplate()
    }).catch(() => {
      // 用户选择手动填写
      ElMessage.info('您可以手动填写简介，或稍后重试AI生成')
    })
    
  } finally {
    isGeneratingDescription.value = false
  }
}

// 备选方案：使用本地模板生成简介
const generateDescriptionFromTemplate = () => {
  const title = createForm.value.title.trim()
  const genreInfo = genrePresets.value[createForm.value.genre]
  
  // 基于类型生成不同风格的简介模板
  const templates = {
    fantasy: [
      `${title}讲述了一个关于修仙与成长的传奇故事。在这个充满灵气与法宝的异世界中，主角将经历重重考验，突破境界桎梏，最终踏上巅峰之路。书中包含丰富的修炼体系、激烈的战斗场面，以及深刻的人性探索。`,
      `这是一部以${title}为名的玄幻巨作。故事背景设定在一个神秘的异世界，那里有着独特的修炼文明和强者为尊的法则。主角将在这个世界中历经磨难，收获友情、爱情与成长，书写属于自己的传奇。`,
      `${title}是一个关于勇气与梦想的修仙传说。在这个弱肉强食的修真世界里，主角凭借坚韧不拔的意志和独特的机缘，从一个普通人逐步成长为绝世强者，期间经历的种种冒险与情感纠葛构成了这部作品的精彩内核。`
    ],
    urban: [
      `${title}是一部现代都市题材的力作，以当代社会为背景，描绘了主角在商场、职场、情场中的精彩人生。故事情节紧贴现实，人物形象鲜活生动，展现了现代都市生活的方方面面。`,
      `这是一个发生在繁华都市中的现代传奇。${title}以独特的视角展现了都市精英的奋斗历程，包含商战智慧、情感纠葛和人生感悟，是一部贴近现实又富有戏剧性的精彩作品。`,
      `${title}讲述了在这个快节奏的现代社会中，主角如何在激烈的竞争中脱颖而出的故事。作品融合了职场智慧、情感描写和社会现象的深度思考，展现了都市生活的真实面貌。`
    ],
    history: [
      `${title}是一部恢弘的历史小说，以真实的历史背景为依托，通过主角的经历展现了那个时代的风云变幻。作品注重历史考证，人物刻画深入，战争场面宏大，是一部兼具文学价值和历史价值的佳作。`,
      `这是一个波澜壮阔的历史传奇。${title}以某个重要历史时期为背景，通过主角的视角展现了朝堂政治、军事战争、民间疾苦等多个层面，构建了一个真实而引人入胜的历史画卷。`,
      `${title}将读者带入了一个充满传奇色彩的历史年代。在那个英雄辈出的时代，主角将经历政治斗争、军事征战、文化碰撞，见证历史的变迁，书写属于自己的历史篇章。`
    ],
    scifi: [
      `${title}是一部想象力丰富的科幻作品，设定在遥远的未来或广袤的宇宙中。故事融合了先进的科技概念、深刻的哲学思考和紧张刺激的冒险情节，展现了人类文明的无限可能。`,
      `这是一个关于未来与科技的宏大叙事。${title}通过主角在星际时代的经历，探讨了科技发展、人性本质、文明演进等深刻主题，是一部兼具娱乐性和思想性的科幻佳作。`,
      `${title}将读者带入了一个充满科技奇迹的未来世界。在这里，人工智能、星际航行、时空穿越等概念成为现实，主角将在这个充满无限可能的宇宙中展开史诗般的冒险。`
    ],
    wuxia: [
      `${title}是一部经典的武侠小说，承载着深厚的江湖文化和武学传统。故事中有着精彩的武功描写、复杂的江湖恩怨、深刻的侠义精神，展现了一个充满豪情与柔情的武林世界。`,
      `这是一个侠骨柔情的江湖传说。${title}以武林为背景，通过主角的成长历程展现了江湖的险恶与温情、武学的精深与传承、侠客的义气与情怀，是一部充满武侠韵味的精彩作品。`,
      `${title}讲述了一个关于武功、情义与正邪的江湖故事。在这个刀光剑影的武林中，主角将学习绝世武功，结交生死兄弟，经历爱恨情仇，最终明悟侠道真谛。`
    ],
    romance: [
      `${title}是一部温馨动人的言情小说，以细腻的笔触描绘了主角们的情感世界。故事情节跌宕起伏，人物情感真挚动人，展现了爱情的美好与复杂，是一部能够触动读者心灵的佳作。`,
      `这是一个关于爱情与成长的美丽故事。${title}通过主角们的相遇、相知、相爱的过程，展现了现代人的情感困惑与追求，用温暖的文字编织了一段动人的爱情童话。`,
      `${title}以爱情为主线，讲述了一段刻骨铭心的情感故事。作品中有欢声笑语，也有离别眼泪，有甜蜜温馨，也有误会波折，最终传达出关于爱情、成长和人生的深刻感悟。`
    ]
  }
  
  // 随机选择一个模板
  const genreTemplates = templates[createForm.value.genre] || templates.fantasy
  const randomTemplate = genreTemplates[Math.floor(Math.random() * genreTemplates.length)]
  
  createForm.value.description = randomTemplate
  ElMessage.success('使用本地模板生成简介成功！')
}

// 生命周期
onMounted(async () => {
  try {
    // 加载类型数据
    loadGenres()
    
    // 异步加载小说数据
    await loadNovels()
  } catch (error) {
    console.error('初始化失败:', error)
    ElMessage.error('应用初始化失败')
  }
})
</script>

<style scoped>
.novel-management {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.header-content h1 {
  margin: 0 0 5px 0;
  font-size: 24px;
  color: #303133;
}

.header-content p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.filter-left {
  display: flex;
  gap: 15px;
}

.novels-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.novel-card {
  height: 100%;
}

.novel-item {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.novel-item :deep(.el-card__body) {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.novel-cover {
  position: relative;
  height: 200px;
  overflow: hidden;
  border-radius: 8px 8px 0 0;
}

.novel-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.novel-status {
  position: absolute;
  top: 10px;
  right: 10px;
}

.novel-info {
  flex: 1;
  padding: 15px;
}

.novel-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1.4;
}

.novel-description {
  margin: 0 0 15px 0;
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.novel-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  margin-bottom: 10px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-size: 12px;
}

.novel-genre {
  margin-bottom: 15px;
}

.novel-actions {
  display: flex;
  gap: 8px;
  padding: 0 15px 15px;
  margin-top: auto;
}

.empty-state {
  padding: 60px 0;
}

.cover-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 120px;
  height: 160px;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-uploader:hover {
  border-color: #409eff;
  background-color: #f8f9fa;
}

.cover-uploader-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  text-align: center;
}

.cover-uploader-icon {
  font-size: 24px;
  color: #8c939d;
  margin-bottom: 8px;
}

.upload-text {
  font-size: 12px;
  color: #8c939d;
  line-height: 1.2;
}

.cover-preview {
  width: 120px;
  height: 160px;
  object-fit: cover;
  display: block;
  border-radius: 6px;
}

.cover-upload-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.cover-actions {
  display: flex;
  gap: 8px;
}

.tags-display {
  margin-top: 10px;
}

.tags-display .el-tag {
  margin: 2px 4px 2px 0;
}

.description-input-group {
  position: relative;
}

.ai-generate-section {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
}

.generate-tip {
  font-size: 12px;
  color: #6c757d;
}

.novel-details {
  max-height: 600px;
  overflow-y: auto;
}

.details-header {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #ebeef5;
}

.details-cover {
  flex-shrink: 0;
}

.details-cover img {
  width: 120px;
  height: 160px;
  object-fit: cover;
  border-radius: 6px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.details-info {
  flex: 1;
}

.details-info h2 {
  margin: 0 0 10px 0;
  color: #303133;
}

.details-description {
  margin: 0 0 15px 0;
  color: #606266;
  line-height: 1.6;
}

.details-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.meta-label {
  font-weight: 500;
  color: #303133;
  min-width: 80px;
}

.chapters-list {
  max-height: 300px;
  overflow-y: auto;
}

.chapter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.chapter-info h4 {
  margin: 0 0 5px 0;
  font-size: 14px;
  color: #303133;
}

.chapter-info p {
  margin: 0;
  font-size: 12px;
  color: #909399;
}

.writing-records {
  max-height: 300px;
  overflow-y: auto;
}

.record-item {
  display: flex;
  gap: 15px;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.record-date {
  flex-shrink: 0;
  font-size: 12px;
  color: #909399;
  min-width: 80px;
}

.record-content {
  flex: 1;
}

.record-stats {
  display: flex;
  gap: 15px;
  font-size: 13px;
  color: #606266;
  margin-bottom: 5px;
}

.record-note {
  font-size: 12px;
  color: #909399;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 20px;
}

.stat-item {
  text-align: center;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #409eff;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  font-size: 12px;
}

.image-placeholder i {
  font-size: 24px;
  margin-bottom: 8px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .filter-content {
    flex-direction: column;
    gap: 15px;
  }
  
  .filter-left {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .novels-grid {
    grid-template-columns: 1fr;
  }
  
  .details-header {
    flex-direction: column;
    text-align: center;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>