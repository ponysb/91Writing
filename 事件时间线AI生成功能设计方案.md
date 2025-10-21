# 🎯 事件时间线AI生成功能设计方案

**设计日期**: 2025年1月  
**功能定位**: 智能辅助创作，提升事件规划效率  
**技术栈**: Vue 3 + Element Plus + AI API

---

## 📋 当前功能分析

### 现有事件时间线功能
```javascript
// 事件数据结构
const eventForm = {
  id: null,
  title: '',           // 事件标题
  description: '',     // 事件描述
  chapter: '',         // 相关章节
  time: '',           // 时间线（如：第三天傍晚）
  importance: 'normal' // 重要程度：low/normal/high/critical
}
```

### 现有操作流程
1. **手动创建**: 点击"新增"按钮 → 填写表单 → 保存
2. **编辑修改**: 点击事件操作菜单 → 编辑 → 保存
3. **删除管理**: 点击删除 → 确认 → 移除

### 用户痛点
- ❌ **创作负担重**: 需要手动构思每个事件
- ❌ **时间线混乱**: 难以保持时间逻辑一致性
- ❌ **事件关联弱**: 缺乏事件间的因果关系分析
- ❌ **重复性工作**: 相似类型事件需要重复填写

---

## 🚀 AI生成功能设计

### 核心设计理念
**"智能辅助 + 人工审核 + 持续优化"**

### 1. 功能入口设计

#### 1.1 主入口 - 增强的"新增"按钮
```vue
<template>
  <div class="card-header">
    <span>📊 事件时间线</span>
    <div class="header-actions">
      <!-- 原有手动创建 -->
      <el-button size="small" @click="addEvent">
        <el-icon><Plus /></el-icon>
        手动创建
      </el-button>
      
      <!-- 新增AI生成入口 -->
      <el-button size="small" type="primary" @click="openAIGenerateDialog">
        <el-icon><MagicStick /></el-icon>
        AI生成事件
      </el-button>
    </div>
  </div>
</template>
```

#### 1.2 快捷入口 - 空状态优化
```vue
<div v-if="events.length === 0" class="empty-state">
  <div class="empty-content">
    <el-icon class="empty-icon"><Calendar /></el-icon>
    <h3>暂无事件记录</h3>
    <p>让AI帮您快速生成故事事件时间线</p>
    
    <div class="empty-actions">
      <el-button type="primary" @click="openAIGenerateDialog">
        <el-icon><MagicStick /></el-icon>
        AI智能生成
      </el-button>
      <el-button @click="addEvent">
        <el-icon><Plus /></el-icon>
        手动创建
      </el-button>
    </div>
  </div>
</div>
```

---

### 2. AI生成对话框设计

#### 2.1 对话框结构
```vue
<el-dialog 
  v-model="showAIGenerateDialog" 
  title="🤖 AI智能生成事件时间线" 
  width="800px"
  :close-on-click-modal="false"
>
  <!-- 生成配置区域 -->
  <div class="ai-generate-config">
    <!-- 生成模式选择 -->
    <el-form :model="aiGenerateForm" label-width="100px">
      <el-form-item label="生成模式">
        <el-radio-group v-model="aiGenerateForm.mode">
          <el-radio label="timeline">时间线生成</el-radio>
          <el-radio label="chapter">章节事件</el-radio>
          <el-radio label="conflict">冲突事件</el-radio>
          <el-radio label="character">角色事件</el-radio>
        </el-radio-group>
      </el-form-item>
      
      <!-- 生成参数 -->
      <div v-if="aiGenerateForm.mode === 'timeline'">
        <el-form-item label="时间跨度">
          <el-input-number v-model="aiGenerateForm.timelineSpan" :min="1" :max="30" />
          <span class="form-tip">天</span>
        </el-form-item>
      </div>
      
      <div v-if="aiGenerateForm.mode === 'chapter'">
        <el-form-item label="目标章节">
          <el-select v-model="aiGenerateForm.targetChapter" placeholder="选择章节">
            <el-option 
              v-for="chapter in chapters" 
              :key="chapter.id" 
              :label="chapter.title" 
              :value="chapter.title" 
            />
          </el-select>
        </el-form-item>
      </div>
      
      <!-- 生成数量 -->
      <el-form-item label="生成数量">
        <el-input-number v-model="aiGenerateForm.count" :min="1" :max="10" />
        <span class="form-tip">个事件</span>
      </el-form-item>
      
      <!-- 事件类型偏好 -->
      <el-form-item label="事件类型">
        <el-checkbox-group v-model="aiGenerateForm.eventTypes">
          <el-checkbox label="action">动作/战斗</el-checkbox>
          <el-checkbox label="dialogue">对话/交流</el-checkbox>
          <el-checkbox label="emotion">情感/心理</el-checkbox>
          <el-checkbox label="plot">剧情转折</el-checkbox>
          <el-checkbox label="world">世界观展示</el-checkbox>
        </el-checkbox-group>
      </el-form-item>
      
      <!-- 自定义提示 -->
      <el-form-item label="特殊要求">
        <el-input 
          v-model="aiGenerateForm.customPrompt" 
          type="textarea" 
          :rows="3"
          placeholder="如：重点突出主角的成长，增加悬疑元素..."
        />
      </el-form-item>
    </el-form>
  </div>
  
  <!-- 生成结果区域 -->
  <div v-if="aiGeneratedEvents.length > 0" class="ai-generate-results">
    <h4>🎯 生成结果预览</h4>
    <div class="events-preview">
      <div 
        v-for="(event, index) in aiGeneratedEvents" 
        :key="index" 
        class="event-preview-item"
      >
        <div class="event-preview-header">
          <el-checkbox v-model="event.selected" />
          <span class="event-title">{{ event.title }}</span>
          <el-tag :type="getImportanceType(event.importance)" size="small">
            {{ getImportanceText(event.importance) }}
          </el-tag>
        </div>
        <p class="event-preview-desc">{{ event.description }}</p>
        <div class="event-preview-meta">
          <span class="event-time">{{ event.time }}</span>
          <span class="event-chapter">{{ event.chapter }}</span>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 操作按钮 -->
  <template #footer>
    <div class="dialog-footer">
      <el-button @click="showAIGenerateDialog = false">取消</el-button>
      <el-button @click="regenerateEvents" :loading="isGenerating">
        <el-icon><Refresh /></el-icon>
        重新生成
      </el-button>
      <el-button 
        type="primary" 
        @click="confirmAddEvents" 
        :disabled="selectedEventsCount === 0"
      >
        <el-icon><Check /></el-icon>
        添加选中事件 ({{ selectedEventsCount }})
      </el-button>
    </div>
  </template>
</el-dialog>
```

---

### 3. 数据结构设计

#### 3.1 AI生成表单数据
```javascript
const aiGenerateForm = ref({
  mode: 'timeline',           // 生成模式
  timelineSpan: 7,            // 时间跨度（天）
  targetChapter: '',          // 目标章节
  count: 5,                   // 生成数量
  eventTypes: ['action', 'dialogue', 'emotion'], // 事件类型
  customPrompt: ''            // 自定义提示
})

const aiGeneratedEvents = ref([])  // AI生成的事件列表
const isGenerating = ref(false)    // 生成状态
```

#### 3.2 生成模式定义
```javascript
const GENERATE_MODES = {
  timeline: {
    name: '时间线生成',
    description: '根据故事时间线自动生成关键事件',
    promptTemplate: '基于故事时间线生成{count}个关键事件，时间跨度{span}天...'
  },
  chapter: {
    name: '章节事件',
    description: '为特定章节生成相关事件',
    promptTemplate: '为第{chapter}章生成{count}个相关事件...'
  },
  conflict: {
    name: '冲突事件',
    description: '生成推动剧情发展的冲突事件',
    promptTemplate: '生成{count}个推动剧情发展的冲突事件...'
  },
  character: {
    name: '角色事件',
    description: '围绕主要角色生成发展事件',
    promptTemplate: '围绕主要角色生成{count}个角色发展事件...'
  }
}
```

---

### 4. AI生成逻辑设计

#### 4.1 核心生成函数
```javascript
const generateEventsWithAI = async () => {
  try {
    isGenerating.value = true
    
    // 构建AI提示词
    const prompt = buildEventGenerationPrompt()
    
    // 调用AI API
    const response = await apiService.generateTextStream(prompt, {}, null)
    
    // 解析AI响应
    const events = parseAIEventResponse(response)
    
    // 处理生成结果
    aiGeneratedEvents.value = events.map(event => ({
      ...event,
      selected: true,  // 默认全选
      id: null,        // 待保存时生成
      createdAt: new Date()
    }))
    
    ElMessage.success(`成功生成 ${events.length} 个事件`)
    
  } catch (error) {
    console.error('AI生成事件失败:', error)
    ElMessage.error('生成失败: ' + error.message)
  } finally {
    isGenerating.value = false
  }
}
```

#### 4.2 提示词构建
```javascript
const buildEventGenerationPrompt = () => {
  const { mode, count, eventTypes, customPrompt } = aiGenerateForm.value
  const novelInfo = getNovelContextInfo()
  
  let basePrompt = `请为小说《${novelInfo.title}》生成${count}个事件，要求：\n\n`
  
  // 根据模式添加特定要求
  switch (mode) {
    case 'timeline':
      basePrompt += `时间跨度：${aiGenerateForm.value.timelineSpan}天\n`
      basePrompt += `需要保持时间逻辑的连贯性\n`
      break
    case 'chapter':
      basePrompt += `目标章节：${aiGenerateForm.value.targetChapter}\n`
      basePrompt += `事件要与该章节内容紧密相关\n`
      break
    case 'conflict':
      basePrompt += `重点生成推动剧情发展的冲突事件\n`
      basePrompt += `要有紧张感和戏剧性\n`
      break
    case 'character':
      basePrompt += `围绕主要角色生成发展事件\n`
      basePrompt += `体现角色成长和变化\n`
      break
  }
  
  // 添加事件类型要求
  if (eventTypes.length > 0) {
    basePrompt += `事件类型偏好：${eventTypes.join('、')}\n`
  }
  
  // 添加自定义要求
  if (customPrompt.trim()) {
    basePrompt += `特殊要求：${customPrompt}\n`
  }
  
  // 添加小说上下文
  basePrompt += `\n小说信息：\n`
  basePrompt += `类型：${novelInfo.genre}\n`
  basePrompt += `当前章节数：${novelInfo.chapterCount}\n`
  basePrompt += `主要角色：${novelInfo.mainCharacters.join('、')}\n`
  
  // 添加现有事件作为参考
  if (events.value.length > 0) {
    basePrompt += `\n现有事件参考：\n`
    events.value.slice(-3).forEach(event => {
      basePrompt += `- ${event.title} (${event.time}): ${event.description}\n`
    })
  }
  
  // 输出格式要求
  basePrompt += `\n请严格按照以下JSON格式返回：\n`
  basePrompt += `[{\n`
  basePrompt += `  "title": "事件标题",\n`
  basePrompt += `  "description": "详细描述",\n`
  basePrompt += `  "time": "时间点（如：第三天傍晚）",\n`
  basePrompt += `  "chapter": "相关章节",\n`
  basePrompt += `  "importance": "normal|high|critical",\n`
  basePrompt += `  "tags": ["标签1", "标签2"]\n`
  basePrompt += `}]\n`
  
  return basePrompt
}
```

#### 4.3 AI响应解析
```javascript
const parseAIEventResponse = (response) => {
  try {
    // 尝试直接解析JSON
    const events = JSON.parse(response)
    
    // 验证数据结构
    if (!Array.isArray(events)) {
      throw new Error('AI返回格式错误：应为数组')
    }
    
    // 验证每个事件的基本字段
    return events.map((event, index) => {
      if (!event.title || !event.description) {
        throw new Error(`第${index + 1}个事件缺少必要字段`)
      }
      
      return {
        title: event.title || `事件${index + 1}`,
        description: event.description || '暂无描述',
        time: event.time || '时间待定',
        chapter: event.chapter || currentChapter.value?.title || '',
        importance: event.importance || 'normal',
        tags: event.tags || [],
        // 确保重要程度有效
        importance: ['low', 'normal', 'high', 'critical'].includes(event.importance) 
          ? event.importance 
          : 'normal'
      }
    })
    
  } catch (error) {
    console.error('解析AI响应失败:', error)
    
    // 降级处理：尝试从文本中提取事件信息
    return extractEventsFromText(response)
  }
}

// 降级处理：从文本中提取事件
const extractEventsFromText = (text) => {
  const events = []
  const lines = text.split('\n').filter(line => line.trim())
  
  lines.forEach((line, index) => {
    // 简单的文本解析逻辑
    if (line.includes('：') || line.includes(':')) {
      const [title, ...descParts] = line.split(/[：:]/)
      events.push({
        title: title.trim(),
        description: descParts.join(':').trim() || '暂无描述',
        time: '时间待定',
        chapter: currentChapter.value?.title || '',
        importance: 'normal',
        tags: []
      })
    }
  })
  
  return events
}
```

---

### 5. 用户交互设计

#### 5.1 生成结果预览
```vue
<div class="events-preview">
  <div class="preview-header">
    <el-checkbox 
      v-model="selectAll" 
      :indeterminate="isIndeterminate"
      @change="handleSelectAll"
    >
      全选 ({{ selectedEventsCount }}/{{ aiGeneratedEvents.length }})
    </el-checkbox>
    
    <div class="preview-actions">
      <el-button size="small" @click="previewInTimeline">
        <el-icon><View /></el-icon>
        时间线预览
      </el-button>
    </div>
  </div>
  
  <div class="events-list">
    <div 
      v-for="(event, index) in aiGeneratedEvents" 
      :key="index"
      class="event-preview-item"
      :class="{ 'selected': event.selected }"
    >
      <div class="event-preview-content">
        <div class="event-header">
          <el-checkbox v-model="event.selected" />
          <h4 class="event-title">{{ event.title }}</h4>
          <el-tag :type="getImportanceType(event.importance)" size="small">
            {{ getImportanceText(event.importance) }}
          </el-tag>
        </div>
        
        <p class="event-description">{{ event.description }}</p>
        
        <div class="event-meta">
          <div class="meta-item">
            <el-icon><Clock /></el-icon>
            <span>{{ event.time }}</span>
          </div>
          <div class="meta-item">
            <el-icon><Document /></el-icon>
            <span>{{ event.chapter }}</span>
          </div>
          <div v-if="event.tags.length > 0" class="meta-item">
            <el-icon><PriceTag /></el-icon>
            <el-tag 
              v-for="tag in event.tags" 
              :key="tag" 
              size="small" 
              type="info"
            >
              {{ tag }}
            </el-tag>
          </div>
        </div>
      </div>
      
      <div class="event-actions">
        <el-button size="small" @click="editGeneratedEvent(event, index)">
          <el-icon><Edit /></el-icon>
        </el-button>
        <el-button size="small" @click="removeGeneratedEvent(index)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</div>
```

#### 5.2 事件编辑功能
```javascript
const editGeneratedEvent = (event, index) => {
  // 打开编辑对话框，预填充数据
  eventForm.value = { ...event }
  showEventDialog.value = true
  
  // 标记为编辑生成的事件
  editingGeneratedEventIndex.value = index
}

const removeGeneratedEvent = (index) => {
  aiGeneratedEvents.value.splice(index, 1)
  ElMessage.success('已移除该事件')
}
```

#### 5.3 批量操作
```javascript
const selectedEventsCount = computed(() => {
  return aiGeneratedEvents.value.filter(event => event.selected).length
})

const selectAll = computed({
  get: () => aiGeneratedEvents.value.length > 0 && selectedEventsCount.value === aiGeneratedEvents.value.length,
  set: (value) => {
    aiGeneratedEvents.value.forEach(event => {
      event.selected = value
    })
  }
})

const isIndeterminate = computed(() => {
  const count = selectedEventsCount.value
  return count > 0 && count < aiGeneratedEvents.value.length
})

const confirmAddEvents = () => {
  const selectedEvents = aiGeneratedEvents.value.filter(event => event.selected)
  
  if (selectedEvents.length === 0) {
    ElMessage.warning('请至少选择一个事件')
    return
  }
  
  // 添加到事件列表
  selectedEvents.forEach(event => {
    const newEvent = {
      ...event,
      id: Date.now() + Math.random(), // 生成唯一ID
      createdAt: new Date()
    }
    events.value.push(newEvent)
  })
  
  // 保存数据
  saveNovelData()
  
  // 关闭对话框
  showAIGenerateDialog.value = false
  aiGeneratedEvents.value = []
  
  ElMessage.success(`成功添加 ${selectedEvents.length} 个事件`)
}
```

---

### 6. 高级功能设计

#### 6.1 智能推荐
```javascript
const getSmartRecommendations = () => {
  // 基于现有事件分析，推荐生成参数
  const analysis = analyzeExistingEvents()
  
  return {
    suggestedCount: Math.min(analysis.gapCount + 2, 8),
    suggestedTypes: analysis.missingTypes,
    suggestedTimeSpan: analysis.recommendedTimeSpan,
    suggestedPrompt: analysis.suggestedPrompt
  }
}

const analyzeExistingEvents = () => {
  const events = events.value
  
  // 分析事件类型分布
  const typeCount = {}
  events.forEach(event => {
    event.tags?.forEach(tag => {
      typeCount[tag] = (typeCount[tag] || 0) + 1
    })
  })
  
  // 分析时间分布
  const timeGaps = analyzeTimeGaps(events)
  
  // 分析重要程度分布
  const importanceCount = {}
  events.forEach(event => {
    importanceCount[event.importance] = (importanceCount[event.importance] || 0) + 1
  })
  
  return {
    gapCount: timeGaps.length,
    missingTypes: getMissingTypes(typeCount),
    recommendedTimeSpan: calculateRecommendedTimeSpan(events),
    suggestedPrompt: generateSuggestedPrompt(events, typeCount, importanceCount)
  }
}
```

#### 6.2 时间线冲突检测
```javascript
const checkTimelineConflicts = (newEvents) => {
  const conflicts = []
  
  newEvents.forEach((newEvent, index) => {
    // 检查与现有事件的冲突
    events.value.forEach(existingEvent => {
      if (isTimeConflict(newEvent.time, existingEvent.time)) {
        conflicts.push({
          type: 'time_conflict',
          newEvent: newEvent,
          existingEvent: existingEvent,
          message: `时间冲突：${newEvent.time} 与 ${existingEvent.time} 重叠`
        })
      }
    })
    
    // 检查与同批次事件的冲突
    newEvents.forEach((otherEvent, otherIndex) => {
      if (index !== otherIndex && isTimeConflict(newEvent.time, otherEvent.time)) {
        conflicts.push({
          type: 'batch_conflict',
          newEvent: newEvent,
          otherEvent: otherEvent,
          message: `批次内冲突：${newEvent.time} 与 ${otherEvent.time} 重叠`
        })
      }
    })
  })
  
  return conflicts
}

const isTimeConflict = (time1, time2) => {
  // 简单的时间冲突检测逻辑
  // 实际实现需要更复杂的时间解析
  return time1 === time2
}
```

#### 6.3 事件关联分析
```javascript
const analyzeEventRelationships = (events) => {
  const relationships = []
  
  events.forEach((event, index) => {
    events.forEach((otherEvent, otherIndex) => {
      if (index !== otherIndex) {
        const relationship = findEventRelationship(event, otherEvent)
        if (relationship) {
          relationships.push({
            event1: event,
            event2: otherEvent,
            type: relationship.type,
            strength: relationship.strength,
            description: relationship.description
          })
        }
      }
    })
  })
  
  return relationships
}

const findEventRelationship = (event1, event2) => {
  // 分析事件间的因果关系、时间关系、角色关系等
  const relationships = []
  
  // 时间关系
  if (isBefore(event1.time, event2.time)) {
    relationships.push({
      type: 'temporal',
      strength: 0.8,
      description: `${event1.title} 发生在 ${event2.title} 之前`
    })
  }
  
  // 角色关系
  const commonCharacters = findCommonCharacters(event1, event2)
  if (commonCharacters.length > 0) {
    relationships.push({
      type: 'character',
      strength: 0.6,
      description: `都涉及角色：${commonCharacters.join('、')}`
    })
  }
  
  // 因果关系（基于关键词分析）
  if (hasCausalRelationship(event1, event2)) {
    relationships.push({
      type: 'causal',
      strength: 0.9,
      description: `${event1.title} 可能导致 ${event2.title}`
    })
  }
  
  return relationships.length > 0 ? relationships[0] : null
}
```

---

### 7. 性能优化设计

#### 7.1 生成状态管理
```javascript
const generationState = ref({
  isGenerating: false,
  progress: 0,
  currentStep: '',
  estimatedTime: 0
})

const generateWithProgress = async () => {
  try {
    generationState.value = {
      isGenerating: true,
      progress: 0,
      currentStep: '构建提示词...',
      estimatedTime: 30
    }
    
    // 步骤1：构建提示词
    generationState.value.progress = 20
    generationState.value.currentStep = '调用AI接口...'
    const prompt = buildEventGenerationPrompt()
    
    // 步骤2：调用AI
    generationState.value.progress = 50
    const response = await apiService.generateTextStream(prompt, {}, null)
    
    // 步骤3：解析结果
    generationState.value.progress = 80
    generationState.value.currentStep = '解析生成结果...'
    const events = parseAIEventResponse(response)
    
    // 步骤4：处理结果
    generationState.value.progress = 100
    generationState.value.currentStep = '完成'
    
    aiGeneratedEvents.value = events.map(event => ({
      ...event,
      selected: true,
      id: null,
      createdAt: new Date()
    }))
    
  } catch (error) {
    console.error('生成失败:', error)
    ElMessage.error('生成失败: ' + error.message)
  } finally {
    generationState.value.isGenerating = false
  }
}
```

#### 7.2 缓存机制
```javascript
const eventGenerationCache = ref(new Map())

const getCachedGeneration = (key) => {
  return eventGenerationCache.value.get(key)
}

const setCachedGeneration = (key, events) => {
  eventGenerationCache.value.set(key, {
    events,
    timestamp: Date.now()
  })
}

const generateCacheKey = (form) => {
  return `${form.mode}-${form.count}-${form.eventTypes.join(',')}-${form.customPrompt}`
}
```

---

### 8. 用户体验优化

#### 8.1 引导和帮助
```vue
<el-tooltip content="AI会根据您的小说信息智能生成相关事件" placement="top">
  <el-icon class="help-icon"><QuestionFilled /></el-icon>
</el-tooltip>

<el-popover placement="right" width="300" trigger="hover">
  <template #reference>
    <el-button size="small" text>如何使用？</el-button>
  </template>
  <div class="help-content">
    <h4>AI生成事件使用指南</h4>
    <ol>
      <li>选择生成模式（时间线/章节/冲突/角色）</li>
      <li>设置生成参数（数量、类型等）</li>
      <li>点击"生成"等待AI处理</li>
      <li>预览并选择需要的事件</li>
      <li>确认添加到时间线</li>
    </ol>
  </div>
</el-popover>
```

#### 8.2 错误处理和降级
```javascript
const handleGenerationError = (error) => {
  console.error('AI生成失败:', error)
  
  if (error.code === 'API_LIMIT_EXCEEDED') {
    ElMessage.error('API调用次数超限，请稍后再试')
  } else if (error.code === 'NETWORK_ERROR') {
    ElMessage.error('网络连接失败，请检查网络设置')
  } else if (error.code === 'PARSE_ERROR') {
    ElMessage.warning('AI返回格式异常，尝试降级处理...')
    // 尝试降级处理
    return tryFallbackParsing(error.response)
  } else {
    ElMessage.error('生成失败: ' + error.message)
  }
  
  // 提供手动创建选项
  ElMessageBox.confirm(
    'AI生成失败，是否手动创建事件？',
    '生成失败',
    {
      confirmButtonText: '手动创建',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    addEvent()
  })
}
```

---

### 9. 技术实现细节

#### 9.1 API集成
```javascript
// 在 api.js 中添加事件生成专用方法
const generateEvents = async (prompt, options = {}) => {
  try {
    const response = await generateTextStream(prompt, {
      max_tokens: 2000,
      temperature: 0.7,
      ...options
    })
    
    return response
  } catch (error) {
    throw new Error(`事件生成失败: ${error.message}`)
  }
}
```

#### 9.2 数据验证
```javascript
const validateGeneratedEvent = (event) => {
  const errors = []
  
  if (!event.title || event.title.trim().length === 0) {
    errors.push('事件标题不能为空')
  }
  
  if (!event.description || event.description.trim().length === 0) {
    errors.push('事件描述不能为空')
  }
  
  if (event.title && event.title.length > 100) {
    errors.push('事件标题不能超过100个字符')
  }
  
  if (event.description && event.description.length > 500) {
    errors.push('事件描述不能超过500个字符')
  }
  
  const validImportance = ['low', 'normal', 'high', 'critical']
  if (event.importance && !validImportance.includes(event.importance)) {
    errors.push('重要程度必须是: low, normal, high, critical 之一')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}
```

---

### 10. 测试用例设计

#### 10.1 功能测试
```javascript
describe('事件时间线AI生成功能', () => {
  test('应该能够生成指定数量的事件', async () => {
    const form = {
      mode: 'timeline',
      count: 5,
      eventTypes: ['action', 'dialogue']
    }
    
    const events = await generateEventsWithAI(form)
    expect(events).toHaveLength(5)
  })
  
  test('应该能够解析AI返回的JSON格式', () => {
    const mockResponse = '[{"title":"测试事件","description":"测试描述"}]'
    const events = parseAIEventResponse(mockResponse)
    expect(events[0].title).toBe('测试事件')
  })
  
  test('应该能够检测时间线冲突', () => {
    const newEvents = [
      { time: '第三天' },
      { time: '第三天' }
    ]
    const conflicts = checkTimelineConflicts(newEvents)
    expect(conflicts.length).toBeGreaterThan(0)
  })
})
```

#### 10.2 用户体验测试
```javascript
describe('用户体验测试', () => {
  test('生成过程中应该显示进度', async () => {
    const { generationState } = useEventGeneration()
    
    generateWithProgress()
    
    expect(generationState.value.isGenerating).toBe(true)
    expect(generationState.value.currentStep).toBe('构建提示词...')
  })
  
  test('生成失败时应该提供降级选项', async () => {
    const mockError = new Error('API调用失败')
    
    const result = await handleGenerationError(mockError)
    expect(result).toHaveProperty('fallback')
  })
})
```

---

## 🎯 总结

### 核心价值
1. **提升创作效率**: 从手动创建到AI辅助生成
2. **保证逻辑一致**: 智能时间线冲突检测
3. **增强用户体验**: 预览、编辑、批量操作
4. **降低使用门槛**: 智能推荐和引导

### 技术亮点
1. **智能提示词构建**: 基于小说上下文的动态提示
2. **多模式生成**: 时间线、章节、冲突、角色四种模式
3. **结果预览编辑**: 生成后可编辑再确认
4. **冲突检测**: 自动检测时间线冲突
5. **降级处理**: 异常情况下的优雅降级

### 实现优先级
1. **P0**: 基础生成功能 + 结果预览
2. **P1**: 编辑功能 + 批量操作
3. **P2**: 冲突检测 + 智能推荐
4. **P3**: 高级分析 + 缓存优化

这个设计方案既保持了与现有功能的兼容性，又大大提升了事件时间线管理的智能化水平。您觉得这个设计如何？有什么需要调整或补充的地方吗？
