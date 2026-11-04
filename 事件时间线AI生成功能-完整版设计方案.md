# 🎯 事件时间线AI生成功能 - 完整版设计方案

**设计日期**: 2025年1月  
**核心特性**: 人物驱动 + 世界观约束 + 章节约束 + 时间线管理  
**核心理念**: "以人物为驱动，以世界观为背景，以章节为框架，智能管理时间线"

---

## 📋 新增章节约束功能

### 1. 章节约束数据结构

#### 1.1 增强的生成配置
```javascript
const aiGenerateForm = ref({
  // 基础配置
  mode: 'timeline',
  count: 5,
  eventTypes: ['action', 'dialogue', 'emotion'],
  
  // 人物联动配置
  characterFocus: {
    enabled: true,
    primaryCharacters: [],
    characterRelationships: [],
    characterDevelopment: true
  },
  
  // 世界观联动配置
  worldSettingFocus: {
    enabled: true,
    relevantSettings: [],
    worldRules: [],
    culturalContext: true
  },
  
  // 新增：章节约束配置
  chapterConstraints: {
    enabled: true,
    selectedChapters: [],           // 选中的章节ID列表
    timelineMode: 'continue',       // 时间线模式：continue/restart/forward/backward
    chapterOrder: 'chronological',  // 章节顺序：chronological/selected
    timeReference: 'relative',      // 时间参考：relative/absolute
    customTimeOffset: 0,            // 自定义时间偏移
    includeChapterEvents: true,     // 是否包含章节内已有事件
    analyzeChapterContent: true     // 是否分析章节内容
  },
  
  // 逻辑一致性配置
  consistencyCheck: {
    enabled: true,
    checkCharacterConsistency: true,
    checkWorldConsistency: true,
    checkTimelineConsistency: true,
    checkEventRelationships: true,
    checkChapterConsistency: true   // 新增：章节一致性检查
  }
})
```

#### 1.2 时间线模式定义
```javascript
const TIMELINE_MODES = {
  continue: {
    name: '延续时间线',
    description: '在现有时间线基础上继续发展',
    icon: 'ArrowRight',
    behavior: 'extend_existing'
  },
  restart: {
    name: '重新开始',
    description: '从指定章节开始新的时间线',
    icon: 'Refresh',
    behavior: 'start_new'
  },
  forward: {
    name: '向前发展',
    description: '生成未来时间的事件',
    icon: 'ArrowUp',
    behavior: 'generate_future'
  },
  backward: {
    name: '回溯补充',
    description: '补充过去时间的事件',
    icon: 'ArrowDown',
    behavior: 'fill_past'
  }
}
```

### 2. 章节分析功能

#### 2.1 章节内容分析
```javascript
const analyzeChapterContent = (chapterIds) => {
  const analysis = {
    chapters: [],
    timeline: [],
    events: [],
    characters: [],
    worldSettings: [],
    timeGaps: [],
    continuityIssues: []
  }
  
  chapterIds.forEach(chapterId => {
    const chapter = chapters.value.find(c => c.id === chapterId)
    if (chapter) {
      const chapterAnalysis = {
        id: chapter.id,
        title: chapter.title,
        content: chapter.content,
        wordCount: chapter.wordCount,
        status: chapter.status,
        createdAt: chapter.createdAt,
        updatedAt: chapter.updatedAt,
        
        // 内容分析
        extractedEvents: extractEventsFromContent(chapter.content),
        mentionedCharacters: extractMentionedCharacters(chapter.content),
        worldElements: extractWorldElements(chapter.content),
        timeReferences: extractTimeReferences(chapter.content),
        emotionalTone: analyzeEmotionalTone(chapter.content),
        plotPoints: extractPlotPoints(chapter.content)
      }
      
      analysis.chapters.push(chapterAnalysis)
    }
  })
  
  // 按时间顺序排序
  analysis.chapters.sort((a, b) => {
    return new Date(a.createdAt) - new Date(b.createdAt)
  })
  
  // 分析时间线连续性
  analysis.timeline = buildTimelineFromChapters(analysis.chapters)
  analysis.timeGaps = findTimeGaps(analysis.timeline)
  analysis.continuityIssues = findContinuityIssues(analysis.chapters)
  
  return analysis
}

const extractEventsFromContent = (content) => {
  // 从章节内容中提取事件信息
  const events = []
  
  // 使用正则表达式或NLP技术提取事件
  const eventPatterns = [
    /(?:突然|忽然|突然之间|就在这时)(.+?)(?:。|！|？)/g,
    /(?:发生|出现|开始|结束)(.+?)(?:。|！|？)/g,
    /(?:决定|选择|决定要)(.+?)(?:。|！|？)/g
  ]
  
  eventPatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(content)) !== null) {
      events.push({
        text: match[1].trim(),
        type: 'extracted',
        confidence: calculateConfidence(match[1])
      })
    }
  })
  
  return events
}

const extractTimeReferences = (content) => {
  // 提取时间引用
  const timeRefs = []
  
  const timePatterns = [
    /(?:第[一二三四五六七八九十\d]+天)/g,
    /(?:[一二三四五六七八九十\d]+天后)/g,
    /(?:[一二三四五六七八九十\d]+年前)/g,
    /(?:[一二三四五六七八九十\d]+月后)/g,
    /(?:早上|中午|下午|晚上|深夜)/g,
    /(?:春天|夏天|秋天|冬天)/g
  ]
  
  timePatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(content)) !== null) {
      timeRefs.push({
        text: match[0],
        type: 'time_reference',
        position: match.index
      })
    }
  })
  
  return timeRefs
}
```

#### 2.2 时间线构建
```javascript
const buildTimelineFromChapters = (chapters) => {
  const timeline = []
  
  chapters.forEach((chapter, index) => {
    // 分析章节中的时间信息
    const chapterTimeline = {
      chapterId: chapter.id,
      chapterTitle: chapter.title,
      order: index + 1,
      timeReferences: chapter.timeReferences,
      events: chapter.extractedEvents,
      characters: chapter.mentionedCharacters,
      worldElements: chapter.worldElements,
      emotionalTone: chapter.emotionalTone,
      
      // 时间推断
      estimatedTime: inferChapterTime(chapter),
      timeSpan: calculateChapterTimeSpan(chapter),
      previousChapter: index > 0 ? chapters[index - 1] : null,
      nextChapter: index < chapters.length - 1 ? chapters[index + 1] : null
    }
    
    timeline.push(chapterTimeline)
  })
  
  return timeline
}

const inferChapterTime = (chapter) => {
  // 基于时间引用推断章节时间
  const timeRefs = chapter.timeReferences
  
  if (timeRefs.length === 0) {
    return '时间未定'
  }
  
  // 分析时间引用的模式
  const dayPattern = /第([一二三四五六七八九十\d]+)天/
  const timePattern = /(早上|中午|下午|晚上|深夜)/
  
  let day = null
  let timeOfDay = null
  
  timeRefs.forEach(ref => {
    const dayMatch = ref.text.match(dayPattern)
    if (dayMatch) {
      day = dayMatch[1]
    }
    
    const timeMatch = ref.text.match(timePattern)
    if (timeMatch) {
      timeOfDay = timeMatch[1]
    }
  })
  
  if (day && timeOfDay) {
    return `第${day}天${timeOfDay}`
  } else if (day) {
    return `第${day}天`
  } else if (timeOfDay) {
    return timeOfDay
  }
  
  return '时间未定'
}
```

### 3. 章节约束UI界面

#### 3.1 章节选择器
```vue
<el-form-item label="约束章节">
  <div class="chapter-constraint-selector">
    <!-- 章节选择模式 -->
    <div class="chapter-selection-mode">
      <el-radio-group v-model="aiGenerateForm.chapterConstraints.chapterOrder">
        <el-radio label="chronological">按时间顺序</el-radio>
        <el-radio label="selected">自定义选择</el-radio>
      </el-radio-group>
    </div>
    
    <!-- 章节列表 -->
    <div class="chapter-list">
      <el-checkbox-group v-model="aiGenerateForm.chapterConstraints.selectedChapters">
        <div class="chapter-grid">
          <div 
            v-for="chapter in availableChapters" 
            :key="chapter.id"
            class="chapter-option"
            :class="{ 'disabled': !isChapterSelectable(chapter) }"
          >
            <el-checkbox 
              :label="chapter.id" 
              :disabled="!isChapterSelectable(chapter)"
            >
              <div class="chapter-info">
                <div class="chapter-header">
                  <h4>{{ chapter.title }}</h4>
                  <el-tag :type="getChapterStatusType(chapter.status)" size="small">
                    {{ getChapterStatusText(chapter.status) }}
                  </el-tag>
                </div>
                <div class="chapter-meta">
                  <span class="word-count">{{ chapter.wordCount || 0 }}字</span>
                  <span class="chapter-time">{{ inferChapterTime(chapter) }}</span>
                  <span class="update-time">{{ formatDate(chapter.updatedAt) }}</span>
                </div>
                <div class="chapter-preview">
                  <p>{{ chapter.content?.substring(0, 100) }}...</p>
                </div>
                <div class="chapter-events" v-if="chapter.extractedEvents?.length > 0">
                  <el-tag 
                    v-for="event in chapter.extractedEvents.slice(0, 3)" 
                    :key="event.text"
                    size="small"
                    type="info"
                  >
                    {{ event.text.substring(0, 20) }}...
                  </el-tag>
                </div>
              </div>
            </el-checkbox>
          </div>
        </div>
      </el-checkbox-group>
    </div>
    
    <!-- 章节分析结果 -->
    <div v-if="chapterAnalysis" class="chapter-analysis">
      <h4>章节分析结果</h4>
      <div class="analysis-summary">
        <div class="analysis-item">
          <span class="label">选中章节：</span>
          <span class="value">{{ chapterAnalysis.chapters.length }} 个</span>
        </div>
        <div class="analysis-item">
          <span class="label">时间跨度：</span>
          <span class="value">{{ chapterAnalysis.timeSpan }}</span>
        </div>
        <div class="analysis-item">
          <span class="label">提取事件：</span>
          <span class="value">{{ chapterAnalysis.events.length }} 个</span>
        </div>
        <div class="analysis-item">
          <span class="label">涉及角色：</span>
          <span class="value">{{ chapterAnalysis.characters.length }} 个</span>
        </div>
      </div>
    </div>
  </div>
</el-form-item>
```

#### 3.2 时间线模式选择器
```vue
<el-form-item label="时间线模式">
  <div class="timeline-mode-selector">
    <el-radio-group v-model="aiGenerateForm.chapterConstraints.timelineMode">
      <div class="timeline-modes">
        <div 
          v-for="(mode, key) in TIMELINE_MODES" 
          :key="key"
          class="timeline-mode-option"
        >
          <el-radio :label="key">
            <div class="mode-content">
              <el-icon class="mode-icon">
                <component :is="mode.icon" />
              </el-icon>
              <div class="mode-info">
                <h4>{{ mode.name }}</h4>
                <p>{{ mode.description }}</p>
              </div>
            </div>
          </el-radio>
        </div>
      </div>
    </el-radio-group>
    
    <!-- 时间线模式详细配置 -->
    <div v-if="aiGenerateForm.chapterConstraints.timelineMode === 'continue'" class="timeline-config">
      <el-form-item label="延续方式">
        <el-radio-group v-model="aiGenerateForm.chapterConstraints.timeReference">
          <el-radio label="relative">相对时间（基于最后章节）</el-radio>
          <el-radio label="absolute">绝对时间（基于章节内容）</el-radio>
        </el-radio-group>
      </el-form-item>
    </div>
    
    <div v-if="aiGenerateForm.chapterConstraints.timelineMode === 'forward'" class="timeline-config">
      <el-form-item label="未来时间">
        <el-input-number 
          v-model="aiGenerateForm.chapterConstraints.customTimeOffset" 
          :min="1" 
          :max="365"
        />
        <span class="form-tip">天后</span>
      </el-form-item>
    </div>
    
    <div v-if="aiGenerateForm.chapterConstraints.timelineMode === 'backward'" class="timeline-config">
      <el-form-item label="回溯时间">
        <el-input-number 
          v-model="aiGenerateForm.chapterConstraints.customTimeOffset" 
          :min="1" 
          :max="365"
        />
        <span class="form-tip">天前</span>
      </el-form-item>
    </div>
  </div>
</el-form-item>
```

#### 3.3 时间线可视化
```vue
<el-form-item label="时间线预览">
  <div class="timeline-visualization">
    <div class="timeline-header">
      <h4>章节时间线</h4>
      <el-button size="small" @click="refreshTimelineAnalysis">
        <el-icon><Refresh /></el-icon>
        刷新分析
      </el-button>
    </div>
    
    <div class="timeline-content">
      <div class="timeline-track">
        <div 
          v-for="(item, index) in timelineVisualization" 
          :key="item.id"
          class="timeline-item"
          :class="{ 'selected': item.selected }"
        >
          <div class="timeline-marker">
            <el-icon><Circle /></el-icon>
          </div>
          <div class="timeline-content">
            <div class="timeline-header">
              <h5>{{ item.title }}</h5>
              <span class="timeline-time">{{ item.time }}</span>
            </div>
            <div class="timeline-events" v-if="item.events.length > 0">
              <el-tag 
                v-for="event in item.events.slice(0, 3)" 
                :key="event.id"
                size="small"
                type="info"
              >
                {{ event.title }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 时间线分析结果 -->
      <div class="timeline-analysis">
        <div class="analysis-section">
          <h5>时间线分析</h5>
          <div class="analysis-items">
            <div class="analysis-item">
              <span class="label">时间跨度：</span>
              <span class="value">{{ timelineAnalysis.timeSpan }}</span>
            </div>
            <div class="analysis-item">
              <span class="label">时间间隔：</span>
              <span class="value">{{ timelineAnalysis.averageGap }}</span>
            </div>
            <div class="analysis-item">
              <span class="label">时间冲突：</span>
              <span class="value" :class="{ 'warning': timelineAnalysis.conflicts.length > 0 }">
                {{ timelineAnalysis.conflicts.length }} 个
              </span>
            </div>
          </div>
        </div>
        
        <div v-if="timelineAnalysis.gaps.length > 0" class="analysis-section">
          <h5>时间间隔</h5>
          <div class="gap-list">
            <div 
              v-for="gap in timelineAnalysis.gaps" 
              :key="gap.id"
              class="gap-item"
            >
              <span class="gap-time">{{ gap.time }}</span>
              <span class="gap-duration">{{ gap.duration }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</el-form-item>
```

### 4. 智能提示词构建增强

#### 4.1 章节约束提示词
```javascript
const buildChapterConstrainedPrompt = () => {
  const { chapterConstraints } = aiGenerateForm.value
  const selectedChapters = chapterConstraints.selectedChapters.map(id =>
    chapters.value.find(c => c.id === id)
  ).filter(Boolean)
  
  let prompt = `\n【章节约束要求】\n`
  
  if (chapterConstraints.enabled && selectedChapters.length > 0) {
    prompt += `基于以下章节生成事件：\n`
    
    selectedChapters.forEach((chapter, index) => {
      prompt += `${index + 1}. ${chapter.title}\n`
      prompt += `   内容概要：${chapter.content?.substring(0, 200)}...\n`
      prompt += `   字数：${chapter.wordCount || 0}字\n`
      prompt += `   状态：${getChapterStatusText(chapter.status)}\n`
      
      // 分析章节内容
      if (chapterConstraints.analyzeChapterContent) {
        const analysis = analyzeChapterContent([chapter.id])
        if (analysis.chapters[0]) {
          const chapterAnalysis = analysis.chapters[0]
          prompt += `   提取事件：${chapterAnalysis.extractedEvents.map(e => e.text).join('、')}\n`
          prompt += `   涉及角色：${chapterAnalysis.mentionedCharacters.join('、')}\n`
          prompt += `   时间引用：${chapterAnalysis.timeReferences.map(t => t.text).join('、')}\n`
        }
      }
      prompt += `\n`
    })
    
    // 时间线模式要求
    const timelineMode = TIMELINE_MODES[chapterConstraints.timelineMode]
    prompt += `时间线模式：${timelineMode.name}\n`
    prompt += `${timelineMode.description}\n`
    
    switch (chapterConstraints.timelineMode) {
      case 'continue':
        prompt += `- 在现有时间线基础上继续发展\n`
        prompt += `- 保持与前面章节的时间连续性\n`
        prompt += `- 考虑章节间的因果关系\n`
        break
      case 'restart':
        prompt += `- 从指定章节开始新的时间线\n`
        prompt += `- 可以重新定义时间起点\n`
        prompt += `- 保持与章节内容的逻辑一致性\n`
        break
      case 'forward':
        prompt += `- 生成未来时间的事件\n`
        prompt += `- 时间偏移：${chapterConstraints.customTimeOffset}天后\n`
        prompt += `- 基于章节内容推断未来发展\n`
        break
      case 'backward':
        prompt += `- 补充过去时间的事件\n`
        prompt += `- 时间偏移：${chapterConstraints.customTimeOffset}天前\n`
        prompt += `- 为章节内容提供背景事件\n`
        break
    }
    
    // 时间参考方式
    if (chapterConstraints.timeReference === 'relative') {
      prompt += `- 使用相对时间（基于最后章节的时间）\n`
    } else {
      prompt += `- 使用绝对时间（基于章节内容的时间引用）\n`
    }
    
    // 包含章节事件
    if (chapterConstraints.includeChapterEvents) {
      prompt += `- 考虑章节内已有的隐含事件\n`
      prompt += `- 与章节事件形成合理的关联\n`
    }
  }
  
  return prompt
}
```

#### 4.2 时间线一致性检查
```javascript
const checkTimelineConsistency = (generatedEvents, selectedChapters) => {
  const issues = []
  
  // 分析章节时间线
  const chapterTimeline = buildTimelineFromChapters(selectedChapters)
  
  generatedEvents.forEach(event => {
    // 检查时间引用是否合理
    const timeConsistency = checkEventTimeConsistency(event, chapterTimeline)
    if (!timeConsistency.isValid) {
      issues.push({
        type: 'time_consistency',
        event,
        issues: timeConsistency.issues,
        suggestions: timeConsistency.suggestions
      })
    }
    
    // 检查与章节内容的关联性
    const contentConsistency = checkEventContentConsistency(event, selectedChapters)
    if (!contentConsistency.isValid) {
      issues.push({
        type: 'content_consistency',
        event,
        issues: contentConsistency.issues,
        suggestions: contentConsistency.suggestions
      })
    }
  })
  
  return issues
}

const checkEventTimeConsistency = (event, chapterTimeline) => {
  const issues = []
  const suggestions = []
  
  // 检查时间引用是否在合理范围内
  const eventTime = parseEventTime(event.time)
  if (eventTime) {
    const isWithinRange = isTimeWithinChapterRange(eventTime, chapterTimeline)
    if (!isWithinRange) {
      issues.push('事件时间超出章节时间范围')
      suggestions.push('调整事件时间到章节时间范围内')
    }
  }
  
  // 检查时间顺序是否合理
  const timeOrder = checkTimeOrder(event, chapterTimeline)
  if (!timeOrder.isValid) {
    issues.push('事件时间顺序不合理')
    suggestions.push(timeOrder.suggestion)
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    suggestions
  }
}
```

### 5. 时间线管理功能

#### 5.1 时间线可视化组件
```vue
<template>
  <div class="timeline-manager">
    <div class="timeline-header">
      <h3>时间线管理</h3>
      <div class="timeline-controls">
        <el-button size="small" @click="addTimelineEvent">
          <el-icon><Plus /></el-icon>
          添加事件
        </el-button>
        <el-button size="small" @click="exportTimeline">
          <el-icon><Download /></el-icon>
          导出时间线
        </el-button>
      </div>
    </div>
    
    <div class="timeline-content">
      <!-- 时间线轨道 -->
      <div class="timeline-track">
        <div 
          v-for="item in timelineItems" 
          :key="item.id"
          class="timeline-item"
          :class="{ 'selected': item.selected }"
          @click="selectTimelineItem(item)"
        >
          <div class="timeline-marker">
            <el-icon><Circle /></el-icon>
          </div>
          <div class="timeline-content">
            <div class="timeline-header">
              <h4>{{ item.title }}</h4>
              <span class="timeline-time">{{ item.time }}</span>
            </div>
            <div class="timeline-description">
              {{ item.description }}
            </div>
            <div class="timeline-meta">
              <el-tag size="small" :type="getItemType(item.type)">
                {{ getItemTypeText(item.type) }}
              </el-tag>
              <span class="timeline-chapter">{{ item.chapter }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 时间线操作面板 -->
      <div class="timeline-actions">
        <el-button size="small" @click="moveTimelineItem('up')">
          <el-icon><ArrowUp /></el-icon>
          上移
        </el-button>
        <el-button size="small" @click="moveTimelineItem('down')">
          <el-icon><ArrowDown /></el-icon>
          下移
        </el-button>
        <el-button size="small" @click="editTimelineItem">
          <el-icon><Edit /></el-icon>
          编辑
        </el-button>
        <el-button size="small" @click="deleteTimelineItem">
          <el-icon><Delete /></el-icon>
          删除
        </el-button>
      </div>
    </div>
  </div>
</template>
```

#### 5.2 时间线操作功能
```javascript
const timelineOperations = {
  // 添加时间线事件
  addTimelineEvent: (event) => {
    const timelineItem = {
      id: Date.now(),
      title: event.title,
      description: event.description,
      time: event.time,
      chapter: event.chapter,
      type: 'event',
      selected: false
    }
    
    timelineItems.value.push(timelineItem)
    sortTimelineItems()
  },
  
  // 移动时间线项目
  moveTimelineItem: (direction) => {
    const selectedItem = timelineItems.value.find(item => item.selected)
    if (!selectedItem) return
    
    const currentIndex = timelineItems.value.indexOf(selectedItem)
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    if (newIndex >= 0 && newIndex < timelineItems.value.length) {
      const item = timelineItems.value.splice(currentIndex, 1)[0]
      timelineItems.value.splice(newIndex, 0, item)
    }
  },
  
  // 排序时间线项目
  sortTimelineItems: () => {
    timelineItems.value.sort((a, b) => {
      const timeA = parseTime(a.time)
      const timeB = parseTime(b.time)
      return timeA - timeB
    })
  },
  
  // 导出时间线
  exportTimeline: () => {
    const timelineData = {
      title: '小说时间线',
      chapters: selectedChapters.value.map(c => c.title),
      events: timelineItems.value.map(item => ({
        title: item.title,
        description: item.description,
        time: item.time,
        chapter: item.chapter
      }))
    }
    
    const dataStr = JSON.stringify(timelineData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = 'timeline.json'
    link.click()
    
    URL.revokeObjectURL(url)
  }
}
```

### 6. 实现优先级

#### 阶段1：基础章节约束 (P0)
- 章节选择器
- 时间线模式选择
- 基础提示词增强

#### 阶段2：智能分析 (P1)
- 章节内容分析
- 时间线构建
- 一致性检查

#### 阶段3：高级功能 (P2)
- 时间线可视化
- 时间线管理
- 导出功能

---

## 🎯 总结

### 核心增强
1. **章节约束**: 基于选定章节生成事件，确保逻辑一致性
2. **时间线管理**: 支持延续、重启、向前、向后四种时间线模式
3. **智能分析**: 自动分析章节内容，提取事件和时间信息
4. **可视化**: 直观的时间线展示和管理界面

### 技术亮点
1. **多模式时间线**: 灵活的时间线管理方式
2. **内容分析**: 智能提取章节中的事件和时间信息
3. **一致性检查**: 全面的时间线一致性验证
4. **可视化管理**: 直观的时间线操作界面

这个完整版设计真正实现了**"以人物为驱动，以世界观为背景，以章节为框架"**的智能事件生成系统，您觉得如何？
