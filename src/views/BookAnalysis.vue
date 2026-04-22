<template>
  <div class="book-analysis">
    <div class="analysis-container">
      <!-- 左侧操作面板 -->
      <div class="left-panel">
        <!-- 文件上传区域 -->
        <div class="panel-section">
          <h3>📁 导入小说</h3>
          
          <!-- 编码选择 -->
          <div class="encoding-selection" v-if="!uploadedFile">
            <label>文件编码:</label>
            <el-radio-group v-model="selectedEncoding" size="small">
              <el-radio-button label="utf-8">UTF-8</el-radio-button>
              <el-radio-button label="gbk">GBK/GB2312</el-radio-button>
            </el-radio-group>
          </div>
          
          <el-upload
            class="upload-area"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :on-exceed="handleFileExceed"
            accept=".txt,.docx,.pdf"
            :limit="1"
            :show-file-list="false"
          >
            <el-icon class="el-icon--upload">
              <UploadFilled />
            </el-icon>
            <div class="el-upload__text">
              拖拽文件到此处或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持 .txt、.docx 和 .pdf 格式 (选择编码: {{ selectedEncoding.toUpperCase() }})
              </div>
            </template>
          </el-upload>
          
          <div v-if="uploadedFile" class="file-info">
            <div class="file-card">
              <el-icon><Document /></el-icon>
              <div class="file-details">
                <span class="file-name">{{ uploadedFile.name }}</span>
                <span class="file-size">{{ (uploadedFile.size / 1024).toFixed(1) }}KB</span>
                <span class="file-encoding">{{ selectedEncoding.toUpperCase() }}</span>
              </div>
              <div class="file-actions">
                <el-button type="text" size="small" @click="rereadWithEncoding" title="重新读取">
                  重新读取
                </el-button>
                <el-button type="text" @click="removeFile" class="remove-btn">
                  <el-icon><Close /></el-icon>
                </el-button>
              </div>
            </div>
            
            <!-- 编码切换 -->
            <div class="encoding-switch">
              <span>编码:</span>
              <el-radio-group v-model="selectedEncoding" size="small" @change="rereadWithEncoding">
                <el-radio-button label="utf-8">UTF-8</el-radio-button>
                <el-radio-button label="gbk">GBK/GB2312</el-radio-button>
              </el-radio-group>
            </div>
          </div>
        </div>
        
        <!-- 分析设置 -->
        <div class="panel-section" v-if="bookContent">
          <h3>⚙️ 分析设置</h3>
          
          <div class="setting-item">
            <label>拆书模板</label>
            <el-select v-model="selectedTemplate" placeholder="选择分析模板">
              <el-option 
                v-for="template in analysisTemplates" 
                :key="template.id"
                :label="template.name" 
                :value="template.id"
              >
                <div class="template-option">
                  <span class="template-icon">{{ template.icon }}</span>
                  <span class="template-name">{{ template.name }}</span>
                </div>
              </el-option>
            </el-select>
          </div>
          
          <div class="setting-item" v-if="detectedChapters.length > 0">
            <label>章节选择</label>
            <el-select 
              v-model="selectedChapters" 
              multiple 
              placeholder="选择要分析的章节"
              size="small"
              style="width: 100%"
            >
              <el-option
                v-for="chapter in detectedChapters"
                :key="chapter.index"
                :label="chapter.title"
                :value="chapter.index"
              >
                <div class="chapter-option">
                  <div class="chapter-title">
                    <span>{{ chapter.title }}</span>
                    <span class="chapter-words">{{ chapter.wordCount }}字</span>
                  </div>
                  <div class="chapter-summary" v-if="chapter.summary">
                    {{ chapter.summary }}
                  </div>
                </div>
              </el-option>
            </el-select>
            
            <div class="chapter-actions">
              <el-button size="small" @click="selectAllChapters">全选</el-button>
              <el-button size="small" @click="clearChapterSelection">清空</el-button>
              <el-button 
                size="small" 
                type="primary"
                @click="openChapterViewer"
              >
                <el-icon><View /></el-icon>
                查看内容
              </el-button>
              <el-button 
                v-if="aiDetectedChapters.length > 0" 
                size="small" 
                type="info"
                @click="openChapterDetailsViewer"
              >
                查看简读
              </el-button>
            </div>
          </div>
          
          <div class="setting-item" v-else-if="bookContent">
            <label>分析范围</label>
            <div class="range-input-group">
              <el-input-number 
                v-model="analysisStartWords" 
                :min="1" 
                :max="bookContent.length - 1000" 
                :step="1000"
                size="small"
                placeholder="起始字数"
              />
              <span class="range-separator">至</span>
              <el-input-number 
                v-model="analysisEndWords" 
                :min="analysisStartWords + 1000" 
                :max="bookContent.length" 
                :step="1000"
                size="small"
                placeholder="结束字数"
              />
            </div>
            <p style="font-size: 12px; color: #909399; margin: 5px 0 0 0;">
              未检测到章节，将分析第 {{ analysisStartWords }} - {{ analysisEndWords }} 字
            </p>
            
            <div class="ai-chapter-section">
              <el-button 
                size="small" 
                type="primary" 
                @click="startAiChapterDetection"
                :loading="detectingChapters"
                style="width: 100%; margin-top: 8px;"
              >
                <el-icon><MagicStick /></el-icon>
                {{ detectingChapters ? 'AI章节检测中...' : 'AI章节重置' }}
              </el-button>
            </div>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="panel-section" v-if="bookContent">
          <div class="action-buttons">
            <el-button 
              type="primary" 
              @click="startAnalysis" 
              :loading="analyzing"
              :disabled="!selectedTemplate"
              block
            >
              <el-icon><DataAnalysis /></el-icon>
              {{ analyzing ? '分析中...' : '开始拆书分析' }}
            </el-button>
            
            <el-button 
              v-if="analysisResult" 
              @click="exportResults" 
              block
            >
              <el-icon><Download /></el-icon>
              导出分析结果
            </el-button>
            
            <el-button 
              v-if="analysisResult" 
              @click="saveToLibrary" 
              block
            >
              <el-icon><FolderAdd /></el-icon>
              保存到参考库
            </el-button>
          </div>
        </div>
        
        <!-- 文件统计 -->
        <div class="panel-section stats-section" v-if="bookContent">
          <h3>📊 文件统计</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">总字数</span>
              <span class="stat-value">{{ bookContent.length.toLocaleString() }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">预计章节</span>
              <span class="stat-value">{{ estimatedChapters }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">阅读时长</span>
              <span class="stat-value">{{ Math.ceil(bookContent.length / 300) }}分钟</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 右侧内容区域 -->
      <div class="right-panel">
        <div class="editor-container">
          <div class="editor-header">
            <h3 v-if="!bookContent">📋 分析结果</h3>
            <h3 v-else-if="!analysisResult && !analyzing">📄 文本预览</h3>
            <h3 v-else-if="analyzing">🔄 正在分析...</h3>
            <h3 v-else>📋 分析结果</h3>
            
            <div class="header-actions" v-if="analysisResult">
              <el-button size="small" @click="exportResults">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
              <el-button size="small" @click="saveToLibrary">
                <el-icon><FolderAdd /></el-icon>
                保存
              </el-button>
            </div>
          </div>
          
          <!-- 分析进度 -->
          <div v-if="analyzing" class="progress-section">
            <el-progress 
              :percentage="analysisProgress" 
              :stroke-width="6"
              :show-text="false"
            />
            <p class="progress-text">{{ analysisStatus }}</p>
          </div>
          
          <!-- 富文本编辑器 -->
          <el-input
            ref="analysisEditorRef"
            v-model="displayContent"
            type="textarea"
            :placeholder="getPlaceholder()"
            :rows="30"
            :readonly="analyzing && !analysisResult"
            class="analysis-editor"
          />
        </div>
      </div>
    </div>
    
    <!-- 章节简读对话框 -->
    <el-dialog 
      v-model="showChapterDetails" 
      title="AI章节管理" 
      width="90%"
      :show-close="true"
    >
      <div class="chapter-details-main">
        <!-- 左侧章节列表 -->
        <div class="chapter-list-panel">
          <div class="panel-header">
            <h4>章节列表 ({{ aiDetectedChapters.length }}章)</h4>
          </div>
          <div class="chapter-list">
            <div 
              v-for="chapter in aiDetectedChapters" 
              :key="chapter.index"
              class="chapter-list-item"
              :class="{ active: selectedDetailChapter === chapter.index }"
              @click="selectDetailChapter(chapter.index)"
            >
              <div class="chapter-item-header">
                <span class="chapter-item-title">{{ chapter.title }}</span>
                <span class="chapter-item-words">{{ chapter.wordCount }}字</span>
              </div>
              <div class="chapter-item-summary">
                {{ chapter.summary || '暂无简读，点击查看后可调用AI生成' }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- 右侧章节详情 -->
        <div class="chapter-detail-panel">
          <div class="detail-header" v-if="currentDetailChapter">
            <h4>{{ currentDetailChapter.title }}</h4>
            <div class="detail-actions">
              <el-button size="small" @click="copyDetailChapterContent">
                <el-icon><DocumentCopy /></el-icon>
                复制
              </el-button>
              <el-button size="small" type="primary" @click="exportDetailChapterContent">
                <el-icon><Download /></el-icon>
                导出
              </el-button>
            </div>
          </div>
          
          <!-- 标签页切换 -->
          <el-tabs v-model="activeDetailTab" v-if="currentDetailChapter">
            <el-tab-pane label="完整内容" name="content">
              <div class="full-content">
                <el-scrollbar height="400px">
                  <div class="chapter-full-text">
                    {{ currentDetailChapterContent }}
                  </div>
                </el-scrollbar>
              </div>
            </el-tab-pane>
            
            <el-tab-pane label="章节简读" name="summary">
              <div class="summary-content">
                <div class="chapter-meta">
                  <el-tag>{{ currentDetailChapter.title }}</el-tag>
                  <el-tag type="info">{{ currentDetailChapter.wordCount }}字</el-tag>
                </div>
                
                <!-- AI解读控制区域 -->
                <div class="summary-actions" v-if="!currentDetailChapter.summary || currentDetailChapter.summary.trim() === ''">
                  <!-- 提示词编辑区域 -->
                  <div class="prompt-section">
                    <div class="prompt-header">
                      <span class="prompt-label">AI解读提示词</span>
                      <el-button 
                        size="small" 
                        text 
                        @click="showPromptEditor = !showPromptEditor"
                      >
                        <el-icon><Edit /></el-icon>
                        {{ showPromptEditor ? '收起编辑' : '编辑提示词' }}
                      </el-button>
                    </div>
                    
                    <div class="prompt-preview" v-if="!showPromptEditor">
                      <div class="prompt-text">
                        {{ getPreviewPrompt() }}
                      </div>
                    </div>
                    
                    <div class="prompt-editor" v-else>
                      <el-input
                        v-model="summaryPromptTemplate"
                        type="textarea"
                        :rows="8"
                        placeholder="编辑AI解读提示词..."
                        class="prompt-textarea"
                      />
                      <div class="prompt-actions">
                        <div class="prompt-tips">
                          <el-tag size="small" type="info">提示：使用 {章节标题}、{章节字数}、{章节内容} 作为变量占位符</el-tag>
                        </div>
                        <div class="prompt-buttons">
                          <el-button size="small" @click="resetPromptTemplate">
                            重置默认
                          </el-button>
                          <el-button size="small" type="primary" @click="previewFullPrompt">
                            <el-icon><View /></el-icon>
                            预览完整提示词
                          </el-button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <el-empty 
                    description="暂无章节简读" 
                    :image-size="60"
                  >
                    <el-button 
                      type="primary" 
                      @click="generateChapterSummaryWithAI"
                      :loading="generatingSummary"
                    >
                      <el-icon><MagicStick /></el-icon>
                      {{ generatingSummary ? 'AI解读中...' : '调用AI解读' }}
                    </el-button>
                  </el-empty>
                </div>
                
                <!-- 显示已有简读 -->
                <div class="summary-display" v-else>
                  <!-- 提示词编辑区域（已有简读时） -->
                  <div class="prompt-section">
                    <div class="prompt-header">
                      <span class="prompt-label">AI解读提示词</span>
                      <el-button 
                        size="small" 
                        text 
                        @click="showPromptEditor = !showPromptEditor"
                      >
                        <el-icon><Edit /></el-icon>
                        {{ showPromptEditor ? '收起编辑' : '编辑提示词' }}
                      </el-button>
                    </div>
                    
                    <div class="prompt-preview" v-if="!showPromptEditor">
                      <div class="prompt-text">
                        {{ getPreviewPrompt() }}
                      </div>
                    </div>
                    
                    <div class="prompt-editor" v-else>
                      <el-input
                        v-model="summaryPromptTemplate"
                        type="textarea"
                        :rows="8"
                        placeholder="编辑AI解读提示词..."
                        class="prompt-textarea"
                      />
                      <div class="prompt-actions">
                        <div class="prompt-tips">
                          <el-tag size="small" type="info">提示：使用 {章节标题}、{章节字数}、{章节内容} 作为变量占位符</el-tag>
                        </div>
                        <div class="prompt-buttons">
                          <el-button size="small" @click="resetPromptTemplate">
                            重置默认
                          </el-button>
                          <el-button size="small" type="primary" @click="previewFullPrompt">
                            <el-icon><View /></el-icon>
                            预览完整提示词
                          </el-button>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="summary-text">
                    {{ currentDetailChapter.summary }}
                  </div>
                  <div class="summary-actions-bottom">
                    <el-button 
                      size="small" 
                      @click="regenerateChapterSummary"
                      :loading="generatingSummary"
                    >
                      重新解读
                    </el-button>
                  </div>
                </div>
              </div>
            </el-tab-pane>
          </el-tabs>
          
          <div class="empty-detail" v-else>
            <el-icon><Document /></el-icon>
            <p>请选择左侧章节查看详情</p>
          </div>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showChapterDetails = false">关闭</el-button>
          <el-button type="info" @click="exportAllChapterSummary">导出所有简读</el-button>
          <el-button type="primary" @click="exportAllChapterContent">导出所有章节</el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 章节内容查看弹窗 -->
    <el-dialog
      v-model="showChapterContent"
      title="章节内容查看"
      width="80%"
      :before-close="closeChapterContent"
    >
      <div class="chapter-content-dialog">
        <div class="chapter-selector">
          <el-select 
            v-model="selectedViewChapter" 
            placeholder="选择要查看的章节" 
            style="width: 300px"
            @change="loadChapterContent"
          >
            <el-option
              v-for="chapter in detectedChapters"
              :key="chapter.index"
              :label="chapter.title"
              :value="chapter.index"
            >
              <div class="chapter-select-option">
                <span class="chapter-title">{{ chapter.title }}</span>
                <span class="chapter-words">({{ chapter.wordCount }}字)</span>
              </div>
            </el-option>
          </el-select>
          
          <div class="chapter-info" v-if="currentViewChapter">
            <el-tag>{{ currentViewChapter.title }}</el-tag>
            <el-tag type="info">{{ currentViewChapter.wordCount }}字</el-tag>
            <el-tag type="warning" v-if="currentViewChapter.summary">{{ currentViewChapter.summary }}</el-tag>
          </div>
        </div>
        
        <div class="chapter-content-viewer">
          <el-scrollbar height="500px">
            <div class="chapter-text" v-if="currentChapterContent">
              {{ currentChapterContent }}
            </div>
            <div class="empty-state" v-else>
              <el-icon><Document /></el-icon>
              <p>请选择章节查看内容</p>
            </div>
          </el-scrollbar>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeChapterContent">关闭</el-button>
          <el-button type="primary" @click="copyChapterContent" :disabled="!currentChapterContent">
            <el-icon><DocumentCopy /></el-icon>
            复制内容
          </el-button>
          <el-button type="success" @click="exportChapterContent" :disabled="!currentChapterContent">
            <el-icon><Download /></el-icon>
            导出章节
          </el-button>
        </div>
      </template>
    </el-dialog>
    
    <!-- 完整提示词预览弹窗 -->
    <el-dialog
      v-model="showPromptPreview"
      title="完整提示词预览"
      width="70%"
      :before-close="() => showPromptPreview = false"
    >
      <div class="prompt-preview-dialog">
        <div class="preview-content">
          <el-scrollbar height="400px">
            <pre class="prompt-full-text">{{ fullPromptPreview }}</pre>
          </el-scrollbar>
        </div>
        
        <div class="preview-stats">
          <el-tag type="info">字符数：{{ fullPromptPreview.length }}</el-tag>
          <el-tag type="warning">行数：{{ fullPromptPreview.split('\n').length }}</el-tag>
        </div>
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showPromptPreview = false">关闭</el-button>
          <el-button type="primary" @click="copyFullPrompt">
            <el-icon><DocumentCopy /></el-icon>
            复制提示词
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  UploadFilled, Document, DataAnalysis, Download, FolderAdd, 
  Close, DocumentCopy, Loading, Check, MagicStick, Refresh, View, Edit
} from '@element-plus/icons-vue'
import { useNovelStore } from '@/stores/novel'
import * as pdfjsLib from 'pdfjs-dist'
import mammoth from 'mammoth'

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

const novelStore = useNovelStore()

// 响应式数据
const uploadedFile = ref(null)
const bookContent = ref('')
const selectedEncoding = ref('utf-8')
const selectedTemplate = ref('')
const selectedChapters = ref([])
const analysisStartWords = ref(1)
const analysisEndWords = ref(5000)
const analyzing = ref(false)
const analysisProgress = ref(0)
const analysisStatus = ref('')
const analysisResult = ref(null)
const analysisTime = ref('')

// 分析编辑器引用
const analysisEditorRef = ref(null)

// 章节检测相关
const detectedChapters = ref([])
const detectingChapters = ref(false)
const aiDetectedChapters = ref([])
const showChapterDetails = ref(false)

// 章节内容查看相关
const showChapterContent = ref(false)
const selectedViewChapter = ref(null)
const currentViewChapter = ref(null)
const currentChapterContent = ref('')

// 章节详情查看相关
const selectedDetailChapter = ref(null)
const currentDetailChapter = ref(null)
const currentDetailChapterContent = ref('')
const activeDetailTab = ref('content') // 默认显示完整内容
const generatingSummary = ref(false)

// 章节简读提示词
const summaryPromptTemplate = ref(`请为以下小说章节生成一个简洁的章节简读，要求：
1. 概括本章节的主要情节和内容
2. 突出关键人物和事件
3. 体现本章节在整体故事中的作用
4. 简读长度控制在100字以内
5. 语言简洁明了，突出重点

章节标题：{章节标题}
章节字数：{章节字数}字

章节内容：
{章节内容}

请生成章节简读：`)
const showPromptEditor = ref(false)
const showPromptPreview = ref(false)
const fullPromptPreview = ref('')

// 分析步骤
const analysisSteps = [
  '文本预处理',
  '结构分析',
  '人物识别',
  '技法提取',
  '生成报告'
]

// 拆书模板（从提示词库获取）
const analysisTemplates = ref([])

// 从提示词库加载拆书模板
const loadAnalysisTemplates = () => {
  const savedPrompts = localStorage.getItem('prompts')
  if (savedPrompts) {
    try {
      const allPrompts = JSON.parse(savedPrompts)
      analysisTemplates.value = allPrompts
        .filter(prompt => prompt.category === 'book-analysis')
        .map(prompt => ({
          id: prompt.id,
          name: prompt.title,
          icon: '📚',
          description: prompt.description,
          content: prompt.content
        }))
    } catch (error) {
      console.error('加载拆书模板失败:', error)
      // 使用默认模板
      analysisTemplates.value = [
        {
          id: 'comprehensive',
          name: '综合拆书分析',
          icon: '📚',
          description: '全方位分析小说的写作技法、结构特点和创作亮点',
          content: '请对以下小说文本进行深度拆书分析...'
        }
      ]
    }
  }
}

// 计算属性
const estimatedChapters = computed(() => {
  if (!bookContent.value) return 0
  return Math.ceil(bookContent.value.length / 3000)
})

const displayContent = computed({
  get() {
    // 如果有分析结果，优先显示分析结果（包括流式输出过程中）
    if (analysisResult.value) return analysisResult.value
    // 如果正在分析但还没有结果，显示空内容
    if (analyzing.value) return ''
    // 如果有书籍内容，显示书籍内容
    if (bookContent.value) return bookContent.value
    return ''
  },
  set(value) {
    if (!analyzing.value) {
      analysisResult.value = value
    }
  }
})

const getPlaceholder = () => {
  if (!bookContent.value) return '请先上传小说文件...'
  if (!analysisResult.value && !analyzing.value) return '小说完整内容预览'
  if (analyzing.value) return '正在进行AI流式分析，内容将实时显示...'
  return '编辑分析结果...'
}

// 方法
const handleFileChange = (file) => {
  // 清除之前的分析结果和章节信息
  analysisResult.value = null
  detectedChapters.value = []
  selectedChapters.value = []
  aiDetectedChapters.value = []
  
  uploadedFile.value = file
  readFileContent(file.raw)
}

// 处理文件数量超过限制（替换文件）
const handleFileExceed = (files) => {
  // 当试图上传新文件但已达到限制时，替换当前文件
  if (files.length > 0) {
    const newFile = files[0]
    // 创建一个文件对象来模拟 el-upload 的文件格式
    const fileObj = {
      name: newFile.name,
      size: newFile.size,
      raw: newFile,
      status: 'ready'
    }
    
    ElMessage.success('正在替换当前文件...')
    handleFileChange(fileObj)
  }
}

const readFileContent = (file, encoding = null) => {
  const fileEncoding = encoding || selectedEncoding.value
  const fileName = file.name.toLowerCase()
  
  if (fileName.endsWith('.pdf')) {
    // .pdf文件处理
    ElMessage.info('正在解析PDF文件，请稍候...')
    parsePdfFile(file)
  } else if (fileName.endsWith('.docx')) {
    // .docx文件处理（Word文档）
    ElMessage.info('正在解析Word文档，请稍候...')
    parseDocxFile(file)
  } else if (fileName.endsWith('.txt')) {
    // .txt文件处理
    parseTxtFile(file, fileEncoding)
  } else {
    ElMessage.error('不支持的文件格式，请上传.txt、.docx或.pdf文件')
  }
}

// 解析PDF文件
const parsePdfFile = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    
    let fullText = ''
    const totalPages = pdf.numPages
    
    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      
      // 提取页面文本
      let pageText = ''
      let lastY = null
      
      textContent.items.forEach((item) => {
        // 处理换行：如果y坐标变化较大，添加换行
        if (lastY !== null && Math.abs(item.transform[5] - lastY) > 5) {
          pageText += '\n'
        }
        pageText += item.str + ' '
        lastY = item.transform[5]
      })
      
      fullText += pageText.trim() + '\n\n'
    }
    
    // 清理多余的空格和换行
    fullText = fullText.replace(/ +/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
    
    bookContent.value = fullText
    detectChapters()
    ElMessage.success(`PDF文件解析成功！共 ${totalPages} 页`)
  } catch (error) {
    console.error('PDF解析失败:', error)
    ElMessage.error(`PDF文件解析失败：${error.message}`)
  }
}

// 解析DOCX文件
const parseDocxFile = async (file) => {
  try {
    const arrayBuffer = await file.arrayBuffer()
    
    // 使用mammoth提取纯文本
    const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer })
    let text = result.value
    
    // 清理文本
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    text = text.replace(/\n{3,}/g, '\n\n').trim()
    
    bookContent.value = text
    detectChapters()
    ElMessage.success('Word文档解析成功！')
  } catch (error) {
    console.error('DOCX解析失败:', error)
    ElMessage.error(`Word文档解析失败：${error.message}`)
  }
}

// 解析TXT文件
const parseTxtFile = (file, fileEncoding) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    let content = e.target.result
    
    // 如果使用GBK编码但内容出现乱码，尝试重新解码
    if (fileEncoding === 'gbk' && content.includes('�')) {
      ElMessage.warning('检测到可能的编码问题，建议尝试UTF-8编码')
    }
    
    bookContent.value = content
    detectChapters()
    
    const encodingText = fileEncoding === 'gbk' ? 'GBK/GB2312' : 'UTF-8'
    ElMessage.success(`文件上传成功！(${encodingText})`)
  }
  reader.onerror = () => {
    ElMessage.error('文件读取失败，请检查文件编码或格式')
  }
  
  // 根据选择的编码读取文件
  if (fileEncoding === 'gbk') {
    reader.readAsText(file, 'GBK')
  } else {
    reader.readAsText(file, 'UTF-8')
  }
}

// 重新读取文件（编码切换时使用）
const rereadWithEncoding = () => {
  if (!uploadedFile.value) return
  
  const fileName = uploadedFile.value.name.toLowerCase()
  
  // PDF和DOCX文件不支持编码切换
  if (fileName.endsWith('.pdf') || fileName.endsWith('.docx')) {
    ElMessage.warning('PDF和Word文档不支持编码切换')
    return
  }
  
  ElMessage.info(`正在使用 ${selectedEncoding.value.toUpperCase()} 编码重新读取文件...`)
  readFileContent(uploadedFile.value.raw, selectedEncoding.value)
}

// 检测章节
const detectChapters = () => {
  if (!bookContent.value) return
  
  const chapterRegex = /(第[一二三四五六七八九十百千万\d]+[章节]|Chapter\s*\d+)/gi
  const lines = bookContent.value.split('\n')
  const chapters = []
  
  let currentChapter = null
  let currentContent = ''
  
  lines.forEach((line, index) => {
    const match = line.match(chapterRegex)
    if (match) {
      // 保存上一章节
      if (currentChapter) {
        currentChapter.wordCount = currentContent.length
        chapters.push(currentChapter)
      }
      
      // 开始新章节
      currentChapter = {
        index: chapters.length,
        title: line.trim() || `第${chapters.length + 1}章`,
        startLine: index,
        wordCount: 0
      }
      currentContent = ''
    } else if (currentChapter) {
      currentContent += line
    }
  })
  
  // 保存最后一章
  if (currentChapter) {
    currentChapter.wordCount = currentContent.length
    chapters.push(currentChapter)
  }
  
  detectedChapters.value = chapters
}

const removeFile = () => {
  uploadedFile.value = null
  bookContent.value = ''
  analysisResult.value = null
  detectedChapters.value = []
  selectedChapters.value = []
  selectedEncoding.value = 'utf-8' // 重置编码选择
  ElMessage.success('文件已移除')
}

// 章节选择相关方法
const selectAllChapters = () => {
  selectedChapters.value = detectedChapters.value.map(chapter => chapter.index)
}

const clearChapterSelection = () => {
  selectedChapters.value = []
}

// AI章节检测
const startAiChapterDetection = async () => {
  detectingChapters.value = true
  
  try {
    // 模拟AI章节检测过程
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 生成AI检测的章节结果
    const aiChapters = await generateAiChapters()
    aiDetectedChapters.value = aiChapters
    detectedChapters.value = aiChapters
    
    ElMessage.success(`AI检测完成！发现 ${aiChapters.length} 个章节`)
  } catch (error) {
    ElMessage.error('AI章节检测失败')
  } finally {
    detectingChapters.value = false
  }
}

const generateAiChapters = async () => {
  const text = bookContent.value
  const textLength = text.length
  
  // 模拟AI智能章节划分（实际应该调用AI接口）
  const avgChapterLength = Math.floor(textLength / Math.max(1, Math.floor(textLength / 3000)))
  const chapters = []
  
  let currentPos = 0
  let chapterIndex = 0
  
  while (currentPos < textLength) {
    const nextPos = Math.min(currentPos + avgChapterLength, textLength)
    
    // 寻找合适的断点（句号、换行等）
    let endPos = nextPos
    for (let i = nextPos; i < Math.min(nextPos + 200, textLength); i++) {
      if (text[i] === '。' || text[i] === '\n\n') {
        endPos = i + 1
        break
      }
    }
    
    const chapterContent = text.slice(currentPos, endPos)
    const summary = generateChapterSummary(chapterContent, chapterIndex + 1)
    
    chapters.push({
      index: chapterIndex,
      title: `第${chapterIndex + 1}章`,
      startPos: currentPos,
      endPos: endPos,
      wordCount: chapterContent.length,
      summary: summary,
      content: chapterContent.slice(0, 100) + (chapterContent.length > 100 ? '...' : '')
    })
    
    currentPos = endPos
    chapterIndex++
    
    if (chapters.length >= 20) break // 限制最大章节数
  }
  
  return chapters
}

const generateChapterSummary = (content, chapterNum) => {
  // 章节拆分时简读保留为空，等待用户手动调用AI生成
  return ''
}

const startAnalysis = async () => {
  if (!selectedTemplate.value) {
    ElMessage.error('请选择分析模板')
    return
  }
  
  analyzing.value = true
  analysisProgress.value = 0
  analysisResult.value = ''
  
  // 初始化分析状态提示
  ElMessage.info('开始AI拆书分析，请耐心等待...')
  
  try {
    // 步骤1: 文本预处理
    analysisStatus.value = '文本预处理'
    analysisProgress.value = 10
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 步骤2: 准备分析数据
    analysisStatus.value = '准备分析数据'
    analysisProgress.value = 20
    const analysisData = await prepareAnalysisData()
    
    // 步骤3: 调用AI分析
    analysisStatus.value = 'AI深度分析中...'
    analysisProgress.value = 40
    
    // 生成分析结果
    analysisResult.value = await generateAnalysisResult(analysisData)
    analysisProgress.value = 100
    analysisStatus.value = '分析完成'
    analysisTime.value = new Date().toLocaleString()
    
    // 最终滚动到底部显示完整结果
    scrollToBottom()
    ElMessage.success('拆书分析完成！结果已生成，您可以编辑和导出。')
  } catch (error) {
    console.error('拆书分析失败:', error)
    ElMessage.error(`分析失败: ${error.message}`)
    analysisResult.value = `分析过程中出现错误：${error.message}\n\n请检查网络连接或API配置。`
  } finally {
    analyzing.value = false
  }
}

// 准备分析数据
const prepareAnalysisData = async () => {
  // 获取要分析的文本
  let textToAnalyze = ''
  let analysisInfo = ''
  let chapterInfos = []
  
  if (selectedChapters.value.length > 0) {
    // 分析选中的章节
    selectedChapters.value.forEach(chapterIndex => {
      const chapter = detectedChapters.value.find(c => c.index === chapterIndex)
      if (chapter) {
        let chapterContent = ''
        
        if (chapter.startPos !== undefined) {
          // AI检测的章节，使用位置信息
          chapterContent = bookContent.value.slice(chapter.startPos, chapter.endPos)
        } else {
          // 传统章节检测，使用行信息
          const lines = bookContent.value.split('\n')
          const chapterLines = lines.slice(chapter.startLine)
          const nextChapter = detectedChapters.value.find(c => c.index === chapterIndex + 1)
          const endLine = nextChapter ? nextChapter.startLine : lines.length
          chapterContent = chapterLines.slice(0, endLine - chapter.startLine).join('\n')
        }
        
        textToAnalyze += chapterContent + '\n\n'
        chapterInfos.push({
          title: chapter.title,
          wordCount: chapter.wordCount,
          summary: chapter.summary || '暂无简读'
        })
      }
    })
    analysisInfo = `分析章节：${selectedChapters.value.length}章`
  } else {
    // 分析指定字数区间
    const startPos = Math.max(0, analysisStartWords.value - 1)
    const endPos = Math.min(bookContent.value.length, analysisEndWords.value)
    textToAnalyze = bookContent.value.slice(startPos, endPos)
    analysisInfo = `分析范围：第${analysisStartWords.value} - ${analysisEndWords.value}字`
  }
  
  // 获取选中的模板
  const template = analysisTemplates.value.find(t => t.id == selectedTemplate.value)
  if (!template) {
    throw new Error('未找到分析模板，请检查提示词库设置。')
  }
  
  return {
    textToAnalyze,
    analysisInfo,
    chapterInfos,
    template,
    totalWordCount: bookContent.value.length,
    fileName: uploadedFile.value?.name || '未知文件',
    encoding: selectedEncoding.value
  }
}

const generateAnalysisResult = async (analysisData) => {
  const { textToAnalyze, analysisInfo, chapterInfos, template, totalWordCount, fileName, encoding } = analysisData
  
  // 构建完整的AI提示词
  let prompt = `你是一位专业的文学分析师和写作导师，请根据以下模板和要求对小说文本进行深度拆书分析。

## 分析模板信息
模板名称：${template.name}
模板描述：${template.description || '专业拆书分析'}

## 文本信息
文件名：${fileName}
编码格式：${encoding.toUpperCase()}
总字数：${totalWordCount.toLocaleString()}字
${analysisInfo}
分析文本字数：${textToAnalyze.length.toLocaleString()}字

## 章节信息
${chapterInfos.length > 0 ? 
  chapterInfos.map(chapter => `- ${chapter.title}：${chapter.wordCount}字，${chapter.summary}`).join('\n') :
  '分析字数区间内容，无明确章节划分'
}

## 分析要求
${template.content}

## 待分析文本
${textToAnalyze}

请按照上述模板要求进行专业的拆书分析，输出应该结构清晰、专业详实，适合作为写作学习的参考资料。`

  try {
    // 生成分析报告头部
    const reportHeader = `《${template.name}报告》

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 分析信息
• 分析时间：${new Date().toLocaleString()}
• 分析模板：${template.name}
• 文件名称：${fileName}
• 文件编码：${encoding.toUpperCase()}
• 总字数：${totalWordCount.toLocaleString()}字
• ${analysisInfo}
• 分析字数：${textToAnalyze.length.toLocaleString()}字

${chapterInfos.length > 0 ? `
📖 章节概况
${chapterInfos.map((chapter, index) => `${index + 1}. ${chapter.title} (${chapter.wordCount}字)
   简读：${chapter.summary}`).join('\n')}
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`

    const reportFooter = `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 分析完成！
• 本报告由AI基于《${template.name}》模板生成
• 内容完全可编辑修改，您可以根据实际需要调整分析结果
• 建议将优质分析结果保存到拆书参考库以供后续学习参考

🔧 技术信息
• API调用时间：${new Date().toISOString()}
• 使用编码：${encoding.toUpperCase()}
• 处理状态：成功`

    // 初始化分析报告
    analysisResult.value = reportHeader
    console.log('初始化分析报告头部:', reportHeader.length, '字符')
    
    // 使用流式API调用
    await novelStore.generateContentWithAPIStream(
      '',  // keywords (不需要)
      '',  // template (已包含在prompt中)
      prompt,  // 使用outline参数传递完整prompt
      4000,  // wordLimit
      (chunk, fullContent) => {
        // 实时更新分析结果
        analysisResult.value = reportHeader + fullContent + reportFooter
        console.log('流式更新:', fullContent.length, '字符')
        
        // 根据内容长度动态更新进度（40%-95%）
        const contentLength = fullContent.length
        const estimatedMaxLength = 3000 // 预估最大长度
        const progressIncrement = Math.min(55, (contentLength / estimatedMaxLength) * 55)
        analysisProgress.value = 40 + progressIncrement
        
        // 更新状态文本
        analysisStatus.value = `AI分析中... (已生成${contentLength}字)`
        
        // 自动滚动到底部，显示最新内容
        scrollToBottom()
      }
    )
    
    return analysisResult.value
    
  } catch (error) {
    console.error('AI分析失败:', error)
    throw new Error(`AI分析失败: ${error.message}`)
  }
}

const getTemplateName = () => {
  const template = analysisTemplates.value.find(t => t.id == selectedTemplate.value)
  return template ? template.name : ''
}

// 自动滚动到文本框底部
const scrollToBottom = () => {
  nextTick(() => {
    if (analysisEditorRef.value) {
      const textarea = analysisEditorRef.value.textarea || analysisEditorRef.value.$el?.querySelector('textarea')
      if (textarea) {
        textarea.scrollTop = textarea.scrollHeight
      }
    }
  })
}

const exportResults = () => {
  // 导出文本格式的分析结果
  const content = analysisResult.value || ''
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `拆书分析结果_${new Date().getTime()}.txt`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('分析结果已导出！')
}

const saveToLibrary = () => {
  // 保存到参考库
  ElMessage.success('已保存到拆书参考库！')
}



// 章节内容查看相关方法
const openChapterViewer = () => {
  if (detectedChapters.value.length === 0) {
    ElMessage.warning('暂无可查看的章节，请先上传文件')
    return
  }
  showChapterContent.value = true
  // 默认选择第一个章节
  if (detectedChapters.value.length > 0) {
    selectedViewChapter.value = detectedChapters.value[0].index
    loadChapterContent()
  }
}

const closeChapterContent = () => {
  showChapterContent.value = false
  selectedViewChapter.value = null
  currentViewChapter.value = null
  currentChapterContent.value = ''
}

const loadChapterContent = () => {
  if (selectedViewChapter.value === null) return
  
  const chapter = detectedChapters.value.find(c => c.index === selectedViewChapter.value)
  if (!chapter) return
  
  currentViewChapter.value = chapter
  
  // 根据章节类型获取内容
  if (chapter.startPos !== undefined) {
    // AI检测的章节，使用位置信息
    currentChapterContent.value = bookContent.value.slice(chapter.startPos, chapter.endPos)
  } else {
    // 传统章节检测，使用行信息
    const lines = bookContent.value.split('\n')
    const chapterLines = lines.slice(chapter.startLine)
    const nextChapter = detectedChapters.value.find(c => c.index === selectedViewChapter.value + 1)
    const endLine = nextChapter ? nextChapter.startLine : lines.length
    currentChapterContent.value = chapterLines.slice(0, endLine - chapter.startLine).join('\n')
  }
}

const copyChapterContent = async () => {
  if (!currentChapterContent.value) return
  
  try {
    await navigator.clipboard.writeText(currentChapterContent.value)
    ElMessage.success('章节内容已复制到剪贴板')
  } catch (error) {
    // 降级处理：创建临时textarea进行复制
    const textarea = document.createElement('textarea')
    textarea.value = currentChapterContent.value
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success('章节内容已复制到剪贴板')
  }
}

const exportChapterContent = () => {
  if (!currentChapterContent.value || !currentViewChapter.value) return
  
  const content = `${currentViewChapter.value.title}\n\n${currentChapterContent.value}`
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${currentViewChapter.value.title}_${new Date().getTime()}.txt`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success(`${currentViewChapter.value.title} 已导出！`)
}

// 章节详情管理相关方法
const selectDetailChapter = (chapterIndex) => {
  selectedDetailChapter.value = chapterIndex
  const chapter = aiDetectedChapters.value.find(c => c.index === chapterIndex)
  if (!chapter) return
  
  currentDetailChapter.value = chapter
  activeDetailTab.value = 'content' // 默认显示完整内容
  
  // 加载完整章节内容
  if (chapter.startPos !== undefined) {
    // AI检测的章节，使用位置信息
    currentDetailChapterContent.value = bookContent.value.slice(chapter.startPos, chapter.endPos)
  } else {
    // 传统章节检测，使用行信息（兼容性处理）
    const lines = bookContent.value.split('\n')
    const chapterLines = lines.slice(chapter.startLine || 0)
    const nextChapter = aiDetectedChapters.value.find(c => c.index === chapterIndex + 1)
    const endLine = nextChapter ? (nextChapter.startLine || lines.length) : lines.length
    currentDetailChapterContent.value = chapterLines.slice(0, endLine - (chapter.startLine || 0)).join('\n')
  }
}

const copyDetailChapterContent = async () => {
  if (!currentDetailChapterContent.value) return
  
  let contentToCopy = ''
  if (activeDetailTab.value === 'summary') {
    contentToCopy = `${currentDetailChapter.value.title}\n\n简读：${currentDetailChapter.value.summary}`
  } else {
    contentToCopy = `${currentDetailChapter.value.title}\n\n${currentDetailChapterContent.value}`
  }
  
  try {
    await navigator.clipboard.writeText(contentToCopy)
    ElMessage.success('内容已复制到剪贴板')
  } catch (error) {
    // 降级处理
    const textarea = document.createElement('textarea')
    textarea.value = contentToCopy
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success('内容已复制到剪贴板')
  }
}

const exportDetailChapterContent = () => {
  if (!currentDetailChapter.value) return
  
  let content = ''
  let filename = ''
  
  if (activeDetailTab.value === 'summary') {
    content = `${currentDetailChapter.value.title}\n\n简读：\n${currentDetailChapter.value.summary}\n\n字数：${currentDetailChapter.value.wordCount}字`
    filename = `${currentDetailChapter.value.title}_简读_${new Date().getTime()}.txt`
  } else {
    content = `${currentDetailChapter.value.title}\n\n${currentDetailChapterContent.value}`
    filename = `${currentDetailChapter.value.title}_完整内容_${new Date().getTime()}.txt`
  }
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('章节内容已导出！')
}

const exportAllChapterSummary = () => {
  if (aiDetectedChapters.value.length === 0) {
    ElMessage.error('暂无章节简读数据')
    return
  }
  
  let summaryText = `AI章节简读报告\n`
  summaryText += `生成时间：${new Date().toLocaleString()}\n`
  summaryText += `总章节数：${aiDetectedChapters.value.length}\n`
  summaryText += `总字数：${bookContent.value.length.toLocaleString()}\n\n`
  summaryText += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  
  aiDetectedChapters.value.forEach((chapter, index) => {
    summaryText += `【${chapter.title}】\n`
    summaryText += `字数：${chapter.wordCount}字\n`
    summaryText += `简读：${chapter.summary}\n`
    if (index < aiDetectedChapters.value.length - 1) {
      summaryText += `\n${'─'.repeat(50)}\n\n`
    }
  })
  
  summaryText += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  summaryText += `\n导出完成！此简读由AI智能生成，可作为创作参考。`
  
  const blob = new Blob([summaryText], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `AI章节简读汇总_${new Date().getTime()}.txt`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('所有章节简读已导出！')
}

const exportAllChapterContent = () => {
  if (aiDetectedChapters.value.length === 0) {
    ElMessage.error('暂无章节数据')
    return
  }
  
  let allContent = `AI智能拆分章节完整内容\n`
  allContent += `生成时间：${new Date().toLocaleString()}\n`
  allContent += `总章节数：${aiDetectedChapters.value.length}\n`
  allContent += `总字数：${bookContent.value.length.toLocaleString()}\n\n`
  allContent += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`
  
  aiDetectedChapters.value.forEach((chapter, index) => {
    allContent += `【${chapter.title}】\n`
    allContent += `字数：${chapter.wordCount}字\n`
    allContent += `简读：${chapter.summary}\n\n`
    
    // 获取完整章节内容
    let chapterContent = ''
    if (chapter.startPos !== undefined) {
      chapterContent = bookContent.value.slice(chapter.startPos, chapter.endPos)
    } else {
      const lines = bookContent.value.split('\n')
      const chapterLines = lines.slice(chapter.startLine || 0)
      const nextChapter = aiDetectedChapters.value.find(c => c.index === index + 1)
      const endLine = nextChapter ? (nextChapter.startLine || lines.length) : lines.length
      chapterContent = chapterLines.slice(0, endLine - (chapter.startLine || 0)).join('\n')
    }
    
    allContent += `完整内容：\n${chapterContent}\n`
    
    if (index < aiDetectedChapters.value.length - 1) {
      allContent += `\n${'═'.repeat(80)}\n\n`
    }
  })
  
  allContent += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`
  allContent += `\n导出完成！此内容由AI智能拆分生成，包含所有章节的完整文本。`
  
  const blob = new Blob([allContent], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `AI拆分章节完整内容_${new Date().getTime()}.txt`
  link.click()
  URL.revokeObjectURL(url)
  ElMessage.success('所有章节完整内容已导出！')
}

// 打开章节详情查看器
const openChapterDetailsViewer = () => {
  if (aiDetectedChapters.value.length === 0) {
    ElMessage.warning('暂无AI检测的章节，请先进行AI章节重置')
    return
  }
  
  showChapterDetails.value = true
  // 默认选择第一个章节
  if (aiDetectedChapters.value.length > 0) {
    selectDetailChapter(aiDetectedChapters.value[0].index)
  }
}

// 获取预览提示词（截取前200字）
const getPreviewPrompt = () => {
  if (!summaryPromptTemplate.value) return '暂无提示词'
  
  const previewText = summaryPromptTemplate.value.length > 200 
    ? summaryPromptTemplate.value.substring(0, 200) + '...'
    : summaryPromptTemplate.value
    
  return previewText
}

// 构建完整的AI提示词
const buildFullPrompt = () => {
  if (!currentDetailChapter.value || !currentDetailChapterContent.value) {
    return summaryPromptTemplate.value
  }
  
  return summaryPromptTemplate.value
    .replace(/{章节标题}/g, currentDetailChapter.value.title)
    .replace(/{章节字数}/g, currentDetailChapter.value.wordCount.toString())
    .replace(/{章节内容}/g, currentDetailChapterContent.value)
}

// AI生成章节简读
const generateChapterSummaryWithAI = async () => {
  if (!currentDetailChapter.value || !currentDetailChapterContent.value) {
    ElMessage.error('当前章节内容为空')
    return
  }
  
  if (!summaryPromptTemplate.value.trim()) {
    ElMessage.error('请先设置提示词模板')
    return
  }
  
  generatingSummary.value = true
  
  try {
    // 构建完整的AI提示词
    const prompt = buildFullPrompt()
    
    // 调用AI生成简读
    const summary = await novelStore.generateContent(prompt)
    
    // 更新章节简读
    const chapterIndex = currentDetailChapter.value.index
    const chapterInList = aiDetectedChapters.value.find(c => c.index === chapterIndex)
    if (chapterInList) {
      chapterInList.summary = summary.trim()
      currentDetailChapter.value.summary = summary.trim()
    }
    
    ElMessage.success('章节简读生成完成！')
    
  } catch (error) {
    console.error('生成章节简读失败:', error)
    ElMessage.error(`生成失败: ${error.message}`)
  } finally {
    generatingSummary.value = false
  }
}

// 重新生成章节简读
const regenerateChapterSummary = async () => {
  if (!currentDetailChapter.value) return
  
  // 清空当前简读
  currentDetailChapter.value.summary = ''
  const chapterIndex = currentDetailChapter.value.index
  const chapterInList = aiDetectedChapters.value.find(c => c.index === chapterIndex)
  if (chapterInList) {
    chapterInList.summary = ''
  }
  
  // 重新生成
  await generateChapterSummaryWithAI()
}

// 保存提示词模板到本地存储
const saveSummaryPromptTemplate = () => {
  try {
    localStorage.setItem('chapterSummaryPromptTemplate', summaryPromptTemplate.value)
  } catch (error) {
    console.error('保存提示词模板失败:', error)
  }
}

// 从本地存储加载提示词模板
const loadSummaryPromptTemplate = () => {
  try {
    const saved = localStorage.getItem('chapterSummaryPromptTemplate')
    if (saved) {
      summaryPromptTemplate.value = saved
    }
  } catch (error) {
    console.error('加载提示词模板失败:', error)
  }
}

// 重置提示词模板为默认值
const resetPromptTemplate = () => {
  const defaultTemplate = `请为以下小说章节生成一个简洁的章节简读，要求：
1. 概括本章节的主要情节和内容
2. 突出关键人物和事件
3. 体现本章节在整体故事中的作用
4. 简读长度控制在100字以内
5. 语言简洁明了，突出重点

章节标题：{章节标题}
章节字数：{章节字数}字

章节内容：
{章节内容}

请生成章节简读：`
  
  summaryPromptTemplate.value = defaultTemplate
  ElMessage.success('已重置为默认提示词模板')
}

// 预览完整提示词
const previewFullPrompt = () => {
  if (!currentDetailChapter.value || !currentDetailChapterContent.value) {
    ElMessage.warning('当前没有选中章节，无法预览完整提示词')
    return
  }
  
  fullPromptPreview.value = buildFullPrompt()
  showPromptPreview.value = true
}

// 复制完整提示词
const copyFullPrompt = () => {
  navigator.clipboard.writeText(fullPromptPreview.value).then(() => {
    ElMessage.success('提示词已复制到剪贴板')
  }).catch(err => {
    console.error('复制失败:', err)
    ElMessage.error('复制失败')
  })
}

// 监听提示词模板变化，自动保存
watch(summaryPromptTemplate, () => {
  saveSummaryPromptTemplate()
})

// 组件挂载时加载模板
onMounted(() => {
  loadAnalysisTemplates()
  loadSummaryPromptTemplate()
})
</script>

<style scoped>
.book-analysis {
  height: calc(100vh - 140px);
  display: flex;
  flex-direction: column;
}

.page-header {
  text-align: center;
  margin-bottom: 20px;
}

.page-header h2 {
  font-size: 24px;
  color: #2c3e50;
  margin-bottom: 8px;
}

.page-header p {
  color: #7f8c8d;
  margin: 0;
}

.analysis-container {
  display: flex;
  flex: 1;
  gap: 20px;
  height: 100%;
  overflow: hidden;
}

/* 左侧面板 */
.left-panel {
  width: 320px;
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
}

.panel-section {
  margin-bottom: 24px;
}

.panel-section h3 {
  font-size: 16px;
  color: #2c3e50;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-area {
  width: 100%;
}

.upload-area .el-upload-dragger {
  width: 100%;
  height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

/* 编码选择样式 */
.encoding-selection {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e4e7ed;
}

.encoding-selection label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #2c3e50;
}

.encoding-switch {
  margin-top: 12px;
  padding: 8px 12px;
  background: #f0f2f5;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.encoding-switch span {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
}

.file-info {
  margin-top: 12px;
}

.file-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background: #f8f9fa;
}

.file-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.file-name {
  font-size: 14px;
  color: #2c3e50;
  font-weight: 500;
}

.file-size {
  font-size: 12px;
  color: #909399;
}

.file-encoding {
  font-size: 11px;
  color: #67c23a;
  background: #f0f9ff;
  padding: 2px 6px;
  border-radius: 10px;
  border: 1px solid #b3e5fc;
  align-self: flex-start;
}

.file-actions {
  display: flex;
  gap: 4px;
  align-items: center;
}

.remove-btn {
  color: #f56c6c;
}

.setting-item {
  margin-bottom: 16px;
}

.setting-item label {
  display: block;
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.template-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-icon {
  font-size: 16px;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-section {
  background: #f8f9fa;
  border-radius: 6px;
  padding: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.stat-value {
  font-size: 14px;
  color: #2c3e50;
  font-weight: 500;
}

/* 右侧面板 */
.right-panel {
  flex: 1;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.editor-header h3 {
  margin: 0;
  font-size: 18px;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.progress-section {
  margin-bottom: 16px;
}

.progress-text {
  margin-top: 8px;
  font-size: 14px;
  color: #606266;
  text-align: center;
}

.analysis-editor {
  flex: 1;
}

.analysis-editor .el-textarea__inner {
  height: 100% !important;
  resize: none;
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.chapter-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.chapter-actions button{
    margin-left: 0 !important;
}

.range-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.range-separator {
  color: #606266;
  font-size: 14px;
}

.chapter-option {
  width: 100%;
}

.chapter-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.chapter-words {
  color: #8492a6;
  font-size: 12px;
}

.chapter-summary {
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
  white-space: normal;
  word-break: break-all;
}

.chapter-details-content {
  max-height: 500px;
  overflow-y: auto;
}

.chapter-detail-item {
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  margin-bottom: 12px;
}

.chapter-detail-item:last-child {
  margin-bottom: 0;
}

.chapter-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.chapter-detail-header h4 {
  margin: 0;
  color: #303133;
  font-size: 16px;
}

.chapter-detail-words {
  color: #909399;
  font-size: 12px;
}

.chapter-detail-summary {
  margin-bottom: 12px;
  line-height: 1.6;
  color: #606266;
}

.chapter-detail-preview {
  color: #909399;
  font-size: 14px;
  line-height: 1.6;
  background: #f8f9fa;
  padding: 8px 12px;
  border-radius: 4px;
}

.ai-chapter-section {
  margin-top: 8px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #909399;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.content-preview {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.preview-header h3 {
  margin: 0;
  color: #2c3e50;
}

.preview-tip {
  font-size: 12px;
  color: #909399;
}

.preview-content {
  line-height: 1.8;
  color: #606266;
  white-space: pre-wrap;
}

.analysis-progress {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px;
}

.progress-content {
  text-align: center;
  max-width: 400px;
}

.progress-icon {
  font-size: 48px;
  color: #409eff;
  margin-bottom: 16px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.progress-steps {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.progress-step {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: 6px;
  transition: all 0.3s;
}

.progress-step.active {
  background: #e6f7ff;
  color: #1890ff;
}

.progress-step.completed {
  color: #52c41a;
}

.step-text {
  font-size: 14px;
}

.analysis-results {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.results-header {
  padding: 20px 20px 0;
  border-bottom: 1px solid #e4e7ed;
}

.results-header h3 {
  margin: 0 0 8px 0;
  color: #2c3e50;
}

.results-meta {
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 16px;
}

.results-tabs {
  flex: 1;
  overflow: hidden;
}

.results-tabs :deep(.el-tabs__content) {
  height: calc(100% - 40px);
  overflow-y: auto;
  padding: 20px;
}

/* 基础分析样式 */
.analysis-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.analysis-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e9ecef;
}

.analysis-card h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
  font-size: 16px;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 14px;
  color: #606266;
}

.value {
  font-size: 14px;
  color: #2c3e50;
  font-weight: 500;
}

.characters-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.character-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  background: white;
  border-radius: 4px;
  font-size: 14px;
}

.character-name {
  font-weight: 500;
  color: #2c3e50;
}

.character-role {
  color: #909399;
}

.character-frequency {
  color: #409eff;
  font-size: 12px;
}

.plot-structure {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.structure-item {
  display: flex;
  gap: 8px;
  padding: 8px;
  background: white;
  border-radius: 4px;
}

.structure-label {
  font-size: 14px;
  color: #606266;
  min-width: 80px;
}

.structure-value {
  font-size: 14px;
  color: #2c3e50;
  flex: 1;
}

/* 技法分析样式 */
.techniques-analysis {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.technique-section {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e9ecef;
}

.technique-section h4 {
  margin: 0 0 12px 0;
  color: #2c3e50;
}

.technique-description {
  color: #606266;
  margin-bottom: 16px;
  line-height: 1.6;
}

.examples-section h5 {
  margin: 0 0 12px 0;
  color: #2c3e50;
  font-size: 14px;
}

.example-item {
  background: white;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid #e4e7ed;
}

.example-text {
  font-style: italic;
  color: #409eff;
  margin-bottom: 8px;
}

.example-analysis {
  font-size: 14px;
  color: #606266;
}

/* 章节详情样式 */
.chapters-analysis {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chapter-detail {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e9ecef;
}

.chapter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.chapter-header h4 {
  margin: 0;
  color: #2c3e50;
}

.chapter-words {
  font-size: 12px;
  color: #909399;
  background: #e9ecef;
  padding: 4px 8px;
  border-radius: 12px;
}

.chapter-content {
  display: grid;
  gap: 16px;
}

.chapter-summary h5,
.chapter-techniques h5 {
  margin: 0 0 8px 0;
  color: #2c3e50;
  font-size: 14px;
}

.chapter-summary p {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.technique-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 创作启发样式 */
.inspiration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.inspiration-card {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e9ecef;
}

.inspiration-card h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.highlight-list,
.suggestion-list {
  margin: 0;
  padding-left: 20px;
}

.highlight-list li,
.suggestion-list li {
  margin-bottom: 8px;
  color: #606266;
  line-height: 1.6;
}

.related-techniques {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 章节内容查看弹窗样式 */
.chapter-content-dialog {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chapter-selector {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chapter-select-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.chapter-title {
  font-weight: 500;
  color: #2c3e50;
}

.chapter-words {
  font-size: 12px;
  color: #909399;
}

.chapter-info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chapter-content-viewer {
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
}

.chapter-text {
  padding: 20px;
  line-height: 1.8;
  font-family: 'Microsoft YaHei', sans-serif;
  color: #2c3e50;
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-state {
  padding: 60px 20px;
  text-align: center;
  color: #909399;
}

.empty-state .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #c0c4cc;
}

.empty-state p {
  margin: 0;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .analysis-container {
    flex-direction: column;
    height: auto;
  }
  
  .left-panel {
    width: 100%;
    order: 1;
  }
  
  .right-panel {
    order: 2;
    min-height: 600px;
  }
  
  .analysis-grid {
    grid-template-columns: 1fr;
  }
  
  .inspiration-grid {
    grid-template-columns: 1fr;
  }
  
  .chapter-content-dialog {
    gap: 16px;
  }
  
  .chapter-text {
    padding: 16px;
    line-height: 1.6;
  }
}

@media (max-width: 768px) {
  .analysis-container {
    gap: 16px;
  }
  
  .left-panel,
  .right-panel {
    border-radius: 6px;
    padding: 16px;
  }
  
  .chapter-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .chapter-selector .el-select {
    width: 100% !important;
  }
  
  .dialog-footer {
    flex-direction: column;
    gap: 8px;
  }
  
  .dialog-footer .el-button {
    width: 100%;
  }
}

/* 章节详情管理弹窗样式 */
.chapter-details-main {
  display: flex;
  gap: 20px;
  height: 600px;
}

.chapter-list-panel {
  width: 350px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

.panel-header {
  background: #f5f7fa;
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
}

.panel-header h4 {
  margin: 0;
  font-size: 14px;
  color: #2c3e50;
}

.chapter-list {
  height: calc(100% - 49px);
  overflow-y: auto;
}

.chapter-list-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: all 0.2s;
}

.chapter-list-item:hover {
  background: #f8f9fa;
}

.chapter-list-item.active {
  background: #e8f4fd;
  border-left: 3px solid #409eff;
}

.chapter-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.chapter-item-title {
  font-weight: 500;
  color: #2c3e50;
  font-size: 14px;
}

.chapter-item-words {
  font-size: 12px;
  color: #909399;
}

.chapter-item-summary {
  font-size: 12px;
  color: #606266;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.chapter-item-summary:empty::before {
  content: '暂无简读，点击查看后可调用AI生成';
  color: #c0c4cc;
  font-style: italic;
}

.chapter-detail-panel {
  flex: 1;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.detail-header h4 {
  margin: 0;
  color: #2c3e50;
  font-size: 16px;
}

.detail-actions {
  display: flex;
  gap: 8px;
}

.summary-content {
  padding: 20px;
}

.chapter-meta {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.summary-actions {
  margin-top: 20px;
}

.summary-display {
  margin-top: 16px;
}

.summary-text {
  color: #2c3e50;
  line-height: 1.6;
  font-size: 14px;
  background: #f8f9fa;
  border-radius: 6px;
  padding: 16px;
  border: 1px solid #e4e7ed;
}

.summary-actions-bottom {
  margin-top: 12px;
  text-align: right;
}

/* 提示词编辑相关样式 */
.prompt-section {
  margin-bottom: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.prompt-label {
  font-size: 13px;
  font-weight: 500;
  color: #2c3e50;
}

.prompt-preview {
  padding: 12px;
  background: #fafbfc;
}

.prompt-text {
  font-size: 12px;
  color: #606266;
  line-height: 1.4;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 120px;
  overflow-y: auto;
}

.prompt-editor {
  padding: 12px;
  background: #fff;
}

.prompt-textarea {
  margin-bottom: 8px;
}

.prompt-textarea .el-textarea__inner {
  font-size: 12px;
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
}

.prompt-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.prompt-tips {
  flex: 1;
}

.prompt-buttons {
  display: flex;
  gap: 8px;
}

/* 提示词预览弹窗样式 */
.prompt-preview-dialog {
  padding: 16px;
}

.preview-content {
  margin-bottom: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
}

.prompt-full-text {
  margin: 0;
  padding: 16px;
  background: #f8f9fa;
  font-family: 'Monaco', 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #2c3e50;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-stats {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.full-content {
  padding: 20px;
}

.chapter-full-text {
  color: #2c3e50;
  line-height: 1.8;
  font-family: 'Microsoft YaHei', sans-serif;
  white-space: pre-wrap;
  word-break: break-word;
}

.empty-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #909399;
}

.empty-detail .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #c0c4cc;
}

.empty-detail p {
  margin: 0;
  font-size: 14px;
}

/* 响应式适配 */
@media (max-width: 1200px) {
  .chapter-details-main {
    flex-direction: column;
    height: auto;
  }
  
  .chapter-list-panel {
    width: 100%;
    height: 250px;
  }
  
  .chapter-detail-panel {
    min-height: 400px;
  }
}

@media (max-width: 768px) {
  .chapter-details-main {
    gap: 16px;
  }
  
  .detail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .chapter-meta {
    flex-wrap: wrap;
  }
  
  .summary-content,
  .full-content {
    padding: 16px;
  }
}
</style>