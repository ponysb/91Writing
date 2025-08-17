<template>
  <div class="book-analysis">
    <div class="analysis-container">
      <!-- 左侧工具栏 -->
      <div class="sidebar">
        <!-- 文件上传卡片 -->
        <el-card class="upload-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><UploadFilled /></el-icon>
              <span>文件导入</span>
            </div>
          </template>
          
          <el-upload
            class="upload-area"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            :show-file-list="false"
            accept=".txt,.pdf,.docx,.epub"
          >
            <el-icon class="upload-icon"><UploadFilled /></el-icon>
            <div class="upload-text">拖拽文件到此处或点击上传</div>
            <div class="upload-hint">支持 .txt .docx 格式 (选择编码: UTF-8)</div>
          </el-upload>
        </el-card>

        <!-- 文件信息卡片 -->
        <el-card v-if="uploadedFile" class="file-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><Document /></el-icon>
              <span>文件信息</span>
            </div>
          </template>
          
          <div class="file-info">
            <div class="file-item">
              <div class="file-icon">
                <el-icon><Document /></el-icon>
              </div>
              <div class="file-details">
                <div class="file-name">{{ uploadedFile.name }}</div>
                <div class="file-meta">
                  <span class="file-size">{{ formatFileSize(uploadedFile.size) }}</span>
                  <el-tag size="small" type="success">UTF-8</el-tag>
                </div>
              </div>
              <el-button size="small" type="primary" link @click="reloadFile">
                重新读取
              </el-button>
            </div>
          </div>
          
          <div class="encoding-selector">
            <div class="selector-label">编码选择</div>
            <el-radio-group v-model="selectedEncoding" size="small" @change="onEncodingChange">
              <el-radio-button label="UTF-8">UTF-8</el-radio-button>
              <el-radio-button label="GBK">GBK/GB2312</el-radio-button>
            </el-radio-group>
          </div>
        </el-card>

        <!-- 分析设置卡片 -->
        <el-card v-if="uploadedFile" class="settings-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><Setting /></el-icon>
              <span>拆书设置</span>
            </div>
          </template>
          
          <div class="setting-group">
            <label class="setting-label">拆书模板</label>
            <el-select v-model="selectedPromptId" placeholder="选择拆书模板" size="default" clearable>
              <!-- 默认拆书模板选项 -->
              <el-option 
                v-for="template in analysisTemplates" 
                :key="template.value" 
                :label="template.label" 
                :value="template.value"
              >
                <div class="prompt-option">
                  <div class="prompt-title">{{ template.label }}</div>
                  <div class="prompt-desc">{{ template.description }}</div>
                </div>
              </el-option>
              <!-- 自定义Prompt模板选项 -->
              <el-option 
                v-for="prompt in availablePrompts" 
                :key="prompt.id" 
                :label="prompt.name" 
                :value="prompt.id"
              >
                <div class="prompt-option">
                  <div class="prompt-title">{{ prompt.name }}</div>
                  <div class="prompt-desc">{{ prompt.description }}</div>
                </div>
              </el-option>
            </el-select>
          </div>
          
          <!-- Tab切换 -->
          <el-tabs v-model="analysisMode" class="analysis-tabs">
            <!-- 字数拆书 -->
            <el-tab-pane label="字数拆书" name="range">
              <div class="setting-group">
                <label class="setting-label">分析范围</label>
                <div class="range-controls">
                  <el-input-number v-model="analysisRange[0]" :min="1" :max="totalWordCount" size="default" />
                  <span class="range-divider">至</span>
                  <el-input-number v-model="analysisRange[1]" :min="1" :max="totalWordCount" size="default" />
                </div>
                <div class="range-hint">将分析第 {{ analysisRange[0] }} - {{ analysisRange[1] }} 字的内容</div>
              </div>
              
              <div class="action-group">
                <el-button type="primary" size="default" @click="startRangeAnalysis" :loading="isAnalyzing" block>
                  <el-icon><MagicStick /></el-icon>
                  {{ isAnalyzing ? '分析中...' : '开始字数拆书' }}
                </el-button>
              </div>
            </el-tab-pane>
            
            <!-- 章节拆书 -->
            <el-tab-pane label="章节拆书" name="chapter">
              <div class="setting-group">
                <div class="chapter-info">
                  <div class="chapter-stats">
                    <span>检测到 {{ detectedChapters.length }} 个章节</span>
                    <el-button size="small" type="primary" link @click="() => smartSplitChapters()">
                      重新智能拆分
                    </el-button>
                  </div>
                </div>
                
                <div class="chapter-list" v-if="detectedChapters.length > 0">
                  <div class="chapter-item" v-for="(chapter, index) in detectedChapters" :key="index">
                    <el-checkbox v-model="chapter.selected" :label="chapter.title">
                      <div class="chapter-detail">
                        <div class="chapter-title">{{ chapter.title }}</div>
                        <div class="chapter-meta">{{ chapter.wordCount }}字 | 第{{ chapter.startPos }}-{{ chapter.endPos }}字</div>
                      </div>
                    </el-checkbox>
                  </div>
                </div>
                
                <div class="no-chapters" v-else>
                  <el-empty description="未检测到章节" :image-size="60">
                    <el-button type="primary" @click="() => smartSplitChapters()">智能拆分章节</el-button>
                  </el-empty>
                </div>
              </div>
              
              <div class="action-group" v-if="detectedChapters.length > 0">
                <div class="selection-actions">
                  <el-button size="small" @click="selectAllChapters">全选</el-button>
                  <el-button size="small" @click="clearChapterSelection">清空</el-button>
                  <span class="selected-count">已选择 {{ selectedChaptersCount }} 个章节</span>
                </div>
                <el-button type="primary" size="default" @click="startChapterAnalysis" :loading="isAnalyzing" :disabled="selectedChaptersCount === 0" block>
                  <el-icon><MagicStick /></el-icon>
                  {{ isAnalyzing ? '分析中...' : '开始章节拆书' }}
                </el-button>
              </div>
            </el-tab-pane>
          </el-tabs>
        </el-card>

        <!-- 文件统计卡片 -->
        <el-card v-if="uploadedFile" class="stats-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <el-icon><DataAnalysis /></el-icon>
              <span>文件统计</span>
            </div>
          </template>
          
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ analysisResult?.wordCount || 206 }}</div>
              <div class="stat-label">总字数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ analysisResult?.chapterCount || 1 }}</div>
              <div class="stat-label">预计章节</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ Math.ceil((analysisResult?.wordCount || 206) / 200) }}分钟</div>
              <div class="stat-label">阅读时长</div>
            </div>
          </div>
        </el-card>
      </div>
      
      <!-- 右侧编辑器区域 -->
      <div class="main-content">
        <el-card class="editor-card" shadow="never">
          <template #header>
            <div class="editor-header">
              <div class="editor-title">
                <el-icon><Document /></el-icon>
                <span>拆书编辑器</span>
              </div>
              <div class="editor-actions">
                <el-button size="default" @click="saveContent" :loading="saving">
                  <el-icon><Document /></el-icon>
                  {{ saving ? '保存中...' : '保存' }}
                </el-button>
                <el-button size="default" @click="exportContent">
                  <el-icon><Download /></el-icon>
                  导出
                </el-button>
              </div>
            </div>
          </template>

          <div class="editor-wrapper">
            <el-input
              v-model="editorContent"
              type="textarea"
              :rows="25"
              placeholder="分析结果将在这里显示..."
              class="editor-textarea"
              resize="none"
            />
          </div>
        </el-card>
      </div>
    </div>
    
    <!-- 拆书结果弹窗 -->
    <el-drawer
      v-model="showAnalysisResult"
      title="拆书分析结果"
      direction="rtl"
      size="50%"
      :before-close="closeAnalysisResult"
    >
      <template #header>
        <div class="analysis-drawer-header">
          <div class="drawer-title">
            <el-icon><MagicStick /></el-icon>
            <span>拆书分析结果</span>
          </div>
          <div class="drawer-actions">
            <el-button size="small" type="primary" @click="applyAnalysisToEditor" :disabled="!analysisResultContent">
              <el-icon><Document /></el-icon>
              应用到编辑器
            </el-button>
            <el-button size="small" @click="copyAnalysisResult" :disabled="!analysisResultContent">
              <el-icon><CopyDocument /></el-icon>
              复制
            </el-button>
          </div>
        </div>
      </template>
      
      <div class="analysis-result-container">
        <!-- 进度提示 -->
        <div v-if="isAnalyzing" class="analysis-progress">
          <el-progress :percentage="100" :indeterminate="true" :duration="3" />
          <div class="progress-text">{{ analysisProgress }}</div>
        </div>
        
        <!-- 分析结果内容 -->
        <div v-if="analysisResultContent" class="analysis-content">
          <div class="markdown-content" v-html="renderMarkdown(analysisResultContent)"></div>
        </div>
        
        <!-- 空状态 -->
        <div v-if="!isAnalyzing && !analysisResultContent" class="empty-result">
          <el-empty description="暂无分析结果" :image-size="100" />
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { marked } from 'marked'
import {
  UploadFilled,
  Document,
  Setting,
  MagicStick,
  DataAnalysis,
  Download,
  Close,
  CopyDocument
} from '@element-plus/icons-vue'
import { ElMessage, ElLoading } from 'element-plus'
import { aiBusinessAPI, promptAPI } from '@/api'
import { useAiModelStore } from '@/stores/aiModel'

// Store实例
const aiModelStore = useAiModelStore()

// 响应式数据
const uploadedFile = ref(null)
const analysisResult = ref(null)
const isAnalyzing = ref(false)
const novelContent = ref('')
// selectedTemplate已合并到selectedPromptId中，不再需要单独的变量
const selectedEncoding = ref('UTF-8')
const analysisRange = ref([1, 5000])
const saving = ref(false)
const editorContent = ref('')

// 新增：拆书结果弹窗相关
const showAnalysisResult = ref(false)
const analysisResultContent = ref('')
const analysisProgress = ref('')
const selectedPromptId = ref('')
const availablePrompts = ref([])
const analysisTemplates = ref([])

// 新增：拆书模式和章节相关数据
const analysisMode = ref('range') // 'range' 或 'chapter'
const detectedChapters = ref([])
const totalWordCount = ref(5000)
const selectedChaptersCount = computed(() => {
  return detectedChapters.value.filter(chapter => chapter.selected).length
})

// 处理文件上传
const handleFileChange = (file) => {
  uploadedFile.value = file
  ElMessage.success(`文件 ${file.name} 上传成功`)
  // 自动分析文件内容
  analyzeBook()
}

// 分析书籍
const analyzeBook = async () => {
  if (!uploadedFile.value) {
    ElMessage.warning('请先上传文件')
    return
  }

  isAnalyzing.value = true
  ElMessage.info('正在读取文件内容...')

  try {
    // 使用FileReader读取实际文件内容
    const fileContent = await readFileContent(uploadedFile.value.raw)
    
    // 计算文件统计信息
    const wordCount = fileContent.length
    totalWordCount.value = wordCount
    
    // 智能拆分章节
    smartSplitChapters(fileContent)
    
    const chapterCount = detectedChapters.value.length || 1
    
    // 生成拆书分析内容
    novelContent.value = `# ${uploadedFile.value.name.replace(/\.[^/.]+$/, "")}

## 📄 原文内容

${fileContent}

---

## 📚 拆书分析

### 📖 基本信息
- **文件名**: ${uploadedFile.value.name}
- **文件大小**: ${formatFileSize(uploadedFile.value.size)}
- **字数统计**: ${wordCount}字
- **章节数量**: ${chapterCount}章
- **编码格式**: ${selectedEncoding.value}

### 🎯 内容概览
${generateContentSummary(fileContent)}

### 📝 学习笔记
*在此处添加你的学习心得和感悟...*

### 💡 分析要点
*使用上方的AI分析功能获取更详细的章节分析...*`
    
    // 设置编辑器内容
    editorContent.value = novelContent.value
    
    analysisResult.value = {
      title: uploadedFile.value.name.replace(/\.[^/.]+$/, ""),
      author: '未知作者',
      wordCount: wordCount,
      chapterCount: chapterCount
    }
    
    isAnalyzing.value = false
    ElMessage.success('文件读取完成！内容已导入编辑器')
  } catch (error) {
    console.error('文件读取失败:', error)
    isAnalyzing.value = false
    ElMessage.error('文件读取失败，请检查文件格式或编码')
  }
}

// 读取文件内容
const readFileContent = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      let content = e.target.result
      
      // 如果选择GBK编码且内容出现乱码，尝试其他方式处理
      if (selectedEncoding.value === 'GBK') {
        // 检测是否有乱码字符
        if (content.includes('�') || /[\u00C0-\u00FF]{2,}/.test(content)) {
          // 尝试重新以UTF-8读取
          const utf8Reader = new FileReader()
          utf8Reader.onload = (utf8Event) => {
            const utf8Content = utf8Event.target.result
            // 如果UTF-8读取结果更好，使用UTF-8结果
            if (!utf8Content.includes('�')) {
              ElMessage.warning('检测到文件可能是UTF-8编码，已自动切换')
              selectedEncoding.value = 'UTF-8'
              resolve(utf8Content)
            } else {
              resolve(content)
            }
          }
          utf8Reader.readAsText(file, 'UTF-8')
          return
        }
      }
      
      resolve(content)
    }
    
    reader.onerror = (e) => {
      reject(new Error('文件读取失败'))
    }
    
    // 根据选择的编码格式读取文件
    try {
      if (selectedEncoding.value === 'UTF-8') {
        reader.readAsText(file, 'UTF-8')
      } else {
        // 对于GBK，先尝试使用GB2312
        reader.readAsText(file, 'GB2312')
      }
    } catch (error) {
      // 如果编码不支持，回退到UTF-8
      ElMessage.warning('当前编码不支持，已切换到UTF-8')
      selectedEncoding.value = 'UTF-8'
      reader.readAsText(file, 'UTF-8')
    }
  })
}

// 生成内容摘要
const generateContentSummary = (content) => {
  const lines = content.split('\n').filter(line => line.trim())
  const firstFewLines = lines.slice(0, 5).join('\n')
  
  if (content.length > 500) {
    return `文件内容较长，以下是前几行预览：\n\n${firstFewLines}\n\n...（内容较长，已省略）`
  } else {
    return `文件内容预览：\n\n${firstFewLines}`
  }
}

// 格式化文件大小
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i]
}

// 重新读取文件
const reloadFile = () => {
  if (uploadedFile.value) {
    analyzeBook()
    ElMessage.success('文件重新读取成功')
  }
}

// 编码变化处理
const onEncodingChange = (newEncoding) => {
  if (uploadedFile.value) {
    ElMessage.info(`切换到${newEncoding}编码，正在重新读取文件...`)
    analyzeBook()
  }
}

// 智能拆分章节
const smartSplitChapters = async (content = null) => {
  let fileContent = content
  
  // 如果没有传递content，尝试重新读取文件
  if (!fileContent && uploadedFile.value) {
    try {
      fileContent = await readFileContent(uploadedFile.value.raw)
    } catch (error) {
      ElMessage.error('无法读取文件内容')
      return
    }
  }
  
  // 如果还是没有内容，使用novelContent.value
  if (!fileContent) {
    fileContent = novelContent.value
  }
  
  if (!fileContent) {
    ElMessage.warning('请先上传文件')
    return
  }
  
  // 确保 fileContent 是字符串类型
  if (typeof fileContent !== 'string') {
    fileContent = String(fileContent)
  }
  
  // 如果fileContent是markdown格式的分析结果，提取原文内容
  if (fileContent.includes('## 📄 原文内容')) {
    const contentMatch = fileContent.match(/## 📄 原文内容\s*\n\n([\s\S]*?)\n\n---/)
    if (contentMatch && contentMatch[1]) {
      fileContent = contentMatch[1].trim()
    }
  }
  
  const chapters = []
  
  // 章节匹配规则（按优先级排序）
  const chapterPatterns = [
    // 最常见的中文章节标题
    /^\s*第[一二三四五六七八九十百千万\d]+章[^\n]*$/gm,
    /^\s*第[\d]+章[^\n]*$/gm,
    // 英文章节标题
    /^\s*Chapter\s*[\d]+[^\n]*$/gmi,
    /^\s*CHAPTER\s*[\d]+[^\n]*$/gmi,
    // 卷标题
    /^\s*第[一二三四五六七八九十百千万\d]+卷[^\n]*$/gm,
    // 数字编号章节
    /^\s*[\d]+\s*[、.。]\s*[^\n]{1,30}$/gm,
    // 特殊标记章节
    /^\s*【[^】]{1,20}】\s*$/gm,
    // 罗马数字章节
    /^\s*[IVX]+[、.。]\s*[^\n]{1,30}$/gm
  ]
  
  let matches = []
  
  // 尝试不同的匹配模式
  for (const pattern of chapterPatterns) {
    const patternMatches = []
    let match
    
    // 使用 exec 方法替代 matchAll 以提高兼容性
    const regex = new RegExp(pattern.source, pattern.flags)
    while ((match = regex.exec(fileContent)) !== null) {
      patternMatches.push(match)
      // 防止无限循环
      if (!regex.global) break
    }
    
    if (patternMatches.length > 1) { // 至少要有2个匹配才认为是有效的章节分割
      matches = patternMatches
      break
    }
  }
  
  // 如果没有找到明显的章节标题，尝试按字数或段落分割
  if (matches.length === 0) {
    // 优先按字数分割，每3000-5000字为一章
    const avgChapterLength = 4000
    const totalLength = fileContent.length
    
    if (totalLength > avgChapterLength) {
      const chapterCount = Math.ceil(totalLength / avgChapterLength)
      const actualChapterLength = Math.floor(totalLength / chapterCount)
      
      for (let i = 0; i < chapterCount; i++) {
        const startPos = i * actualChapterLength
        const endPos = i === chapterCount - 1 ? totalLength : (i + 1) * actualChapterLength
        const chapterContent = fileContent.slice(startPos, endPos)
        
        chapters.push({
          title: `第${i + 1}部分`,
          content: chapterContent,
          startPos: startPos + 1,
          endPos: endPos,
          wordCount: chapterContent.length,
          selected: false
        })
      }
    } else {
      // 文件较短，尝试按段落分割
      const paragraphs = fileContent.split(/\n\s*\n/).filter(p => p.trim())
      if (paragraphs.length > 3) {
        const chapterSize = Math.max(1, Math.floor(paragraphs.length / Math.min(5, paragraphs.length)))
        let currentPos = 0
        
        for (let i = 0; i < paragraphs.length; i += chapterSize) {
          const chapterParagraphs = paragraphs.slice(i, i + chapterSize)
          
          // 在原文中找到这些段落的实际位置
          let chapterStartPos = currentPos
          let chapterContent = ''
          
          for (let j = 0; j < chapterParagraphs.length; j++) {
            const paragraph = chapterParagraphs[j]
            const paragraphIndex = fileContent.indexOf(paragraph, currentPos)
            
            if (j === 0) {
              chapterStartPos = paragraphIndex
            }
            
            chapterContent += paragraph
            if (j < chapterParagraphs.length - 1) {
              chapterContent += '\n\n'
            }
            
            currentPos = paragraphIndex + paragraph.length
          }
          
          chapters.push({
            title: `第${Math.floor(i / chapterSize) + 1}部分`,
            content: chapterContent,
            startPos: chapterStartPos + 1,
            endPos: chapterStartPos + chapterContent.length,
            wordCount: chapterContent.length,
            selected: false
          })
        }
      }
    }
  } else {
    // 根据匹配的章节标题分割内容
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i]
      const nextMatch = matches[i + 1]
      
      const startPos = currentMatch.index
      const endPos = nextMatch ? nextMatch.index : fileContent.length
      const chapterContent = fileContent.slice(startPos, endPos)
      
      chapters.push({
        title: currentMatch[0].trim(),
        content: chapterContent,
        startPos: startPos + 1,
        endPos: endPos,
        wordCount: chapterContent.length,
        selected: false
      })
    }
  }
  
  // 如果还是没有章节，创建一个默认章节
  if (chapters.length === 0) {
    chapters.push({
      title: '全文内容',
      content: fileContent,
      startPos: 1,
      endPos: fileContent.length,
      wordCount: fileContent.length,
      selected: false
    })
  }
  
  detectedChapters.value = chapters
  ElMessage.success(`智能拆分完成，检测到 ${chapters.length} 个章节`)
}

// 章节选择相关函数
const selectAllChapters = () => {
  detectedChapters.value.forEach(chapter => {
    chapter.selected = true
  })
}

const clearChapterSelection = () => {
  detectedChapters.value.forEach(chapter => {
    chapter.selected = false
  })
}

// 字数拆书分析
const startRangeAnalysis = async () => {
  if (!novelContent.value) {
    ElMessage.warning('请先上传文件')
    return
  }
  
  if (!selectedPromptId.value) {
    ElMessage.warning('请选择拆书模板')
    return
  }
  
  isAnalyzing.value = true
  ElMessage.info('正在进行字数范围分析...')
  
  try {
    // 提取原文内容
    let fileContent = novelContent.value
    if (fileContent.includes('## 📄 原文内容')) {
      const contentMatch = fileContent.match(/## 📄 原文内容\s*\n\n([\s\S]*?)\n\n---/)
      if (contentMatch && contentMatch[1]) {
        fileContent = contentMatch[1].trim()
      }
    }
    
    const startPos = analysisRange.value[0] - 1
    const endPos = analysisRange.value[1]
    const selectedContent = fileContent.slice(startPos, endPos)
    
    if (!selectedContent.trim()) {
      ElMessage.error('选择的范围内容为空')
      isAnalyzing.value = false
      return
    }
    
    // 获取当前选择的模型ID，确保为字符串类型
    const currentModelId = String(aiModelStore.selectedModelId || 'gpt-4')
    
    // 判断选中的是默认模板还是自定义Prompt
    const isDefaultTemplate = analysisTemplates.value.length > 0 && analysisTemplates.value.some(template => template.value === selectedPromptId.value)
    const analysisType = isDefaultTemplate ? selectedPromptId.value : 'comprehensive'
    const promptId = isDefaultTemplate ? undefined : selectedPromptId.value
    
    // 调用拆书API
    await callBookAnalysisAPI({
      book_name: uploadedFile.value?.name?.replace(/\.[^/.]+$/, "") || '未命名书籍',
      content_to_analyze: selectedContent,
      special_requirements: `分析第${analysisRange.value[0]}-${analysisRange.value[1]}字的内容`,
      analysis_type: analysisType,
      focus_points: ['结构分析', '内容特色', '写作技巧'],
      analysis_depth: '深入',
      target_audience: '一般读者',
      model_id: currentModelId,
      prompt_id: promptId,
      stream: true
    })
    
  } catch (error) {
    console.error('字数分析失败:', error)
    isAnalyzing.value = false
    if (error.message && error.message.includes('网络')) {
      ElMessage.error('网络连接错误，请检查网络后重试')
    } else {
      ElMessage.error('分析失败，请重试')
    }
  }
}

// 章节拆书分析
const startChapterAnalysis = async () => {
  const selectedChapters = detectedChapters.value.filter(chapter => chapter.selected)
  
  if (selectedChapters.length === 0) {
    ElMessage.warning('请至少选择一个章节')
    return
  }
  
  if (!selectedPromptId.value) {
    ElMessage.warning('请选择拆书模板')
    return
  }
  
  isAnalyzing.value = true
  ElMessage.info(`正在分析 ${selectedChapters.length} 个章节...`)
  
  try {
    // 合并选中章节的内容
    const combinedContent = selectedChapters.map(chapter => {
      return `### ${chapter.title}\n\n${chapter.content}`
    }).join('\n\n')
    
    // 获取当前选择的模型ID，确保为字符串类型
    const currentModelId = String(aiModelStore.selectedModelId || 'gpt-4')
    
    // 判断选中的是默认模板还是自定义Prompt
    const isDefaultTemplate = analysisTemplates.value.length > 0 && analysisTemplates.value.some(template => template.value === selectedPromptId.value)
    const analysisType = isDefaultTemplate ? selectedPromptId.value : 'comprehensive'
    const promptId = isDefaultTemplate ? undefined : selectedPromptId.value
    
    // 调用拆书API
    await callBookAnalysisAPI({
      book_name: uploadedFile.value?.name?.replace(/\.[^/.]+$/, "") || '未命名书籍',
      content_to_analyze: combinedContent,
      special_requirements: `分析选中的${selectedChapters.length}个章节：${selectedChapters.map(c => c.title).join('、')}`,
      analysis_type: analysisType,
      focus_points: ['章节结构', '内容发展', '写作手法'],
      analysis_depth: '深入',
      target_audience: '一般读者',
      model_id: currentModelId,
      prompt_id: promptId,
      stream: true
    })
    
  } catch (error) {
    console.error('章节分析失败:', error)
    isAnalyzing.value = false
    if (error.message && error.message.includes('网络')) {
      ElMessage.error('网络连接错误，请检查网络后重试')
    } else {
      ElMessage.error('分析失败，请重试')
    }
  }
}

// AI章节重点分析
const startAIAnalysis = async () => {
  if (!uploadedFile.value) {
    ElMessage.warning('请先上传文件')
    return
  }
  
  if (!selectedPromptId.value) {
    ElMessage.warning('请选择拆书模板')
    return
  }
  
  isAnalyzing.value = true
  ElMessage.info('AI正在分析章节重点...')
  
  try {
    // 读取文件内容
    const fileContent = await readFileContent(uploadedFile.value.raw)
    
    // 提取分析范围内的内容
    const startPos = Math.max(0, analysisRange.value[0] - 1)
    const endPos = Math.min(fileContent.length, analysisRange.value[1])
    const analysisContent = fileContent.substring(startPos, endPos)
    
    // 判断选中的是默认模板还是自定义Prompt
    const isDefaultTemplate = analysisTemplates.value.length > 0 && analysisTemplates.value.some(template => template.value === selectedPromptId.value)
    const templateValue = isDefaultTemplate ? selectedPromptId.value : 'comprehensive'
    
    // 基于实际内容生成分析
    const aiAnalysis = generateAIAnalysis(analysisContent, templateValue)
    
    // 将AI分析结果追加到编辑器内容
    editorContent.value += aiAnalysis
    
    isAnalyzing.value = false
    ElMessage.success('AI章节重点分析完成！')
  } catch (error) {
    console.error('AI分析失败:', error)
    isAnalyzing.value = false
    ElMessage.error('AI分析失败，请重试')
  }
}

// 生成AI分析内容
const generateAIAnalysis = (content, template) => {
  const lines = content.split('\n').filter(line => line.trim())
  const wordCount = content.length
  const paragraphs = content.split('\n\n').filter(p => p.trim())
  
  // 检测章节标题
  const chapters = content.match(/第[一二三四五六七八九十\d]+章[^\n]*|Chapter\s*\d+[^\n]*/gi) || []
  
  // 检测对话
  const dialogues = content.match(/[""''][^""'']*[""'']|"[^"]*"/g) || []
  
  return `\n\n## 🤖 AI章节重点分析\n\n### 分析模板：${template}\n### 分析范围：${wordCount}字符\n\n#### 📊 内容统计\n- **段落数量**：${paragraphs.length}段\n- **章节标题**：${chapters.length > 0 ? chapters.join('、') : '未检测到明确章节标题'}\n- **对话数量**：${dialogues.length}处\n\n#### 🎯 内容特征\n${generateContentFeatures(content)}\n\n#### 💡 写作技巧\n${generateWritingTechniques(content)}\n\n#### 📝 分析建议\n${generateAnalysisSuggestions(content, template)}\n\n---\n`
}

// 生成内容特征
const generateContentFeatures = (content) => {
  const features = []
  
  if (content.includes('第') && content.includes('章')) {
    features.push('- **章节结构**：包含明确的章节划分')
  }
  
  if (content.match(/[""''][^""'']*[""'']|"[^"]*"/g)) {
    features.push('- **对话描写**：包含人物对话')
  }
  
  if (content.match(/[。！？]\s*[\n\r]/g)) {
    features.push('- **叙述节奏**：句式变化丰富')
  }
  
  if (content.length > 1000) {
    features.push('- **内容长度**：内容较为丰富')
  }
  
  return features.length > 0 ? features.join('\n') : '- 基础文本结构，建议增加更多描写元素'
}

// 生成写作技巧分析
const generateWritingTechniques = (content) => {
  const techniques = []
  
  if (content.includes('...') || content.includes('……')) {
    techniques.push('- **悬念营造**：使用省略号营造悬念')
  }
  
  if (content.match(/[""''][^""'']*[""'']|"[^"]*"/g)) {
    techniques.push('- **对话推进**：通过对话推动情节发展')
  }
  
  if (content.match(/第[一二三四五六七八九十\d]+章/g)) {
    techniques.push('- **结构清晰**：章节划分明确')
  }
  
  return techniques.length > 0 ? techniques.join('\n') : '- 基础写作技巧，建议增加更多修辞手法'
}

// 生成分析建议
const generateAnalysisSuggestions = (content, template) => {
  const suggestions = []
  
  if (template === 'classic') {
    suggestions.push('- 可以增加更多的环境描写和心理描写')
    suggestions.push('- 注意语言的典雅性和文学性')
  } else if (template === 'modern') {
    suggestions.push('- 可以加强现代感的表达方式')
    suggestions.push('- 注意节奏的把控和情节的紧凑性')
  } else if (template === 'scifi') {
    suggestions.push('- 可以增加更多科技元素的描述')
    suggestions.push('- 注意逻辑的严密性和想象力的发挥')
  }
  
  if (content.length < 500) {
    suggestions.push('- 内容相对较短，可以考虑增加更多细节描写')
  }
  
  return suggestions.length > 0 ? suggestions.join('\n') : '- 继续保持当前的写作风格，注意细节的完善'
}

// 调用拆书API的核心方法
const callBookAnalysisAPI = async (params) => {
  try {
    // 显示分析结果弹窗
    showAnalysisResult.value = true
    analysisResultContent.value = ''
    analysisProgress.value = '正在连接AI服务...'
    
    // 调用SSE流式API
    await handleStreamResponse(params)
    
  } catch (error) {
    console.error('拆书API调用失败:', error)
    // 确保分析状态被重置
    isAnalyzing.value = false
    analysisProgress.value = '分析失败'
    
    // 如果错误还没有被显示给用户，显示一个通用错误
    if (!error.message.includes('网络连接错误') && 
        !error.message.includes('AI服务暂时无响应') && 
        !error.message.includes('无法连接到服务器')) {
      ElMessage.error('拆书分析失败，请重试')
    }
    
    throw error
  }
}

// 处理SSE流式响应
const handleStreamResponse = async (params) => {
  try {
    console.log('发送拆书分析请求:', params)
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/ai-business/book-analyze/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(params)
    })
    
    console.log('API响应状态:', response.status, response.statusText)
    
    if (!response.ok) {
      // 尝试解析错误响应
      let errorMessage = `HTTP error! status: ${response.status}`
      try {
        const errorText = await response.text()
        console.log('错误响应内容:', errorText)
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorMessage
      } catch (parseError) {
        console.warn('解析错误响应失败:', parseError)
      }
      throw new Error(errorMessage)
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let hasContent = false
    let receivedData = []
    
    analysisProgress.value = '正在生成拆书分析...'
    
    while (true) {
      const { done, value } = await reader.read()
      
      if (done) {
        console.log('流读取完成，收到的数据:', receivedData)
        if (hasContent) {
          analysisProgress.value = '拆书分析完成！'
          isAnalyzing.value = false
          ElMessage.success('拆书分析完成！')
          return
        }
        break
      }
      
      const chunk = decoder.decode(value, { stream: true })
      console.log('收到数据块:', chunk)
      const lines = chunk.split('\n')
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = line.slice(6)
            receivedData.push(data)
            
            if (data === '[DONE]') {
              console.log('收到结束标记')
              analysisProgress.value = '拆书分析完成！'
              isAnalyzing.value = false
              ElMessage.success('拆书分析完成！')
              return
            }
            
            if (data.trim() === '') {
              continue
            }
            
            const parsed = JSON.parse(data)
            console.log('解析的数据:', parsed)
            
            if (parsed.content) {
              hasContent = true
              analysisResultContent.value += parsed.content
              analysisProgress.value = '正在生成拆书分析...'
            } else if (parsed.error) {
              throw new Error(parsed.error)
            }
          } catch (parseError) {
            console.warn('解析SSE数据失败:', parseError, 'Line:', line)
            // 如果不是JSON格式，可能是纯文本内容
            if (line.slice(6).trim() && !line.slice(6).startsWith('{')) {
              hasContent = true
              analysisResultContent.value += line.slice(6)
            }
          }
        }
      }
    }
    
    if (!hasContent) {
      console.error('未收到有效内容，收到的所有数据:', receivedData)
      throw new Error('未收到有效的分析内容，请检查网络连接或稍后重试')
    }
    
  } catch (error) {
    console.error('SSE流处理失败:', error)
    analysisProgress.value = '分析失败'
    isAnalyzing.value = false
    
    // 提供更友好的错误信息
    let userFriendlyMessage = '拆书分析失败'
    
    if (error.message.includes('HTTP error')) {
      userFriendlyMessage = '网络连接错误，请检查网络后重试'
    } else if (error.message.includes('未收到有效的分析内容')) {
      userFriendlyMessage = 'AI服务暂时无响应，请稍后重试'
    } else if (error.message.includes('Failed to fetch')) {
      userFriendlyMessage = '无法连接到服务器，请检查网络连接'
    } else {
      userFriendlyMessage = error.message || '未知错误，请重试'
    }
    
    ElMessage.error(userFriendlyMessage)
    throw new Error(userFriendlyMessage)
  }
}

// 关闭分析结果弹窗
const closeAnalysisResult = () => {
  showAnalysisResult.value = false
  analysisResultContent.value = ''
  analysisProgress.value = ''
}

// 将分析结果应用到编辑器
const applyAnalysisToEditor = () => {
  if (analysisResultContent.value) {
    editorContent.value = analysisResultContent.value
    ElMessage.success('分析结果已应用到编辑器')
    closeAnalysisResult()
  }
}

// 复制分析结果到剪贴板
const copyAnalysisResult = async () => {
  if (!analysisResultContent.value) {
    ElMessage.warning('暂无分析结果可复制')
    return
  }
  
  try {
    await navigator.clipboard.writeText(analysisResultContent.value)
    ElMessage.success('分析结果已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
  }
}

// 获取拆书分析模板
const fetchAnalysisTemplates = async () => {
  // 不再调用系统设置接口，直接使用空数组
  analysisTemplates.value = []
}

// 获取拆书类型的prompt模板
const fetchBookAnalysisPrompts = async () => {
  try {
    const response = await promptAPI.getPrompts({
      category: 'book_analysis',
      page: 1,
      pageSize: 100,
      status: 'active' // 只获取启用状态的提示词
    })
    if (response.data && response.data.prompts) {
      availablePrompts.value = response.data.prompts
    }
  } catch (error) {
    console.error('获取prompt模板失败:', error)
  }
}

// 模板变化处理（已合并到统一的选择器中，不再需要单独处理）
// const onTemplateChange = () => {
//   // 清空当前选中的prompt
//   selectedPromptId.value = ''
//   // 当模板变化时，重新获取对应的prompt
//   fetchBookAnalysisPrompts()
// }

// 组件挂载时初始化
onMounted(() => {
  // 初始化获取拆书分析模板
  fetchAnalysisTemplates()
  // 初始化获取拆书类型的prompt模板
  fetchBookAnalysisPrompts()
})

// 开始拆书分析
const startBookAnalysis = async () => {
  if (!uploadedFile.value) {
    ElMessage.warning('请先上传文件')
    return
  }
  
  isAnalyzing.value = true
  ElMessage.info('正在进行拆书分析...')
  
  try {
    // 读取文件内容
    const fileContent = await readFileContent(uploadedFile.value.raw)
    
    // 基于实际内容生成深度分析
    const bookAnalysis = generateBookAnalysis(fileContent)
    
    // 将拆书分析结果追加到编辑器内容
    editorContent.value += bookAnalysis
    
    isAnalyzing.value = false
    ElMessage.success('拆书分析完成！')
  } catch (error) {
    console.error('拆书分析失败:', error)
    isAnalyzing.value = false
    ElMessage.error('拆书分析失败，请重试')
  }
}

// 生成拆书分析内容
const generateBookAnalysis = (content) => {
  const lines = content.split('\n').filter(line => line.trim())
  const paragraphs = content.split('\n\n').filter(p => p.trim())
  const chapters = content.match(/第[一二三四五六七八九十\d]+章[^\n]*|Chapter\s*\d+[^\n]*/gi) || []
  const dialogues = content.match(/[""''][^""'']*[""'']|"[^"]*"/g) || []
  
  return `\n\n## 📚 深度拆书分析报告\n\n### 📖 作品概览\n- **文本长度**：${content.length}字符\n- **段落数量**：${paragraphs.length}段\n- **章节数量**：${chapters.length}章\n- **对话片段**：${dialogues.length}处\n\n### 🏗️ 结构分析\n#### 章节划分\n${generateChapterAnalysis(chapters)}\n\n#### 内容组织\n${generateContentOrganization(content)}\n\n### 🎭 内容分析\n#### 主要特征\n${generateMainFeatures(content)}\n\n#### 表达方式\n${generateExpressionStyle(content)}\n\n### 🎨 写作技法\n#### 语言特色\n${generateLanguageFeatures(content)}\n\n#### 结构特点\n${generateStructureFeatures(content)}\n\n### 📊 文本特色\n${generateTextCharacteristics(content)}\n\n### 💭 深度思考\n#### 内容价值\n${generateContentValue(content)}\n\n#### 学习要点\n${generateLearningPoints(content)}\n\n---\n`
}



// 生成章节分析
const generateChapterAnalysis = (chapters) => {
  if (chapters.length === 0) {
    return '- 未检测到明确的章节标题，建议添加章节划分'
  }
  return chapters.map((chapter, index) => `${index + 1}. **${chapter.trim()}**`).join('\n')
}

// 生成内容组织分析
const generateContentOrganization = (content) => {
  const features = []
  if (content.includes('\n\n')) {
    features.push('- **段落分明**：内容按段落清晰组织')
  }
  if (content.match(/[。！？]\s*[\n\r]/g)) {
    features.push('- **句式丰富**：包含多种句式结构')
  }
  return features.length > 0 ? features.join('\n') : '- 基础文本结构，建议优化内容组织'
}

// 生成主要特征
const generateMainFeatures = (content) => {
  const features = []
  if (content.match(/[""''][^""'']*[""'']|"[^"]*"/g)) {
    features.push('- **对话丰富**：包含人物对话或引用内容')
  }
  if (content.match(/[，。！？；：]/g)) {
    features.push('- **标点规范**：使用标准中文标点符号')
  }
  if (content.length > 1000) {
    features.push('- **内容充实**：文本内容较为丰富')
  }
  return features.length > 0 ? features.join('\n') : '- 基础文本特征，建议增加更多内容元素'
}

// 生成表达方式分析
const generateExpressionStyle = (content) => {
  const styles = []
  if (content.includes('...') || content.includes('……')) {
    styles.push('- **悬念表达**：使用省略号营造悬念或停顿')
  }
  if (content.match(/[！？]{2,}/g)) {
    styles.push('- **情感强化**：使用多重标点强调情感')
  }
  return styles.length > 0 ? styles.join('\n') : '- 平实的表达方式，建议增加修辞技巧'
}

// 生成语言特色分析
const generateLanguageFeatures = (content) => {
  const features = []
  if (content.match(/[一二三四五六七八九十]/g)) {
    features.push('- **数字表达**：使用中文数字表达')
  }
  if (content.match(/的|了|着|过/g)) {
    features.push('- **助词运用**：恰当使用中文助词')
  }
  return features.length > 0 ? features.join('\n') : '- 基础语言运用，建议丰富表达方式'
}

// 生成结构特点分析
const generateStructureFeatures = (content) => {
  const features = []
  const paragraphs = content.split('\n\n').filter(p => p.trim())
  if (paragraphs.length > 3) {
    features.push('- **层次分明**：内容分段清晰，层次感强')
  }
  if (content.match(/第[一二三四五六七八九十\d]+章/g)) {
    features.push('- **章节完整**：具有完整的章节结构')
  }
  return features.length > 0 ? features.join('\n') : '- 基础结构安排，建议优化内容层次'
}

// 生成文本特色分析
const generateTextCharacteristics = (content) => {
  const characteristics = []
  if (content.match(/[""''][^""'']*[""'']|"[^"]*"/g)) {
    characteristics.push('- **互动性强**：包含对话或引用，增强阅读体验')
  }
  if (content.length > 500) {
    characteristics.push('- **信息丰富**：内容详实，信息量充足')
  }
  return characteristics.length > 0 ? characteristics.join('\n') : '- 基础文本特色，建议增强特色元素'
}

// 生成内容价值分析
const generateContentValue = (content) => {
  const values = []
  if (content.match(/第[一二三四五六七八九十\d]+章/g)) {
    values.push('- **结构价值**：具有良好的章节结构，便于阅读理解')
  }
  if (content.length > 1000) {
    values.push('- **信息价值**：内容丰富，具有一定的信息密度')
  }
  return values.length > 0 ? values.join('\n') : '- 基础内容价值，建议深化主题表达'
}

// 生成学习要点
const generateLearningPoints = (content) => {
  const points = []
  if (content.match(/[""''][^""'']*[""'']|"[^"]*"/g)) {
    points.push('- **对话技巧**：学习如何通过对话推进情节')
  }
  if (content.match(/第[一二三四五六七八九十\d]+章/g)) {
    points.push('- **结构安排**：学习章节划分和内容组织')
  }
  points.push('- **文本分析**：练习从多角度分析文本特征')
  return points.join('\n')
}

// 生成字数范围分析
const generateRangeAnalysis = async (content, range) => {
  const wordCount = content.length
  const sentences = content.split(/[。！？.!?]/).filter(s => s.trim().length > 0)
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  
  return `# 字数范围拆书分析

## 📊 分析范围
- **起始位置**: 第${range[0]}字
- **结束位置**: 第${range[1]}字
- **分析字数**: ${wordCount}字
- **句子数量**: ${sentences.length}句
- **段落数量**: ${paragraphs.length}段

## 📄 选中内容

${content}

---

## 📚 内容分析

### 🎯 内容特点
${generateContentFeatures(content)}

### ✍️ 写作技巧
${generateWritingTechniques(content)}

### 💡 分析建议
 ${generateAnalysisSuggestions(content)}

### 📝 学习要点
${generateLearningPoints(content)}

---

*分析完成时间: ${new Date().toLocaleString()}*`
}

// 生成章节分析报告
const generateChapterAnalysisReport = async (selectedChapters) => {
  const totalWords = selectedChapters.reduce((sum, chapter) => sum + chapter.wordCount, 0)
  const chapterCount = selectedChapters.length
  
  let report = `# 章节拆书分析报告

## 📊 分析概览
- **选中章节**: ${chapterCount}个
- **总字数**: ${totalWords}字
- **平均章节长度**: ${Math.round(totalWords / chapterCount)}字

## 📖 章节列表
`
  
  selectedChapters.forEach((chapter, index) => {
    report += `### ${index + 1}. ${chapter.title}
- **字数**: ${chapter.wordCount}字
- **位置**: 第${chapter.startPos}-${chapter.endPos}字

`
  })
  
  report += `## 📚 详细分析

`
  
  for (let i = 0; i < selectedChapters.length; i++) {
    const chapter = selectedChapters[i]
    report += `### 📄 ${chapter.title}

#### 原文内容
${chapter.content.substring(0, 500)}${chapter.content.length > 500 ? '...' : ''}

#### 内容分析
${generateContentFeatures(chapter.content)}

#### 写作技巧
${generateWritingTechniques(chapter.content)}

#### 学习要点
${generateLearningPoints(chapter.content)}

---

`
  }
  
  report += `## 🎯 整体总结

### 📈 统计信息
- 最长章节: ${selectedChapters.reduce((max, chapter) => chapter.wordCount > max.wordCount ? chapter : max).title} (${selectedChapters.reduce((max, chapter) => chapter.wordCount > max.wordCount ? chapter : max).wordCount}字)
- 最短章节: ${selectedChapters.reduce((min, chapter) => chapter.wordCount < min.wordCount ? chapter : min).title} (${selectedChapters.reduce((min, chapter) => chapter.wordCount < min.wordCount ? chapter : min).wordCount}字)

### 💡 综合建议
- 注意各章节之间的逻辑关系和过渡
- 分析不同章节的写作风格变化
- 关注情节发展的节奏控制
- 学习章节结构的安排技巧

---

*分析完成时间: ${new Date().toLocaleString()}*`
  
  return report
}

// 保存内容
const saveContent = async () => {
  if (!editorContent.value.trim()) {
    ElMessage.warning('没有可保存的内容')
    return
  }
  
  saving.value = true
  
  try {
    // 这里可以调用API保存内容
    await new Promise(resolve => setTimeout(resolve, 1000)) // 模拟保存
    
    ElMessage.success('内容保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 导出内容
const exportContent = () => {
  if (!editorContent.value.trim()) {
    ElMessage.warning('没有可导出的内容')
    return
  }
  
  const blob = new Blob([editorContent.value], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `拆书分析_${uploadedFile.value?.name || '未命名'}_${new Date().toISOString().slice(0, 10)}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  
  ElMessage.success('内容导出成功')
}

// 渲染Markdown内容
const renderMarkdown = (content) => {
  if (!content) return ''
  try {
    // 配置marked选项
    marked.setOptions({
      breaks: true,
      gfm: true,
      sanitize: false
    })
    return marked(content)
  } catch (error) {
    console.error('Markdown渲染失败:', error)
    return content
  }
}

</script>

<style scoped>
.book-analysis {
  width: 100%;
  margin: 0;
  padding: 20px;
  background: #f5f7fa;
  height: calc(100vh - 100px);
}

/* 主容器布局 */
.analysis-container {
  display: flex;
  gap: 24px;
  height: calc(100vh - 120px);
  max-width: 1400px;
  margin: 0 auto;
}

.sidebar {
  width: 400px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  overflow-y: auto;
  padding-right: 8px;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 卡片通用样式 */
.upload-card,
.file-card,
.settings-card,
.stats-card {
  margin-bottom: 0;
  flex-shrink: 0;
}

/* 自定义滚动条样式 */
.sidebar::-webkit-scrollbar {
  width: 6px;
}

.sidebar::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.sidebar::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
  transition: background 0.3s ease;
}

.sidebar::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.editor-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

/* 上传区域样式 */
.upload-area {
  width: 100%;
}

.upload-icon {
  font-size: 48px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.upload-text {
  color: #606266;
  font-size: 16px;
  margin-bottom: 8px;
  font-weight: 500;
}

.upload-hint {
  color: #909399;
  font-size: 12px;
}

/* 文件信息样式 */
.file-info {
  margin-bottom: 16px;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e6e6e6;
  transition: all 0.3s ease;
}

.file-item:hover {
  background: #ecf5ff;
  border-color: #409eff;
}

.file-icon {
  color: #409eff;
  font-size: 24px;
}

.file-details {
  flex: 1;
}

.file-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  word-break: break-all;
}

.file-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-size {
  font-size: 12px;
  color: #666;
}

/* 编码选择样式 */
.encoding-selector {
  padding-top: 16px;
  border-top: 1px solid #e6e6e6;
}

.selector-label {
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  font-weight: 600;
}

/* 分析设置样式 */
.setting-group {
  margin-bottom: 20px;
}

.setting-group:last-child {
  margin-bottom: 0;
}

.setting-label {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 8px;
  font-weight: 600;
}

.range-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.range-divider {
  font-size: 14px;
  color: #666;
  margin: 0 4px;
  font-weight: 500;
}

.range-hint {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

/* Tab样式 */
.analysis-tabs {
  margin-top: 16px;
}

:deep(.analysis-tabs .el-tabs__header) {
  margin: 0 0 16px 0;
}

:deep(.analysis-tabs .el-tabs__nav-wrap) {
  padding: 0;
}

/* 章节相关样式 */
.chapter-info {
  margin-bottom: 16px;
}

.chapter-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  color: #606266;
  margin-bottom: 12px;
}

.chapter-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  padding: 8px;
}

.chapter-item {
  margin-bottom: 12px;
}

.chapter-item:last-child {
  margin-bottom: 0;
}

:deep(.chapter-item .el-checkbox) {
  width: 100%;
}

:deep(.chapter-item .el-checkbox__label) {
  width: 100%;
  padding-left: 8px;
}

.chapter-detail {
  width: 100%;
}

.chapter-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
  font-size: 14px;
}

.chapter-meta {
  font-size: 12px;
  color: #909399;
}

.no-chapters {
  text-align: center;
  padding: 20px;
}

.selection-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.selected-count {
  font-size: 12px;
  color: #909399;
}

.action-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 20px;
}

/* 文件统计样式 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px 8px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 8px;
  border: 1px solid #e6e6e6;
  transition: all 0.3s ease;
}

.stat-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #409eff;
  margin-bottom: 4px;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  color: #666;
  font-weight: 500;
}

/* 编辑器区域样式 */
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.editor-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #333;
  font-size: 16px;
}

.editor-actions {
  display: flex;
  gap: 12px;
}

.editor-wrapper {
  flex: 1;
  overflow: hidden;
  margin-top: 16px;
}

.editor-textarea {
  height: 100%;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
}

:deep(.editor-textarea .el-textarea__inner) {
  height: 100% !important;
  min-height: calc(100vh - 250px) !important;
  border-radius: 8px;
  border: 1px solid #e6e6e6;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
  padding: 20px;
  resize: none;
}



/* Element Plus 组件样式覆盖 */
:deep(.el-card) {
  border-radius: 12px;
  border: 1px solid #e6e6e6;
  transition: all 0.3s ease;
}

:deep(.el-card:hover) {
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

:deep(.el-card__header) {
  background: #fafafa;
  border-bottom: 1px solid #e6e6e6;
  padding: 16px 20px;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-upload-dragger) {
  border-radius: 8px;
  border: 2px dashed #d9d9d9;
  transition: all 0.3s ease;
}

:deep(.el-upload-dragger:hover) {
  border-color: #409eff;
}

:deep(.el-button) {
  border-radius: 6px;
  font-weight: 500;
}

:deep(.el-select) {
  width: 100%;
}

:deep(.el-input-number) {
  width: 100%;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .analysis-container {
    flex-direction: column;
    height: auto;
  }
  
  .sidebar {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
    gap: 16px;
  }
  
  .sidebar > * {
    flex-shrink: 0;
    min-width: 300px;
  }
  
  .main-content {
    min-height: 600px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .book-analysis {
    padding: 10px;
  }
  
  .analysis-container {
    gap: 16px;
  }
  
  .sidebar {
    flex-direction: column;
  }
  
  .sidebar > * {
    min-width: auto;
  }
  
  .file-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .file-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .range-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .range-divider {
    display: none;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
  
  .editor-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
  
  .editor-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  :deep(.el-card__header) {
    padding: 12px 16px;
  }
  
  :deep(.el-card__body) {
    padding: 16px;
  }
}

/* 拆书结果弹窗样式 */
.analysis-drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.drawer-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.drawer-actions {
  display: flex;
  gap: 8px;
}

.analysis-result-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.analysis-progress {
  padding: 20px;
  text-align: center;
}

.progress-text {
  margin-top: 12px;
  color: #606266;
  font-size: 14px;
}

.analysis-content {
  flex: 1;
  padding: 0;
}

.result-textarea {
  height: 100%;
}

:deep(.result-textarea .el-textarea__inner) {
  height: 100% !important;
  min-height: 100% !important;
  resize: none !important;
  border: none;
  box-shadow: none;
  background-color: #fafafa;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.6;
  padding: 16px;
}

.empty-result {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

/* Markdown内容样式 */
.markdown-content {
  padding: 16px;
  background-color: #fafafa;
  border-radius: 6px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  max-height: calc(100vh - 115px);
  overflow-y: auto;
}

.markdown-content :deep(h1) {
  font-size: 24px;
  font-weight: 600;
  margin: 20px 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e1e4e8;
  color: #24292e;
}

.markdown-content :deep(h2) {
  font-size: 20px;
  font-weight: 600;
  margin: 18px 0 14px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid #e1e4e8;
  color: #24292e;
}

.markdown-content :deep(h3) {
  font-size: 18px;
  font-weight: 600;
  margin: 16px 0 12px 0;
  color: #24292e;
}

.markdown-content :deep(h4) {
  font-size: 16px;
  font-weight: 600;
  margin: 14px 0 10px 0;
  color: #24292e;
}

.markdown-content :deep(h5) {
  font-size: 14px;
  font-weight: 600;
  margin: 12px 0 8px 0;
  color: #24292e;
}

.markdown-content :deep(h6) {
  font-size: 13px;
  font-weight: 600;
  margin: 10px 0 6px 0;
  color: #24292e;
}

.markdown-content :deep(p) {
  margin: 0 0 12px 0;
  line-height: 1.6;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0 0 12px 0;
  padding-left: 24px;
}

.markdown-content :deep(li) {
  margin: 4px 0;
  line-height: 1.5;
}

.markdown-content :deep(blockquote) {
  margin: 12px 0;
  padding: 8px 16px;
  background-color: #f6f8fa;
  border-left: 4px solid #dfe2e5;
  color: #6a737d;
  font-style: italic;
}

.markdown-content :deep(code) {
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
  font-size: 85%;
  margin: 0;
  padding: 0.2em 0.4em;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
}

.markdown-content :deep(pre) {
  background-color: #f6f8fa;
  border-radius: 6px;
  font-size: 85%;
  line-height: 1.45;
  overflow: auto;
  padding: 16px;
  margin: 12px 0;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  border: 0;
  display: inline;
  line-height: inherit;
  margin: 0;
  max-width: auto;
  overflow: visible;
  padding: 0;
  word-wrap: normal;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  border-spacing: 0;
  width: 100%;
  margin: 12px 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #dfe2e5;
  padding: 6px 13px;
  text-align: left;
}

.markdown-content :deep(th) {
  background-color: #f6f8fa;
  font-weight: 600;
}

.markdown-content :deep(tr:hover) {
  background-color: #f6f8fa;
}

.markdown-content :deep(a) {
  color: #0366d6;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

.markdown-content :deep(hr) {
  border: 0;
  border-top: 1px solid #e1e4e8;
  margin: 24px 0;
}

.markdown-content :deep(strong) {
  font-weight: 600;
}

.markdown-content :deep(em) {
  font-style: italic;
}

/* Prompt选择器样式 */
.prompt-option {
  padding: 4px 0;
}

.prompt-title {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
}

.prompt-desc {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
  line-height: 1.4;
}
</style>
