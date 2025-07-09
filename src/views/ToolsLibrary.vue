<template>
  <div class="tools-library">
    
    <div class="tools-grid">
      <!-- 细纲生成器 -->
      <div class="tool-card" @click="openTool('outline')">
        <div class="tool-icon">📝</div>
        <h3>细纲生成器</h3>
        <p>根据故事设定生成详细的章节细纲</p>
      </div>
      
      <!-- 金手指生成器 -->
      <div class="tool-card" @click="openTool('cheat')">
        <div class="tool-icon">✨</div>
        <h3>金手指生成器</h3>
        <p>为主角设计独特的特殊能力</p>
      </div>
      
      <!-- 黄金开篇生成器 -->
      <div class="tool-card" @click="openTool('opening')">
        <div class="tool-icon">🚀</div>
        <h3>黄金开篇生成器</h3>
        <p>创造引人入胜的小说开头</p>
      </div>
      
      <!-- 爆款书名生成器 -->
      <div class="tool-card" @click="openTool('title')">
        <div class="tool-icon">💎</div>
        <h3>爆款书名生成器</h3>
        <p>生成吸引读者的书名</p>
      </div>
      
      <!-- 爆款题材生成器 -->
      <div class="tool-card" @click="openTool('genre')">
        <div class="tool-icon">🎯</div>
        <h3>爆款题材生成器</h3>
        <p>挖掘热门题材和创意点子</p>
      </div>
      
      <!-- 脑洞生成器 -->
      <div class="tool-card" @click="openTool('brainstorm')">
        <div class="tool-icon">🧠</div>
        <h3>脑洞生成器</h3>
        <p>激发创意灵感的随机想法</p>
      </div>
      
      <!-- 简介生成器 -->
      <div class="tool-card" @click="openTool('synopsis')">
        <div class="tool-icon">📋</div>
        <h3>简介生成器</h3>
        <p>生成精彩的小说简介和推荐语</p>
      </div>
      
      <!-- 宏大世界观生成器 -->
      <div class="tool-card" @click="openTool('worldview')">
        <div class="tool-icon">🌍</div>
        <h3>宏大世界观生成器</h3>
        <p>构建完整的虚构世界背景</p>
      </div>
      
      <!-- 角色生成器 -->
      <div class="tool-card" @click="openTool('character')">
        <div class="tool-icon">👤</div>
        <h3>角色生成器</h3>
        <p>创建丰富立体的人物角色</p>
      </div>
      
      <!-- 冲突生成器 -->
      <div class="tool-card" @click="openTool('conflict')">
        <div class="tool-icon">⚡</div>
        <h3>冲突生成器</h3>
        <p>设计引人入胜的故事冲突</p>
      </div>
    </div>
    
    <!-- 工具对话框 -->
    <el-dialog 
      v-model="showToolDialog" 
      :title="currentTool.title"
      width="900px"
      class="tool-dialog"
      :close-on-click-modal="false"
    >
      <div class="tool-content">
        <div class="tool-form">
          <el-form :model="toolForm" label-width="100px" @submit.prevent="generateContent">
            <el-form-item v-for="field in currentTool.fields" :key="field.key" :label="field.label">
              <!-- 小说选择器 -->
              <el-select 
                v-if="field.type === 'novel-select'"
                v-model="toolForm[field.key]" 
                :placeholder="field.placeholder"
                @change="onNovelChange"
                clearable
              >
                <el-option 
                  v-for="novel in novelList" 
                  :key="novel.value" 
                  :label="novel.label" 
                  :value="novel.value"
                />
              </el-select>
              
              <!-- 章节多选器 -->
              <el-select 
                v-else-if="field.type === 'chapter-select'"
                v-model="toolForm[field.key]" 
                :placeholder="field.placeholder"
                multiple
                collapse-tags
                collapse-tags-tooltip
                :disabled="!toolForm.selectedNovel"
                clearable
              >
                <el-option 
                  v-for="chapter in selectedNovelChapters" 
                  :key="chapter.value" 
                  :label="chapter.label" 
                  :value="chapter.value"
                />
              </el-select>
              
              <!-- 普通输入框 -->
              <el-input 
                v-else-if="field.type === 'input'"
                v-model="toolForm[field.key]" 
                :placeholder="field.placeholder"
                :type="field.key === 'count' && currentToolType === 'character' ? 'number' : 'text'"
                :min="field.key === 'count' && currentToolType === 'character' ? 1 : undefined"
                :max="field.key === 'count' && currentToolType === 'character' ? 15 : undefined"
                @keyup.enter="generateContent"
                @input="validateCharacterCount(field, $event)"
              />
              <!-- 角色数量提示 -->
              <div 
                v-if="field.key === 'count' && currentToolType === 'character' && toolForm[field.key]"
                class="character-count-hint"
              >
                <span v-if="isValidCharacterCount(toolForm[field.key])" class="valid-hint">
                  ✓ 将生成 {{ toolForm[field.key] }} 个角色
                </span>
                <span v-else class="invalid-hint">
                  ⚠️ 请输入1-15之间的数字
                </span>
              </div>
              
              <!-- 文本域 -->
              <el-input 
                v-else-if="field.type === 'textarea'"
                v-model="toolForm[field.key]" 
                type="textarea" 
                :rows="4"
                :placeholder="field.placeholder"
              />
              
              <!-- 提示词选择器 -->
              <el-select 
                v-else-if="field.type === 'prompt-select'"
                v-model="toolForm[field.key]" 
                :placeholder="field.placeholder"
                clearable
                filterable
                @change="onPromptChange"
              >
                <el-option 
                  v-for="prompt in getPromptsByCategory(field.category)" 
                  :key="prompt.id" 
                  :label="prompt.title" 
                  :value="prompt.id"
                >
                  <div class="prompt-option">
                    <div class="prompt-option-title">{{ prompt.title }}</div>
                    <div class="prompt-option-desc">{{ prompt.description }}</div>
                  </div>
                </el-option>
              </el-select>
              
              <!-- 下拉选择 -->
              <el-select 
                v-else-if="field.type === 'select'"
                v-model="toolForm[field.key]" 
                :placeholder="field.placeholder"
              >
                <el-option 
                  v-for="option in field.options" 
                  :key="option.value" 
                  :label="option.label" 
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-form>
        </div>
        
        <div class="tool-actions">
          <el-button type="primary" @click="generateContent" :loading="generating" :disabled="!canGenerate">
            <el-icon><MagicStick /></el-icon>
            {{ generating ? '生成中...' : '生成内容' }}
          </el-button>
          <el-button @click="clearForm" :disabled="generating">
            清空
          </el-button>
        </div>
        
        <!-- 生成进度提示 -->
        <div v-if="generating" class="generating-status">
          <el-progress :percentage="generatingProgress" :show-text="false" />
          <span class="status-text">{{ generatingStatusText }}</span>
        </div>
        
        <!-- 结果显示区 -->
        <div class="tool-result" v-if="generatedContent || generating">
          <h4>生成结果：</h4>
          <div class="result-content-wrapper">
            <el-input
              v-model="displayContent"
              type="textarea"
              :rows="15"
              readonly
              class="result-textarea"
              placeholder="生成的内容将在这里显示..."
              ref="resultTextarea"
            />
          </div>
          <div class="result-actions" v-if="generatedContent && !generating">
            <el-button @click="copyToClipboard" :disabled="!generatedContent">
              <el-icon><CopyDocument /></el-icon>
              复制
            </el-button>
            <el-button @click="saveResult" :disabled="!generatedContent">
              <el-icon><DocumentAdd /></el-icon>
              保存到本地
            </el-button>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { MagicStick, Refresh, CopyDocument, DocumentAdd } from '@element-plus/icons-vue'
import { useNovelStore } from '@/stores/novel'

const novelStore = useNovelStore()

const showToolDialog = ref(false)
const generating = ref(false)
const generatedContent = ref('')
const generatingProgress = ref(0)
const generatingStatusText = ref('')
const toolForm = reactive({})
const resultTextarea = ref(null)

// 小说列表数据
const novelList = ref([])
const selectedNovelChapters = ref([])

// 提示词数据
const availablePrompts = ref([])
const selectedPromptData = ref(null)

// 加载小说列表
const loadNovelList = () => {
  try {
    const savedNovels = JSON.parse(localStorage.getItem('novels') || '[]')
    console.log('原始小说数据:', savedNovels) // 调试用
    
    if (!Array.isArray(savedNovels)) {
      console.warn('小说数据不是数组格式')
      novelList.value = []
      return
    }
    
    novelList.value = savedNovels.map(novel => {
      if (!novel || typeof novel !== 'object') {
        return null
      }
      
      return {
        value: novel.id || `novel_${Date.now()}_${Math.random()}`,
        label: novel.title || '未命名小说',
        chapters: Array.isArray(novel.chapterList) ? novel.chapterList : (Array.isArray(novel.chapters) ? novel.chapters : [])
      }
    }).filter(novel => novel !== null) // 过滤掉无效的小说
    
    console.log('处理后的小说列表:', novelList.value) // 调试用
  } catch (error) {
    console.error('加载小说列表失败:', error)
    novelList.value = []
  }
}

// 当选择小说时，更新章节列表
const onNovelChange = (novelId) => {
  console.log('选择的小说ID:', novelId) // 调试用
  const selectedNovel = novelList.value.find(novel => novel.value === novelId)
  console.log('找到的小说:', selectedNovel) // 调试用
  
  if (selectedNovel && selectedNovel.chapters && Array.isArray(selectedNovel.chapters)) {
    console.log('小说章节数据:', selectedNovel.chapters) // 调试用
    selectedNovelChapters.value = selectedNovel.chapters.map(chapter => {
      if (!chapter || typeof chapter !== 'object') {
        return null
      }
      return {
        value: chapter.id || `chapter_${Date.now()}_${Math.random()}`,
        label: chapter.title || '未命名章节',
        content: chapter.content || '',
        description: chapter.description || ''
      }
    }).filter(chapter => chapter !== null)
  } else {
    console.log('没有找到有效的章节数据') // 调试用
    selectedNovelChapters.value = []
  }
  
  // 清空已选择的章节
  if (toolForm.selectedChapters) {
    toolForm.selectedChapters = []
  }
}

// 工具配置
const toolsConfig = {
  outline: {
    title: '细纲生成器',
    hasNovelSelector: true, // 标记需要小说选择器
    fields: [
      { key: 'selectedNovel', label: '选择小说', type: 'novel-select', placeholder: '请选择要生成细纲的小说', required: true },
      { key: 'selectedChapters', label: '参考章节', type: 'chapter-select', placeholder: '选择要参考的章节（可多选）' },
      { key: 'selectedPrompt', label: '提示词模板', type: 'prompt-select', placeholder: '选择提示词模板（可选）', category: 'outline' },
      { key: 'chapters', label: '章节数量', type: 'input', placeholder: '预计章节数（建议5-15章）' }
    ]
  },
  cheat: {
    title: '金手指生成器',
    hasNovelSelector: true, // 标记需要小说选择器
    fields: [
      { key: 'selectedNovel', label: '选择小说', type: 'novel-select', placeholder: '请选择要生成金手指的小说', required: true },
      { key: 'selectedChapters', label: '参考章节', type: 'chapter-select', placeholder: '选择要参考的章节（可多选）' },
      { key: 'selectedPrompt', label: '提示词模板', type: 'prompt-select', placeholder: '选择提示词模板（可选）', category: 'cheat' },
      { key: 'level', label: '能力等级', type: 'select', placeholder: '选择等级', required: true, options: [
        { label: '初级', value: 'low' },
        { label: '中级', value: 'medium' },
        { label: '高级', value: 'high' },
        { label: '神级', value: 'god' }
      ]},
      { key: 'description', label: '特殊要求', type: 'textarea', placeholder: '描述特殊要求或偏好（可选）' }
    ]
  },
  opening: {
    title: '黄金开篇生成器',
    fields: [
      { key: 'selectedPrompt', label: '提示词模板', type: 'prompt-select', placeholder: '选择提示词模板（可选）', category: 'opening' },
      { key: 'genre', label: '小说类型', type: 'select', placeholder: '选择类型', required: true, options: [
        { label: '都市', value: 'urban' },
        { label: '玄幻', value: 'fantasy' },
        { label: '悬疑', value: 'mystery' },
        { label: '言情', value: 'romance' }
      ]},
      { key: 'mood', label: '开篇氛围', type: 'select', placeholder: '选择氛围', required: true, options: [
        { label: '紧张刺激', value: 'tense' },
        { label: '温馨平和', value: 'warm' },
        { label: '神秘悬疑', value: 'mysterious' },
        { label: '幽默轻松', value: 'humorous' }
      ]},
      { key: 'protagonist', label: '主角设定', type: 'textarea', placeholder: '简要描述主角特点', required: true },
      { key: 'scene', label: '开篇场景', type: 'input', placeholder: '开篇场景或环境' }
    ]
  },
  title: {
    title: '爆款书名生成器',
    fields: [
      { key: 'selectedPrompt', label: '提示词模板', type: 'prompt-select', placeholder: '选择提示词模板（可选）', category: 'title' },
      { key: 'count', label: '生成数量', type: 'select', placeholder: '选择生成数量', required: true, options: [
        { label: '5个书名', value: '5' },
        { label: '10个书名', value: '10' },
        { label: '15个书名', value: '15' },
        { label: '20个书名', value: '20' }
      ]},
      { key: 'genre', label: '小说类型', type: 'select', placeholder: '选择类型', required: true, options: [
        { label: '都市', value: 'urban' },
        { label: '玄幻', value: 'fantasy' },
        { label: '科幻', value: 'scifi' },
        { label: '言情', value: 'romance' },
        { label: '悬疑', value: 'mystery' }
      ]},
      { key: 'keywords', label: '关键词', type: 'input', placeholder: '输入相关关键词，用逗号分隔', required: true },
      { key: 'style', label: '风格偏好', type: 'select', placeholder: '选择风格', options: [
        { label: '霸气', value: 'domineering' },
        { label: '文艺', value: 'literary' },
        { label: '悬疑', value: 'mysterious' },
        { label: '简洁', value: 'simple' }
      ]}
    ]
  },
  genre: {
    title: '爆款题材生成器',
    fields: [
      { key: 'selectedPrompt', label: '提示词模板', type: 'prompt-select', placeholder: '选择提示词模板（可选）', category: 'inspiration' },
      { key: 'count', label: '生成数量', type: 'select', placeholder: '选择生成数量', required: true, options: [
        { label: '3个题材', value: '3' },
        { label: '5个题材', value: '5' },
        { label: '8个题材', value: '8' },
        { label: '10个题材', value: '10' }
      ]},
      { key: 'trend', label: '流行趋势', type: 'select', placeholder: '选择趋势', required: true, options: [
        { label: '当前热门', value: 'current' },
        { label: '经典永恒', value: 'classic' },
        { label: '新兴题材', value: 'emerging' }
      ]},
      { key: 'target', label: '目标读者', type: 'select', placeholder: '选择读者群体', required: true, options: [
        { label: '年轻人', value: 'young' },
        { label: '中年人', value: 'middle' },
        { label: '全年龄', value: 'all' }
      ]},
      { key: 'elements', label: '元素偏好', type: 'textarea', placeholder: '希望包含的元素或避免的元素' }
    ]
  },
  brainstorm: {
    title: '脑洞生成器',
    fields: [
      { key: 'selectedPrompt', label: '提示词模板', type: 'prompt-select', placeholder: '选择提示词模板（可选）', category: 'brainstorm' },
      { key: 'count', label: '生成数量', type: 'select', placeholder: '选择生成数量', required: true, options: [
        { label: '3个脑洞', value: '3' },
        { label: '5个脑洞', value: '5' },
        { label: '8个脑洞', value: '8' },
        { label: '10个脑洞', value: '10' }
      ]},
      { key: 'type', label: '脑洞类型', type: 'select', placeholder: '选择类型', required: true, options: [
        { label: '世界设定', value: 'world' },
        { label: '角色设定', value: 'character' },
        { label: '情节转折', value: 'plot' },
        { label: '能力设定', value: 'ability' }
      ]},
      { key: 'creativity', label: '创意程度', type: 'select', placeholder: '选择程度', required: true, options: [
        { label: '常规', value: 'normal' },
        { label: '新颖', value: 'novel' },
        { label: '天马行空', value: 'wild' }
      ]},
      { key: 'base', label: '基础设定', type: 'textarea', placeholder: '现有的设定基础（可选）' }
    ]
  },
  synopsis: {
    title: '简介生成器',
    hasNovelSelector: true, // 标记需要小说选择器
    fields: [
      { key: 'selectedNovel', label: '选择小说', type: 'novel-select', placeholder: '请选择要生成简介的小说', required: true },
      { key: 'selectedChapters', label: '参考章节', type: 'chapter-select', placeholder: '选择要参考的章节（可多选）' },
      { key: 'selectedPrompt', label: '提示词模板', type: 'prompt-select', placeholder: '选择提示词模板（可选）', category: 'content' },
      { key: 'style', label: '简介风格', type: 'select', placeholder: '选择风格', options: [
        { label: '悬疑吸引', value: 'suspense' },
        { label: '直白介绍', value: 'direct' },
        { label: '情感共鸣', value: 'emotional' }
      ]}
    ]
  },
  worldview: {
    title: '宏达世界观生成器',
    hasNovelSelector: true, // 标记需要小说选择器
    fields: [
      { key: 'selectedNovel', label: '选择小说', type: 'novel-select', placeholder: '请选择要生成世界观的小说', required: true },
      { key: 'selectedChapters', label: '参考章节', type: 'chapter-select', placeholder: '选择要参考的章节（可多选）' },
      { key: 'selectedPrompt', label: '提示词模板', type: 'prompt-select', placeholder: '选择提示词模板（可选）', category: 'worldview' },
      { key: 'type', label: '世界类型', type: 'select', placeholder: '选择类型', required: true, options: [
        { label: '奇幻世界', value: 'fantasy' },
        { label: '科幻未来', value: 'scifi' },
        { label: '古代历史', value: 'ancient' },
        { label: '现代都市', value: 'modern' }
      ]},
      { key: 'scale', label: '世界规模', type: 'select', placeholder: '选择规模', required: true, options: [
        { label: '单一城市', value: 'city' },
        { label: '国家大陆', value: 'continent' },
        { label: '多个星球', value: 'planets' },
        { label: '宇宙级别', value: 'universe' }
      ]}
    ]
  },
  character: {
    title: '角色生成器',
    fields: [
      { key: 'selectedPrompt', label: '提示词模板', type: 'prompt-select', placeholder: '选择提示词模板（可选）', category: 'character' },
      { key: 'count', label: '生成数量', type: 'input', placeholder: '输入数量（1-15个角色）', required: true },
      { key: 'role', label: '角色定位', type: 'select', placeholder: '选择定位', required: true, options: [
        { label: '主角', value: 'protagonist' },
        { label: '配角', value: 'supporting' },
        { label: '反派', value: 'antagonist' },
        { label: '路人', value: 'background' }
      ]},
      { key: 'gender', label: '性别', type: 'select', placeholder: '选择性别', options: [
        { label: '男性', value: 'male' },
        { label: '女性', value: 'female' },
        { label: '不限', value: 'any' }
      ]},
      { key: 'personality', label: '性格特点', type: 'textarea', placeholder: '期望的性格特点', required: true }
    ]
  },
  conflict: {
    title: '冲突生成器',
    hasNovelSelector: true, // 标记需要小说选择器
    fields: [
      { key: 'selectedNovel', label: '选择小说', type: 'novel-select', placeholder: '请选择要生成冲突的小说', required: true },
      { key: 'selectedChapters', label: '参考章节', type: 'chapter-select', placeholder: '选择要参考的章节（可多选）' },
      { key: 'selectedPrompt', label: '提示词模板', type: 'prompt-select', placeholder: '选择提示词模板（可选）', category: 'conflict' },
      { key: 'type', label: '冲突类型', type: 'select', placeholder: '选择类型', required: true, options: [
        { label: '人物冲突', value: 'character' },
        { label: '社会冲突', value: 'social' },
        { label: '内心冲突', value: 'internal' },
        { label: '环境冲突', value: 'environment' }
      ]},
      { key: 'intensity', label: '冲突强度', type: 'select', placeholder: '选择强度', required: true, options: [
        { label: '轻微', value: 'mild' },
        { label: '中等', value: 'moderate' },
        { label: '激烈', value: 'intense' }
      ]},
      { key: 'background', label: '背景设定', type: 'textarea', placeholder: '故事背景和现有冲突' }
    ]
  }
}

const currentTool = computed(() => {
  return toolsConfig[currentToolType.value] || {}
})

const currentToolType = ref('')

// 计算属性：检查是否可以生成
const canGenerate = computed(() => {
  if (!currentTool.value.fields) return false
  
  // 检查必填字段
  const requiredFields = currentTool.value.fields.filter(field => field.required)
  return requiredFields.every(field => {
    const value = toolForm[field.key]
    if (!value) return false
    
    // 根据字段类型检查值
    if (field.type === 'novel-select') {
      return value !== null && value !== undefined && value !== ''
    }
    
    if (field.type === 'chapter-select') {
      return Array.isArray(value) && value.length > 0
    }
    
    // 对于字符串类型字段
    if (typeof value === 'string') {
      return value.trim() !== ''
    }
    
    // 对于其他类型
    return Boolean(value)
  })
})

// 计算属性：显示内容（用于流式输出）
const displayContent = computed(() => {
  return generatedContent.value
})

const openTool = (toolType) => {
  currentToolType.value = toolType
  showToolDialog.value = true
  clearForm()
  
  // 如果工具需要小说选择器，加载小说列表
  if (currentTool.value.hasNovelSelector) {
    loadNovelList()
  }
}

const clearForm = () => {
  Object.keys(toolForm).forEach(key => {
    delete toolForm[key]
  })
  generatedContent.value = ''
  generatingProgress.value = 0
  generatingStatusText.value = ''
  selectedNovelChapters.value = []
  selectedPromptData.value = null
}

const generateContent = async () => {
  if (!canGenerate.value) {
    ElMessage.warning('请填写所有必填字段')
    return
  }
  
  // 特殊验证：角色生成器的数量检查
  if (currentToolType.value === 'character' && toolForm.count) {
    const count = parseInt(toolForm.count)
    if (isNaN(count) || count < 1 || count > 15) {
      ElMessage.warning('角色数量必须是1-15之间的数字')
      return
    }
  }
  
  if (!novelStore.isApiConfigured) {
    ElMessage.error('请先配置API密钥')
    return
  }
  
  generating.value = true
  generatedContent.value = ''
  generatingProgress.value = 0
  generatingStatusText.value = '正在准备生成...'
  
  try {
    // 构建提示词
    const prompt = buildPrompt()
    console.log('工具生成提示词:', prompt)
    
    // 开始进度模拟
    const progressInterval = setInterval(() => {
      if (generatingProgress.value < 90) {
        generatingProgress.value += Math.random() * 10
        updateStatusText()
      }
    }, 500)
    
    // 调用API生成内容（带流式输出）
    const response = await novelStore.generateContent(prompt, (chunk) => {
      // 流式更新内容
      generatedContent.value += chunk
      
      // 自动滚动到底部
      nextTick(() => {
        if (resultTextarea.value) {
          const textarea = resultTextarea.value.$el.querySelector('textarea')
          if (textarea) {
            textarea.scrollTop = textarea.scrollHeight
          }
        }
      })
    })
    
    // 清除进度定时器
    clearInterval(progressInterval)
    generatingProgress.value = 100
    generatingStatusText.value = '生成完成'
    
    if (!response || !response.trim()) {
      throw new Error('AI返回内容为空')
    }
    
    // 确保内容完整
    if (!generatedContent.value) {
      generatedContent.value = response
    }
    
    ElMessage.success('内容生成成功！')
    
  } catch (error) {
    console.error('生成内容失败:', error)
    ElMessage.error('生成失败：' + error.message)
    generatedContent.value = ''
  } finally {
    generating.value = false
    generatingProgress.value = 0
    generatingStatusText.value = ''
  }
}

const updateStatusText = () => {
  const progress = generatingProgress.value
  if (progress < 20) {
    generatingStatusText.value = '正在分析需求...'
  } else if (progress < 40) {
    generatingStatusText.value = '正在构思内容...'
  } else if (progress < 60) {
    generatingStatusText.value = '正在生成内容...'
  } else if (progress < 80) {
    generatingStatusText.value = '正在优化表达...'
  } else {
    generatingStatusText.value = '即将完成...'
  }
}

const buildPrompt = () => {
  const tool = currentTool.value
  let prompt = ''
  let useTemplate = selectedPromptData.value && selectedPromptData.value.content
  
  // 首先构建小说信息部分（如果工具支持小说选择器）
  let novelInfoSection = ''
  if (tool.hasNovelSelector && toolForm.selectedNovel) {
    const selectedNovel = novelList.value.find(novel => novel.value === toolForm.selectedNovel)
    if (selectedNovel) {
      // 获取完整的小说数据
      const originalNovels = JSON.parse(localStorage.getItem('novels') || '[]')
      const originalNovel = originalNovels.find(n => n.id == selectedNovel.value || n.title === selectedNovel.label)
      
      novelInfoSection += `=== 目标小说信息 ===\n`
      novelInfoSection += `小说标题：${selectedNovel.label}\n`
      
      if (originalNovel) {
        // 自动添加小说的基本信息
        if (originalNovel.genre) {
          novelInfoSection += `小说类型：${originalNovel.genre}\n`
        }
        if (originalNovel.description) {
          novelInfoSection += `小说简介：${originalNovel.description}\n`
        }
        if (originalNovel.tags && Array.isArray(originalNovel.tags)) {
          novelInfoSection += `标签：${originalNovel.tags.join('、')}\n`
        }
        
        // 添加角色信息
        if (originalNovel.characters && Array.isArray(originalNovel.characters) && originalNovel.characters.length > 0) {
          novelInfoSection += `\n=== 主要角色 ===\n`
          originalNovel.characters.forEach(char => {
            if (char.name) {
              novelInfoSection += `${char.name}：${char.description || char.personality || '主要角色'}\n`
            }
          })
        }
        
        // 添加世界观设定
        if (originalNovel.worldSettings && Array.isArray(originalNovel.worldSettings) && originalNovel.worldSettings.length > 0) {
          novelInfoSection += `\n=== 世界观设定 ===\n`
          originalNovel.worldSettings.forEach(setting => {
            novelInfoSection += `${setting.name || setting.title}：${setting.description || setting.content}\n`
          })
        }
      }
      
      // 添加选中章节的内容
      if (toolForm.selectedChapters && toolForm.selectedChapters.length > 0) {
        novelInfoSection += `\n=== 参考章节内容 ===\n`
        toolForm.selectedChapters.forEach(chapterId => {
          const chapter = selectedNovelChapters.value.find(ch => ch.value === chapterId)
          if (chapter) {
            novelInfoSection += `\n【${chapter.label}】\n`
            if (chapter.description) {
              novelInfoSection += `大纲：${chapter.description}\n`
            }
            if (chapter.content) {
              // 截取部分内容，避免过长
              const content = chapter.content.length > 500 ? 
                chapter.content.substring(0, 500) + '...' : chapter.content
              novelInfoSection += `内容：${content}\n`
            }
          }
        })
        novelInfoSection += `\n`
      }
    }
  }
  
  // 如果选择了提示词模板，使用模板内容
  if (useTemplate) {
    prompt = selectedPromptData.value.content
    
    // 如果有小说信息，首先添加到提示词前面
    if (novelInfoSection) {
      prompt = novelInfoSection + '\n' + prompt
    }
    
    // 替换模板中的变量
    if (tool.hasNovelSelector && toolForm.selectedNovel) {
      const selectedNovel = novelList.value.find(novel => novel.value === toolForm.selectedNovel)
      if (selectedNovel) {
        const originalNovels = JSON.parse(localStorage.getItem('novels') || '[]')
        const originalNovel = originalNovels.find(n => n.id == selectedNovel.value || n.title === selectedNovel.label)
        
        // 替换小说相关变量
        prompt = prompt.replace(/\{小说标题\}/g, selectedNovel.label)
        if (originalNovel) {
          prompt = prompt.replace(/\{小说类型\}/g, originalNovel.genre || '未设定')
          prompt = prompt.replace(/\{小说简介\}/g, originalNovel.description || '无简介')
          prompt = prompt.replace(/\{标签\}/g, originalNovel.tags ? originalNovel.tags.join('、') : '无标签')
          
          // 替换角色信息
          if (originalNovel.characters && Array.isArray(originalNovel.characters) && originalNovel.characters.length > 0) {
            const charactersInfo = originalNovel.characters.map(char => 
              `${char.name}：${char.description || char.personality || '主要角色'}`
            ).join('\n')
            prompt = prompt.replace(/\{主要人物\}/g, charactersInfo)
          } else {
            prompt = prompt.replace(/\{主要人物\}/g, '暂无详细人物设定')
          }
          
          // 替换世界观信息
          if (originalNovel.worldSettings && Array.isArray(originalNovel.worldSettings) && originalNovel.worldSettings.length > 0) {
            const worldInfo = originalNovel.worldSettings.map(setting => 
              `${setting.name || setting.title}：${setting.description || setting.content}`
            ).join('\n')
            prompt = prompt.replace(/\{世界观设定\}/g, worldInfo)
          } else {
            prompt = prompt.replace(/\{世界观设定\}/g, '暂无详细世界观设定')
          }
        }
        
        // 替换章节信息
        if (toolForm.selectedChapters && toolForm.selectedChapters.length > 0) {
          let chaptersInfo = ''
          toolForm.selectedChapters.forEach(chapterId => {
            const chapter = selectedNovelChapters.value.find(ch => ch.value === chapterId)
            if (chapter) {
              chaptersInfo += `\n【${chapter.label}】\n`
              if (chapter.description) {
                chaptersInfo += `大纲：${chapter.description}\n`
              }
              if (chapter.content) {
                const content = chapter.content.length > 500 ? 
                  chapter.content.substring(0, 500) + '...' : chapter.content
                chaptersInfo += `内容：${content}\n`
              }
            }
          })
          prompt = prompt.replace(/\{参考章节内容\}/g, chaptersInfo || '暂无参考章节')
        } else {
          prompt = prompt.replace(/\{参考章节内容\}/g, '暂无参考章节')
        }
      }
    }
    
    // 替换表单字段变量
    tool.fields.forEach(field => {
      if (field.type !== 'novel-select' && field.type !== 'chapter-select' && field.type !== 'prompt-select' && toolForm[field.key]) {
        const value = toolForm[field.key]
        // 支持中文和英文字段名
        const patterns = [
          new RegExp(`\\{${field.label}\\}`, 'g'),
          new RegExp(`\\{${field.key}\\}`, 'g')
        ]
        patterns.forEach(pattern => {
          prompt = prompt.replace(pattern, value)
        })
      }
    })
    
    // 特殊处理生成数量变量
    if (toolForm.count) {
      prompt = prompt.replace(/\{生成数量\}/g, toolForm.count)
      prompt = prompt.replace(/\{count\}/g, toolForm.count)
    }
    
    // 清理未替换的变量
    prompt = prompt.replace(/\{[^}]*\}/g, '[待填充]')
    
    console.log('使用提示词模板构建的提示词:', prompt)
    return prompt
  }
  
  // 如果没有选择提示词模板，使用默认构建方式
  prompt = `请作为一个专业的${tool.title}，根据以下信息生成高质量的内容：\n\n`
  
  // 添加小说信息
  if (novelInfoSection) {
    prompt += novelInfoSection
  }
  
  // 添加其他字段信息
  tool.fields.forEach(field => {
    // 跳过小说、章节选择和提示词选择字段
    if (field.type !== 'novel-select' && field.type !== 'chapter-select' && field.type !== 'prompt-select' && toolForm[field.key]) {
      prompt += `${field.label}：${toolForm[field.key]}\n`
    }
  })
  
  // 根据不同工具类型添加具体要求
  switch (currentToolType.value) {
    case 'outline':
      prompt += '\n请根据上述小说信息生成详细的章节细纲，包括：\n1. 每章的标题和主要情节\n2. 故事发展脉络和转折点\n3. 人物关系变化\n4. 冲突设置和解决\n5. 整体结构要完整（开头、发展、高潮、结局）\n6. 与已有角色和世界观保持一致\n\n请按照以下格式输出：\n第一章：章节标题\n- 主要情节描述\n- 重要转折点\n第二章：...'
      break
    case 'cheat':
      prompt += '\n请根据上述小说的类型和世界观，生成一个独特的金手指设定，包括：\n1. 能力名称和核心功能\n2. 详细的能力描述和效果\n3. 获得方式和触发条件\n4. 使用限制和副作用\n5. 能力的成长路径和进阶可能\n6. 与故事情节和世界观的结合点\n\n要求创意新颖，符合小说类型的特点，与现有角色和设定协调。'
      break
    case 'opening':
      prompt += '\n请生成一个引人入胜的小说开篇，要求：\n1. 字数控制在500-800字\n2. 立即抓住读者注意力\n3. 巧妙引入主角和背景\n4. 设置悬念或冲突点\n5. 语言风格符合所选氛围\n6. 为后续情节发展做好铺垫\n\n请直接输出开篇内容，无需其他说明。'
      break
    case 'title':
      const titleCount = toolForm.count || '10'
      prompt += `\n请生成${titleCount}个不同风格的书名供选择，要求：\n1. 符合所选类型的特点\n2. 体现关键词元素\n3. 具有吸引力和记忆点\n4. 长度适中（3-8个字为佳）\n5. 避免俗套，有创新性\n6. 风格多样化，覆盖不同类型\n\n请按照以下格式输出：\n1. 书名 - 创意说明\n2. 书名 - 创意说明\n3. 书名 - 创意说明\n...\n${titleCount}. 书名 - 创意说明`
      break
    case 'genre':
      const genreCount = toolForm.count || '5'
      prompt += `\n请分析当前流行趋势，提供${genreCount}个具有潜力的题材方向，每个题材都要包括：\n1. 题材名称和核心概念\n2. 市场潜力分析\n3. 目标读者群体\n4. 创作要点和注意事项\n5. 成功案例参考\n6. 创新突破点建议\n\n请按照以下格式输出：\n=== 题材1 ===\n名称：[题材名称]\n核心概念：[详细描述]\n市场潜力：[分析]\n目标读者：[读者群体]\n创作要点：[注意事项]\n成功案例：[参考作品]\n创新点：[突破建议]\n\n=== 题材2 ===\n...\n\n以此类推到第${genreCount}个题材。`
      break
    case 'brainstorm':
      const brainstormCount = toolForm.count || '5'
      prompt += `\n请提供${brainstormCount}个创意脑洞，每个都要：\n1. 独特有趣，避免俗套\n2. 具有可扩展性\n3. 符合所选创意程度\n4. 包含具体的设定细节\n5. 提供发展方向建议\n\n请按照以下格式输出：\n脑洞1：标题\n- 核心设定\n- 创意亮点\n- 发展方向\n脑洞2：标题\n- 核心设定\n- 创意亮点\n- 发展方向\n\n以此类推，直到第${brainstormCount}个脑洞...`
      break
    case 'synopsis':
      prompt += '\n请根据上述小说信息生成吸引人的简介，要求：\n1. 突出故事亮点和悬念\n2. 介绍主角和核心冲突\n3. 体现故事的独特性\n4. 语言精炼有力\n5. 长度控制在100-200字\n6. 符合所选风格特点\n7. 与现有角色和世界观保持一致\n\n请直接输出简介内容。'
      break
    case 'worldview':
      prompt += '\n请根据上述小说信息，扩展和完善世界观设定，包括：\n1. 世界的基本架构和地理环境\n2. 社会制度和政治结构\n3. 文化传统和价值观念\n4. 科技水平或魔法系统\n5. 历史背景和重要事件\n6. 独特的规则和法则\n7. 与现有故事情节和角色的结合点\n\n要求设定合理，富有创意，具有内在逻辑性，与现有设定协调。'
      break
    case 'character':
      const characterCount = parseInt(toolForm.count || '1')
      if (characterCount === 1) {
        prompt += '\n请生成详细的角色档案，包括：\n1. 基本信息（姓名、年龄、职业等）\n2. 外貌特征和穿着风格\n3. 性格特点和行为习惯\n4. 背景故事和成长经历\n5. 能力特长和弱点\n6. 人际关系和社会地位\n7. 内心动机和目标追求\n8. 与主线情节的关系\n\n要求人物立体丰满，符合角色定位。'
      } else {
        prompt += `\n请生成${characterCount}个详细的角色档案，每个角色都要包括：\n1. 基本信息（姓名、年龄、职业等）\n2. 外貌特征和穿着风格\n3. 性格特点和行为习惯\n4. 背景故事和成长经历\n5. 能力特长和弱点\n6. 人际关系和社会地位\n7. 内心动机和目标追求\n8. 与主线情节的关系\n\n要求：\n- 每个人物都要立体丰满，符合角色定位\n- 角色之间要有差异化，避免重复\n- 可以设计角色间的关系和互动\n- 如果生成的是同一类型角色，请在性格、背景、能力等方面做出明显区分\n- 按照以下格式输出：\n\n=== 角色1 ===\n姓名：[角色姓名]\n[详细信息]\n\n=== 角色2 ===\n姓名：[角色姓名]\n[详细信息]\n\n以此类推到第${characterCount}个角色...`
      }
      break
    case 'conflict':
      prompt += '\n请根据上述小说信息设计合理的冲突情节，包括：\n1. 冲突的起因和背景\n2. 冲突各方的立场和动机\n3. 冲突的发展过程和升级\n4. 关键转折点和高潮设计\n5. 可能的解决方向和结果\n6. 对现有角色成长的影响\n7. 与整体故事和世界观的呼应\n\n要求冲突合理有力，推动情节发展，与现有设定协调。'
      break
  }
  
      console.log('最终构建的提示词:', prompt)
  console.log('小说信息部分:', novelInfoSection)
  console.log('是否使用模板:', useTemplate)
  console.log('选中的小说:', toolForm.selectedNovel)
  console.log('选中的章节:', toolForm.selectedChapters)
  return prompt
}

const copyToClipboard = async () => {
  if (!generatedContent.value) {
    ElMessage.warning('没有可复制的内容')
    return
  }
  
  try {
    await navigator.clipboard.writeText(generatedContent.value)
    ElMessage.success('内容已复制到剪贴板')
  } catch (error) {
    // 如果 Clipboard API 不可用，使用传统方法
    const textArea = document.createElement('textarea')
    textArea.value = generatedContent.value
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    ElMessage.success('内容已复制到剪贴板')
  }
}

const saveResult = () => {
  if (!generatedContent.value) {
    ElMessage.warning('没有可保存的内容')
    return
  }
  
  try {
    // 创建文件内容
    const content = `=== ${currentTool.value.title} ===
生成时间：${new Date().toLocaleString()}

=== 生成参数 ===
${currentTool.value.fields.map(field => 
  toolForm[field.key] ? `${field.label}：${toolForm[field.key]}` : ''
).filter(line => line).join('\n')}

=== 生成结果 ===
${generatedContent.value}
`
    
    // 创建并下载文件
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${currentTool.value.title}_${new Date().getTime()}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success('结果已保存到本地文件')
  } catch (error) {
    console.error('保存文件失败:', error)
    ElMessage.error('保存失败')
  }
}



// 加载提示词数据
const loadPrompts = () => {
  try {
    const savedPrompts = localStorage.getItem('prompts')
    if (savedPrompts) {
      availablePrompts.value = JSON.parse(savedPrompts)
    } else {
      availablePrompts.value = []
    }
    console.log('加载提示词数据:', availablePrompts.value.length)
  } catch (error) {
    console.error('加载提示词失败:', error)
    availablePrompts.value = []
  }
}

// 根据分类获取提示词
const getPromptsByCategory = (category) => {
  if (!category) return []
  return availablePrompts.value.filter(prompt => prompt.category === category)
}

// 当选择提示词时
const onPromptChange = (promptId) => {
  console.log('选择的提示词ID:', promptId)
  if (promptId) {
    selectedPromptData.value = availablePrompts.value.find(prompt => prompt.id === promptId)
    console.log('选择的提示词数据:', selectedPromptData.value)
  } else {
    selectedPromptData.value = null
  }
}

// 验证角色数量
const isValidCharacterCount = (count) => {
  const num = parseInt(count)
  return !isNaN(num) && num >= 1 && num <= 15
}

// 角色数量输入验证
const validateCharacterCount = (field, value) => {
  if (field.key === 'count' && currentToolType.value === 'character') {
    // 限制只能输入数字
    const numericValue = value.replace(/[^0-9]/g, '')
    if (numericValue !== value) {
      toolForm[field.key] = numericValue
    }
  }
}

// 组件挂载时加载小说列表和提示词
onMounted(() => {
  loadNovelList()
  loadPrompts()
})
</script>

<style scoped>
.tools-library {
  max-width: 1200px;
  margin: 0 auto;
}


.tools-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.tool-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #e4e7ed;
}

.tool-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: #409eff;
}

.tool-icon {
  font-size: 48px;
  text-align: center;
  margin-bottom: 16px;
}

.tool-card h3 {
  font-size: 18px;
  color: #2c3e50;
  margin-bottom: 8px;
  text-align: center;
}

.tool-card p {
  font-size: 14px;
  color: #7f8c8d;
  text-align: center;
  line-height: 1.5;
}

.tool-dialog .tool-content {
  padding: 20px 0;
}

.tool-form {
  margin-bottom: 24px;
}

.tool-actions {
  text-align: center;
  margin-bottom: 24px;
}

.tool-actions .el-button {
  margin: 0 8px;
}

.generating-status {
  margin: 16px 0;
  text-align: center;
}

.status-text {
  display: block;
  margin-top: 8px;
  color: #606266;
  font-size: 14px;
}

.tool-result {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border: 1px solid #e9ecef;
}

.tool-result h4 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #2c3e50;
}

.result-content-wrapper {
  margin-bottom: 16px;
}

.result-textarea {
  width: 100%;
}

.result-textarea :deep(.el-textarea__inner) {
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
}

.result-actions {
  text-align: center;
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.result-actions .el-button {
  margin: 4px;
}

/* 小说和章节选择器样式 */
.tool-form .el-select {
  width: 100%;
}

.tool-form .el-select .el-tag {
  max-width: 120px;
}

.tool-form .el-form-item {
  margin-bottom: 18px;
}

/* 提示词选择器样式 */
.prompt-option {
  padding: 8px 0;
}

.prompt-option-title {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.prompt-option-desc {
  font-size: 12px;
  color: #909399;
  line-height: 1.4;
}

/* 角色数量提示样式 */
.character-count-hint {
  margin-top: 5px;
  font-size: 12px;
}

.valid-hint {
  color: #67c23a;
}

.invalid-hint {
  color: #f56c6c;
}

@media (max-width: 768px) {
  .tools-grid {
    grid-template-columns: 1fr;
  }
  
  .tool-dialog {
    width: 95% !important;
  }
  
  .result-actions {
    flex-direction: column;
    align-items: center;
  }
  
  .result-actions .el-button {
    width: 100%;
    max-width: 200px;
  }
}
</style>